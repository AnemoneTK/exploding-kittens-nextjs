// src/components/JoinRoomModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, Hash } from "lucide-react";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // เช็คว่าสิ่งที่วางลงมา มีคำว่า '/room/' ไหม (แสดงว่าเป็น Link)
    if (value.includes("/room/")) {
      // ตัดเอาข้อความหลังคำว่า /room/ มาใช้
      const parts = value.split("/room/");
      // เอาส่วนสุดท้ายมา และตัดให้เหลือ 6 ตัว (เผื่อมีเศษเกิน)
      value = parts[parts.length - 1];
    }

    // แปลงเป็นพิมพ์ใหญ่ และตัดเกิน 6 ตัวอักษรทิ้ง (Manual limit)
    // แล้วลบตัวอักษรแปลกปลอมออก (เอาแค่ A-Z และตัวเลข)
    const cleanCode = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    setRoomCode(cleanCode);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    // เปลี่ยนหน้าไปที่ห้องนั้น (แปลงเป็นตัวพิมพ์ใหญ่เสมอ)
    router.push(`/room/${roomCode.toUpperCase()}`);
    onClose();
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5 border border-slate-100 dark:border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center mb-6 mt-2">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hash className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            กรอกรหัสห้อง
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            ขอรหัส 4 หลักจากหัวห้องมาใส่เลย
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={roomCode}
            onChange={handleInputChange}
            className="w-full text-center text-3xl font-black tracking-widest p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-black transition-all text-slate-900 dark:text-white placeholder:text-slate-300"
            autoFocus
          />

          <button
            type="submit"
            disabled={!roomCode.trim()}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <span>ไปลุยกันเลย</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
