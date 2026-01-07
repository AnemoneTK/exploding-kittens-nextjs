import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const { roomId, playerId, card } = await request.json();

    // 1. ดึงข้อมูล
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId);

    if (!room || !players) throw new Error("Not found");

    const me = players.find((p: any) => p.id === playerId);

    // 2. ลบการ์ด Nope ออกจากมือคนกด
    const cardIndex = me.hand.findIndex((c: any) => c.id === card.id);
    if (cardIndex === -1)
      return NextResponse.json({ error: "ไม่มีการ์ด Nope" }, { status: 400 });
    me.hand.splice(cardIndex, 1);

    // 3. Logic การทำงานของ Nope (แบ่งตามสถานการณ์)
    let newDiscard = [...room.discard_pile, card]; // ทิ้งการ์ด Nope ลงกองก่อนเลย
    let updateData: any = {};

    // --- CASE A: ขัดขวาง Action ที่กำลังรอ (Pending) ---
    // เช่น เพื่อนลง Attack มา -> เรากด Nope -> Attack นั้นถือเป็นโมฆะ
    if (room.game_state?.phase === "action_pending") {
      const pendingAction = room.game_state.pending_action;

      // การ์ดที่ถูกขัดขวาง ก็ต้องลงกองทิ้งด้วย (เสียฟรี)
      newDiscard.push(pendingAction.card);

      updateData = {
        discard_pile: newDiscard,
        game_state: {
          ...room.game_state,
          phase: "playing", // กลับไปเล่นต่อ (เทิร์นยังอยู่ที่คนเดิม)
          pending_action: null, // ล้าง Action ทิ้ง
        },
      };
    }

    // --- CASE B: ขัดขวางการส่งของ (Giving Favor) ---
    // เช่น เราโดน Favor -> เรากด Nope -> ไม่ต้องให้ของ
    else if (room.game_state?.phase === "giving_favor") {
      // ต้องเป็นเหยื่อเท่านั้นถึงจะกด Nope ตอนนี้ได้
      if (room.game_state.target_player_id !== playerId) {
        return NextResponse.json(
          { error: "คุณไม่ได้โดนขอของ" },
          { status: 400 }
        );
      }

      updateData = {
        discard_pile: newDiscard,
        game_state: {
          ...room.game_state,
          phase: "playing", // กลับไปเล่นต่อ
          request_player_id: null,
          target_player_id: null,
        },
      };
    }

    // --- CASE C: กดเล่นๆ ผิดจังหวะ ---
    else {
      return NextResponse.json(
        { error: "จังหวะนี้ใช้ Nope ไม่ได้" },
        { status: 400 }
      );
    }

    // 4. Update Database
    await supabase.from("players").update({ hand: me.hand }).eq("id", playerId);
    await supabase.from("rooms").update(updateData).eq("id", roomId);

    return NextResponse.json({ success: true, message: "Nope Successful!" });
  } catch (error) {
    console.error("Nope error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
