// src/app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner"; // 1. import เข้ามา

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      {/* 2. วาง Component ไว้ตรงนี้ เลือกตำแหน่ง top-center จะเด่นสุด */}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
