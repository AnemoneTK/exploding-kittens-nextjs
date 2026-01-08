"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import GameCard from "@/components/GameCard";
import DefuseModal from "@/components/DefuseModal";
import { User, Skull, Crown, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// --- Types ---
type Card = { id: string; type: string };

type Player = {
  id: string;
  name: string;
  is_alive: boolean;
  hand: Card[];
  joined_at: string;
};

type RoomState = {
  id: string;
  code: string;
  status: string;
  current_turn_player_id: string;
  deck: any[];
  discard_pile: Card[];
  game_state: {
    phase?: "playing" | "defusing" | "giving_favor" | "action_pending";
    defusing_player_id?: string;
    target_player_id?: string;
    request_player_id?: string;
    pending_action?: {
      card: Card;
      source_player_id: string;
      target_player_id?: string;
    };
    winner_id?: string;
    turns_left?: number;
    [key: string]: any;
  };
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.code as string;

  // --- States ---
  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [futureCards, setFutureCards] = useState<Card[] | null>(null);

  // 🔥 เปลี่ยน Logic: เก็บเป็น "ลำดับ (Index)" แทน ID เพื่อแก้ปัญหาการ์ดซ้ำ
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [targetMode, setTargetMode] = useState<"pair" | "favor" | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // เพิ่ม state สำหรับนับถอยหลัง
  const [countdown, setCountdown] = useState(3);

  // --- Init & Realtime ---
  useEffect(() => {
    const storedId = localStorage.getItem("kitten_player_id");
    if (!storedId) {
      toast.error("ไม่พบข้อมูลผู้เล่น");
      router.push("/");
      return;
    }
    setMyId(storedId);

    const fetchAll = async () => {
      const { data: r } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .single();
      if (r) {
        setRoom(r);
        const { data: p } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", r.id)
          .order("joined_at", { ascending: true });
        if (p) setPlayers(p);
        setLoading(false);
      }
    };
    fetchAll();

    const channel = supabase
      .channel("game_loop")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        (pl) => setRoom(pl.new as RoomState)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
        },
        async () => {
          const { data: r } = await supabase
            .from("rooms")
            .select("id")
            .eq("code", roomCode)
            .single();
          if (!r) return;
          const { data: p } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", r.id)
            .order("joined_at", { ascending: true });
          if (p) setPlayers(p);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, router]);

  useEffect(() => {
    // ฟังก์ชันยิง API บอกว่าออกแล้ว
    const handleLeave = () => {
      if (!myId || !room) return;

      // ใช้ sendBeacon หรือ fetch keepalive เพื่อให้ยิงออกแม้จะปิดจอไปแล้ว
      const payload = JSON.stringify({ roomId: room.id, playerId: myId });
      const blob = new Blob([payload], { type: "application/json" });

      // วิธี 1: sendBeacon (เหมาะสำหรับปิดแท็บ)
      navigator.sendBeacon("/api/game/leave", blob);
    };

    // 1. ดักจับกรณีปิดแท็บ / Refresh
    window.addEventListener("beforeunload", handleLeave);

    // 2. ดักจับกรณีเปลี่ยนหน้า (Unmount Component) ใน Next.js
    return () => {
      window.removeEventListener("beforeunload", handleLeave);
    };
  }, [myId, room?.id]); // dependency

  // --- Helpers ---
  const me = players.find((p) => p.id === myId);
  const opponents = players.filter((p) => p.id !== myId);

  // Helper สำหรับดึงการ์ดจริงจาก Index ที่เลือก
  const getSelectedCards = () => {
    if (!me) return [];
    return selectedIndices.map((index) => me.hand[index]).filter(Boolean);
  };
  const selectedCards = getSelectedCards(); // ใช้ตัวแปรนี้แทน state เดิม

  const currentPhase = room?.game_state?.phase || "playing";
  const isMyTurn = room?.current_turn_player_id === myId;
  const isDefusing =
    currentPhase === "defusing" && room?.game_state.defusing_player_id === myId;
  const isGivingFavor =
    currentPhase === "giving_favor" &&
    room?.game_state.target_player_id === myId;
  const isPending = currentPhase === "action_pending";
  const isGameFinished = room?.status === "finished";
  const pendingAction = room?.game_state?.pending_action;

  // --- Actions ---

  const handleDraw = async () => {
    if (!isMyTurn || currentPhase !== "playing") return;

    try {
      const res = await fetch("/api/game/draw", {
        method: "POST",
        body: JSON.stringify({ roomId: room?.id, playerId: myId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.action === "defuse_needed") toast.warning("เจอระเบิด! กู้ด่วน!");
      if (data.action === "exploded") toast.error("ตู้มมม! แตกพ่าย...");
    } catch (e) {
      toast.error("จั่วไม่ได้ (อาจจะไม่ใช่ตาคุณ)");
    }
  };

  const handleDefuse = async (index: number) => {
    await fetch("/api/game/defuse", {
      method: "POST",
      body: JSON.stringify({
        roomId: room?.id,
        playerId: myId,
        insertIndex: index,
      }),
    });
    toast.success("รอดตายหวุดหวิด!");
  };

  const handleNope = async (card: Card) => {
    try {
      const res = await fetch("/api/game/nope", {
        method: "POST",
        body: JSON.stringify({ roomId: room?.id, playerId: myId, card }),
      });
      if (!res.ok) throw new Error();
      toast.success("NOPE! ปัดตกไปซะ");
      setSelectedIndices([]); // Clear
    } catch (e) {
      toast.error("ใช้ Nope ไม่ได้ในจังหวะนี้");
    }
  };

  const handleResolve = async () => {
    try {
      const res = await fetch("/api/game/resolve", {
        method: "POST",
        body: JSON.stringify({ roomId: room?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.see_future_cards) setFutureCards(data.see_future_cards);
      toast.success("Action สำเร็จ!");
    } catch (e) {
      toast.error("ยืนยันไม่สำเร็จ");
    }
  };

  // --- Logic การกดเลือกการ์ด (Index Based) ---
  const handleCardClick = (card: Card, index: number) => {
    if (isProcessing) return;
    if (isPending && pendingAction) {
      if (card.type === "nope") {
        if (pendingAction.source_player_id === myId) {
          return; // นิ่งใส่เลย
        }

        handleNope(card);
      } else {
      }
      return;
    }

    if (isGivingFavor) {
      // สำหรับส่งของ ใช้ index ตรงๆ ได้เลย แม่นยำกว่า
      if (card.type === "nope") handleNope(card);
      else handleGiveFavor(card, index);
      return;
    }

    // B. กรณีเล่นปกติ
    if (!isMyTurn || currentPhase !== "playing") return;

    // Logic Deselect (กดซ้ำเพื่อออก)
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
      return;
    }

    if (card.type === "nope") {
      toast.info("Nope ใช้ตอนเพื่อนเล่นใส่เรา");
      return;
    }

    // Logic เลือกเพิ่ม
    if (selectedIndices.length === 0) {
      setSelectedIndices([index]);
      return;
    }

    // เช็คชนิดการ์ด (เทียบกับใบแรกที่เลือกไว้)
    const firstIndex = selectedIndices[0];
    const firstCard = me?.hand[firstIndex];

    if (firstCard && firstCard.type === card.type) {
      // ✅ ชนิดเดียวกัน -> ยอมให้เลือกเพิ่ม
      setSelectedIndices([...selectedIndices, index]);
    } else {
      toast.warning("ต้องเลือกการ์ดชนิดเดียวกันเท่านั้น!");
    }
  };

  const handlePlaySingleCard = async () => {
    const card = selectedCards[0];
    if (!card) return;

    if (card.type === "defuse") return;

    if (card.type === "favor") {
      setTargetMode("favor");
      toast.info("เลือกเพื่อนที่จะขอการ์ดเลย");
      return;
    }

    try {
      const res = await fetch("/api/game/play", {
        method: "POST",
        body: JSON.stringify({
          roomId: room?.id,
          playerId: myId,
          card,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIndices([]);
    } catch (e) {
      toast.error("เล่นการ์ดไม่ได้");
    }
  };

  const handlePlayPair = async (targetId: string) => {
    if (selectedCards.length !== 2) {
      toast.error("ต้องใช้การ์ด 2 ใบ");
      return;
    }

    try {
      const res = await fetch("/api/game/play-pair", {
        method: "POST",
        body: JSON.stringify({
          roomId: room?.id,
          playerId: myId,
          cardType: selectedCards[0].type,
          targetPlayerId: targetId,
        }),
      });
      const data = await res.json();
      if (data.stolenCard) toast.success(`ขโมยได้ ${data.stolenCard.type}!`);

      setSelectedIndices([]);
      setTargetMode(null);
    } catch (e) {
      toast.error("ขโมยพลาด");
    }
  };

  const handleTriggerFavor = async (targetId: string) => {
    const favorCard = selectedCards[0];
    await fetch("/api/game/play", {
      method: "POST",
      body: JSON.stringify({
        roomId: room?.id,
        playerId: myId,
        card: favorCard,
        targetPlayerId: targetId,
      }),
    });
    setSelectedIndices([]);
    setTargetMode(null);
  };

  // แก้ให้รับ index โดยตรง เพื่อความแม่นยำ
  const handleGiveFavor = async (card: Card, index: number) => {
    // ถ้ากำลังโหลดอยู่ ห้ามทำซ้ำ
    if (isProcessing) return;

    setIsProcessing(true); // 🔒 ล็อกทันที
    try {
      await fetch("/api/game/give", {
        method: "POST",
        body: JSON.stringify({
          roomId: room?.id,
          giverId: myId,
          cardIndex: index,
        }),
      });
      toast.success("ส่งให้แล้ว (จำใจสุดๆ)");
    } catch (error) {
      toast.error("ส่งของไม่สำเร็จ");
      setIsProcessing(false); // 🔓 ปลดล็อกถ้าพัง
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPending && pendingAction) {
      // 1. รีเซ็ตเวลาเริ่มต้นทุกครั้งที่มี Action ใหม่
      setCountdown(3);

      // 2. เริ่มนับถอยหลัง
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // หมดเวลา! (นับถึง 0)
            clearInterval(timer);

            // สั่งทำงานอัตโนมัติ (เฉพาะเจ้าของ Action เท่านั้นที่เป็นคนยิง API)
            // เพื่อป้องกัน API ชนกันหลายคน
            if (pendingAction.source_player_id === myId) {
              handleResolve();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup: ถ้ามีคน Nope หรือสถานะเปลี่ยน ให้หยุดเวลาทันที
    return () => clearInterval(timer);
  }, [isPending, pendingAction, myId]);

  // --- Render ---

  if (loading || !room || !me)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );

  if (isGameFinished) {
    const winner = players.find((p) => p.id === room.game_state.winner_id);
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-6 animate-in zoom-in">
        <Crown className="w-24 h-24 text-yellow-400 animate-bounce" />
        <h1 className="text-5xl font-black text-center">GAME OVER!</h1>
        <div className="text-2xl">
          ผู้ชนะคือ{" "}
          <span className="text-yellow-400 font-bold text-4xl block mt-2">
            {winner?.name}
          </span>
        </div>
        <button
          onClick={() => router.push("/")}
          className="bg-white text-black px-6 py-3 rounded-xl font-bold mt-8"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const topDiscard = Array.isArray(room.discard_pile)
    ? room.discard_pile.slice(-1)[0]
    : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden relative">
      {/* 1. Opponents */}
      <div className="flex justify-center gap-4 p-4 overflow-x-auto bg-white/50 dark:bg-black/20 backdrop-blur-sm z-10 min-h-[130px]">
        {opponents.map((p) => (
          <div
            key={p.id}
            onClick={() => {
              if (targetMode === "pair") handlePlayPair(p.id);
              if (targetMode === "favor") handleTriggerFavor(p.id);
            }}
            className={`
               flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[100px] relative
               ${
                 room.current_turn_player_id === p.id
                   ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 scale-105"
                   : "border-transparent opacity-80"
               }
               ${
                 targetMode && p.is_alive
                   ? "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 border-red-400 animate-pulse"
                   : ""
               }
               ${!p.is_alive ? "grayscale opacity-50" : ""}
             `}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-2 ${
                p.is_alive ? "bg-slate-500" : "bg-red-900"
              }`}
            >
              {p.is_alive ? <User size={20} /> : <Skull size={20} />}
            </div>
            <span className="font-bold text-sm truncate max-w-[80px] text-slate-900 dark:text-white">
              {p.name}
            </span>
            <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 rounded-full mt-1">
              {p.hand.length} ใบ
            </span>

            {targetMode && p.is_alive && (
              <div className="absolute -top-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                เลือก
              </div>
            )}
            {room.game_state.target_player_id === p.id && (
              <div className="absolute -bottom-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-bounce z-20">
                โดนเพ่งเล็ง
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. Board */}
      <div className="flex-1 flex items-center justify-center gap-8 sm:gap-16 relative">
        {targetMode && (
          <div
            className="absolute top-0 bg-black/70 text-white px-4 py-2 rounded-full z-20 cursor-pointer"
            onClick={() => {
              setTargetMode(null);
              setSelectedIndices([]); // Clear indices
            }}
          >
            ยกเลิกการเลือก
          </div>
        )}

        {/* Draw Pile */}
        <div
          onClick={handleDraw}
          className={`relative group transition-transform ${
            isMyTurn && currentPhase === "playing"
              ? "cursor-pointer hover:scale-105"
              : "opacity-80"
          }`}
        >
          <div className="w-32 h-48 bg-slate-800 rounded-xl absolute top-2 left-2" />
          <div className="w-32 h-48 bg-slate-900 border-4 border-slate-600 rounded-xl flex items-center justify-center relative shadow-2xl">
            <span className="text-4xl font-black text-slate-700">?</span>
            <span className="absolute -bottom-8 font-bold text-slate-500 text-sm w-full text-center">
              เหลือ {Array.isArray(room.deck) ? room.deck.length : 0}
            </span>
          </div>
        </div>

        <div className="w-32 h-48 border-4 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
          {topDiscard && <GameCard type={topDiscard.type} disabled />}
        </div>
      </div>

      {/* 3. My Hand */}
      <div
        className={`relative pb-4 pt-12 px-4 flex justify-center 
        ${isMyTurn ? "bg-yellow-500/5" : ""} 
        ${isGivingFavor ? "bg-blue-500/10" : ""}
        ${isPending ? "bg-black/10" : ""}
        `}
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap flex flex-col items-center gap-2">
          {isMyTurn &&
            currentPhase === "playing" &&
            (room.game_state.turns_left || 1) > 1 && (
              <div className="px-4 py-1 bg-orange-600 text-white font-bold rounded-full text-sm animate-bounce shadow-lg border border-white">
                ⚔️ โดนโจมตี! (จั่วอีก {room.game_state.turns_left} ครั้ง)
              </div>
            )}

          {isMyTurn && currentPhase === "playing" && (
            <div className="px-6 py-2 bg-yellow-500 text-black font-black rounded-full shadow-lg animate-pulse">
              ⚡ ตาของคุณ!
            </div>
          )}
          {isDefusing && (
            <div className="px-6 py-2 bg-red-600 text-white font-black rounded-full shadow-lg animate-bounce">
              💣 กู้ระเบิดด่วน!
            </div>
          )}
          {isGivingFavor && (
            <div className="px-6 py-2 bg-blue-600 text-white font-black rounded-full shadow-lg animate-pulse">
              😰 เลือกการ์ดส่งให้เพื่อน
            </div>
          )}
          {isPending && (
            <div className="px-6 py-2 bg-purple-600 text-white font-bold rounded-full shadow-lg">
              ⏳ รอ Action...
            </div>
          )}
          {!isMyTurn && !isGivingFavor && !isPending && me.is_alive && (
            <div className="px-4 py-1 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-full text-sm">
              รอเพื่อนเล่น...
            </div>
          )}
          {!me.is_alive && (
            <div className="px-6 py-2 bg-black text-red-500 font-black rounded-full border border-red-500">
              💀 GAME OVER
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute -top-20 right-10 flex gap-2 z-30">
          {selectedCards.length === 1 &&
            !selectedCards[0].type.startsWith("cat_") &&
            selectedCards[0].type !== "defuse" &&
            selectedCards[0].type !== "nope" &&
            currentPhase === "playing" && (
              <button
                onClick={handlePlaySingleCard}
                className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-black shadow-lg hover:scale-105 transition-transform animate-in zoom-in"
              >
                ใช้การ์ด {selectedCards[0].type} 🚀
              </button>
            )}

          {selectedCards.length === 2 &&
            selectedCards[0].type === selectedCards[1].type &&
            !targetMode &&
            currentPhase === "playing" && (
              <button
                onClick={() => {
                  setTargetMode("pair");
                  toast.info("เลือกเหยื่อที่จะขโมยเลย!");
                }}
                className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform animate-in zoom-in"
              >
                ใช้คู่ {selectedCards[0].type} ขโมยของ! 🕵️
              </button>
            )}
        </div>

        {/* Hand Cards */}
        <div
          className={`flex gap-[-40px] overflow-x-visible items-end justify-center py-4 px-8 min-h-[200px] ${
            isPending ? "z-50" : ""
          }`}
          style={{ perspective: "1000px" }}
        >
          {me.hand.map((card, i) => {
            // 🔥 เช็คจาก Index แทน ID
            const isSel = selectedIndices.includes(i);
            // หาลำดับการเลือก (1 หรือ 2)
            const selOrder = selectedIndices.indexOf(i) + 1;

            return (
              <div
                key={`${card.id}-${i}`}
                onClick={() => handleCardClick(card, i)}
                className={`
                    transition-all duration-300 cursor-pointer relative
                    ${
                      isSel
                        ? "-translate-y-16 z-50 scale-110"
                        : "-ml-6 hover:-translate-y-8 hover:z-40 hover:scale-105"
                    }
                `}
                style={{
                  zIndex: isSel ? 100 : i,
                  transform: isSel
                    ? "translateY(-60px) scale(1.1)"
                    : `rotate(${
                        (i - (me.hand.length - 1) / 2) * 5
                      }deg) translateY(${
                        Math.abs(i - (me.hand.length - 1) / 2) * 5
                      }px)`,
                }}
              >
                <div
                  className={`rounded-xl ${
                    isSel
                      ? "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                      : ""
                  }`}
                >
                  <GameCard type={card.type} selected={!!isSel} />
                </div>

                {isSel && (
                  <div className="absolute -top-4 right-0 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md border border-white animate-bounce">
                    {selOrder}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {room.game_state.phase === "defusing" &&
        room.game_state.defusing_player_id !== myId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
            <div className="bg-red-900/50 p-8 rounded-3xl border-2 border-red-500 text-center max-w-md w-full animate-pulse">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-3xl font-black text-red-400 mb-2">
                ระเบิดลง!
              </h2>
              <p className="text-white text-xl">
                <span className="font-bold text-yellow-400">
                  {
                    players.find(
                      (p) => p.id === room.game_state.defusing_player_id
                    )?.name
                  }
                </span>
                <br />
                กำลังกู้ระเบิดอย่างเคร่งเครียด...
              </p>
              <div className="mt-6 text-sm text-slate-400">
                (ภาวนาให้มันเอาไปใส่ไว้ไกลๆ เถอะ)
              </div>
            </div>
          </div>
        )}

      {/* --- Modals --- */}
      <DefuseModal
        isOpen={isDefusing}
        deckCount={Array.isArray(room.deck) ? room.deck.length : 0}
        onSubmit={handleDefuse}
      />

      {isPending && pendingAction && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
          <div className="bg-slate-900 p-8 rounded-3xl border-2 border-yellow-400 text-center max-w-md w-full relative overflow-hidden">
            {/* 🔥 แถบเวลาวิ่งด้านบน (Progress Bar) */}
            <div
              className="absolute top-0 left-0 h-2 bg-yellow-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />

            <h2 className="text-2xl font-bold text-white mb-4 mt-2">
              {pendingAction.source_player_id === myId ? "คุณ" : "เพื่อน"}{" "}
              กำลังจะใช้...
            </h2>

            <div className="flex justify-center my-12 scale-125 transition-transform">
              {/* ใส่ Animation สั่นๆ ตอนใกล้หมดเวลา */}
              <div className={countdown <= 1 ? "animate-bounce" : ""}>
                <GameCard type={pendingAction.card.type} />
              </div>
            </div>

            <div className="text-red-400 animate-pulse font-bold mb-6 flex flex-col gap-2 relative z-10">
              <AlertCircle className="mx-auto w-8 h-8" />
              <span className="text-lg">
                เหลือเวลา{" "}
                <span className="text-3xl text-yellow-400">{countdown}</span>{" "}
                วินาที!
              </span>
              <span className="text-sm text-slate-500 font-normal">
                (ใครมี NOPE รีบกดด่วน!)
              </span>
            </div>

            {/* 🔥 เอาปุ่มกดยืนยันออก! เปลี่ยนเป็นสถานะบอกเฉยๆ */}
            <div className="w-full bg-slate-800 text-slate-300 font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2">
              {countdown > 0 ? (
                <>⏳ กำลังทำงานอัตโนมัติ...</>
              ) : (
                <>🚀 กำลังประมวลผล...</>
              )}
            </div>
          </div>
        </div>
      )}

      {futureCards && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setFutureCards(null)}
        >
          <div className="bg-slate-900 p-6 rounded-2xl border border-purple-500 text-center animate-in zoom-in">
            <h3 className="text-purple-400 font-bold text-xl mb-4 flex items-center justify-center gap-2">
              <Eye /> อนาคต
            </h3>
            <div className="flex gap-2">
              {futureCards.map((c, i) => (
                <div key={i} className="relative">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-1.5 rounded-full font-bold">
                    {i + 1}
                  </span>
                  <GameCard type={c.type} small />
                </div>
              ))}
            </div>
            <p className="text-slate-500 mt-4 text-sm">(แตะเพื่อปิด)</p>
          </div>
        </div>
      )}
    </div>
  );
}
