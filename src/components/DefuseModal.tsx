"use client";

import { useState, useEffect } from "react";
import { Bomb } from "lucide-react";

interface DefuseModalProps {
  isOpen: boolean;
  deckCount: number;
  onSubmit: (index: number) => Promise<void>; // 🔥 แก้ Type ให้รอ Promise ได้
}

export default function DefuseModal({
  isOpen,
  deckCount,
  onSubmit,
}: DefuseModalProps) {
  const [insertIndex, setInsertIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state เมื่อเปิด Modal ใหม่
  useEffect(() => {
    if (isOpen) {
      setInsertIndex(0);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // 🔥 ใส่ async
    setIsSubmitting(true);
    try {
      await onSubmit(insertIndex); // รอให้ API ทำงานเสร็จ
      // ถ้าสำเร็จ Modal จะปิดเองจาก Parent (isOpen = false)
    } catch (error) {
      // ถ้าพัง ให้ปุ่มกลับมากดได้ใหม่
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 text-white w-full max-w-md p-8 rounded-3xl border-2 border-red-500 shadow-2xl relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>

        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center animate-bounce">
            <Bomb className="w-10 h-10 text-red-500" />
          </div>

          <div>
            <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest">
              รอดแล้ว!
            </h2>
            <p className="text-slate-400 mt-2">
              แต่ระเบิดยังต้องทำงาน...
              <br />
              คุณจะแอบซ่อนมันไว้ตรงไหน?
            </p>
          </div>

          {/* Slider Section */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
              <span>บนสุด (ใบแรก)</span>
              <span>ล่างสุด</span>
            </div>

            <input
              type="range"
              min="0"
              max={deckCount}
              step="1"
              value={insertIndex}
              onChange={(e) => setInsertIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />

            <div className="mt-4 flex items-center justify-center gap-2 text-xl font-bold">
              <span className="text-slate-400">ตำแหน่งที่:</span>
              <span className="text-red-400 text-3xl">{insertIndex}</span>
              <span className="text-slate-500 text-sm">(จาก {deckCount})</span>
            </div>

            <p className="text-xs text-center text-slate-500 mt-2">
              {insertIndex === 0 && "😈 คนต่อไปจั่วโดนแน่!"}
              {insertIndex > 0 && insertIndex < 3 && "😨 อยู่แถวๆ บนเนี่ยแหละ"}
              {insertIndex >= deckCount && "😇 เอาไปไว้ก้นหลุมเลย"}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg hover:shadow-red-900/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "กำลังซ่อนระเบิด..." : "วางระเบิดตรงนี้แหละ!"}
          </button>
        </div>
      </div>
    </div>
  );
}
