// Xac thuc: bam mat khau (scrypt), phien dang nhap (cookie token ngau nhien, CSDL luu ban bam), kiem tra quyen

import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

export const TEN_COOKIE = "c20_phien";
const THOI_HAN_MS = 7 * 24 * 3600 * 1000;

export interface NguoiDung {
  id: string;
  username: string;
  hoTen: string;
  vaiTro: string;
  ca: string | null;
  doiMatKhau: boolean;
}

export function bamMatKhau(matKhau: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(matKhau, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

// Chi chap nhan mat khau da bam; mat khau rong hoac dang cu deu khong dang nhap duoc
export function kiemMatKhau(matKhau: string, daLuu: string | null | undefined): boolean {
  if (!daLuu || !daLuu.startsWith("scrypt$")) return false;
  const [, salt, hash] = daLuu.split("$");
  if (!salt || !hash) return false;
  const thu = crypto.scryptSync(matKhau, salt, 64);
  const goc = Buffer.from(hash, "hex");
  return goc.length === thu.length && crypto.timingSafeEqual(goc, thu);
}

function bamToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function taoPhien(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const hetHan = new Date(Date.now() + THOI_HAN_MS);
  await prisma.phienDangNhap.create({ data: { tokenHash: bamToken(token), userId, hetHan } });
  // Don phien het han cua nguoi nay cho gon
  await prisma.phienDangNhap.deleteMany({ where: { userId, hetHan: { lt: new Date() } } });
  cookies().set(TEN_COOKIE, token, {
    httpOnly: true,
    secure: !!process.env.VERCEL,
    sameSite: "lax",
    path: "/",
    expires: hetHan,
  });
}

export async function xoaPhien() {
  const token = cookies().get(TEN_COOKIE)?.value;
  if (token) await prisma.phienDangNhap.deleteMany({ where: { tokenHash: bamToken(token) } });
  cookies().delete(TEN_COOKIE);
}

export const layNguoiDung = cache(async (): Promise<NguoiDung | null> => {
  const token = cookies().get(TEN_COOKIE)?.value;
  if (!token) return null;
  const phien = await prisma.phienDangNhap.findUnique({
    where: { tokenHash: bamToken(token) },
    include: { user: true },
  });
  if (!phien || phien.hetHan < new Date()) return null;
  const u = phien.user;
  return { id: u.id, username: u.username, hoTen: u.hoTen, vaiTro: u.vaiTro, ca: u.ca, doiMatKhau: u.doiMatKhau };
});

// Dung trong trang (server component): chua dang nhap hoac sai vai tro thi chuyen huong
export async function yeuCauTrang(vaiTro: string[], tiep: string): Promise<NguoiDung> {
  const u = await layNguoiDung();
  if (!u) redirect(`/dang-nhap?tiep=${encodeURIComponent(tiep)}`);
  if (u.doiMatKhau) redirect("/doi-mat-khau");
  if (!vaiTro.includes(u.vaiTro)) redirect("/?khongQuyen=1");
  return u;
}

// Dung trong server action va API: tra ve null neu khong du quyen
export async function yeuCauQuyen(vaiTro: string[]): Promise<NguoiDung | null> {
  const u = await layNguoiDung();
  if (!u || u.doiMatKhau || !vaiTro.includes(u.vaiTro)) return null;
  return u;
}

export class LoiQuyen extends Error {
  constructor() {
    super("Bạn không có quyền thực hiện thao tác này. Hãy đăng nhập lại.");
  }
}

export async function batBuocQuyen(vaiTro: string[]): Promise<NguoiDung> {
  const u = await yeuCauQuyen(vaiTro);
  if (!u) throw new LoiQuyen();
  return u;
}
