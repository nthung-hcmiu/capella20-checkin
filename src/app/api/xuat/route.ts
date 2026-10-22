import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { yeuCauQuyen } from "@/lib/auth";
import { NHAN_TRANG_THAI } from "@/lib/constants";
import { urlQR } from "@/lib/codes";

export const dynamic = "force-dynamic";

// Chuoi bat dau bang = + - @ co the bi Excel hieu la cong thuc
function o(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

// Xuat toan bo danh sach khach ra CSV (UTF-8 co BOM de Excel doc dung tieng Viet)
export async function GET() {
  if (!(await yeuCauQuyen(["ADMIN"]))) {
    return NextResponse.json({ loi: "Chỉ BTC được xuất danh sách" }, { status: 401 });
  }
  const ds = await prisma.guest.findMany({ include: { venue: true }, orderBy: { soThuTu: "asc" } });
  // Thu tu cot theo mau danh sach cac nam truoc, roi den cac cot cua he thong
  const tieuDe = [
    "STT", "Đơn vị", "Nhóm khách mời", "Thuộc đơn vị kinh doanh", "Mã CORP Netsuite", "Company Name", "Nhóm khách",
    "Lĩnh vực", "Danh xưng", "Tên khách mời", "Chức vụ", "Số điện thoại", "Số lượng người tham dự", "Phân loại khách",
    "Phân loại khách VIP", "Doanh thu dự kiến", "Round 1: Khách đã nhận thiệp online", "Round 2: Đã gửi thiệp giấy",
    "Line ghế", "Số ghế cho khách VIP", "Họ và tên người phụ trách tiếp khách", "Phòng ban", "Ghi chú",
    "Số thứ tự thiệp", "Trạng thái", "Số người xác nhận", "Số người thực tế đến", "Giờ check in", "Mã thiệp", "Link thiệp",
  ];
  const daNhanOnline = ["DA_MOI", "THAM_DU", "CHUA_PHAN_HOI", "KHONG_THAM_DU", "DA_CHECKIN", "VANG_MAT"];
  const dong = ds.map((g, i) =>
    [
      o(i + 1), o(g.venue.ten), o(g.nhomKhachMoi), o(g.donViKinhDoanh), o(g.maCorp), o(g.congTy), o(g.nhomKhach),
      o(g.linhVuc), o(g.danhXung), o(g.hoTen), o(g.chucVu), g.sdt ? `="${g.sdt}"` : o(""), o(g.soNguoiMoi), o(g.nguonKhach),
      o(g.isVip ? "VIP" : "THƯỜNG"), o(g.doanhThuDuKien), o(daNhanOnline.includes(g.trangThai) ? "ĐÃ NHẬN" : ""),
      o(g.daGuiThiepGiay ? "ĐÃ GỬI" : ""), o(g.ban), o(g.soGhe), o(g.salesOwner), o(g.phongBan), o(g.ghiChu),
      o(g.soThuTu), o(NHAN_TRANG_THAI[g.trangThai] || g.trangThai), o(g.soNguoiXacNhan ?? ""),
      o(g.soNguoiDen ?? ""),
      o(g.checkinLuc ? g.checkinLuc.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : ""),
      o(g.maBiMat), o(urlQR(g.maBiMat)),
    ].join(",")
  );
  const csv = "﻿" + [tieuDe.map(o).join(","), ...dong].join("\r\n");
  const ngay = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(/-/g, "");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="capella20-khach-${ngay}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
