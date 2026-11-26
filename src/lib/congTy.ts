// Tim cac khach khac cung cong ty (theo ma CORP hoac ten cong ty da chuan hoa), de sales va BTC
// biet mot cong ty dang duoc moi bao nhieu nguoi, boi nhung sales nao
import { TRANG_THAI } from "./constants";
import { boDau, chuanHoaSdt } from "./format";
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

// Ma CORP that phai co chu so va du dai; "N/A", "0", "Bo sung MST" la o dien tam, khong dung de gop cong ty
export function maCorpThat(maCorp: string | null | undefined): string | null {
  const t = (maCorp || "").trim().toUpperCase();
  return t.length >= 4 && /\d/.test(t) ? t : null;
}
// Nhan su noi bo Capella (ban lanh dao, sales, marketing) khong phai khach cua sales nao,
// nen khong xet "cung cong ty" / "trung cong ty giua cac sales" cho nhom nay
const laNoiBo = (cty: string | null) => !!cty && /^capella( |$)/.test(cty);
export const laNoiBoCapella = (congTy: string | null | undefined) => laNoiBo(khoaCty(congTy));
// Khach noi bo ghi cong ty la CAPELLA HOLDINGS, do Nguyen Huong Thao phu trach (ten cong ty bat dau bang "Capella" deu tinh la noi bo).
// Thiep giay: moi khach mot thiep, tru toan bo khach noi bo (ke ca ban lanh dao va VIP): nhom nay chi dung thiep online.
export const canThiepGiay = (g: { congTy: string | null | undefined; isVip?: boolean | null }) => !laNoiBoCapella(g.congTy);
export const CONG_TY_NOI_BO = "CAPELLA HOLDINGS";
export const PHU_TRACH_NOI_BO = "Nguyễn Hương Thảo";

function cacKhoa(g: { maCorp?: string | null; congTy?: string | null }): string[] {
  const cty = khoaCty(g.congTy);
  if (laNoiBo(cty)) return [];
  const ds: string[] = [];
  const corp = maCorpThat(g.maCorp);
  if (corp) ds.push(`corp:${corp}`);
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

// Mo ta cho sales: so luong va ten cac sales khac cung moi cong ty nay (de lien he nhau), khong lo ten khach
export interface CongTySales {
  cuaToi: number;
  salesKhac: number;
  tenSalesKhac: string[];
  tongNguoi: number; // tong so nguoi duoc moi cua cong ty, ke ca khach nay
}
export function choSales(khac: KhachCty[], toi: string, soNguoiNay: number): CongTySales | null {
  if (!khac.length) return null;
  return {
    cuaToi: khac.filter((x) => x.salesOwner === toi).length,
    salesKhac: khac.filter((x) => x.salesOwner !== toi).length,
    tenSalesKhac: [...new Set(khac.filter((x) => x.salesOwner !== toi).map((x) => x.salesOwner))].sort(),
    tongNguoi: soNguoiNay + khac.reduce((s, x) => s + x.soNguoiMoi, 0),
  };
}
export function moTaChoSales(c: CongTySales | null): string | null {
  if (!c) return null;
  const phan = [c.cuaToi ? `${c.cuaToi} của bạn` : "", c.salesKhac ? `${c.salesKhac} của sales ${c.tenSalesKhac.join(", ")}` : ""].filter(Boolean).join(", ");
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

// Khach trung: sales duoc xem ten khach trung va sales dang phu trach de lien he nhau xu ly.
//  TRUNG_SDT: cung SDT
//  TRUNG_TEN: cung ho ten va cung ma CORP, hoac cung ho ten va cung cong ty (bo qua "Cong ty TNHH", "Vietnam"...)
export interface KhachTrung {
  id: string;
  loai: "TRUNG_SDT" | "TRUNG_TEN";
  hoTen: string;
  congTy: string | null;
  soThuTu: number;
  salesOwner: string;
}
const tenNguoi = (s: string) => boDau(s || "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
// Mot khach co the co 2 khoa (theo ma CORP va theo ten cong ty); trung mot khoa la trung
export function khoaTenManh(hoTen: string, maCorp?: string | null, congTy?: string | null): string[] {
  const ten = tenNguoi(hoTen);
  if (!ten) return [];
  const ds: string[] = [];
  const corp = maCorpThat(maCorp);
  if (corp) ds.push(`${ten}|corp:${corp}`);
  const cty = khoaCty(congTy);
  if (cty) ds.push(`${ten}|cty:${cty}`);
  return ds;
}
type KhachDoiChieu = { id: string; hoTen: string; sdt: string | null; maCorp: string | null; congTy: string | null; salesOwner: string; soThuTu: number; trangThai: string };
export function taoBoTrung(guests: KhachDoiChieu[]) {
  const theoSdt = new Map<string, KhachDoiChieu[]>();
  const theoTen = new Map<string, KhachDoiChieu[]>();
  const ghi = (m: Map<string, KhachDoiChieu[]>, k: string | null, g: KhachDoiChieu) => {
    if (!k) return;
    const ds = m.get(k) || [];
    ds.push(g);
    m.set(k, ds);
  };
  for (const g of guests) {
    if (g.trangThai === TRANG_THAI.DA_HUY) continue;
    ghi(theoSdt, chuanHoaSdt(g.sdt) || null, g);
    for (const k of khoaTenManh(g.hoTen, g.maCorp, g.congTy)) ghi(theoTen, k, g);
  }
  // Ket qua xep theo do chac chan: trung SDT truoc, roi trung ten + cong ty
  return (g: { id?: string; hoTen: string; sdt: string | null; maCorp?: string | null; congTy?: string | null }): KhachTrung[] => {
    const kq = new Map<string, KhachTrung>();
    const them = (ds: KhachDoiChieu[] | undefined, loai: KhachTrung["loai"]) => {
      for (const x of [...(ds || [])].sort((a, b) => a.soThuTu - b.soThuTu)) {
        if (x.id === g.id || kq.has(x.id)) continue;
        kq.set(x.id, { id: x.id, loai, hoTen: x.hoTen, congTy: x.congTy, soThuTu: x.soThuTu, salesOwner: x.salesOwner });
      }
    };
    const sdt = chuanHoaSdt(g.sdt);
    if (sdt) them(theoSdt.get(sdt), "TRUNG_SDT");
    for (const k of khoaTenManh(g.hoTen, g.maCorp, g.congTy)) them(theoTen.get(k), "TRUNG_TEN");
    return [...kq.values()];
  };
}
// "Trung SDT voi khach Nguyen Van A (so 1020) cua sales Tran B"
export function moTaKhachTrung(x: KhachTrung, toi?: string): string {
  const cua = toi && x.salesOwner === toi ? "của bạn" : `của sales ${x.salesOwner}`;
  return `${x.loai === "TRUNG_SDT" ? "Trùng SĐT" : "Trùng tên và công ty"} với khách ${x.hoTen} (số ${x.soThuTu}) ${cua}`;
}
export function moTaTrung(ds: KhachTrung[] | null | undefined, toi?: string): string | null {
  if (!ds?.length) return null;
  return ds.slice(0, 5).map((x) => moTaKhachTrung(x, toi)).join("; ") + (ds.length > 5 ? "; ..." : "");
}
