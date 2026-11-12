"use server";

// Cap nhat nguoi phu trach hang loat tu file (vd danh sach gop cua venue):
// khop tung dong voi khach trong app theo ten + ma CORP / cong ty, dong khong co ten thi khop theo cong ty.
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { batBuocQuyen } from "./auth";
import { TRANG_THAI } from "./constants";
import { boDau } from "./format";
import { khoaCty } from "./lichSu";

export interface DongPhuTrach {
  hoTen: string;
  congTy: string;
  maCorp: string;
  sales: string;
}

export interface KetQuaPhuTrach {
  ok: boolean;
  thongBao: string;
  ghi: boolean;
  tongDong: number;
  doi: { soThuTu: number; hoTen: string; congTy: string | null; cu: string; moi: string }[];
  daDung: number; // khach da dung nguoi phu trach
  khongThay: { dong: number; hoTen: string; congTy: string }[];
  khongTaiKhoan: { sales: string; soDong: number }[];
  xungDot: { soThuTu: number; hoTen: string; cacSales: string[] }[];
}

const tenNguoi = (s: string) => boDau(s || "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const corp = (s: string | null | undefined) => (s || "").trim().toUpperCase() || null;

export async function capNhatPhuTrach(
  rows: DongPhuTrach[],
  tuyChon: { venueId?: string; dongBatDau: number; ghi: boolean }
): Promise<KetQuaPhuTrach> {
  await batBuocQuyen(["ADMIN"]);
  const rong: KetQuaPhuTrach = { ok: false, thongBao: "", ghi: false, tongDong: rows.length, doi: [], daDung: 0, khongThay: [], khongTaiKhoan: [], xungDot: [] };
  if (rows.length > 5000) return { ...rong, thongBao: "Mỗi lần tối đa 5.000 dòng." };

  const [khach, sales] = await Promise.all([
    prisma.guest.findMany({
      where: { trangThai: { not: TRANG_THAI.DA_HUY }, ...(tuyChon.venueId ? { venueId: tuyChon.venueId } : {}) },
      select: { id: true, soThuTu: true, hoTen: true, congTy: true, maCorp: true, salesOwner: true },
    }),
    prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true } }),
  ]);
  // Ten sales trong file -> ho ten tai khoan (khong phan biet dau, hoa thuong)
  const timSales = (t: string) => sales.find((s) => boDau(s.hoTen) === boDau(t))?.hoTen ?? null;

  // Chi muc khach theo cong ty / ma CORP
  const theoCty = new Map<string, typeof khach>();
  const them = (k: string | null, g: (typeof khach)[number]) => {
    if (!k) return;
    const ds = theoCty.get(k) || [];
    ds.push(g);
    theoCty.set(k, ds);
  };
  for (const g of khach) {
    const c = corp(g.maCorp);
    them(c ? `corp:${c}` : null, g);
    const t = khoaCty(g.congTy);
    them(t ? `cty:${t}` : null, g);
  }

  const ganCho = new Map<string, Set<string>>(); // guestId -> cac sales file muon gan
  const thieuTk = new Map<string, number>();
  rows.forEach((r, i) => {
    const dong = tuyChon.dongBatDau + i;
    if (!r.sales?.trim()) return;
    const moi = timSales(r.sales);
    if (!moi) {
      thieuTk.set(r.sales.trim(), (thieuTk.get(r.sales.trim()) || 0) + 1);
      return;
    }
    const ungVien = new Map<string, (typeof khach)[number]>();
    const c = corp(r.maCorp);
    for (const g of theoCty.get(c ? `corp:${c}` : "") || []) ungVien.set(g.id, g);
    const t = khoaCty(r.congTy);
    for (const g of theoCty.get(t ? `cty:${t}` : "") || []) ungVien.set(g.id, g);
    let khop = [...ungVien.values()];
    // Co ten khach thi uu tien dung nguoi; khong khop ten thi lay ca cong ty
    const ten = tenNguoi(r.hoTen);
    if (ten) {
      const dungTen = khop.filter((g) => tenNguoi(g.hoTen) === ten || tenNguoi(g.hoTen).split(" ").sort().join(" ") === ten.split(" ").sort().join(" "));
      if (dungTen.length) khop = dungTen;
    }
    if (!khop.length) {
      rong.khongThay.push({ dong, hoTen: r.hoTen, congTy: r.congTy });
      return;
    }
    for (const g of khop) {
      const s = ganCho.get(g.id) || new Set<string>();
      s.add(moi);
      ganCho.set(g.id, s);
    }
  });

  const capNhat: { id: string; moi: string }[] = [];
  for (const g of khach) {
    const s = ganCho.get(g.id);
    if (!s) continue;
    if (s.size > 1) {
      rong.xungDot.push({ soThuTu: g.soThuTu, hoTen: g.hoTen, cacSales: [...s] });
      continue;
    }
    const moi = [...s][0];
    if (g.salesOwner === moi) rong.daDung++;
    else {
      rong.doi.push({ soThuTu: g.soThuTu, hoTen: g.hoTen, congTy: g.congTy, cu: g.salesOwner, moi });
      capNhat.push({ id: g.id, moi });
    }
  }
  rong.doi.sort((a, b) => a.soThuTu - b.soThuTu);
  rong.khongTaiKhoan = [...thieuTk.entries()].map(([sales, soDong]) => ({ sales, soDong }));

  if (tuyChon.ghi && capNhat.length) {
    await prisma.$transaction(capNhat.map((x) => prisma.guest.update({ where: { id: x.id }, data: { salesOwner: x.moi } })));
    revalidatePath("/", "layout");
  }
  return {
    ...rong,
    ok: true,
    ghi: tuyChon.ghi,
    thongBao: tuyChon.ghi
      ? `Đã đổi người phụ trách cho ${capNhat.length} khách.`
      : `Kiểm tra xong: ${rong.doi.length} khách sẽ đổi người phụ trách, ${rong.daDung} khách đã đúng.`,
  };
}
