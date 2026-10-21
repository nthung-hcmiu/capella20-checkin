// Cai dat he thong luu trong CSDL va ma khoi tao tai khoan BTC dau tien

import type { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function docCaiDat(prisma: PrismaClient, khoa: string): Promise<string | null> {
  const r = await prisma.caiDat.findUnique({ where: { khoa } });
  return r?.giaTri ?? null;
}

export async function ghiCaiDat(prisma: PrismaClient, khoa: string, giaTri: string) {
  await prisma.caiDat.upsert({ where: { khoa }, create: { khoa, giaTri }, update: { giaTri } });
}

// Da co it nhat mot tai khoan BTC dang nhap duoc chua
export async function coTaiKhoanBTC(prisma: PrismaClient): Promise<boolean> {
  const n = await prisma.staffUser.count({ where: { vaiTro: "ADMIN", matKhau: { startsWith: "scrypt$" } } });
  return n > 0;
}

// Khi chua co BTC: tao (hoac giu) ma khoi tao. Ma chi in ra Build Logs, khong nam trong code.
export async function damBaoMaKhoiTao(prisma: PrismaClient): Promise<string | null> {
  if (await coTaiKhoanBTC(prisma)) {
    await prisma.caiDat.deleteMany({ where: { khoa: "maKhoiTao" } });
    return null;
  }
  const daCo = await docCaiDat(prisma, "maKhoiTao");
  if (daCo) return daCo;
  let ma = "";
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) ma += BANG_MA[bytes[i] % BANG_MA.length];
  await ghiCaiDat(prisma, "maKhoiTao", ma);
  return ma;
}
