"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { TRANG_THAI } from "./constants";
import { boDau, chuanHoaSdt, sdtHopLe } from "./format";
import { batBuocQuyen } from "./auth";
import { TRUONG_CHU, khoaTen, lamSach, chuanSoGhe, type ThongTinThem } from "./khach";

export interface DongNhap extends ThongTinThem {
  hoTen: string;
  sdt: string;
  venue: string;
  soNguoiMoi: string;
  sales: string;
  vip: string;
  ghiChu: string;
  thiepGiay?: string;
}

export interface KetQuaDong {
  dong: number; // so dong trong file (bat dau tu 1, tinh ca dong tieu de)
  hoTen: string;
  congTy?: string | null;
  sdt: string;
  venueTen?: string;
  salesOwner?: string;
  trangThai?: string;
  soThuTu?: number;
  loi?: string;
  canhBao?: string;
}

export interface KetQuaNhap {
  ok: boolean;
  thongBao: string;
  ghi: boolean;
  dong: KetQuaDong[];
  tongHop: { hopLe: number; loi: number; choDuyet: number; danhSachCho: number; nhap: number; khongSdt: number };
}

const CHIEM_QUOTA = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_CHECKIN,
];
const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function laVip(s: string): boolean {
  return ["x", "co", "1", "yes", "y", "vip", "true", "dung"].includes(boDau(s));
}
function laCo(s: string): boolean {
  return ["x", "co", "1", "yes", "y", "true", "dung", "da nhan", "da gui", "roi"].includes(boDau(s));
}

