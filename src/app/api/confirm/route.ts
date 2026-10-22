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

  if (!ma) return NextResponse.json({ ok: false, thongBao: "Thiếu mã thiệp" }, { status: 400 });

  const guest = await prisma.guest.findUnique({ where: { maBiMat: ma }, include: { venue: true } });
  if (!guest) return NextResponse.json({ ok: false, thongBao: "Thiệp không hợp lệ" }, { status: 404 });

  if (guest.trangThai === TRANG_THAI.DA_CHECKIN) {
    return NextResponse.json({ ok: false, thongBao: "Quý khách đã check in tại sự kiện" }, { status: 409 });
  }

  if (guest.trangThai === TRANG_THAI.DA_HUY) {
    return NextResponse.json({ ok: false, thongBao: "Thiệp đã bị hủy" }, { status: 410 });
  }

  // Doi chieu so thu tu va 4 so cuoi SDT
  // Khach co SDT: doi chieu them 4 so cuoi. Khong co SDT: duong link rieng va so thu tu la du.
  if (guest.soThuTu !== soThuTu || (guest.sdt && guest.sdt.slice(-4) !== last4)) {
    return NextResponse.json(
      { ok: false, thongBao: guest.sdt ? "Số thứ tự hoặc 4 số cuối điện thoại chưa khớp. Quý khách vui lòng kiểm tra lại." : "Số thứ tự chưa khớp với thiệp. Quý khách vui lòng kiểm tra lại." },
      { status: 403 }
    );
  }

  if (soNguoiXacNhan > guest.soNguoiMoi) {
    return NextResponse.json(
      { ok: false, thongBao: `Thiệp này mời tối đa ${guest.soNguoiMoi} người` },
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
    thongBao: thamDu ? "Cảm ơn quý khách, Capella đã ghi nhận xác nhận tham dự" : "Capella đã ghi nhận phản hồi của quý khách",
    trangThai: capNhat.trangThai,
    soNguoiXacNhan: capNhat.soNguoiXacNhan,
  });
}
