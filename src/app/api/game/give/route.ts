import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const { roomId, giverId, cardIndex } = await request.json();

    // 1. Init
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

    // เช็คว่าอยู่ใน phase 'giving_favor' ไหม
    if (room.game_state?.phase !== "giving_favor")
      return NextResponse.json({ error: "ไม่ใช่ช่วงส่งของ" }, { status: 400 });

    const giver = players.find((p: any) => p.id === giverId);
    const receiverId = room.game_state.request_player_id; // คนขอรออยู่
    const receiver = players.find((p: any) => p.id === receiverId);

    // 2. Action: ย้ายไพ่
    const cardToGive = giver.hand.splice(cardIndex, 1)[0];
    receiver.hand.push(cardToGive);

    // 3. Save DB & Reset State
    await supabase
      .from("players")
      .update({ hand: giver.hand })
      .eq("id", giverId);
    await supabase
      .from("players")
      .update({ hand: receiver.hand })
      .eq("id", receiverId);

    // 🔥 จุดที่แก้: เพิ่ม target_player_id: null เพื่อล้างสถานะโดนเพ่งเล็ง
    await supabase
      .from("rooms")
      .update({
        game_state: {
          ...room.game_state,
          phase: "playing",
          request_player_id: null,
          target_player_id: null, // <--- สำคัญมาก! ต้องล้างทิ้งไม่งั้นป้ายค้าง
        },
      })
      .eq("id", roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
