// src/app/loading.tsx
import { Bomb } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground space-y-4">
      <div className="relative">
        {/* ระเบิดสั่นดุ๊กดิ๊ก */}
        <Bomb className="w-16 h-16 text-slate-900 dark:text-white animate-bounce" />

        {/* ประกายไฟที่ชนวน (Absolute position) */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      </div>

      <p className="text-lg font-bold animate-pulse text-slate-500">
        กำลังเชื่อมต่อกับแมว...
      </p>
    </div>
  );
}
