// Thong tin khach theo mau danh sach cac nam truoc, va khoa chong trung khi khong co SDT

import { boDau } from "./format";

// Cac truong chu (khong bat buoc) ngoai ho ten, SDT
export const TRUONG_CHU = [
  "danhXung", "chucVu", "congTy", "maCorp", "nhomKhachMoi", "donViKinhDoanh",
  "nhomKhach", "linhVuc", "nguonKhach", "doanhThuDuKien", "phongBan", "soGhe",
] as const;
export type TruongChu = (typeof TRUONG_CHU)[number];
export type ThongTinThem = Partial<Record<TruongChu, string | null>>;

export const NHAN_TRUONG: Record<TruongChu, string> = {
  danhXung: "Danh xưng",
  chucVu: "Chức vụ",
  congTy: "Công ty",
  maCorp: "Mã CORP Netsuite",
  nhomKhachMoi: "Nhóm khách mời",
  donViKinhDoanh: "Thuộc đơn vị kinh doanh",
  nhomKhach: "Nhóm khách",
  linhVuc: "Lĩnh vực",
  nguonKhach: "Phân loại khách",
  doanhThuDuKien: "Doanh thu dự kiến",
  phongBan: "Phòng ban",
  soGhe: "Số ghế VIP",
};

export const DANH_XUNG = ["Ông", "Bà", "Anh", "Chị"];

// Lam sach: cat khoang trang, chuoi rong thanh null
export function lamSach(t: ThongTinThem): ThongTinThem {
  const r: ThongTinThem = {};
  for (const k of TRUONG_CHU) {
    const v = t[k];
    if (v === undefined) continue;
    const s = v == null ? "" : String(v).trim().replace(/\s+/g, " ");
    r[k] = s || null;
  }
  return r;
}

// Khoa chong trung khi khong co SDT: ten + ma CORP, hoac ten + cong ty
export function khoaTen(hoTen: string, maCorp?: string | null, congTy?: string | null): string | null {
  const ten = boDau(hoTen || "");
  if (!ten) return null;
  if (maCorp && maCorp.trim()) return `${ten}|corp:${boDau(maCorp)}`;
  if (congTy && congTy.trim()) return `${ten}|cty:${boDau(congTy)}`;
  return null;
}

// Ten goi day du: "Ong Nguyen Van An"
export function tenGoi(g: { danhXung?: string | null; hoTen: string }): string {
  return [g.danhXung, g.hoTen].filter(Boolean).join(" ");
}

// Excel hay doc so ghe 10.10 thanh 10.1: giu 2 chu so sau dau cham
export function chuanSoGhe(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  const s = String(v).trim();
  return /^\d+\.\d$/.test(s) ? s + "0" : s || null;
}
