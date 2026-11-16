// Thong tin khach theo mau danh sach cac nam truoc, va khoa chong trung khi khong co SDT

import { boDau } from "./format";

// Cac truong chu ngoai ho ten, SDT. Da bo "Thuoc don vi kinh doanh", "Phong ban", "Nhom khach moi", "Nhom khach" (cot CSDL van giu).
export const TRUONG_CHU = [
  "danhXung", "chucVu", "congTy", "diaChi", "maCorp", "linhVuc", "nguonKhach", "doanhThuDuKien",
] as const;
export type TruongChu = (typeof TRUONG_CHU)[number];
export type ThongTinThem = Partial<Record<TruongChu, string | null>>;

export const NHAN_TRUONG: Record<TruongChu, string> = {
  danhXung: "Danh xưng",
  chucVu: "Chức vụ",
  congTy: "Công ty",
  diaChi: "Địa chỉ",
  maCorp: "Mã CORP Netsuite",
  linhVuc: "Lĩnh vực",
  nguonKhach: "Phân loại khách",
  doanhThuDuKien: "Doanh thu dự kiến",
};

// Phan loai khach: 3 lua chon. File cu ghi Netsuite / Contact moi.
export const PHAN_LOAI_KHACH = ["Khách cũ", "Khách tiềm năng", "Đối tác"];
export function chuanPhanLoai(s: string | null | undefined): string | null {
  const t = boDau(String(s ?? ""));
  if (!t) return null;
  if (["khach cu", "cu", "netsuite", "old"].includes(t) || t.includes("netsuite") || t.includes("khach cu")) return "Khách cũ";
  if (["khach tiem nang", "tiem nang", "contact moi", "moi", "new"].includes(t) || t.includes("tiem nang") || t.includes("contact")) return "Khách tiềm năng";
  if (["doi tac", "partner"].includes(t) || t.startsWith("doi tac")) return "Đối tác";
  return String(s).trim();
}

// Linh vuc: danh muc gon theo nganh cua khach doanh nghiep, moi nganh mot muc. "Khac" luon o cuoi.
export const LINH_VUC = [
  "Event/Media Agency", "Giải Trí/Thể Thao", "Công Nghệ/Viễn Thông", "Tài Chính/Ngân Hàng/Chứng Khoán", "Bảo Hiểm",
  "Bất Động Sản/Xây Dựng", "Sản Xuất/Công Nghiệp", "Điện Máy/Điện Lạnh", "Ô Tô/Xe Máy", "Hàng Tiêu Dùng",
  "Thực Phẩm/Đồ Uống", "Bán Lẻ/Thương Mại Điện Tử", "Dệt May/Thời Trang", "Làm Đẹp/Mỹ Phẩm", "Y Tế/Dược Phẩm",
  "Giáo Dục/Đào Tạo", "Du Lịch/Khách Sạn", "Vận Chuyển/Logistics", "Năng Lượng/Môi Trường", "Nông Nghiệp/Thủy Sản",
  "Tư Vấn/Nhân Sự/Pháp Lý", "An Ninh/Bảo Vệ", "Cơ Quan Nhà Nước", "Hiệp Hội/Tổ Chức", "Đa Ngành", "Khác",
];
// Tu khoa (khong dau) -> muc trong danh muc. Dung de doi ten cu sang ten moi va nhan cach ghi tu do trong file.
// Xet tu tren xuong, tu khoa cu the dat truoc tu khoa chung ("thuong mai dien tu" truoc "dien tu", "thuc pham" truoc "san xuat").
const BIET_DANH_LINH_VUC: [string[], string][] = [
  [["thuong mai dien tu", "ecommerce", "e-commerce", "ban le", "sieu thi", "retail"], "Bán Lẻ/Thương Mại Điện Tử"],
  [["su kien", "agency", "event", "truyen thong", "quang cao", "media", "bao chi"], "Event/Media Agency"],
  [["giai tri", "the thao", "nghe thuat", "am nhac", "dien anh"], "Giải Trí/Thể Thao"],
  [["chung khoan", "ngan hang", "tai chinh", "fintech"], "Tài Chính/Ngân Hàng/Chứng Khoán"],
  [["bao hiem"], "Bảo Hiểm"],
  [["bat dong san", "xay dung", "kien truc", "noi that"], "Bất Động Sản/Xây Dựng"],
  [["dien may", "dien lanh", "dien tu"], "Điện Máy/Điện Lạnh"],
  [["o to", "xe may", "automotive"], "Ô Tô/Xe Máy"],
  [["thuc pham", "do uong", "beverage", "wine", "f&b", "nha hang"], "Thực Phẩm/Đồ Uống"],
  [["tieu dung", "fmcg"], "Hàng Tiêu Dùng"],
  [["det may", "thoi trang", "may mac"], "Dệt May/Thời Trang"],
  [["lam dep", "my pham", "tham my"], "Làm Đẹp/Mỹ Phẩm"],
  [["y te", "duoc pham", "benh vien", "phong kham", "nha khoa"], "Y Tế/Dược Phẩm"],
  [["giao duc", "dao tao", "dai hoc"], "Giáo Dục/Đào Tạo"],
  [["du lich", "khach san", "lu hanh"], "Du Lịch/Khách Sạn"],
  [["logistics", "van chuyen", "van tai", "giao nhan"], "Vận Chuyển/Logistics"],
  [["nang luong", "moi truong"], "Năng Lượng/Môi Trường"],
  [["nong nghiep", "thuy san"], "Nông Nghiệp/Thủy Sản"],
  [["hr/law", "nhan su", "phap ly", "luat", "tu van", "kiem toan"], "Tư Vấn/Nhân Sự/Pháp Lý"],
  [["an ninh", "bao ve"], "An Ninh/Bảo Vệ"],
  [["co quan", "nha nuoc", "ban nganh"], "Cơ Quan Nhà Nước"],
  [["hiep hoi"], "Hiệp Hội/Tổ Chức"],
  [["da nganh", "multidisciplinary", "tap doan"], "Đa Ngành"],
  [["san xuat", "cong nghiep", "co khi"], "Sản Xuất/Công Nghiệp"],
  [["cong nghe", "vien thong", "phan mem"], "Công Nghệ/Viễn Thông"],
];
export function chuanLinhVuc(s: string | null | undefined): string | null {
  const t = boDau(String(s ?? "")).replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const khop = LINH_VUC.find((l) => boDau(l) === t);
  if (khop) return khop;
  for (const [tuKhoa, muc] of BIET_DANH_LINH_VUC) if (tuKhoa.some((k) => t.includes(k))) return muc;
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
// Thong tin bat buoc truoc khi gui duyet: SDT, dia chi, chuc vu, ten va chuc vu nguoi di cung
export function thieuThongTinMoi(g: {
  sdt: string | null | undefined;
  diaChi: string | null | undefined;
  chucVu: string | null | undefined;
  soNguoiMoi: number;
  khachDiCung: string | null | undefined;
}): string | null {
  if (!g.sdt?.trim()) return "Thiếu số điện thoại của khách";
  if (!g.diaChi?.trim()) return "Thiếu địa chỉ của khách";
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

