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

// Tai toan bo lich su (vai nghin dong) va tao ham khop trong bo nho. Co nhieu nam thi hien tung nam.
export async function taiBoKhop(prisma: PrismaClient): Promise<BoKhop> {
  const ds = (await prisma.khachNamTruoc.findMany({ orderBy: { nam: "desc" } })) as (DongLichSu & { laDiKem: boolean })[];
  if (ds.length === 0) return { coDuLieu: false, nam: null, khop: () => null, thongKe: () => ({ daMoiLai: 0, namTruocDaDen: 0, denNhungChuaMoiLai: 0, tongNamTruoc: 0 }) };

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

  const thongKe = (guests: KhachKhop[]) => {
    const khoaNay = new Set<string>();
    for (const g of guests) for (const k of cacKhoa(g)) khoaNay.add(k);
    const namMoiNhat = ds.filter((d) => d.nam === nam && !d.laDiKem);
    const daMoiLai = new Set(namMoiNhat.filter((d) => cacKhoa(d).some((k) => khoaNay.has(k))));
    return {
      tongNamTruoc: namMoiNhat.length,
      daMoiLai: daMoiLai.size,
      namTruocDaDen: namMoiNhat.filter((d) => d.soDen > 0).length,
      denNhungChuaMoiLai: namMoiNhat.filter((d) => d.soDen > 0 && !daMoiLai.has(d)).length,
    };
  };

  return { coDuLieu: true, nam, khop, thongKe };
}
