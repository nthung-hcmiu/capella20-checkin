// Tim cac khach khac cung cong ty (theo ma CORP hoac ten cong ty da chuan hoa), de sales va BTC
// biet mot cong ty dang duoc moi bao nhieu nguoi, boi nhung sales nao
import { TRANG_THAI } from "./constants";
import { khoaCty } from "./lichSu";

export interface KhachCty {
  id: string;
  hoTen: string;
  congTy: string | null;
  maCorp: string | null;
  salesOwner: string;
  soThuTu: number;
  soNguoiMoi: number;
  trangThai: string;
}

function cacKhoa(g: { maCorp?: string | null; congTy?: string | null }): string[] {
  const ds: string[] = [];
  const corp = (g.maCorp || "").trim().toUpperCase();
  if (corp) ds.push(`corp:${corp}`);
  const cty = khoaCty(g.congTy);
  if (cty) ds.push(`cty:${cty}`);
  return ds;
}

// Bo tim co the them dan (dung khi nhap Excel: dong sau thay duoc dong truoc trong cung file).
// Noi chuoi: A cung ma CORP voi B, B cung ten cong ty voi C thi A, B, C la mot cong ty.
export function taoBoCongTy(guests: KhachCty[]) {
  const cha = new Map<string, string>();
  const tim = (k: string): string => {
    let r = k;
    while (cha.get(r) !== r) r = cha.get(r)!;
    let x = k;
    while (cha.get(x) !== r) { const n = cha.get(x)!; cha.set(x, r); x = n; }
    return r;
  };
  const noi = (a: string, b: string) => {
    for (const k of [a, b]) if (!cha.has(k)) cha.set(k, k);
    const ra = tim(a), rb = tim(b);
    if (ra !== rb) cha.set(ra, rb);
  };
  const ds: { g: KhachCty; khoa: string }[] = [];
  const them = (g: KhachCty) => {
    if (g.trangThai === TRANG_THAI.DA_HUY) return;
    const ks = cacKhoa(g);
    if (!ks.length) return;
    noi(ks[0], ks[ks.length - 1]);
    ds.push({ g, khoa: ks[0] });
  };
  guests.forEach(them);
  // Khach khac cung cong ty (khong tinh chinh khach nay)
  const timKhac = (g: { id?: string; maCorp?: string | null; congTy?: string | null }): KhachCty[] => {
    const goc = new Set(cacKhoa(g).filter((k) => cha.has(k)).map(tim));
    if (!goc.size) return [];
    return ds
      .filter((x) => x.g.id !== g.id && goc.has(tim(x.khoa)))
      .map((x) => x.g)
      .sort((a, b) => a.soThuTu - b.soThuTu);
  };
  return { timKhac, them };
}

// Mo ta cho sales: chi so luong, khong lo ten khach cua sales khac
export interface CongTySales {
  cuaToi: number;
  salesKhac: number;
  tongNguoi: number; // tong so nguoi duoc moi cua cong ty, ke ca khach nay
}
export function choSales(khac: KhachCty[], toi: string, soNguoiNay: number): CongTySales | null {
  if (!khac.length) return null;
  return {
    cuaToi: khac.filter((x) => x.salesOwner === toi).length,
    salesKhac: khac.filter((x) => x.salesOwner !== toi).length,
    tongNguoi: soNguoiNay + khac.reduce((s, x) => s + x.soNguoiMoi, 0),
  };
}
export function moTaChoSales(c: CongTySales | null): string | null {
  if (!c) return null;
  const phan = [c.cuaToi ? `${c.cuaToi} của bạn` : "", c.salesKhac ? `${c.salesKhac} của sales khác` : ""].filter(Boolean).join(", ");
  return `Công ty này đã có ${c.cuaToi + c.salesKhac} khách khác được mời (${phan}), tổng ${c.tongNguoi} người.`;
}

// Mo ta day du cho BTC
export interface CongTyBtc {
  soKhac: number;
  tongNguoi: number;
  nhieuSales: boolean; // co sales khac cung moi cong ty nay
  ds: { hoTen: string; soThuTu: number; salesOwner: string }[];
}
export function choBtc(khac: KhachCty[], salesNay: string, soNguoiNay: number): CongTyBtc | null {
  if (!khac.length) return null;
  return {
    soKhac: khac.length,
    tongNguoi: soNguoiNay + khac.reduce((s, x) => s + x.soNguoiMoi, 0),
    nhieuSales: khac.some((x) => x.salesOwner !== salesNay),
    ds: khac.slice(0, 10).map((x) => ({ hoTen: x.hoTen, soThuTu: x.soThuTu, salesOwner: x.salesOwner })),
  };
}
export function moTaChoBtc(c: CongTyBtc | null): string | null {
  if (!c) return null;
  const ten = c.ds.map((x) => `${x.soThuTu} ${x.hoTen} (sales ${x.salesOwner})`).join("; ");
  return `Cùng công ty có ${c.soKhac} khách khác, tổng ${c.tongNguoi} người: ${ten}${c.soKhac > c.ds.length ? "; ..." : ""}.`;
}

export const CHON_CONG_TY = {
  id: true, hoTen: true, congTy: true, maCorp: true, salesOwner: true, soThuTu: true, soNguoiMoi: true, trangThai: true,
} as const;
