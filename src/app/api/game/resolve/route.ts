import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { calculateNextTurn } from "@/lib/game-logic";
import { shuffleDeck } from "@/lib/game-utils";

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    // 1. Fetch Data
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    // Validate Pending Action
    if (!room || !players) throw new Error("Not found");
    if (
      room.game_state?.phase !== "action_pending" ||
      !room.game_state?.pending_action
    ) {
      return NextResponse.json(
        { error: "ไม่มี Action ที่ต้องประมวลผล" },
        { status: 400 }
      );
    }

    const { card, source_player_id, target_player_id } =
      room.game_state.pending_action;
    const currentStack = room.game_state.turns_left || 1;

    // เตรียมข้อมูล Update
    let updateData: any = {
      game_state: {
        ...room.game_state,
        phase: "playing",
        pending_action: null,
      }, // ค่า Default คือกลับไปเล่นปกติ
    };
    let responseData: any = { success: true };

    // 2. รัน Logic ตามประเภทการ์ด
    switch (card.type) {
      case "skip": {
        // ข้ามเทิร์น (ลด Stack หรือเปลี่ยนคน)
        const { nextPlayerId, nextStack } = calculateNextTurn(
          source_player_id,
          players,
          currentStack,
          "skip"
        );
        updateData.current_turn_player_id = nextPlayerId;
        updateData.game_state.turns_left = nextStack;
        break;
      }
      case "attack": {
        // โจมตี (เปลี่ยนคน และเพิ่ม Stack เป็น 2)
        const { nextPlayerId, nextStack } = calculateNextTurn(
          source_player_id,
          players,
          currentStack,
          "attack"
        );
        updateData.current_turn_player_id = nextPlayerId;
        updateData.game_state.turns_left = nextStack;
        break;
      }
      case "shuffle": {
        // 🔥 FIX: ป้องกันบัคสับไพ่แล้วหาย
        if (!Array.isArray(room.deck) || room.deck.length === 0) {
          // ถ้าไพ่หมด/มีปัญหา ไม่ต้องสับ (ข้ามไปเลย)
          break;
        }

        // สับไพ่
        const shuffled = shuffleDeck([...room.deck]);

        // Safety Check หลังสับ
        if (shuffled.length === 0 && room.deck.length > 0) {
          throw new Error("Shuffle Error: Deck vanished");
        }

        updateData.deck = shuffled;
        // Shuffle ไม่เปลี่ยนเทิร์น
        break;
      }
      case "see_future": {
        // ดูอนาคต 3 ใบ
        // ถ้า Deck มีปัญหาก็ส่ง array ว่างไป
        const currentDeck = Array.isArray(room.deck) ? room.deck : [];
        const top3 = currentDeck.slice(-3).reverse(); // หยิบจากท้าย (บนสุด)
        responseData.see_future_cards = top3;
        // See future ไม่เปลี่ยนเทิร์น
        break;
      }
      case "favor": {
        // เข้าสู่โหมด "รอเพื่อนส่งของ"
        updateData.game_state.phase = "giving_favor";
        updateData.game_state.request_player_id = source_player_id;
        updateData.game_state.target_player_id = target_player_id;
        // ยังไม่เปลี่ยนเทิร์น (รอเพื่อนส่งของเสร็จก่อน)
        break;
      }
      default: {
        // การ์ดอื่นๆ (เช่น แมว) ถ้าหลุดมาในนี้ ก็แค่ทิ้งลงกองแล้วเล่นต่อ
        break;
      }
    }

    // 3. เอาการ์ดลงกองทิ้ง (Action Card ที่ใช้แล้ว)
    // เช็ค discard_pile ว่ามีค่าไหม
    const currentDiscard = Array.isArray(room.discard_pile)
      ? room.discard_pile
      : [];
    const newDiscard = [...currentDiscard, card];

    // 4. Update Database
    const { error } = await supabase
      .from("rooms")
      .update({
        ...updateData,
        discard_pile: newDiscard,
      })
      .eq("id", roomId);

    if (error) throw error;

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Resolve Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
