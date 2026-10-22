import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { yeuCauQuyen } from "@/lib/auth";
import { TRANG_THAI } from "@/lib/constants";

// Le tan chinh so nguoi thuc te den cua mot khach da check in (doi soat dang ky va thuc te)
export async function POST(req: NextRequest) {
  if (!(await yeuCauQuyen(["LE_TAN", "ADMIN"]))) {
    return NextResponse.json({ ok: false, thongBao: "Phiên đăng nhập đã hết, hãy đăng nhập lại" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const soNguoi = Math.min(20, Math.max(1, parseInt(String(body.soNguoi), 10) || 1));
  const { count } = await prisma.guest.updateMany({
    where: { id: String(body.id || ""), trangThai: TRANG_THAI.DA_CHECKIN },
    data: { soNguoiDen: soNguoi },
  });
  if (count === 0) return NextResponse.json({ ok: false, thongBao: "Khách chưa check in" }, { status: 409 });
  return NextResponse.json({ ok: true, soNguoi });
}
