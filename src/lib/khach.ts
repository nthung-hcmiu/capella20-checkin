// Thong tin khach theo mau danh sach cac nam truoc, va khoa chong trung khi khong co SDT

import { boDau } from "./format";

// Cac truong chu ngoai ho ten, SDT. Da bo "Thuoc don vi kinh doanh" va "Phong ban" (cot CSDL van giu).
export const TRUONG_CHU = [
  "danhXung", "chucVu", "congTy", "maCorp", "nhomKhachMoi",
  "nhomKhach", "linhVuc", "nguonKhach", "doanhThuDuKien",
] as const;
export type TruongChu = (typeof TRUONG_CHU)[number];
export type ThongTinThem = Partial<Record<TruongChu, string | null>>;

export const NHAN_TRUONG: Record<TruongChu, string> = {
  danhXung: "Danh xưng",
  chucVu: "Chức vụ",
  congTy: "Công ty",
  maCorp: "Mã CORP Netsuite",
  nhomKhachMoi: "Nhóm khách mời",
  nhomKhach: "Nhóm khách",
  linhVuc: "Lĩnh vực",
  nguonKhach: "Phân loại khách",
  doanhThuDuKien: "Doanh thu dự kiến",
};

// Phan loai khach: chi 2 lua chon. File cu ghi Netsuite / Contact moi.
export const PHAN_LOAI_KHACH = ["Khách cũ", "Khách tiềm năng"];
export function chuanPhanLoai(s: string | null | undefined): string | null {
  const t = boDau(String(s ?? ""));
  if (!t) return null;
  if (["khach cu", "cu", "netsuite", "old"].includes(t) || t.includes("netsuite") || t.includes("khach cu")) return "Khách cũ";
  if (["khach tiem nang", "tiem nang", "contact moi", "moi", "new"].includes(t) || t.includes("tiem nang") || t.includes("contact")) return "Khách tiềm năng";
  return String(s).trim();
}

// Linh vuc: lay tu danh sach khach 2024, gop cac cach ghi khac nhau
export const LINH_VUC = [
  "Giải Trí/Tổ Chức Sự Kiện", "Event Agency", "Công Nghệ", "Làm Đẹp", "Du Lịch", "Giáo Dục / Đào Tạo",
  "Hàng Tiêu Dùng", "Chứng Khoán", "Điện Lạnh", "Điện Máy", "Hiệp Hội Doanh Nghiệp", "Đa Ngành", "Khác",
];
const BIET_DANH_LINH_VUC: Record<string, string> = {
  "hiep hoi": "Hiệp Hội Doanh Nghiệp",
  multidisciplinary: "Đa Ngành",
  "giao duc": "Giáo Dục / Đào Tạo",
  "dao tao": "Giáo Dục / Đào Tạo",
  "su kien": "Giải Trí/Tổ Chức Sự Kiện",
  "giai tri": "Giải Trí/Tổ Chức Sự Kiện",
  agency: "Event Agency",
};
export function chuanLinhVuc(s: string | null | undefined): string | null {
  const t = boDau(String(s ?? "")).replace(/\s*\/\s*/g, "/");
  if (!t) return null;
  const khop = LINH_VUC.find((l) => boDau(l).replace(/\s*\/\s*/g, "/") === t);
  if (khop) return khop;
  for (const [k, v] of Object.entries(BIET_DANH_LINH_VUC)) if (t.includes(k)) return v;
  return String(s).trim();
}

// Khach di cung tren cung mot thiep (nguoi thu 2 tro di): bat buoc ten va chuc vu
export interface NguoiDiCung {
  hoTen: string;
  chucVu: string;
}
export function docDiCung(s: string | null | undefined): NguoiDiCung[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map((x) => ({ hoTen: String(x?.hoTen ?? ""), chucVu: String(x?.chucVu ?? "") })) : [];
  } catch {
    return [];
  }
}
// Giu dung so nguoi di cung theo so nguoi moi, cat khoang trang
export function lamSachDiCung(ds: NguoiDiCung[] | undefined, soNguoiMoi: number): NguoiDiCung[] {
  const lam = (x: string) => String(x ?? "").trim().replace(/\s+/g, " ");
  return (ds || []).slice(0, Math.max(0, soNguoiMoi - 1)).map((x) => ({ hoTen: lam(x.hoTen), chucVu: lam(x.chucVu) }));
}
export function ghiDiCung(ds: NguoiDiCung[]): string | null {
  const co = ds.filter((x) => x.hoTen || x.chucVu);
  return co.length ? JSON.stringify(co) : null;
}
// Thieu ten hoac chuc vu cua nguoi chinh hay nguoi di cung
export function thieuThongTinMoi(g: { chucVu?: string | null; soNguoiMoi: number; khachDiCung?: string | null }): string | null {
  if (!g.chucVu?.trim()) return "Thiếu chức vụ của khách";
  const ds = docDiCung(g.khachDiCung);
  for (let i = 0; i < g.soNguoiMoi - 1; i++) {
    if (!ds[i]?.hoTen?.trim() || !ds[i]?.chucVu?.trim()) return `Thiếu tên hoặc chức vụ khách thứ ${i + 2}`;
  }
  return null;
}
export function moTaDiCung(s: string | null | undefined): string {
  return docDiCung(s)
    .filter((x) => x.hoTen)
    .map((x) => (x.chucVu ? `${x.hoTen} (${x.chucVu})` : x.hoTen))
    .join("; ");
}

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
  if (r.nguonKhach) r.nguonKhach = chuanPhanLoai(r.nguonKhach);
  if (r.linhVuc) r.linhVuc = chuanLinhVuc(r.linhVuc);
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

