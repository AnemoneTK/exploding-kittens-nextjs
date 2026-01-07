import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const { roomId, playerId, cardType, targetPlayerId } = await request.json();

    // 1. Init Data
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
    if (room.current_turn_player_id !== playerId)
      return NextResponse.json({ error: "ไม่ใช่ตาคุณ" }, { status: 400 });

    const me = players.find((p: any) => p.id === playerId);
    const target = players.find((p: any) => p.id === targetPlayerId);

    // 2. Validate: มีการ์ดคู่นั้นจริงไหม?
    const myHand = me.hand as any[];
    const pairIndices = myHand
      .map((c, i) => (c.type === cardType ? i : -1))
      .filter((i) => i !== -1);

    if (pairIndices.length < 2)
      return NextResponse.json({ error: "การ์ดไม่ครบคู่" }, { status: 400 });
    if (target.hand.length === 0)
      return NextResponse.json(
        { error: "เป้าหมายไม่มีไพ่ให้ขโมย" },
        { status: 400 }
      );

    // 3. Action: ลบการ์ดคู่จากมือเรา
    // ลบจากหลังมาหน้า เพื่อไม่ให้ index เพี้ยน
    myHand.splice(pairIndices[1], 1);
    myHand.splice(pairIndices[0], 1);

    // 4. Action: ขโมย (สุ่ม)
    const targetHand = target.hand as any[];
    const randomIndex = Math.floor(Math.random() * targetHand.length);
    const stolenCard = targetHand.splice(randomIndex, 1)[0];

    // เอาเข้ามือเรา
    myHand.push(stolenCard);

    // 5. Save DB
    await supabase.from("players").update({ hand: myHand }).eq("id", playerId);
    await supabase
      .from("players")
      .update({ hand: targetHand })
      .eq("id", targetPlayerId);

    // ลงคู่ไม่จบเทิร์น แค่เสียไพ่ลงกองทิ้ง
    // (เพื่อความง่าย เราไม่เอาการ์ดที่ลงไปใส่กองทิ้งใน DB ก็ได้ หรือจะใส่ก็ได้ ในที่นี้ขอข้ามเพื่อความกระชับ)

    return NextResponse.json({ success: true, stolenCard }); // ส่งกลับไปบอกว่าได้ใบไหน
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
