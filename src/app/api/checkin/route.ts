import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { docMaTuQR } from "@/lib/codes";
import { TRANG_THAI, KET_QUA_CHECKIN } from "@/lib/constants";

// Thuc hien check in. Moi ma chi check in mot lan.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const lan = body.lan || "Lan 1";
  const leTan = body.leTan || "Le tan";

  // Xac dinh khach theo id hoac ma QR
  let guest = null as any;
  if (body.id) {
    guest = await prisma.guest.findUnique({ where: { id: body.id }, include: { venue: true } });
  } else if (body.ma) {
    const ma = docMaTuQR(String(body.ma));
    if (ma) guest = await prisma.guest.findUnique({ where: { maBiMat: ma }, include: { venue: true } });
  }

  if (!guest) {
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Khong tim thay ma" }, { status: 404 });
  }

  if (guest.trangThai === TRANG_THAI.DA_HUY) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.KHONG_HOP_LE);
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Ma da bi huy, vo hieu", guest: gon(guest) });
  }

  // Da check in truoc do -> trung lap
  if (guest.trangThai === TRANG_THAI.DA_CHECKIN) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.TRUNG_LAP);
    return NextResponse.json({
      ok: false,
      ketQua: KET_QUA_CHECKIN.TRUNG_LAP,
      thongBao: "Ma nay da check in roi",
      guest: gon(guest),
    });
  }

  const canhBao =
    guest.trangThai === TRANG_THAI.KHONG_THAM_DU
      ? "Khach truoc do bao khong tham du"
      : guest.trangThai === TRANG_THAI.CHUA_PHAN_HOI
      ? "Khach chua phan hoi xac nhan"
      : null;

  const capNhat = await prisma.guest.update({
    where: { id: guest.id },
    data: { trangThai: TRANG_THAI.DA_CHECKIN, checkinLuc: new Date() },
    include: { venue: true },
  });
  await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.THANH_CONG);

  return NextResponse.json({
    ok: true,
    ketQua: KET_QUA_CHECKIN.THANH_CONG,
    thongBao: "Check in thanh cong",
    canhBao,
    guest: gon(capNhat),
  });
}

async function ghiLog(guestId: string, lan: string, leTan: string, ketQua: string) {
  await prisma.checkinLog.create({ data: { guestId, lan, leTan, ketQua } });
}

function gon(g: any) {
  return {
    id: g.id,
    soThuTu: g.soThuTu,
    hoTen: g.hoTen,
    venue: g.venue?.ten,
    soNguoiMoi: g.soNguoiMoi,
    soNguoiXacNhan: g.soNguoiXacNhan,
    isVip: g.isVip,
    ban: g.ban,
    trangThai: g.trangThai,
    checkinLuc: g.checkinLuc,
  };
}
