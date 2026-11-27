// Thong tin khach theo mau danh sach cac nam truoc, va khoa chong trung khi khong co SDT

import { boDau, hienTien } from "./format";

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
  linhVuc: "Ngành hàng",
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

// Nganh hang (truong Linh vuc): moi nganh mot muc, du lon de so sanh. "Khac" luon o cuoi.
// Quy tac xep: theo nganh san pham cuoi cua cong ty. Hang Tieu Dung chi gom hang phi thuc pham;
// San Xuat/Cong Nghiep chi danh cho cong nghiep B2B (co khi, bao bi, nhua, thep, linh kien).
export const LINH_VUC = [
  "Tài Chính/Ngân Hàng/Chứng Khoán", "Bảo Hiểm", "Bất Động Sản/Xây Dựng", "Nội Thất/Vật Liệu Xây Dựng", "Công Nghệ/Viễn Thông",
  "Điện Máy/Gia Dụng", "Ô Tô/Xe Máy", "Thực Phẩm/Đồ Uống", "Hàng Tiêu Dùng (Phi Thực Phẩm)", "Làm Đẹp/Mỹ Phẩm",
  "Y Tế/Dược Phẩm", "Dệt May/Thời Trang/Trang Sức", "Bán Lẻ/Thương Mại Điện Tử", "Bán Hàng Đa Cấp", "Vận Chuyển/Logistics",
  "Sản Xuất/Công Nghiệp", "Năng Lượng/Tài Nguyên/Hóa Chất", "Nông Nghiệp/Thủy Sản", "Du Lịch/Khách Sạn/Hàng Không", "Giáo Dục/Đào Tạo",
  "Giải Trí/Nghệ Thuật/Thể Thao", "Event/Media Agency", "Dịch Vụ Doanh Nghiệp", "Khu Vực Công/Hiệp Hội/NGO", "Khác",
];
// Tu khoa (khong dau) -> muc trong danh muc. Dung de doi ten cu sang ten moi va nhan cach ghi tu do trong file.
// Xet tu tren xuong, tu khoa cu the dat truoc tu khoa chung ("thuong mai dien tu" truoc "dien tu", "vat lieu" truoc "xay dung").
const BIET_DANH_LINH_VUC: [string[], string][] = [
  [["thuong mai dien tu", "ecommerce", "e-commerce", "ban le", "sieu thi", "retail"], "Bán Lẻ/Thương Mại Điện Tử"],
  [["da cap", "mlm", "ban hang truc tiep"], "Bán Hàng Đa Cấp"],
  [["su kien", "agency", "event", "truyen thong", "quang cao", "media", "bao chi"], "Event/Media Agency"],
  [["giai tri", "the thao", "nghe thuat", "am nhac", "dien anh"], "Giải Trí/Nghệ Thuật/Thể Thao"],
  [["chung khoan", "ngan hang", "tai chinh", "fintech"], "Tài Chính/Ngân Hàng/Chứng Khoán"],
  [["bao hiem"], "Bảo Hiểm"],
  [["noi that", "vat lieu", "thiet bi ve sinh"], "Nội Thất/Vật Liệu Xây Dựng"],
  [["bat dong san", "xay dung", "kien truc"], "Bất Động Sản/Xây Dựng"],
  [["dien may", "dien lanh", "dien tu", "gia dung"], "Điện Máy/Gia Dụng"],
  [["o to", "xe may", "automotive"], "Ô Tô/Xe Máy"],
  [["thuc pham", "do uong", "beverage", "wine", "f&b", "nha hang"], "Thực Phẩm/Đồ Uống"],
  [["tieu dung", "fmcg"], "Hàng Tiêu Dùng (Phi Thực Phẩm)"],
  [["det may", "thoi trang", "may mac", "trang suc", "phu kien"], "Dệt May/Thời Trang/Trang Sức"],
  [["lam dep", "my pham", "tham my"], "Làm Đẹp/Mỹ Phẩm"],
  [["y te", "duoc pham", "benh vien", "phong kham", "nha khoa"], "Y Tế/Dược Phẩm"],
  [["giao duc", "dao tao", "dai hoc"], "Giáo Dục/Đào Tạo"],
  [["du lich", "khach san", "lu hanh", "hang khong"], "Du Lịch/Khách Sạn/Hàng Không"],
  [["logistics", "van chuyen", "van tai", "giao nhan", "kho van"], "Vận Chuyển/Logistics"],
  [["nang luong", "moi truong", "khoang san", "dau khi", "hoa chat", "tai nguyen"], "Năng Lượng/Tài Nguyên/Hóa Chất"],
  [["nong nghiep", "thuy san", "phan bon", "bao ve thuc vat"], "Nông Nghiệp/Thủy Sản"],
  [["hr/law", "nhan su", "phap ly", "luat", "tu van", "kiem toan", "an ninh", "bao ve", "dich vu doanh nghiep"], "Dịch Vụ Doanh Nghiệp"],
  [["co quan", "nha nuoc", "ban nganh", "hiep hoi", "khu vuc cong", "lanh su", "phong thuong mai"], "Khu Vực Công/Hiệp Hội/NGO"],
  [["da nganh", "multidisciplinary", "tap doan"], "Khác"],
  [["san xuat", "cong nghiep", "co khi", "bao bi"], "Sản Xuất/Công Nghiệp"],
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

// Khach di cung tren cung mot ve (nguoi thu 2 tro di): bat buoc danh xung, ten va chuc vu,
// vi moi nguoi nhan mot thiep rieng ghi dung ten minh
export interface NguoiDiCung {
  danhXung?: string;
  hoTen: string;
  chucVu: string;
}
export function docDiCung(s: string | null | undefined): NguoiDiCung[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v)
      ? v.map((x) => ({ danhXung: String(x?.danhXung ?? ""), hoTen: String(x?.hoTen ?? ""), chucVu: String(x?.chucVu ?? "") }))
      : [];
  } catch {
    return [];
  }
}
// Khach di kem thu k tren ve (k = 2 la nguoi di kem dau tien). Chi tra ve khi nguoi do da co ten.
export function khachDiKemThu(
  g: { soNguoiMoi: number; khachDiCung: string | null | undefined },
  k: number | null | undefined
): NguoiDiCung | null {
  if (!k || k < 2 || k > g.soNguoiMoi) return null;
  const x = docDiCung(g.khachDiCung)[k - 2];
  return x?.hoTen?.trim() ? x : null;
}
// So thu tu cua tung nguoi tren thiep: khach chinh la so cua thiep (1004), khach di kem them duoi thu tu (1004-2).
// So trong CSDL van la mot so cho ca thiep; duoi chi de phan biet nguoi khi in thiep giay, in nhan va check in.
export function soThiep(soThuTu: number, nguoi?: number | null): string {
  return nguoi && nguoi >= 2 ? `${soThuTu}-${nguoi}` : String(soThuTu);
}
// Doc so le tan go: "1004" hoac "1004-2". Ban phim so tren dien thoai khong co dau gach nen nhan ca dau cham, phay, cach, gach cheo.
export function docSoThiep(raw: string): { so: number; nguoi: number | null } | null {
  const khop = String(raw || "").trim().match(/^(\d{1,5})(?:\s*[-.,/ ]\s*(\d{1,2}))?$/);
  if (!khop) return null;
  const nguoi = khop[2] ? parseInt(khop[2], 10) : null;
  return { so: parseInt(khop[1], 10), nguoi: nguoi && nguoi >= 2 ? nguoi : null };
}
// Giu dung so nguoi di cung theo so nguoi moi, cat khoang trang
export function lamSachDiCung(ds: NguoiDiCung[] | undefined, soNguoiMoi: number): NguoiDiCung[] {
  const lam = (x: string | undefined) => String(x ?? "").trim().replace(/\s+/g, " ");
  return (ds || [])
    .slice(0, Math.max(0, soNguoiMoi - 1))
    .map((x) => ({ danhXung: lam(x.danhXung), hoTen: lam(x.hoTen), chucVu: lam(x.chucVu) }));
}
export function ghiDiCung(ds: NguoiDiCung[]): string | null {
  const co = ds.filter((x) => x.hoTen || x.chucVu);
  return co.length ? JSON.stringify(co) : null;
}
// Thong tin bat buoc truoc khi gui duyet: SDT, dia chi, chuc vu, ten va chuc vu nguoi di cung
// linhVuc: nganh hang bat buoc de bao cao theo nganh khong con nhom "chua ghi". Nhan su noi bo Capella duoc mien.
// Noi goi khong truyen linhVuc (undefined) thi khong xet.
export function thieuThongTinMoi(g: {
  sdt: string | null | undefined;
  diaChi: string | null | undefined;
  chucVu: string | null | undefined;
  soNguoiMoi: number;
  khachDiCung: string | null | undefined;
  linhVuc?: string | null;
  congTy?: string | null;
}): string | null {
  if (!g.sdt?.trim()) return "Thiếu số điện thoại của khách";
  if (!g.diaChi?.trim()) return "Thiếu địa chỉ của khách";
  if (!g.chucVu?.trim()) return "Thiếu chức vụ của khách";
  if (g.linhVuc !== undefined && !g.linhVuc?.trim() && !boDau(g.congTy || "").includes("capella")) return "Thiếu ngành hàng của khách";
  const ds = docDiCung(g.khachDiCung);
  for (let i = 0; i < g.soNguoiMoi - 1; i++) {
    if (!ds[i]?.hoTen?.trim() || !ds[i]?.chucVu?.trim()) return `Thiếu tên hoặc chức vụ khách thứ ${i + 2}`;
    if (!ds[i]?.danhXung?.trim()) return `Thiếu danh xưng khách thứ ${i + 2}`;
  }
  return null;
}
export function moTaDiCung(s: string | null | undefined): string {
  return docDiCung(s)
    .filter((x) => x.hoTen)
    .map((x) => {
      const ten = [x.danhXung, x.hoTen].filter(Boolean).join(" ");
      return x.chucVu ? `${ten} (${x.chucVu})` : ten;
    })
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
  if (r.doanhThuDuKien) r.doanhThuDuKien = hienTien(r.doanhThuDuKien); // luu thong nhat dang 349.955.000 đ
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

