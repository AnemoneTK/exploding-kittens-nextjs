// src/app/not-found.tsx
import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-6">
        <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
      </div>

      <h2 className="text-4xl font-black mb-2">404 - BOOM!</h2>
      <p className="text-xl text-slate-500 mb-8 max-w-md">
        ไม่พบห้องนี้ หรือห้องอาจจะระเบิดไปแล้ว... <br />
        ลองตรวจสอบรหัสห้องอีกทีนะ
      </p>

      <Link
        href="/"
        className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
      >
        <Home className="w-5 h-5" />
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
