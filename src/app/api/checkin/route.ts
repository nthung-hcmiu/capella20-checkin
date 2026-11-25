import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { docMaTuQR, docNguoiTuQR } from "@/lib/codes";
import { TRANG_THAI, KET_QUA_CHECKIN, DUOC_CHECKIN } from "@/lib/constants";
import { yeuCauQuyen } from "@/lib/auth";
import { khachDiKemThu, moTaDiCung } from "@/lib/khach";

// Thuc hien check in. Moi ma chi check in mot lan.
// Ma chung cua ve (khach chinh, thiep giay, go so thu tu): check in ca ve, mac dinh du so nguoi.
// Ma rieng cua khach di kem (?k=2): ghi nhan dung nguoi do, den truoc hay sau khach chinh deu duoc.
export async function POST(req: NextRequest) {
  const u = await yeuCauQuyen(DUOC_CHECKIN);
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
  let kQuet: number | null = null;
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
      kQuet = docNguoiTuQR(raw);
    }
  }

  if (!guest) {
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Không tìm thấy số thứ tự hoặc mã này" }, { status: 404 });
  }

  if (guest.trangThai === TRANG_THAI.DA_HUY) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.KHONG_HOP_LE);
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.KHONG_HOP_LE, thongBao: "Thiệp đã bị hủy, mã không còn hiệu lực", guest: gon(guest) });
  }

  // Nguoi dang quet: khach di kem co ma rieng, hoac khach chinh / ca ve
  const diKem = khachDiKemThu(guest, kQuet);
  const nguoiQuet = diKem ? { ten: [diKem.danhXung, diKem.hoTen].filter(Boolean).join(" "), chucVu: diKem.chucVu } : null;
  const chiSo = diKem ? String(kQuet) : "1";
  const daDen: string[] = (guest.nguoiDaDen || "").split(",").filter(Boolean);

  // Ve da check in truoc do
  if (guest.trangThai === TRANG_THAI.DA_CHECKIN) {
    // Nguoi nay chua duoc ghi nhan: khach di kem den sau, hoac khach chinh den sau khach di kem.
    // Ve check in kieu cu (chua ghi tung nguoi) thi ma chung coi nhu da dung roi.
    const chuaGhi = !daDen.includes(chiSo) && (diKem || daDen.length > 0);
    if (chuaGhi) {
      const { count } = await prisma.guest.updateMany({
        where: { id: guest.id, trangThai: TRANG_THAI.DA_CHECKIN, nguoiDaDen: guest.nguoiDaDen },
        // Ve check in kieu cu chua ghi tung nguoi: ma chung da duoc dung, tinh nhu khach chinh da den
        data: {
          nguoiDaDen: [...(daDen.length ? daDen : ["1"]), chiSo].sort().join(","),
          soNguoiDen: Math.max(guest.soNguoiDen || 0, daDen.length + 1),
        },
      });
      if (count > 0) {
        await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.THANH_CONG);
        const capNhat = await prisma.guest.findUnique({ where: { id: guest.id }, include: { venue: true } });
        return NextResponse.json({
          ok: true,
          ketQua: KET_QUA_CHECKIN.THANH_CONG,
          thongBao: "Check in thành công",
          canhBao: "Đoàn này đã có người check in trước đó",
          guest: gon(capNhat),
          nguoiQuet,
        });
      }
    }
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.TRUNG_LAP);
    return NextResponse.json({
      ok: false,
      ketQua: KET_QUA_CHECKIN.TRUNG_LAP,
      thongBao: diKem ? "Khách đi kèm này đã check in rồi" : "Mã này đã check in rồi",
      guest: gon(guest),
      nguoiQuet,
    });
  }

  // Sales xac nhan thay khach; canh bao le tan khi khach den ma chua duoc xac nhan
  const canhBaoTrangThai =
    guest.trangThai === TRANG_THAI.KHONG_THAM_DU
      ? `Sales ${guest.salesOwner} đã ghi nhận khách không tham dự`
      : [TRANG_THAI.DA_MOI, TRANG_THAI.DA_PHAT_HANH].includes(guest.trangThai as any)
      ? `Khách chưa được xác nhận tham dự (sales ${guest.salesOwner})`
      : [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET].includes(guest.trangThai as any)
      ? "Thiệp của khách chưa được BTC phát hành. Báo BTC"
      : null;
  // Ma rieng cua khach di kem chi ghi nhan 1 nguoi: nhac le tan neu ca doan den cung luc
  const canhBao =
    [canhBaoTrangThai, diKem && guest.soNguoiMoi > 1 ? "Mã riêng của khách đi kèm: mới ghi nhận 1 người. Người cùng đoàn có mặt thì quét thêm mã của họ hoặc tăng số người đến" : null]
      .filter(Boolean)
      .join(". ") || null;

  // Cap nhat co dieu kien: hai lan quet cung luc thi chi mot lan thanh cong
  const { count } = await prisma.guest.updateMany({
    where: { id: guest.id, trangThai: { notIn: [TRANG_THAI.DA_CHECKIN, TRANG_THAI.DA_HUY] } },
    data: {
      trangThai: TRANG_THAI.DA_CHECKIN,
      checkinLuc: new Date(),
      soNguoiDen: diKem ? 1 : guest.soNguoiXacNhan || guest.soNguoiMoi,
      nguoiDaDen: chiSo,
    },
  });
  const capNhat = await prisma.guest.findUnique({ where: { id: guest.id }, include: { venue: true } });
  if (count === 0) {
    await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.TRUNG_LAP);
    return NextResponse.json({ ok: false, ketQua: KET_QUA_CHECKIN.TRUNG_LAP, thongBao: "Mã này vừa được check in ở làn khác, quét lại để kiểm tra", guest: gon(capNhat), nguoiQuet });
  }
  await ghiLog(guest.id, lan, leTan, KET_QUA_CHECKIN.THANH_CONG);

  return NextResponse.json({
    ok: true,
    ketQua: KET_QUA_CHECKIN.THANH_CONG,
    thongBao: "Check in thành công",
    canhBao,
    guest: gon(capNhat),
    nguoiQuet,
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
    diCung: moTaDiCung(g.khachDiCung),
    trangThai: g.trangThai,
    checkinLuc: g.checkinLuc,
  };
}
