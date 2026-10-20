import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { docMaTuQR } from "@/lib/codes";
import { TRANG_THAI } from "@/lib/constants";

// Khach xac nhan tham du tu trang thiep cong khai.
// Xac thuc nhe: so thu tu + 4 so cuoi SDT (phuong an thiep A)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ma = docMaTuQR(String(body.ma || ""));
  const soThuTu = parseInt(String(body.soThuTu || ""), 10);
  const last4 = String(body.last4 || "").trim();
  const thamDu = !!body.thamDu;
  const soNguoiXacNhan = thamDu ? Math.max(1, parseInt(String(body.soNguoiXacNhan || "1"), 10)) : 0;

  if (!ma) return NextResponse.json({ ok: false, thongBao: "Thieu ma" }, { status: 400 });

  const guest = await prisma.guest.findUnique({ where: { maBiMat: ma }, include: { venue: true } });
  if (!guest) return NextResponse.json({ ok: false, thongBao: "Thiep khong hop le" }, { status: 404 });

  if (guest.trangThai === TRANG_THAI.DA_HUY) {
    return NextResponse.json({ ok: false, thongBao: "Thiep da bi huy" }, { status: 410 });
  }

  // Doi chieu so thu tu va 4 so cuoi SDT
  if (guest.soThuTu !== soThuTu || guest.sdt.slice(-4) !== last4) {
    return NextResponse.json(
      { ok: false, thongBao: "So thu tu hoac 4 so cuoi SDT chua khop. Vui long kiem tra lai." },
      { status: 403 }
    );
  }

  if (soNguoiXacNhan > guest.soNguoiMoi) {
    return NextResponse.json(
      { ok: false, thongBao: `Thiep nay moi toi da ${guest.soNguoiMoi} nguoi` },
      { status: 400 }
    );
  }

  const capNhat = await prisma.guest.update({
    where: { id: guest.id },
    data: {
      trangThai: thamDu ? TRANG_THAI.THAM_DU : TRANG_THAI.KHONG_THAM_DU,
      soNguoiXacNhan,
      xacNhanLuc: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    thongBao: thamDu ? "Cam on, da ghi nhan xac nhan tham du" : "Da ghi nhan phan hoi khong tham du",
    trangThai: capNhat.trangThai,
    soNguoiXacNhan: capNhat.soNguoiXacNhan,
  });
}
