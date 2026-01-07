import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const { roomId, playerId, card, targetPlayerId } = await request.json();

    // 1. ดึงข้อมูลห้องและผู้เล่น
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

    if (!room || !players) throw new Error("Room not found");

    // Validate: ต้องเป็นตาเราเท่านั้น
    if (room.current_turn_player_id !== playerId) {
      return NextResponse.json({ error: "ไม่ใช่ตาของคุณ!" }, { status: 400 });
    }

    // Validate Phase: ต้องอยู่ในช่วงเล่นปกติ (ห้ามกดซ้อนตอนกำลัง Pending)
    if (
      room.game_state?.phase !== "playing" &&
      room.game_state?.phase !== undefined
    ) {
      return NextResponse.json(
        { error: "รอ Action ก่อนหน้าจบก่อน" },
        { status: 400 }
      );
    }

    const currentPlayer = players.find((p: any) => p.id === playerId);

    // 2. ลบการ์ดออกจากมือทันที (เสมือนวางลงบนโต๊ะแล้ว)
    const cardIndex = currentPlayer.hand.findIndex(
      (c: any) => c.id === card.id
    );
    if (cardIndex === -1) {
      return NextResponse.json(
        { error: "ไม่มีการ์ดใบนี้ในมือ" },
        { status: 400 }
      );
    }
    currentPlayer.hand.splice(cardIndex, 1);

    // 3. เตรียมข้อมูล Pending Action
    const pendingAction = {
      card: card, // การ์ดที่ลง
      source_player_id: playerId, // ใครลง
      target_player_id: targetPlayerId || null, // เป้าหมาย (สำหรับ Favor/Attack)
    };

    // 4. Update Database:
    // - อัปเดตมือผู้เล่น (ไพ่หายไป)
    // - อัปเดตห้องให้เป็นสถานะ 'action_pending'
    await supabase
      .from("players")
      .update({ hand: currentPlayer.hand })
      .eq("id", playerId);
    await supabase
      .from("rooms")
      .update({
        game_state: {
          ...room.game_state,
          phase: "action_pending", // เปลี่ยน Phase
          pending_action: pendingAction, // บันทึกว่าทำอะไรค้างไว้
          nope_count: 0, // เริ่มนับ Nope
        },
      })
      .eq("id", roomId);

    // ส่งกลับบอก Frontend ว่า "รอนะ"
    return NextResponse.json({ success: true, pending: true });
  } catch (error) {
    console.error("Play error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
