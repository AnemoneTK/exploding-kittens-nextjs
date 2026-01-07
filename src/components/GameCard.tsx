"use client";

import {
  Zap,
  Shield,
  Skull,
  Eye,
  SkipForward,
  Repeat,
  XCircle,
  Cat,
} from "lucide-react";

// สีประจำการ์ดแต่ละประเภท
const CARD_STYLES = {
  bomb: {
    bg: "bg-slate-900",
    border: "border-red-500",
    text: "text-red-500",
    icon: Skull,
    label: "ระเบิด",
  },
  defuse: {
    bg: "bg-green-100 dark:bg-green-900",
    border: "border-green-500",
    text: "text-green-700 dark:text-green-400",
    icon: Shield,
    label: "กู้ระเบิด",
  },
  attack: {
    bg: "bg-yellow-100 dark:bg-yellow-900",
    border: "border-yellow-500",
    text: "text-yellow-700 dark:text-yellow-400",
    icon: Zap,
    label: "โจมตี",
  },
  skip: {
    bg: "bg-blue-100 dark:bg-blue-900",
    border: "border-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    icon: SkipForward,
    label: "ข้าม",
  },
  favor: {
    bg: "bg-pink-100 dark:bg-pink-900",
    border: "border-pink-500",
    text: "text-pink-700 dark:text-pink-400",
    icon: Cat,
    label: "ขอหน่อย",
  },
  shuffle: {
    bg: "bg-orange-100 dark:bg-orange-900",
    border: "border-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    icon: Repeat,
    label: "สับกอง",
  },
  see_future: {
    bg: "bg-purple-100 dark:bg-purple-900",
    border: "border-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    icon: Eye,
    label: "ดูอนาคต",
  },
  nope: {
    bg: "bg-red-100 dark:bg-red-900",
    border: "border-red-500",
    text: "text-red-700 dark:text-red-400",
    icon: XCircle,
    label: "ไม่!",
  },
  // แมวธรรมดาใช้ Style เดียวกันหมด
  cat_1: {
    bg: "bg-white dark:bg-slate-800",
    border: "border-slate-300",
    text: "text-slate-600 dark:text-slate-300",
    icon: Cat,
    label: "แมว 1",
  },
  cat_2: {
    bg: "bg-white dark:bg-slate-800",
    border: "border-slate-300",
    text: "text-slate-600 dark:text-slate-300",
    icon: Cat,
    label: "แมว 2",
  },
  cat_3: {
    bg: "bg-white dark:bg-slate-800",
    border: "border-slate-300",
    text: "text-slate-600 dark:text-slate-300",
    icon: Cat,
    label: "แมว 3",
  },
  cat_4: {
    bg: "bg-white dark:bg-slate-800",
    border: "border-slate-300",
    text: "text-slate-600 dark:text-slate-300",
    icon: Cat,
    label: "แมว 4",
  },
  cat_5: {
    bg: "bg-white dark:bg-slate-800",
    border: "border-slate-300",
    text: "text-slate-600 dark:text-slate-300",
    icon: Cat,
    label: "แมว 5",
  },
};

interface GameCardProps {
  type: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  small?: boolean; // ย่อส่วนเวลาแสดงใน History หรือกองทิ้ง
}

export default function GameCard({
  type,
  onClick,
  disabled,
  selected,
  small,
}: GameCardProps) {
  // ถ้า type ไม่รู้จัก ให้ใช้แบบแมวทั่วไป
  // @ts-ignore
  const style = CARD_STYLES[type] || CARD_STYLES["cat_1"];
  const Icon = style.icon;

  if (small) {
    return (
      <div
        className={`w-10 h-14 rounded flex items-center justify-center border ${style.bg} ${style.border} ${style.text}`}
        title={style.label}
      >
        <Icon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-24 h-36 sm:w-32 sm:h-48 rounded-xl border-2 flex flex-col items-center justify-between p-2 shadow-lg transition-all duration-200
        ${style.bg} ${style.border} ${style.text}
        ${
          disabled
            ? "opacity-50 cursor-not-allowed grayscale"
            : "hover:-translate-y-2 hover:shadow-xl cursor-pointer"
        }
        ${
          selected
            ? "ring-4 ring-offset-2 ring-blue-500 -translate-y-4 shadow-2xl z-10"
            : ""
        }
      `}
    >
      {/* Top Icon */}
      <div className="w-full flex justify-start">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
      </div>

      {/* Center Label */}
      <div className="text-center">
        <Icon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 opacity-100" />
        <span className="text-xs sm:text-sm font-bold uppercase tracking-tight leading-none block">
          {style.label}
        </span>
      </div>

      {/* Bottom Icon (Rotated) */}
      <div className="w-full flex justify-end">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 rotate-180" />
      </div>
    </button>
  );
}
