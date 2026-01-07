import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getNextTurnPlayerId, calculateNextTurn } from "@/lib/game-logic";

export async function POST(request: Request) {
  try {
    const { roomId, playerId } = await request.json();

    // 1. ดึงข้อมูล Room และ Players
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

    // 2. Validate: ใช่ตาคนเล่นไหม?
    if (room.current_turn_player_id !== playerId) {
      return NextResponse.json({ error: "ไม่ใช่ตาของคุณ!" }, { status: 400 });
    }

    // 3. 🔥 Safety Check: ป้องกันบัคกองไพ่หายหรือว่างเปล่า
    if (
      !Array.isArray(room.deck) ||
      (room.deck.length === 0 && room.status === "playing")
    ) {
      return NextResponse.json(
        { error: "ไพ่หมดกองแล้ว (System Error)" },
        { status: 400 }
      );
    }

    // 4. เริ่มจั่ว (หยิบจากท้ายแถว)
    const deck = [...room.deck]; // copy array เพื่อความปลอดภัย
    const drawnCard = deck.pop();
    const currentPlayer = players.find((p: any) => p.id === playerId);

    // --- CASE A: จั่วเจอระเบิด 💣 ---
    if (drawnCard.type === "bomb") {
      const defuseIndex = currentPlayer.hand.findIndex(
        (c: any) => c.type === "defuse"
      );

      if (defuseIndex !== -1) {
        // ✅ รอด (มี Defuse): ใช้การ์ด Defuse
        const usedDefuse = currentPlayer.hand.splice(defuseIndex, 1)[0];
        const newDiscard = [...room.discard_pile, usedDefuse];

        // อัปเดต: ตัด Defuse ออก, เข้าโหมด Defusing (ยังไม่เปลี่ยนเทิร์น)
        await supabase
          .from("players")
          .update({ hand: currentPlayer.hand })
          .eq("id", playerId);
        await supabase
          .from("rooms")
          .update({
            deck: deck,
            discard_pile: newDiscard,
            game_state: {
              ...room.game_state,
              phase: "defusing",
              defusing_player_id: playerId,
              bomb_card: drawnCard,
            },
          })
          .eq("id", roomId);

        return NextResponse.json({ action: "defuse_needed", card: drawnCard });
      } else {
        // 💀 ตาย (ไม่มี Defuse)
        const newDiscard = [...room.discard_pile, drawnCard]; // ทิ้งระเบิดลงกอง (หรือจะเก็บไว้เป็นอนุสรณ์ก็ได้)

        // หาคนเล่นถัดไปทันที
        const nextPlayerId = getNextTurnPlayerId(playerId, players);

        // อัปเดตผู้เล่นตาย
        await supabase
          .from("players")
          .update({ is_alive: false })
          .eq("id", playerId);

        // เช็ค Win Condition (เหลือรอดคนเดียวไหม)
        const alivePlayersCount = players.filter(
          (p: any) => p.is_alive && p.id !== playerId
        ).length;
        let finalStatus = "playing";
        let winnerId = null;
        if (alivePlayersCount === 1) {
          finalStatus = "finished";
          // หาคนชนะ (คนที่มีชีวิตอยู่คนสุดท้าย)
          const winner = players.find(
            (p: any) => p.is_alive && p.id !== playerId
          );
          winnerId = winner ? winner.id : null;
        }

        // อัปเดตห้อง (เปลี่ยนคน, รีเซ็ต Stack เป็น 1)
        await supabase
          .from("rooms")
          .update({
            deck: deck,
            discard_pile: newDiscard,
            current_turn_player_id: nextPlayerId,
            status: finalStatus,
            game_state: {
              ...room.game_state,
              turns_left: 1, // 🔥 รีเซ็ตเสมอเมื่อมีคนตาย
              winner_id: winnerId,
            },
          })
          .eq("id", roomId);

        return NextResponse.json({ action: "exploded", card: drawnCard });
      }
    }

    // --- CASE B: จั่วปลอดภัย 😌 ---
    else {
      const newHand = [...currentPlayer.hand, drawnCard];

      // 🔥 หัวใจสำคัญ: คำนวณเทิร์นถัดไป (Handle Attack Stack)
      // ถ้า turns_left > 1 -> ลดเหลือ 1 -> nextPlayer คือ คนเดิม
      // ถ้า turns_left == 1 -> เปลี่ยนคน -> turns_left เป็น 1
      const currentStack = room.game_state?.turns_left || 1;
      const { nextPlayerId, nextStack } = calculateNextTurn(
        playerId,
        players,
        currentStack,
        "pass"
      );

      await supabase
        .from("players")
        .update({ hand: newHand })
        .eq("id", playerId);
      await supabase
        .from("rooms")
        .update({
          deck: deck,
          current_turn_player_id: nextPlayerId,
          game_state: {
            ...room.game_state,
            turns_left: nextStack, // อัปเดตค่า Stack ใหม่
          },
        })
        .eq("id", roomId);

      return NextResponse.json({ action: "drew", card: drawnCard });
    }
  } catch (error) {
    console.error("Draw Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
