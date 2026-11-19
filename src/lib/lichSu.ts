// Doi chieu khach nam nay voi danh sach khach su kien nam truoc (bang KhachNamTruoc)
import type { PrismaClient } from "@prisma/client";
import { boDau, chuanHoaSdt } from "./format";

export type LoaiLichSu = "den" | "khongDen" | "congTy" | "moi";
export interface LichSu {
  loai: LoaiLichSu;
  nhan: string; // ngan, hien o dong khach
  chiTiet: string; // day du, hien khi mo chi tiet
}

interface DongLichSu {
  nam: number;
  hoTen: string;
  chucVu: string | null;
  congTy: string | null;
  maCorp: string | null;
  sdt: string | null;
  phuTrach: string | null;
  soDangKy: number;
  soDen: number;
}

// Bo cac tu chung trong ten cong ty de "CONG TY TNHH GRAB" khop "Cong ty Grab" va "Grab Vietnam":
// loai hinh doanh nghiep, ten nuoc, chi nhanh, va cac cum nganh chung hay bi viet tat (TM, DV, SX, XNK)
const CUM_CHUNG = /\b(trach nhiem huu han|mot thanh vien|co phan|tap doan|chi nhanh|joint stock|thuong mai|dich vu|san xuat|xuat nhap khau)\b/g;
const TU_CHUNG = new Set([
  "cong", "ty", "cty", "tnhh", "cp", "mtv", "jsc", "ltd", "llc", "inc", "pte", "co", "corp", "corporation", "company", "limited", "group",
  "cn", "tm", "dv", "sx", "xnk",
]);
export function khoaCty(congTy: string | null | undefined): string | null {
  const goc = boDau(congTy || "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!goc) return null;
  const t = goc
    .replace(CUM_CHUNG, " ")
    .split(" ")
    .filter((w) => w && !TU_CHUNG.has(w))
    .join(" ")
    // "Grab Vietnam" la "Grab"; ten bat dau bang Vietnam ("Vietnam Airlines") thi giu nguyen
    .replace(/(\S)\s+(viet nam|vietnam|vn)(?=\s|$)/g, "$1");
  // Ten chi gom tu chung (vd "Cong ty Dich vu Thuong mai") thi giu nguyen de khong gop nham
  return t || goc;
}
function khoaCorp(maCorp: string | null | undefined): string | null {
  const t = (maCorp || "").trim().toUpperCase();
  return t || null;
}
function khoaTenNguoi(hoTen: string): string {
  return boDau(hoTen || "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

type KhachKhop = { hoTen: string; sdt?: string | null; maCorp?: string | null; congTy?: string | null };

function cacKhoa(g: KhachKhop): string[] {
  const ten = khoaTenNguoi(g.hoTen);
  const ds: string[] = [];
  const sdt = chuanHoaSdt(g.sdt);
  if (sdt) ds.push(`sdt:${sdt}`);
  if (!ten) return ds;
  const corp = khoaCorp(g.maCorp);
  const cty = khoaCty(g.congTy);
  if (corp) ds.push(`corp:${corp}|${ten}`);
  if (cty) ds.push(`cty:${cty}|${ten}`);
  return ds;
}
function cacKhoaCongTy(g: { maCorp?: string | null; congTy?: string | null }): string[] {
  const ds: string[] = [];
  const corp = khoaCorp(g.maCorp);
  const cty = khoaCty(g.congTy);
  if (corp) ds.push(`corp:${corp}`);
  if (cty) ds.push(`cty:${cty}`);
  return ds;
}

// Moi con so co 2 don vi: so khach (nguoi) va so cong ty
export interface SoDoi {
  khach: number;
  congTy: number;
}
export interface ThongKeNam {
  nam: number;
  duocMoi: SoDoi; // khach chinh duoc moi nam do, va so cong ty cua ho
  daDen: SoDoi; // cong ty tinh la da den khi co it nhat 1 khach den
  moiLai: SoDoi; // nam nay da moi lai
  moiLaiDaDen: SoDoi; // nam do da den va nam nay duoc moi lai
  denChuaMoi: SoDoi; // nam do da den nhung nam nay chua moi
}
// Co cau khach nam nay so voi lich su: cac nhom khong chong len nhau, cong lai bang tong
export interface CoCauNamNay {
  tongKhach: number; // so thiep doi chieu duoc (khach chinh va khach di kem da co ten)
  chuaCoTen: number; // thiep khach di kem chua co ten nen chua doi chieu duoc
  khach: Record<LoaiLichSu, number>;
  tongCongTy: number;
  khongGhiCongTy: number; // so khach khong ghi cong ty
  congTy: { den: number; khongDen: number; moi: number };
}
// Khach nam nay dua vao doi chieu: can them so nguoi moi va khach di cung de tinh ca khach di kem
export type KhachNamNay = KhachKhop & { soNguoiMoi?: number; khachDiCung?: string | null };

export interface BoKhop {
  coDuLieu: boolean;
  nam: number | null; // nam moi nhat da tai
  khop: (g: KhachKhop) => LichSu | null;
  // Moi nam mot dong: so khach chinh va so cong ty nam do, bao nhieu da den, nam nay moi lai bao nhieu
  thongKe: (guests: KhachNamNay[]) => ThongKeNam[];
  // Khach va cong ty nam nay: cu hay moi
  coCau: (guests: KhachNamNay[]) => CoCauNamNay;
}

// Tai toan bo lich su (vai nghin dong) va tao ham khop trong bo nho. Co nhieu nam thi hien tung nam.
export async function taiBoKhop(prisma: PrismaClient): Promise<BoKhop> {
  const ds = (await prisma.khachNamTruoc.findMany({ orderBy: { nam: "desc" } })) as (DongLichSu & { laDiKem: boolean })[];
  if (ds.length === 0) {
    const rong: CoCauNamNay = { tongKhach: 0, chuaCoTen: 0, khach: { den: 0, khongDen: 0, congTy: 0, moi: 0 }, tongCongTy: 0, khongGhiCongTy: 0, congTy: { den: 0, khongDen: 0, moi: 0 } };
    return { coDuLieu: false, nam: null, khop: () => null, thongKe: () => [], coCau: () => rong };
  }

  const cacNam = [...new Set(ds.map((d) => d.nam))].sort((a, b) => b - a);
  const nam = cacNam[0];
  // Moi nam: chi muc theo nguoi, va thong ke theo cong ty (chi khach chinh)
  const theoNam = new Map<number, { nguoi: Map<string, DongLichSu & { laDiKem: boolean }>; cty: Map<string, { soMoi: number; soDen: number }> }>();
  for (const n of cacNam) theoNam.set(n, { nguoi: new Map(), cty: new Map() });
  for (const d of ds) {
    const t = theoNam.get(d.nam)!;
    // Uu tien khach chinh khi trung khoa voi nguoi di kem
    for (const k of cacKhoa(d)) {
      const cu = t.nguoi.get(k);
      if (!cu || (cu.laDiKem && !d.laDiKem)) t.nguoi.set(k, d);
    }
    if (d.laDiKem) continue;
    const daDem = new Set<string>();
    for (const k of cacKhoaCongTy(d)) {
      if (daDem.has(k)) continue;
      daDem.add(k);
      const r = t.cty.get(k) || { soMoi: 0, soDen: 0 };
      r.soMoi++;
      if (d.soDen > 0) r.soDen++;
      t.cty.set(k, r);
    }
  }

  const khop = (g: KhachKhop): LichSu => {
    const khoaNguoi = cacKhoa(g);
    const theoTungNam: { nam: number; d: DongLichSu & { laDiKem: boolean } }[] = [];
    for (const n of cacNam) {
      const d = khoaNguoi.map((k) => theoNam.get(n)!.nguoi.get(k)).find(Boolean);
      if (d) theoTungNam.push({ nam: n, d });
    }
    if (theoTungNam.length) {
      const nhan = theoTungNam.map(({ nam: n, d }) => `${n}: ${d.soDen > 0 ? "đã đến" : "mời, không đến"}`).join(" · ");
      const chiTiet = theoTungNam
        .map(({ nam: n, d }) => {
          const ai = d.phuTrach ? `, sales ${d.phuTrach}` : "";
          const vai = d.laDiKem ? " (là người đi kèm)" : "";
          return d.soDen > 0
            ? `Năm ${n} được mời${vai} ${d.soDangKy || 1} người, đã đến ${d.soDen} người${ai}.`
            : `Năm ${n} được mời${vai} ${d.soDangKy || 1} người nhưng không đến${ai}.`;
        })
        .join(" ");
      return { loai: theoTungNam[0].d.soDen > 0 ? "den" : "khongDen", nhan, chiTiet };
    }
    const khoaCt = cacKhoaCongTy(g);
    for (const n of cacNam) {
      const c = khoaCt.map((k) => theoNam.get(n)!.cty.get(k)).find(Boolean);
      if (c) {
        return {
          loai: "congTy",
          nhan: `${n}: cùng công ty`,
          chiTiet: `Năm ${n} khách này chưa được mời. Cùng công ty có ${c.soMoi} khách được mời, ${c.soDen} khách đã đến.`,
        };
      }
    }
    return { loai: "moi", nhan: "Khách mới", chiTiet: `Các năm ${cacNam.join(", ")} chưa mời khách này và cả công ty này.` };
  };

  // Moi thiep nam nay la mot nguoi: khach chinh, va khach di kem da co ten (cung cong ty voi khach chinh, khong co SDT rieng)
  const nguoiNamNay = (guests: KhachNamNay[]) => {
    const ds2: KhachKhop[] = [];
    let chuaCoTen = 0;
    for (const g of guests) {
      ds2.push(g);
      const soKem = Math.max(0, (g.soNguoiMoi ?? 1) - 1);
      let kem: { hoTen?: unknown }[] = [];
      try {
        const v = g.khachDiCung ? JSON.parse(g.khachDiCung) : [];
        if (Array.isArray(v)) kem = v;
      } catch {}
      for (let i = 0; i < soKem; i++) {
        const ten = String(kem[i]?.hoTen ?? "").trim();
        if (ten) ds2.push({ hoTen: ten, sdt: null, maCorp: g.maCorp, congTy: g.congTy });
        else chuaCoTen++;
      }
    }
    return { nguoi: ds2, chuaCoTen };
  };
  // Mot cong ty: lay ten da chuan hoa lam khoa chinh, khong co ten thi lay ma CORP
  const khoaChinhCty = (g: { maCorp?: string | null; congTy?: string | null }) => {
    const ks = cacKhoaCongTy(g);
    return ks.find((k) => k.startsWith("cty:")) || ks[0] || null;
  };
  // Cong ty tung nam: cac khoa de nhan ra (ten, ma CORP) va co khach nao den khong. Chi tinh khach chinh.
  const ctyTheoNam = new Map<number, Map<string, { khoa: Set<string>; den: boolean }>>();
  for (const n of cacNam) ctyTheoNam.set(n, new Map());
  for (const d of ds) {
    if (d.laDiKem) continue;
    const chinh = khoaChinhCty(d);
    if (!chinh) continue;
    const m = ctyTheoNam.get(d.nam)!;
    const r = m.get(chinh) || { khoa: new Set<string>(), den: false };
    for (const k of cacKhoaCongTy(d)) r.khoa.add(k);
    if (d.soDen > 0) r.den = true;
    m.set(chinh, r);
  }

  const thongKe = (guests: KhachNamNay[]): ThongKeNam[] => {
    const { nguoi } = nguoiNamNay(guests);
    const khoaNay = new Set<string>();
    for (const g of nguoi) for (const k of cacKhoa(g)) khoaNay.add(k);
    const ctyNay = new Set<string>();
    for (const g of guests) for (const k of cacKhoaCongTy(g)) ctyNay.add(k);
    return cacNam.map((n) => {
      const chinh = ds.filter((d) => d.nam === n && !d.laDiKem);
      const moiLai = chinh.filter((d) => cacKhoa(d).some((k) => khoaNay.has(k)));
      const daDen = chinh.filter((d) => d.soDen > 0).length;
      const moiLaiDaDen = moiLai.filter((d) => d.soDen > 0).length;
      const cty = [...ctyTheoNam.get(n)!.values()];
      const ctyMoiLai = cty.filter((c) => [...c.khoa].some((k) => ctyNay.has(k)));
      const ctyDen = cty.filter((c) => c.den).length;
      const ctyMoiLaiDen = ctyMoiLai.filter((c) => c.den).length;
      return {
        nam: n,
        duocMoi: { khach: chinh.length, congTy: cty.length },
        daDen: { khach: daDen, congTy: ctyDen },
        moiLai: { khach: moiLai.length, congTy: ctyMoiLai.length },
        moiLaiDaDen: { khach: moiLaiDaDen, congTy: ctyMoiLaiDen },
        denChuaMoi: { khach: daDen - moiLaiDaDen, congTy: ctyDen - ctyMoiLaiDen },
      };
    });
  };

  const coCau = (guests: KhachNamNay[]): CoCauNamNay => {
    const { nguoi, chuaCoTen } = nguoiNamNay(guests);
    const khach: Record<LoaiLichSu, number> = { den: 0, khongDen: 0, congTy: 0, moi: 0 };
    for (const g of nguoi) khach[khop(g).loai]++;
    // Cong ty nam nay: da tung den (bat ky nam nao), tung duoc moi nhung chua den, hay moi hoan toan
    const lichSuCty = new Map<string, boolean>(); // khoa -> da tung co khach den
    for (const m of ctyTheoNam.values()) for (const c of m.values()) for (const k of c.khoa) lichSuCty.set(k, (lichSuCty.get(k) || false) || c.den);
    const ctyNay = new Map<string, Set<string>>();
    let khongGhiCongTy = 0;
    for (const g of nguoi) {
      const chinh = khoaChinhCty(g);
      if (!chinh) {
        khongGhiCongTy++;
        continue;
      }
      const r = ctyNay.get(chinh) || new Set<string>();
      for (const k of cacKhoaCongTy(g)) r.add(k);
      ctyNay.set(chinh, r);
    }
    const congTy = { den: 0, khongDen: 0, moi: 0 };
    for (const ks of ctyNay.values()) {
      const khopDuoc = [...ks].filter((k) => lichSuCty.has(k));
      if (!khopDuoc.length) congTy.moi++;
      else if (khopDuoc.some((k) => lichSuCty.get(k))) congTy.den++;
      else congTy.khongDen++;
    }
    return { tongKhach: nguoi.length, chuaCoTen, khach, tongCongTy: ctyNay.size, khongGhiCongTy, congTy };
  };

  return { coDuLieu: true, nam, khop, thongKe, coCau };
}
