"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Moon, Sun, Play, Users, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { generateRoomCode } from "@/lib/utils";
import RulesModal from "@/components/RulesModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // ป้องกัน Hydration Mismatch (รอให้ Client โหลดเสร็จก่อนค่อยแสดง UI ที่เกี่ยวกับ Theme)
  useEffect(() => {
    setMounted(true);
  }, []);

  // ฟังก์ชันสร้างห้อง
  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const roomCode = generateRoomCode();

      // 1. สร้างห้องใน Supabase
      const { error } = await supabase
        .from("rooms")
        .insert([
          {
            code: roomCode,
            status: "waiting",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. ถ้าสำเร็จ ให้พาไปหน้าห้องรอ (Lobby)
      router.push(`/room/${roomCode}`);
    } catch (error) {
      console.error("Error creating room:", error);
      // เปลี่ยน alert เป็น toast
      toast.error("สร้างห้องไม่สำเร็จ", {
        description: "ระบบหลังบ้านอาจจะมีปัญหา ลองใหม่อีกทีนะ",
      });
    }
  };

  // ถ้ายังโหลด Component ไม่เสร็จ ไม่ต้อง render (กันภาพกระพริบ)
  if (!mounted) return null;

  return (
    // ใช้ bg-background text-foreground เพื่อรับค่าจาก globals.css
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* --- Navbar --- */}
      <nav className="p-4 flex justify-end">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-transparent hover:border-border"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-6 h-6 text-yellow-400" />
          ) : (
            <Moon className="w-6 h-6 text-slate-600" />
          )}
        </button>
      </nav>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        {/* Logo Section */}
        <div className="mb-12 space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="text-8xl sm:text-9xl mb-4 filter drop-shadow-xl animate-bounce">
            💣
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent pb-2">
            KITTEN BOMB
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            เกมการ์ดระเบิดเหมียวฉบับเล่นบนเว็บ <br />
            หักหลังเพื่อน รอดชีวิต และระเบิดตู้ม!
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          {/* ปุ่มสร้างห้อง */}
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="group relative flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            {/* Shimmer Effect */}
            {!isLoading && (
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
            )}

            <div className="flex items-center justify-center gap-3 relative z-20">
              {isLoading ? (
                // Loading Spinner แบบง่ายๆ
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Play className="w-5 h-5" fill="currentColor" />
                  <span>สร้างห้องใหม่</span>
                </>
              )}
            </div>
          </button>

          {/* ปุ่มเข้าร่วม (ยังไม่มี Logic) */}
          <button
            onClick={() => setIsJoinOpen(true)} // 3. สั่งเปิด Modal ตรงนี้
            className="flex-1 bg-transparent border-2 border-slate-200 dark:border-slate-700 font-bold py-4 px-8 rounded-2xl shadow-sm hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-foreground"
          >
            <div className="flex items-center justify-center gap-3">
              <Users className="w-5 h-5" />
              <span>เข้าร่วมเกม</span>
            </div>
          </button>
        </div>

        {/* How to Play */}
        <button
          onClick={() => setIsRulesOpen(true)} // สั่งเปิด modal
          className="mt-8 text-slate-400 hover:text-foreground underline underline-offset-4 text-sm flex items-center gap-2 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          เล่นยังไง?
        </button>
      </main>

      {/* --- Footer --- */}
      <footer className="p-6 text-center text-slate-400 text-sm opacity-60">
        <p>© 2026 Kitten Bomb Web Project.</p>
      </footer>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <JoinRoomModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
    </div>
  );
}
