import { v4 as uuidv4 } from "uuid";

export const shuffleDeck = (deck: any[]) => {
  return deck.sort(() => Math.random() - 0.5);
};

export const generateGameSetup = (players: any[]) => {
  const playerCount = players.length;

  // 1. สร้างกองการ์ดปลอดภัย (Safe Cards) สำหรับแจกก่อน
  // (ไม่รวมระเบิด และ ไม่รวม Defuse)
  let safeDeck: any[] = [];

  const addCards = (type: string, count: number) => {
    for (let i = 0; i < count; i++) safeDeck.push({ id: uuidv4(), type });
  };

  // --- ปรับจำนวนการ์ด Action อื่นๆ ตามใจชอบ ---
  addCards("attack", 4);
  addCards("skip", 4);
  addCards("favor", 4);
  addCards("shuffle", 4);
  addCards("see_future", 5);
  addCards("nope", 5); // ยิ่งคนเยอะ ยิ่งควรเพิ่ม Nope

  // การ์ดแมว
  addCards("cat_1", 4);
  addCards("cat_2", 4);
  addCards("cat_3", 4);
  addCards("cat_4", 4);
  addCards("cat_5", 4);

  // สับการ์ดปลอดภัยก่อนแจก
  safeDeck = shuffleDeck(safeDeck);

  // 2. แจกไพ่เริ่มต้น (7 safe + 1 defuse)
  const updatedPlayers = players.map((player) => {
    const hand = safeDeck.splice(0, 7);
    hand.push({ id: uuidv4(), type: "defuse" }); // แจก 1 ใบ
    return { ...player, hand };
  });

  // 3. เตรียมการ์ดเข้ากอง Main Deck (ส่วนที่เหลือ)

  // A. ใส่ระเบิด (Bomb) = จำนวนผู้เล่น - 1
  const bombCount = Math.max(1, playerCount - 1);
  for (let i = 0; i < bombCount; i++) {
    safeDeck.push({ id: uuidv4(), type: "bomb" });
  }

  // B. 🔥 ใส่ Defuse ในกอง (สูตรใหม่: เท่ากับ จำนวนผู้เล่น - 1)
  // สูตรนี้ทำให้ กู้ระเบิดในกอง มีค่าเท่ากับ ระเบิด เป๊ะๆ
  const extraDefuse = Math.max(0, playerCount - 1);
  for (let i = 0; i < extraDefuse; i++) {
    safeDeck.push({ id: uuidv4(), type: "defuse" });
  }

  // 4. สับกองครั้งสุดท้าย
  const finalDeck = shuffleDeck(safeDeck);

  return {
    deck: finalDeck,
    players: updatedPlayers,
  };
};
