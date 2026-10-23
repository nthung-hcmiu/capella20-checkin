import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { yeuCauQuyen } from "@/lib/auth";
import { NHAN_TRANG_THAI } from "@/lib/constants";
import { urlQR } from "@/lib/codes";
import { docDiCung } from "@/lib/khach";

export const dynamic = "force-dynamic";

// Chuoi bat dau bang = + - @ co the bi Excel hieu la cong thuc
function o(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

// Xuat toan bo danh sach khach ra CSV (UTF-8 co BOM de Excel doc dung tieng Viet)
export async function GET() {
  const u = await yeuCauQuyen(["ADMIN"]);
  if (!u) return NextResponse.json({ loi: "Chỉ Quản trị được xuất danh sách" }, { status: 401 });
  if (!u.quanTri) return NextResponse.json({ loi: "Chỉ Quản trị được xuất danh sách" }, { status: 403 });
  const ds = await prisma.guest.findMany({ include: { venue: true }, orderBy: { soThuTu: "asc" } });
  // Thu tu cot theo mau danh sach cac nam truoc, roi den cac cot cua he thong
  const tieuDe = [
    "STT", "Đơn vị", "Nhóm khách mời", "Mã CORP Netsuite", "Company Name", "Nhóm khách",
    "Lĩnh vực", "Danh xưng", "Tên khách mời", "Chức vụ", "Số điện thoại", "Số lượng người tham dự",
    "Tên khách thứ 2", "Chức vụ khách thứ 2", "Phân loại khách",
    "Phân loại khách VIP", "Doanh thu dự kiến", "Round 1: Khách đã nhận thiệp online", "Round 2: Đã gửi thiệp giấy",
    "Họ và tên người phụ trách tiếp khách", "Ghi chú",
    "Số thứ tự thiệp", "Trạng thái", "Số người xác nhận", "Số người thực tế đến", "Giờ check in", "Mã thiệp", "Link thiệp",
  ];
  const daNhanOnline = ["DA_MOI", "THAM_DU", "KHONG_THAM_DU", "DA_CHECKIN", "VANG_MAT"];
  const dong = ds.map((g, i) => {
    // Khach thu 2 vao cot rieng; nguoi thu 3 tro di ghep vao cung o, ngan cach dau cham phay
    const dc = docDiCung(g.khachDiCung);
    return [
      o(i + 1), o(g.venue.ten), o(g.nhomKhachMoi), o(g.maCorp), o(g.congTy), o(g.nhomKhach),
      o(g.linhVuc), o(g.danhXung), o(g.hoTen), o(g.chucVu), g.sdt ? `="${g.sdt}"` : o(""), o(g.soNguoiMoi),
      o(dc.map((x) => x.hoTen).join("; ")), o(dc.map((x) => x.chucVu).join("; ")), o(g.nguonKhach),
      o(g.isVip ? "VIP" : "THƯỜNG"), o(g.doanhThuDuKien), o(daNhanOnline.includes(g.trangThai) ? "ĐÃ NHẬN" : ""),
      o(g.daGuiThiepGiay ? "ĐÃ GỬI" : ""), o(g.salesOwner), o(g.ghiChu),
      o(g.soThuTu), o(NHAN_TRANG_THAI[g.trangThai] || g.trangThai), o(g.soNguoiXacNhan ?? ""),
      o(g.soNguoiDen ?? ""),
      o(g.checkinLuc ? g.checkinLuc.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : ""),
      o(g.maBiMat), o(urlQR(g.maBiMat)),
    ].join(",");
  });
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
