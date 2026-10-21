import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chuoiKetNoi, tenBienDangDung } from "@/lib/dbUrl";

export const dynamic = "force-dynamic";

// Chan doan nhanh khi deploy: co bien ket noi nao, noi duoc CSDL chua, da co bang chua.
// Chi tra ve co/khong va ten may chu, khong lo mat khau.
export async function GET() {
  const ten = ["POSTGRES_PRISMA_URL", "DATABASE_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED"];
  const bien: Record<string, boolean> = {};
  for (const t of ten) bien[t] = !!process.env[t];
  const dangDung = tenBienDangDung();

  let mayChu: string | null = null;
  if (dangDung) {
    try {
      const u = new URL(chuoiKetNoi()!);
      mayChu = `${u.hostname}:${u.port || "5432"}`;
    } catch {
      mayChu = "chuỗi kết nối sai định dạng";
    }
  }

  let ketNoi = "chưa thử";
  let soKhach: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    ketNoi = "ok";
    soKhach = await prisma.guest.count();
  } catch (e: any) {
    ketNoi = String(e?.message || e).split("\n").filter(Boolean).slice(-3).join(" | ").slice(0, 400);
  }

  const chanDoan = !dangDung
    ? "Chưa có biến kết nối CSDL. Vào Storage gắn Neon hoặc Supabase vào project (hoặc thêm DATABASE_URL) rồi Redeploy."
    : ketNoi !== "ok" && soKhach === null && /does not exist|P2021/i.test(ketNoi)
    ? "Nối được CSDL nhưng chưa có bảng. Redeploy để bước build tạo bảng."
    : ketNoi !== "ok"
    ? "Có biến nhưng không nối được CSDL. Xem dòng ketNoi."
    : soKhach === 0
    ? "CSDL trống. Vào trang Dữ liệu để nạp mẫu, hoặc nhập danh sách."
    : "Ổn định.";

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