export async function nhapDanhSach(
  rows: DongNhap[],
  tuyChon: { venueMacDinh?: string; salesMacDinh?: string; dongBatDau: number; ghi: boolean; vipDaDuyet?: boolean }
): Promise<KetQuaNhap> {
  await batBuocQuyen(["ADMIN"]);
  if (rows.length > 3000) {
    return { ok: false, thongBao: "Mỗi lần nhập tối đa 3.000 dòng.", ghi: false, dong: [], tongHop: { hopLe: 0, loi: 0, choDuyet: 0, danhSachCho: 0, nhap: 0, khongSdt: 0 } };
  }

  const [venues, salesAcc, daCo] = await Promise.all([
    prisma.venue.findMany(),
    prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true } }),
    prisma.guest.findMany({ select: { sdt: true, hoTen: true, maCorp: true, congTy: true, trangThai: true, soThuTu: true, venueId: true, maBiMat: true } }),
  ]);

  // Tim venue theo ten hoac ma, khong phan biet dau; "Riverside" khop "Riverside Palace"
  const timVenue = (text: string): { v: (typeof venues)[number]; chinhXac: boolean } | null => {
    const t = boDau(text);
    if (!t) return null;
    const bang = venues.find((v) => boDau(v.ten) === t || v.code.toLowerCase() === t);
    if (bang) return { v: bang, chinhXac: true };
    const gan = venues.filter((v) => boDau(v.ten).startsWith(t) || t.startsWith(boDau(v.ten)));
    if (gan.length === 1) return { v: gan[0], chinhXac: false };
    const chua = venues.filter((v) => boDau(v.ten).split(" ").includes(t));
    if (chua.length === 1) return { v: chua[0], chinhXac: false };
    const nam = venues.filter((v) => t.includes(boDau(v.ten)));
    return nam.length === 1 ? { v: nam[0], chinhXac: false } : null;
  };
  const timSales = (text: string) => {
    const t = boDau(text);
    if (!t) return null;
    return salesAcc.find((s) => boDau(s.hoTen) === t)?.hoTen ?? null;
  };

  const venueMacDinh = tuyChon.venueMacDinh ? venues.find((v) => v.id === tuyChon.venueMacDinh) : undefined;
  const conHieuLuc = daCo.filter((g) => g.trangThai !== TRANG_THAI.DA_HUY);
  const sdtDaCo = new Set(conHieuLuc.map((g) => g.sdt).filter(Boolean) as string[]);
  const tenDaCo = new Set(conHieuLuc.map((g) => khoaTen(g.hoTen, g.maCorp, g.congTy)).filter(Boolean) as string[]);
  const soDaDung = new Set(daCo.map((g) => g.soThuTu));
  const maDaDung = new Set(daCo.map((g) => g.maBiMat));
  const dangChiem: Record<string, number> = {};
  for (const g of daCo) if (CHIEM_QUOTA.includes(g.trangThai as any)) dangChiem[g.venueId] = (dangChiem[g.venueId] || 0) + 1;
  const conTro: Record<string, number> = {};

  const capSo = (venueId: string): number | null => {
    const v = venues.find((x) => x.id === venueId)!;
    let n = conTro[venueId] ?? v.rangeStart;
    while (n <= v.rangeEnd && soDaDung.has(n)) n++;
    if (n > v.rangeEnd) return null;
    soDaDung.add(n);
    conTro[venueId] = n + 1;
    return n;
  };
  const sinhMa = () => {
    let ma = "";
    do {
      ma = "";
      for (let i = 0; i < 8; i++) ma += BANG_MA[Math.floor(Math.random() * BANG_MA.length)];
    } while (maDaDung.has(ma));
    maDaDung.add(ma);
    return ma;
  };

  const ketQua: KetQuaDong[] = [];
  const duLieuGhi: any[] = [];
  const tongHop = { hopLe: 0, loi: 0, choDuyet: 0, danhSachCho: 0, nhap: 0, khongSdt: 0 };

  rows.forEach((r, i) => {
    const dong = tuyChon.dongBatDau + i;
    const hoTen = String(r.hoTen || "").trim().replace(/\s+/g, " ");
    const sdtGoc = String(r.sdt || "").trim();
    const kq: KetQuaDong = { dong, hoTen, sdt: sdtGoc };
    ketQua.push(kq);

    if (!hoTen && !sdtGoc) {
      kq.loi = "Dòng trống";
      tongHop.loi++;
      return;
    }
    if (!hoTen) {
      kq.loi = "Thiếu họ tên";
      tongHop.loi++;
      return;
    }
    const sdt = sdtGoc ? chuanHoaSdt(sdtGoc) : "";
    kq.sdt = sdt || sdtGoc;
    if (sdtGoc && !sdtHopLe(sdt)) {
      kq.loi = "Số điện thoại không hợp lệ";
      tongHop.loi++;
      return;
    }
    const them = lamSach(Object.fromEntries(TRUONG_CHU.map((k) => [k, r[k] ?? null])) as ThongTinThem);
    them.soGhe = chuanSoGhe(r.soGhe);
    const khoa = khoaTen(hoTen, them.maCorp, them.congTy);
    kq.congTy = them.congTy;
    const khopVenue = r.venue?.trim() ? timVenue(r.venue) : venueMacDinh ? { v: venueMacDinh, chinhXac: true } : null;
    const venue = khopVenue?.v;
    if (!venue) {
      kq.loi = r.venue?.trim() ? `Không nhận ra venue "${r.venue}"` : "Thiếu venue";
      tongHop.loi++;
      return;
    }
    kq.venueTen = venue.ten;
    const canhBao: string[] = [];
    if (khopVenue && !khopVenue.chinhXac) canhBao.push(`Venue ghi "${r.venue.trim()}", đã hiểu là ${venue.ten}`);

    const salesKhop = timSales(r.sales);
    const salesOwner = salesKhop || String(r.sales || "").trim() || tuyChon.salesMacDinh?.trim() || "BTC";
    kq.salesOwner = salesOwner;
    if (r.sales?.trim() && !salesKhop) canhBao.push("Sales chưa có tài khoản, sales đó sẽ không thấy khách này");

    const soNguoiGoc = parseInt(String(r.soNguoiMoi ?? "").trim() || "1", 10);
    const soNguoi = Math.min(10, Math.max(1, Number.isFinite(soNguoiGoc) ? soNguoiGoc : 1));
    if (soNguoiGoc === 0) canhBao.push("Số người ghi 0, đã tính là 1");
    const vip = laVip(String(r.vip || ""));

    let trangThai: string = TRANG_THAI.NHAP;
    let lyDo: string | null = null;
    if (sdt && sdtDaCo.has(sdt)) {
      trangThai = TRANG_THAI.CHO_DUYET;
      lyDo = "TRUNG_SDT";
    } else if (khoa && tenDaCo.has(khoa)) {
      trangThai = TRANG_THAI.CHO_DUYET;
      lyDo = "TRUNG_TEN";
    } else if (vip && !tuyChon.vipDaDuyet) {
      trangThai = TRANG_THAI.CHO_DUYET;
      lyDo = "VIP";
    } else if (!vip && venue.quota > 0 && (dangChiem[venue.id] || 0) >= venue.quota) {
      trangThai = TRANG_THAI.DANH_SACH_CHO;
    }

    const soThuTu = capSo(venue.id);
    if (soThuTu === null) {
      kq.loi = `Hết số thứ tự trong dải ${venue.rangeStart} đến ${venue.rangeEnd}`;
      tongHop.loi++;
      return;
    }

    if (sdt) sdtDaCo.add(sdt);
    if (khoa) tenDaCo.add(khoa);
    if (CHIEM_QUOTA.includes(trangThai as any)) dangChiem[venue.id] = (dangChiem[venue.id] || 0) + 1;
    kq.trangThai = trangThai;
    kq.soThuTu = soThuTu;
    if (lyDo === "TRUNG_SDT") canhBao.unshift("Trùng SĐT với khách đã có, chờ BTC duyệt");
    if (lyDo === "TRUNG_TEN") canhBao.unshift("Trùng tên và công ty với khách đã có, chờ BTC duyệt");
    if (canhBao.length) kq.canhBao = canhBao.join(". ");
    tongHop.hopLe++;
    if (!sdt) tongHop.khongSdt++;
    if (trangThai === TRANG_THAI.CHO_DUYET) tongHop.choDuyet++;
    else if (trangThai === TRANG_THAI.DANH_SACH_CHO) tongHop.danhSachCho++;
    else tongHop.nhap++;

    duLieuGhi.push({
      ...them,
      soThuTu, maBiMat: sinhMa(), hoTen, sdt: sdt || null, venueId: venue.id, soNguoiMoi: soNguoi,
      salesOwner, isVip: vip, ghiChu: String(r.ghiChu || "").trim() || null, trangThai, lyDoChoDuyet: lyDo,
      daGuiThiepGiay: laCo(String(r.thiepGiay || "")),
    });
  });

  if (!tuyChon.ghi) {
    return { ok: true, thongBao: `Kiểm tra xong: ${tongHop.hopLe} dòng hợp lệ, ${tongHop.loi} dòng lỗi.`, ghi: false, dong: ketQua, tongHop };
  }
  if (duLieuGhi.length === 0) {
    return { ok: false, thongBao: "Không có dòng hợp lệ để nhập.", ghi: false, dong: ketQua, tongHop };
  }
  await prisma.guest.createMany({ data: duLieuGhi });
  revalidatePath("/", "layout");
  return {
    ok: true,
    thongBao: `Đã nhập ${duLieuGhi.length} khách. ${tongHop.loi > 0 ? `Bỏ qua ${tongHop.loi} dòng lỗi.` : ""}`.trim(),
    ghi: true,
    dong: ketQua,
    tongHop,
  };
}
