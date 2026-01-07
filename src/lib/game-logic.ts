// src/lib/game-logic.ts

interface Player {
  id: string;
  is_alive: boolean;
  // ... field อื่นๆ
}

// 1. ฟังก์ชันหาคนเล่นตาถัดไป (ข้ามคนที่ตายแล้ว)
export function getNextTurnPlayerId(
  currentId: string | null,
  players: Player[],
  direction: number = 1
): string {
  // กรองเอาเฉพาะคนที่ยังมีชีวิต
  const alivePlayers = players.filter((p) => p.is_alive);

  if (alivePlayers.length === 0) return currentId || "";
  if (alivePlayers.length === 1) return alivePlayers[0].id; // เหลือคนเดียว = ชนะ

  // หา index ปัจจุบัน
  const currentIndex = alivePlayers.findIndex((p) => p.id === currentId);

  if (currentIndex === -1) {
    // ถ้าหาไม่เจอ (เช่น เพิ่งเริ่มเกม หรือคนปัจจุบันเพิ่งตาย) ให้เอาคนแรก
    return alivePlayers[0].id;
  }

  // คำนวณ index ถัดไป (วนลูป)
  let nextIndex = (currentIndex + direction) % alivePlayers.length;

  // กรณี index ติดลบ (เมื่อวนซ้าย)
  if (nextIndex < 0) nextIndex = alivePlayers.length + nextIndex;

  return alivePlayers[nextIndex].id;
}

// 2. ฟังก์ชันคำนวณ Stack (จำนวนเทิร์นที่ต้องเล่น) สำหรับ Attack/Skip
export function calculateNextTurn(
  currentId: string,
  players: any[],
  currentStack: number, // จำนวนเทิร์นที่คนปัจจุบันต้องเล่นเหลืออยู่
  action: "pass" | "attack" | "skip"
): { nextPlayerId: string; nextStack: number } {
  // กรณี Skip: ลดจำนวนเทิร์นที่ต้องเล่นลง 1
  if (action === "skip") {
    if (currentStack > 1) {
      // ถ้าโดน Attack มา (ต้องเล่น 2 รอบ) -> Skip 1 รอบ -> ยังต้องเล่นต่ออีก 1 รอบ
      return { nextPlayerId: currentId, nextStack: currentStack - 1 };
    } else {
      // ถ้าเล่นปกติ -> Skip -> จบเทิร์น เปลี่ยนคน
      const nextId = getNextTurnPlayerId(currentId, players);
      return { nextPlayerId: nextId, nextStack: 1 };
    }
  }

  // กรณี Attack: จบเทิร์นเราทันที -> คนถัดไปโดน 2 รอบ
  if (action === "attack") {
    const nextId = getNextTurnPlayerId(currentId, players);
    return { nextPlayerId: nextId, nextStack: 2 };
  }

  // กรณี Pass (จั่วไพ่เสร็จ/จบเทิร์นปกติ):
  if (action === "pass") {
    if (currentStack > 1) {
      // ยังเหลือรอบต้องเล่นอีก (เช่น โดน Attack แล้วเพิ่งจั่วไป 1 ใบ)
      return { nextPlayerId: currentId, nextStack: currentStack - 1 };
    } else {
      // จบเทิร์น เปลี่ยนคน
      const nextId = getNextTurnPlayerId(currentId, players);
      return { nextPlayerId: nextId, nextStack: 1 };
    }
  }

  return { nextPlayerId: currentId, nextStack: 1 };
}
