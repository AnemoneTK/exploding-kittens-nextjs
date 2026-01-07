// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ฟังก์ชันรวม class (เผื่อใช้ในอนาคต)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ฟังก์ชันสุ่มรหัสห้อง 4 ตัวอักษร (A-Z)
export function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
