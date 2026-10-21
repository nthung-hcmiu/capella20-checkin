import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Chan doan nhanh khi deploy: co bien ket noi nao, noi duoc CSDL chua, da co bang chua.
// Chi tra ve co/khong va ten may chu, khong lo mat khau.
export async function GET() {
  const ten = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED"];
  const bien: Record<string, boolean> = {};
  for (const t of ten) bien[t] = !!process.env[t];
  const dangDung = ten.slice(0, 3).find((t) => process.env[t]) || null;

  let mayChu: string | null = null;
  if (dangDung) {
    try {
      const u = new URL(process.env[dangDung]!);
      mayChu = `${u.hostname}:${u.port || "5432"}`;
    } catch {
      mayChu = "chuoi ket noi khong dung dinh dang URL";
    }
  }

  let ketNoi = "chua thu";
  let soKhach: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    ketNoi = "ok";
    soKhach = await prisma.guest.count();
  } catch (e: any) {
    ketNoi = String(e?.message || e).split("\n").filter(Boolean).slice(-3).join(" | ").slice(0, 400);
  }

  const chanDoan = !dangDung
    ? "Chua co bien ket noi CSDL. Vao Storage gan Supabase vao project (hoac them DATABASE_URL) roi Redeploy."
    : ketNoi !== "ok" && soKhach === null && /does not exist|P2021/i.test(ketNoi)
    ? "Noi duoc CSDL nhung chua co bang. Redeploy de buoc build tao bang."
    : ketNoi !== "ok"
    ? "Co bien nhung khong noi duoc CSDL. Xem dong ketNoi."
    : soKhach === 0
    ? "CSDL trong. Redeploy de gieo du lieu mau."
    : "On dinh.";

  return NextResponse.json({
    chanDoan,
    bien,
    dangDung,
    mayChu,
    ketNoi,
    soKhach,
    vercelEnv: process.env.VERCEL_ENV || null,
    domainProduction: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
  });
}
