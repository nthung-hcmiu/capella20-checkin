import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gieoDuLieu } from "@/lib/seedData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gieo du lieu mau sau khi deploy, khong can terminal.
// Bao ve bang SETUP_KEY: goi /api/setup?key=... (GET de kiem tra, POST de chay)
function kiemTraKhoa(req: NextRequest): boolean {
  const key = req.nextUrl.searchParams.get("key");
  const mong = process.env.SETUP_KEY;
  return !!mong && key === mong;
}

export async function GET(req: NextRequest) {
  if (!kiemTraKhoa(req)) {
    return NextResponse.json({ ok: false, thongBao: "Thieu hoac sai SETUP_KEY" }, { status: 401 });
  }
  // Them &seed=1 de gieo du lieu ngay tren trinh duyet (tien cho nguoi khong dung terminal)
  if (req.nextUrl.searchParams.get("seed") === "1") {
    try {
      const { tong, venue } = await gieoDuLieu(prisma);
      return NextResponse.json({ ok: true, thongBao: `Da gieo ${tong} khach, ${venue} venue.` });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, thongBao: "Gieo that bai: " + (e?.message || "loi khong ro") },
        { status: 500 }
      );
    }
  }
  const tong = await prisma.guest.count().catch(() => null);
  return NextResponse.json({
    ok: true,
    thongBao:
      tong === null
        ? "Chua ket noi duoc CSDL hoac chua tao bang. Kiem tra DATABASE_URL va buoc db push."
        : `CSDL dang co ${tong} khach. Them &seed=1 vao URL de gieo lai du lieu mau.`,
  });
}

export async function POST(req: NextRequest) {
  if (!kiemTraKhoa(req)) {
    return NextResponse.json({ ok: false, thongBao: "Thieu hoac sai SETUP_KEY" }, { status: 401 });
  }
  try {
    const { tong, venue } = await gieoDuLieu(prisma);
    return NextResponse.json({ ok: true, thongBao: `Da gieo ${tong} khach, ${venue} venue.` });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, thongBao: "Gieo that bai: " + (e?.message || "loi khong ro") },
      { status: 500 }
    );
  }
}
