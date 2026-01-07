import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getNextTurnPlayerId } from "@/lib/game-logic";

export async function POST(request: Request) {
  try {
    const { roomId, playerId, insertIndex } = await request.json();

    // 1. ดึงข้อมูล
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

    // 2. Security Check
    if (
      room.game_state?.phase !== "defusing" ||
      room.game_state?.defusing_player_id !== playerId
    ) {
      return NextResponse.json(
        { error: "ไม่ใช่ตาของคุณที่จะกู้ระเบิด" },
        { status: 400 }
      );
    }

    const bombCard = room.game_state.bomb_card;
    if (!bombCard)
      return NextResponse.json({ error: "ไม่พบระเบิด" }, { status: 400 });

    const currentDeck = room.deck as any[];

    // 🔥 แก้ตรงนี้: กลับด้านตัวเลข (Invert Index)
    // UI ส่งมา: 0 = บนสุด (อยากให้จั่วเจอเลย), Max = ล่างสุด
    // Array เก็บ: 0 = ล่างสุด, Max = บนสุด (เพราะ pop() หยิบจาก Max)
    // สูตรคำนวณ: ตำแหน่งจริง = ความยาว - ตำแหน่งที่เลือก

    let targetIndex = currentDeck.length - insertIndex;

    // กันเหนียว (Clamp) ให้อยู่ในขอบเขต array
    targetIndex = Math.max(0, Math.min(targetIndex, currentDeck.length));

    // แทรกระเบิดลงไป
    currentDeck.splice(targetIndex, 0, bombCard);

    // 3. เปลี่ยนเทิร์น
    const nextPlayerId = getNextTurnPlayerId(playerId, players);

    // 4. Update DB
    const { error } = await supabase
      .from("rooms")
      .update({
        deck: currentDeck,
        current_turn_player_id: nextPlayerId,
        game_state: { phase: "playing", turns_left: 1 }, // Reset กลับเป็น Playing
      })
      .eq("id", roomId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
