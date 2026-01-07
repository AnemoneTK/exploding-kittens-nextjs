// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      <h2 className="text-3xl font-bold mb-4">อุ๊ย! แมวกัดสายไฟขาด</h2>
      <p className="text-slate-500 mb-8">
        เกิดข้อผิดพลาดบางอย่าง (Error: {error.digest || "Unknown"})
      </p>

      <button
        onClick={() => reset()}
        className="flex items-center gap-2 border-2 border-slate-300 dark:border-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <RefreshCcw className="w-5 h-5" />
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
