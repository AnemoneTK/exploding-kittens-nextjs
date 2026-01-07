// src/app/api/game/leave/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const { roomId, playerId } = await request.json();

    // 1. ลบผู้เล่นออกจากห้อง
    await supabase.from("players").delete().eq("id", playerId);

    // 2. เช็คว่าเหลือคนในห้องไหม
    const { data: remainingPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId);

    // 3. ถ้าไม่เหลือใครเลย -> ปิดห้อง (Abandoned)
    if (!remainingPlayers || remainingPlayers.length === 0) {
      await supabase
        .from("rooms")
        .update({ status: "abandoned" })
        .eq("id", roomId);
    }
    // ถ้าเหลือคนเดียว -> ให้ชนะเลย (Optional)
    else if (remainingPlayers.length === 1 && roomId) {
      const winner = remainingPlayers[0];
      await supabase
        .from("rooms")
        .update({
          status: "finished",
          game_state: { winner_id: winner.id },
        })
        .eq("id", roomId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave Error:", error);
    return NextResponse.json({ error: "Error leaving room" }, { status: 500 });
  }
}
