import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { docMaTuQR } from "@/lib/codes";
import { TRANG_THAI, KET_QUA_CHECKIN } from "@/lib/constants";
import { yeuCauQuyen } from "@/lib/auth";

// Thuc hien check in. Moi ma chi check in mot lan.
export async function POST(req: NextRequest) {
  const u = await yeuCauQuyen(["LE_TAN", "ADMIN"]);
  if (!u) {
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Phiên đăng nhập đã hết, hãy đăng nhập lại" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const lan = String(body.lan || "Làn 1").slice(0, 40);
  const cach = body.cach === "QR" ? "QR" : "THU_CONG";
  const ghiLog = (guestId: string, lan: string, leTan: string, ketQua: string) =>
    prisma.checkinLog.create({ data: { guestId, lan, leTan, ketQua, cach } });
  const leTan = u.hoTen;

  // Xac dinh khach theo id hoac ma QR
  let guest = null as any;
  if (body.id) {
    guest = await prisma.guest.findUnique({ where: { id: body.id }, include: { venue: true } });
  } else if (body.ma) {
    const raw = String(body.ma).trim();
    // Le tan go so thu tu tren thiep (1 den 5 chu so), hoac quet / nhap ma QR
    if (/^\d{1,5}$/.test(raw)) {
      guest = await prisma.guest.findUnique({ where: { soThuTu: parseInt(raw, 10) }, include: { venue: true } });
    } else {
      const ma = docMaTuQR(raw);
      if (ma) guest = await prisma.guest.findUnique({ where: { maBiMat: ma }, include: { venue: true } });
    }
  }

  if (!guest) {
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Không tìm thấy số thứ tự hoặc mã này" }, { status: 404 });
  }

  if (guest.trangThai === TRANG_THAI.DA_HUY) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.KHONG_HOP_LE);
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Thiệp đã bị hủy, mã không còn hiệu lực", guest: gon(guest) });
  }

  // Da check in truoc do -> trung lap
  if (guest.trangThai === TRANG_THAI.DA_CHECKIN) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.TRUNG_LAP);
    return NextResponse.json({
      ok: false,
      ketQua: KET_QUA_CHECKIN.TRUNG_LAP,
      thongBao: "Mã này đã check in rồi",
      guest: gon(guest),
    });
  }

  // Sales xac nhan thay khach; canh bao le tan khi khach den ma chua duoc xac nhan
  const canhBao =
    guest.trangThai === TRANG_THAI.KHONG_THAM_DU
      ? `Sales ${guest.salesOwner} đã ghi nhận khách không tham dự`
      : [TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_MOI, TRANG_THAI.DA_PHAT_HANH].includes(guest.trangThai)
      ? `Khách chưa được xác nhận tham dự (sales ${guest.salesOwner})`
      : [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DANH_SACH_CHO].includes(guest.trangThai)
      ? "Thiệp của khách chưa được BTC phát hành. Báo BTC"
      : null;

  // Cap nhat co dieu kien: hai lan quet cung luc thi chi mot lan thanh cong
  const { count } = await prisma.guest.updateMany({
    where: { id: guest.id, trangThai: { notIn: [TRANG_THAI.DA_CHECKIN, TRANG_THAI.DA_HUY] } },
    data: { trangThai: TRANG_THAI.DA_CHECKIN, checkinLuc: new Date(), soNguoiDen: guest.soNguoiXacNhan || guest.soNguoiMoi },
  });
  const capNhat = await prisma.guest.findUnique({ where: { id: guest.id }, include: { venue: true } });
  if (count === 0) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.TRUNG_LAP);
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.TRUNG_LAP, thongBao: "Mã này đã check in rồi", guest: gon(capNhat) });
  }
  await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.THANH_CONG);

  return NextResponse.json({
    ok: true,
    ketQua: KET_QUA_CHECKIN.THANH_CONG,
    thongBao: "Check in thành công",
    canhBao,
    guest: gon(capNhat),
  });
}



function gon(g: any) {
  return {
    id: g.id,
    soThuTu: g.soThuTu,
    hoTen: g.hoTen,
    danhXung: g.danhXung,
    chucVu: g.chucVu,
    congTy: g.congTy,
    soNguoiDen: g.soNguoiDen,
    venue: g.venue?.ten,
    soNguoiMoi: g.soNguoiMoi,
    soNguoiXacNhan: g.soNguoiXacNhan,
    isVip: g.isVip,
    ban: g.ban,
    trangThai: g.trangThai,
    checkinLuc: g.checkinLuc,
  };
}
