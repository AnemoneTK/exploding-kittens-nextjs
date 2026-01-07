// src/app/room/[code]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Users, Crown, Copy, ArrowRight, Loader2, User } from "lucide-react";
import { toast } from "sonner";

// Type ของข้อมูลผู้เล่น
type Player = {
  id: string;
  name: string;
  is_host: boolean;
  is_alive: boolean;
};

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.code as string;

  // State
  const [nickname, setNickname] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomError, setRoomError] = useState("");

  // เช็คว่าห้องมีจริงไหมตอนเข้ามาครั้งแรก
  useEffect(() => {
    const checkRoom = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("code", roomCode)
        .single();

      if (error || !data) {
        setRoomError("ไม่พบห้องนี้ (หรือห้องอาจถูกลบไปแล้ว)");
      } else if (data.status === "playing") {
        setRoomError("เกมเริ่มไปแล้ว เข้าไม่ได้จ้า");
      }
    };
    checkRoom();
  }, [roomCode]);

  // --- Real-time Subscription (หัวใจสำคัญ) ---
  useEffect(() => {
    if (!isJoined) return;

    // 1. โหลดข้อมูลผู้เล่นล่าสุดมาก่อน
    const fetchPlayers = async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", roomCode)
        .single();
      if (!room) return;

      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true });

      if (data) setCurrentPlayers(data as Player[]);
    };

    fetchPlayers();

    // 2. เปิดหูฟัง (Subscribe) การเปลี่ยนแปลงในตาราง players
    const channel = supabase
      .channel("room-players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" }, // ฟังทุก event (insert, update, delete)
        (payload) => {
          console.log("Change received!", payload);
          fetchPlayers(); // ดึงข้อมูลใหม่ทันทีที่มีคนเข้า/ออก
        }
      )
      .subscribe();

    // Cleanup เมื่อออกจากหน้า
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isJoined, roomCode]);

  // ฟังก์ชันกดเข้าร่วม (Join)
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);

    try {
      // 1. หา room_id จาก code
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", roomCode)
        .single();

      if (roomError || !room) throw new Error("Room not found");

      // 2. เช็คว่ามีคนอยู่ในห้องกี่คน (เพื่อดูว่าเป็น Host ไหม)
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);

      const isFirstPlayer = count === 0;
      const playerId = crypto.randomUUID(); // สร้าง ID ให้ตัวเอง

      // 3. ยัดตัวเองเข้า Database
      const { error: joinError } = await supabase.from("players").insert({
        id: playerId,
        room_id: room.id,
        name: nickname,
        is_host: isFirstPlayer, // ถ้าเป็นคนแรก ให้เป็น Host
        is_alive: true,
      });

      if (joinError) throw joinError;

      // 🔥 เพิ่มตรงนี้ครับ: บันทึก ID ลงเครื่องไว้กันลืมเวลาเปลี่ยนหน้า
      localStorage.setItem("kitten_player_id", playerId);

      // 4. สำเร็จ! เปลี่ยน State
      setMyPlayerId(playerId);
      setIsJoined(true);
    } catch (error) {
      console.error(error);
      // ✨ ใช้ toast error แทน alert
      toast.error("เข้าห้องไม่ได้แฮะ", {
        description: "ลองเปลี่ยนชื่อ หรือรีเฟรชหน้าจอใหม่อีกทีนะ",
      });
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันก๊อปปี้ลิงก์
  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);

    // ✨ ใช้ toast แทน alert
    toast.success("ก๊อปปี้ลิงก์ห้องเรียบร้อย!", {
      description: "ส่งลิงก์นี้ให้เพื่อนกดเข้าห้องได้เลย",
      duration: 3000, // โชว์ 3 วิ
    });
  };

  // ฟังก์ชันเริ่มเกม (สำหรับ Host) - เดี๋ยวมาเขียน Logic จริงทีหลัง
  const handleStartGame = async () => {
    if (currentPlayers.length < 2) return;

    // ห้ามกดซ้ำ
    const btn = document.getElementById("start-btn") as HTMLButtonElement;
    if (btn) btn.disabled = true;

    try {
      // 1. หา room id (เรามีแต่ code ต้อง query หา id หรือจริงๆ เราควร fetch id มาเก็บใน state ตั้งแต่แรก)
      // เพื่อความชัวร์ query ใหม่อีกรอบ หรือใช้ข้อมูลจาก useEffect ก็ได้
      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", roomCode)
        .single();

      if (!room) throw new Error("Room not found");

      // 2. เรียก API เพื่อเริ่มเกม
      const res = await fetch("/api/start-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          playerIds: currentPlayers.map((p) => p.id), // ส่ง ID ผู้เล่นทุกคนไปเรียงลำดับ
        }),
      });

      if (!res.ok) throw new Error("Failed to start game");

      // ไม่ต้องทำอะไรต่อ! เพราะ Real-time subscription ข้างล่างจะทำงานเอง
    } catch (error) {
      console.error(error);
      // ✨ ใช้ toast error
      toast.error("เริ่มเกมไม่สำเร็จ", {
        description: "ลองกดใหม่อีกทีนะ",
      });
      if (btn) btn.disabled = false;
    }
  };

  useEffect(() => {
    // ฟังการเปลี่ยนแปลงในตาราง rooms
    const channel = supabase
      .channel("room-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === "playing") {
            // 🎉 เกมเริ่มแล้ว! เปลี่ยนหน้าไปหน้ากระดานเกม
            router.push(`/game/${roomCode}`); // เดี๋ยวเราไปสร้างหน้านี้กัน
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, router]);

  // --- UI Section ---

  if (roomError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            เข้าห้องไม่ได้!
          </h1>
          <p>{roomError}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // Case 1: ยังไม่ได้ Join (หน้ากรอกชื่อ)
  if (!isJoined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground transition-colors">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <h2 className="text-slate-500 dark:text-slate-400 text-lg uppercase tracking-wider font-bold">
              ROOM CODE
            </h2>
            <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-widest my-2">
              {roomCode}
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              ใส่ชื่อเท่ๆ ของคุณ แล้วเข้าไปลุยกันเลย
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="ชื่อเล่นของคุณ (เช่น เหมียวซ่า007)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="w-full p-4 pl-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 transition-all font-bold text-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors" />
            </div>

            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-xl font-bold text-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  เข้าห้อง <ArrowRight />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Case 2: เข้ามาแล้ว (Lobby รอเพื่อน)
  const isMeHost = currentPlayers.find((p) => p.id === myPlayerId)?.is_host;

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-background text-foreground flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase">
            Room Code
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-widest">{roomCode}</h1>
            <button
              onClick={copyLink}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Copy Link"
            >
              <Copy className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
            <Users className="w-5 h-5" />
            <span>{currentPlayers.length} / 5 Players</span>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
        {currentPlayers.map((player) => (
          <div
            key={player.id}
            className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all animate-in zoom-in duration-300 ${
              player.id === myPlayerId
                ? "bg-slate-50 dark:bg-slate-800 border-slate-900 dark:border-white shadow-md scale-105"
                : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80"
            }`}
          >
            {/* Host Icon */}
            {player.is_host && (
              <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-sm z-10">
                <Crown className="w-4 h-4 fill-current" />
              </div>
            )}

            {/* Avatar (Random color based on name length) */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 font-black text-white shadow-inner
              ${
                [
                  "bg-red-500",
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-purple-500",
                  "bg-orange-500",
                ][player.name.length % 5]
              }
            `}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>

            <p className="font-bold truncate w-full text-center">
              {player.name}
            </p>
            {player.id === myPlayerId && (
              <span className="text-xs text-slate-500 font-bold">(คุณ)</span>
            )}
          </div>
        ))}

        {/* Empty Slots (Show ghosts) */}
        {Array.from({ length: Math.max(0, 5 - currentPlayers.length) }).map(
          (_, i) => (
            <div
              key={`empty-${i}`}
              className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 mb-3 animate-pulse"></div>
              <p className="text-sm font-bold">รอเพื่อน...</p>
            </div>
          )
        )}
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-center">
        {isMeHost ? (
          <button
            onClick={handleStartGame}
            disabled={currentPlayers.length < 2} // ต้องมี 2 คนขึ้นไปถึงเริ่มได้
            className="w-full max-w-md bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-xl py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {currentPlayers.length < 2
              ? "รอเพื่อนอย่างน้อย 2 คน..."
              : "🚀 เริ่มเกมเลย!"}
          </button>
        ) : (
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 animate-pulse font-bold">
            <Loader2 className="animate-spin" />
            รอหัวห้องกดเริ่มเกม...
          </div>
        )}
      </div>
    </div>
  );
}
