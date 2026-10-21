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
  const tieuDe = [
    "Số thứ tự", "Họ tên", "Số điện thoại", "Venue", "Số người mời", "Số người xác nhận",
    "Trạng thái", "VIP", "Bàn", "Sales phụ trách", "Ghi chú", "Mã thiệp", "Link thiệp", "Giờ check in",
  ];
  const dong = ds.map((g) =>
    [
      o(g.soThuTu), o(g.hoTen), `="${g.sdt}"`, o(g.venue.ten), o(g.soNguoiMoi), o(g.soNguoiXacNhan ?? ""),
      o(NHAN_TRANG_THAI[g.trangThai] || g.trangThai), o(g.isVip ? "x" : ""), o(g.ban ?? ""), o(g.salesOwner),
      o(g.ghiChu ?? ""), o(g.maBiMat), o(urlQR(g.maBiMat)),
      o(g.checkinLuc ? g.checkinLuc.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : ""),
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
