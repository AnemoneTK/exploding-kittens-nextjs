import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { generateGameSetup } from "@/lib/game-utils"; // import มา

export async function POST(request: Request) {
  const { roomId } = await request.json();

  // 1. ดึงผู้เล่น
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId);
  if (!players || players.length < 2)
    return NextResponse.json({ error: "คนไม่ครบ" }, { status: 400 });

  // 2. ใช้ฟังก์ชันจัด Deck ใหม่ (ได้ทั้งกองจั่ว และมือผู้เล่นที่แจกแล้ว)
  const { deck, players: playersWithHand } = generateGameSetup(players);

  // 3. อัปเดตลง Database
  // 3.1 อัปเดตห้อง (ใส่ Deck, สถานะ)
  await supabase
    .from("rooms")
    .update({
      status: "playing",
      deck: deck,
      discard_pile: [],
      current_turn_player_id: players[0].id, // ให้คนแรกเริ่ม
      game_state: { phase: "playing", turns_left: 1 },
    })
    .eq("id", roomId);

  // 3.2 อัปเดตมือผู้เล่นทุกคน
  for (const p of playersWithHand) {
    await supabase
      .from("players")
      .update({ hand: p.hand, is_alive: true })
      .eq("id", p.id);
  }

  return NextResponse.json({ success: true });
}
