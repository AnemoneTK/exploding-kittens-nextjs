// src/components/RulesModal.tsx
"use client";

import {
  X,
  BookOpen,
  AlertCircle,
  PlayCircle,
  Zap,
  Eye,
  Hand,
} from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-950 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              วิธีเล่น
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8 bg-white dark:bg-slate-950">
          {/* Section 1: Goal */}
          <section className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-1">
                  เป้าหมายเดียวของเกม
                </h3>
                <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  ทำยังไงก็ได้ให้{" "}
                  <span className="font-bold underline decoration-red-500 decoration-2">
                    ไม่ระเบิดตาย
                  </span>{" "}
                  คนสุดท้ายที่เหลือรอดคือผู้ชนะ!
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: How to play */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
              <PlayCircle className="w-5 h-5 text-slate-400" />
              ในเทิร์นของคุณ
            </h3>
            <ul className="space-y-3 pl-2">
              <li className="flex gap-3 text-slate-700 dark:text-slate-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold shrink-0">
                  1
                </span>
                <span>ลงการ์ดกี่ใบก็ได้ เพื่อแกล้งเพื่อน หรือเอาตัวรอด</span>
              </li>
              <li className="flex gap-3 text-slate-700 dark:text-slate-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold shrink-0">
                  2
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  จบเทิร์นด้วยการจั่วการ์ด 1 ใบ
                </span>
              </li>
              <li className="flex gap-3 text-slate-700 dark:text-slate-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 text-xs font-bold shrink-0">
                  !
                </span>
                <span>
                  ถ้าจั่วได้{" "}
                  <span className="text-red-600 dark:text-red-400 font-bold">
                    "ระเบิดแมว"
                  </span>{" "}
                  คุณตายทันที! (ยกเว้นมีการ์ดกู้ระเบิด)
                </span>
              </li>
            </ul>
          </section>

          {/* Section 3: Cards */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
              <Zap className="w-5 h-5 text-slate-400" />
              การ์ดที่ควรรู้จัก
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Defuse */}
              <div className="p-4 rounded-xl border-2 border-green-100 dark:border-green-900/30 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-bold">Defuse (กู้ระเบิด)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  สำคัญที่สุด! ใช้แก้เมื่อจั่วเจอระเบิด
                  และนำระเบิดไปเสียบคืนตรงไหนก็ได้
                </p>
              </div>

              {/* Attack */}
              <div className="p-4 rounded-xl border-2 border-yellow-100 dark:border-yellow-900/30 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="font-bold">Attack (โจมตี)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ไม่ต้องจั่ว! และบังคับให้คนถัดไปเล่น 2 รอบ (สะสมได้)
                </p>
              </div>

              {/* Skip */}
              <div className="p-4 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-bold">Skip (ข้าม)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  จบรอบตัวเองทันทีโดยไม่ต้องจั่วการ์ด (รอดไปอีกตา)
                </p>
              </div>

              {/* See Future */}
              <div className="p-4 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="font-bold">See Future</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  แอบดูไพ่ 3 ใบแรกของกองจั่ว (ห้ามเปลี่ยนลำดับ)
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 dark:shadow-none hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
          >
            เข้าใจแล้ว ลุยเลย!
          </button>
        </div>
      </div>
    </div>
  );
}
