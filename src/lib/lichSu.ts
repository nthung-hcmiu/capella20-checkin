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

// Bo cac tu chung trong ten cong ty de "CONG TY TNHH ABC" khop "Cong ty ABC"
const TU_CHUNG = new Set(["cong", "ty", "tnhh", "cp", "co", "phan", "mtv", "jsc", "ltd", "company", "limited", "tap", "doan"]);
export function khoaCty(congTy: string | null | undefined): string | null {
  const t = boDau(congTy || "").replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w && !TU_CHUNG.has(w)).join(" ");
  return t || null;
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

export interface BoKhop {
  coDuLieu: boolean;
  nam: number | null; // nam moi nhat da tai
  khop: (g: KhachKhop) => LichSu | null;
  thongKe: (guests: KhachKhop[]) => { daMoiLai: number; namTruocDaDen: number; denNhungChuaMoiLai: number; tongNamTruoc: number };
}

// Tai toan bo lich su (vai nghin dong) va tao ham khop trong bo nho
export async function taiBoKhop(prisma: PrismaClient): Promise<BoKhop> {
  const ds: DongLichSu[] = await prisma.khachNamTruoc.findMany({ orderBy: { nam: "desc" } });
  if (ds.length === 0) return { coDuLieu: false, nam: null, khop: () => null, thongKe: () => ({ daMoiLai: 0, namTruocDaDen: 0, denNhungChuaMoiLai: 0, tongNamTruoc: 0 }) };

  const nam = ds[0].nam;
  const theoKhoa = new Map<string, DongLichSu>();
  const theoCty = new Map<string, { soMoi: number; soDen: number; nam: number }>();
  for (const d of ds) {
    for (const k of cacKhoa(d)) if (!theoKhoa.has(k)) theoKhoa.set(k, d);
    // Thong ke cong ty chi tinh nam moi nhat
    if (d.nam !== nam) continue;
    const daDem = new Set<string>();
    for (const k of cacKhoaCongTy(d)) {
      if (daDem.has(k)) continue;
      daDem.add(k);
      const r = theoCty.get(k) || { soMoi: 0, soDen: 0, nam };
      r.soMoi++;
      if (d.soDen > 0) r.soDen++;
      theoCty.set(k, r);
    }
  }

  const khop = (g: KhachKhop): LichSu => {
    const d = cacKhoa(g).map((k) => theoKhoa.get(k)).find(Boolean);
    if (d) {
      const ai = d.phuTrach ? `, sales ${d.phuTrach}` : "";
      return d.soDen > 0
        ? { loai: "den", nhan: `${d.nam}: đã đến`, chiTiet: `Năm ${d.nam} được mời ${d.soDangKy || 1} người, đã đến ${d.soDen} người${ai}.` }
        : { loai: "khongDen", nhan: `${d.nam}: mời, không đến`, chiTiet: `Năm ${d.nam} được mời ${d.soDangKy || 1} người nhưng không đến${ai}.` };
    }
    const c = cacKhoaCongTy(g).map((k) => theoCty.get(k)).find(Boolean);
    if (c) {
      return {
        loai: "congTy",
        nhan: `${c.nam}: cùng công ty`,
        chiTiet: `Năm ${c.nam} khách này chưa được mời. Cùng công ty có ${c.soMoi} khách được mời, ${c.soDen} khách đã đến.`,
      };
    }
    return { loai: "moi", nhan: "Khách mới", chiTiet: `Năm ${nam} chưa mời khách này và cả công ty này.` };
  };

  const thongKe = (guests: KhachKhop[]) => {
    const khoaNay = new Set<string>();
    for (const g of guests) for (const k of cacKhoa(g)) khoaNay.add(k);
    const namMoiNhat = ds.filter((d) => d.nam === nam);
    const daMoiLaiDs = namMoiNhat.filter((d) => cacKhoa(d).some((k) => khoaNay.has(k)));
    return {
      tongNamTruoc: namMoiNhat.length,
      daMoiLai: daMoiLaiDs.length,
      namTruocDaDen: namMoiNhat.filter((d) => d.soDen > 0).length,
      denNhungChuaMoiLai: namMoiNhat.filter((d) => d.soDen > 0 && !daMoiLaiDs.includes(d)).length,
    };
  };

  return { coDuLieu: true, nam, khop, thongKe };
}
