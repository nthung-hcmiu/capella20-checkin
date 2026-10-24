"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { CHIEM_QUOTA, TRANG_THAI } from "./constants";
import { boDau, chuanHoaSdt, sdtHopLe } from "./format";
import { batBuocQuyen } from "./auth";
import { LINH_VUC, PHAN_LOAI_KHACH, TRUONG_CHU, ghiDiCung, khoaTen, lamSach, thieuThongTinMoi, type ThongTinThem } from "./khach";

export interface DongNhap extends ThongTinThem {
  hoTen: string;
  sdt: string;
  venue: string;
  soNguoiMoi: string;
  sales: string;
  vip: string;
  ghiChu: string;
  thiepGiay?: string;
  diCungTen?: string;
  diCungChucVu?: string;
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

export interface TongHopNhap {
  hopLe: number;
  loi: number;
  nhap: number;
  choDuyet: number;
  phatHanh: number;
  canhBao: number;
  khongSdt: number;
}

export interface KetQuaNhap {
  ok: boolean;
  thongBao: string;
  ghi: boolean;
  dong: KetQuaDong[];
  tongHop: TongHopNhap;
}

const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function laVip(s: string): boolean {
  return ["x", "co", "1", "yes", "y", "vip", "true", "dung"].includes(boDau(s));
}
function laCo(s: string): boolean {
  return ["x", "co", "1", "yes", "y", "true", "dung", "da nhan", "da gui", "roi"].includes(boDau(s));
}

function tongHopRong(): TongHopNhap {
  return { hopLe: 0, loi: 0, nhap: 0, choDuyet: 0, phatHanh: 0, canhBao: 0, khongSdt: 0 };
}

export async function nhapDanhSach(
  rows: DongNhap[],
  tuyChon: {
    venueMacDinh?: string;
    salesMacDinh?: string;
    dongBatDau: number;
    ghi: boolean;
    trangThaiDich?: "NHAP" | "CHO_DUYET" | "DA_PHAT_HANH";
  }
): Promise<KetQuaNhap> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  // Sales chi nhap khach cho chinh minh, vao Nhap hoac Cho duyet
  const laSales = u.vaiTro === "SALES";
  const toiDa = laSales ? 500 : 3000;
  if (rows.length > toiDa) {
    return { ok: false, thongBao: `Mỗi lần nhập tối đa ${toiDa.toLocaleString("vi-VN")} dòng.`, ghi: false, dong: [], tongHop: tongHopRong() };
  }
  let dich: string = tuyChon.trangThaiDich || TRANG_THAI.CHO_DUYET;
  if (laSales && dich === TRANG_THAI.DA_PHAT_HANH) dich = TRANG_THAI.NHAP;

  const [venues, salesAcc, daCo] = await Promise.all([
    prisma.venue.findMany(),
    prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true } }),
    prisma.guest.findMany({ select: { sdt: true, hoTen: true, maCorp: true, congTy: true, trangThai: true, soThuTu: true, venueId: true, maBiMat: true, soNguoiMoi: true } }),
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
  const venueSales = laSales && u.venueId ? venues.find((v) => v.id === u.venueId) : undefined;
  const conHieuLuc = daCo.filter((g) => g.trangThai !== TRANG_THAI.DA_HUY);
  const sdtDaCo = new Set(conHieuLuc.map((g) => g.sdt).filter(Boolean) as string[]);
  const tenDaCo = new Set(conHieuLuc.map((g) => khoaTen(g.hoTen, g.maCorp, g.congTy)).filter(Boolean) as string[]);
  const soDaDung = new Set(daCo.map((g) => g.soThuTu));
  const maDaDung = new Set(daCo.map((g) => g.maBiMat));
  const dangChiem: Record<string, number> = {};
  // Quota dem theo nguoi
  for (const g of daCo) if (CHIEM_QUOTA.includes(g.trangThai)) dangChiem[g.venueId] = (dangChiem[g.venueId] || 0) + g.soNguoiMoi;
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
  const tongHop = tongHopRong();

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
    const khoa = khoaTen(hoTen, them.maCorp, them.congTy);
    kq.congTy = them.congTy;
    // Sales thuoc venue: moi dong deu vao venue cua sales, bo qua cot venue trong file
    const khopVenue = venueSales
      ? { v: venueSales, chinhXac: true }
      : r.venue?.trim() ? timVenue(r.venue) : venueMacDinh ? { v: venueMacDinh, chinhXac: true } : null;
    const venue = khopVenue?.v;
    if (!venue) {
      kq.loi = r.venue?.trim() ? `Không nhận ra venue "${r.venue}"` : "Thiếu venue";
      tongHop.loi++;
      return;
    }
    kq.venueTen = venue.ten;
    const canhBao: string[] = [];
    if (khopVenue && !khopVenue.chinhXac) canhBao.push(`Venue ghi "${r.venue.trim()}", đã hiểu là ${venue.ten}`);

    const salesKhop = laSales ? u.hoTen : timSales(r.sales);
    const salesOwner = laSales ? u.hoTen : salesKhop || String(r.sales || "").trim() || tuyChon.salesMacDinh?.trim() || "BTC";
    kq.salesOwner = salesOwner;
    if (!laSales && r.sales?.trim() && !salesKhop) canhBao.push("Sales chưa có tài khoản, sales đó sẽ không thấy khách này");

    const soNguoiGoc = parseInt(String(r.soNguoiMoi ?? "").trim() || "1", 10);
    const soNguoi = Math.min(10, Math.max(1, Number.isFinite(soNguoiGoc) ? soNguoiGoc : 1));
    if (soNguoiGoc === 0) canhBao.push("Số người ghi 0, đã tính là 1");
    const vip = laVip(String(r.vip || ""));
    // Khach thu 2: file chi co mot cap cot ten / chuc vu
    const khachDiCung =
      soNguoi >= 2 ? ghiDiCung([{ hoTen: String(r.diCungTen || "").trim(), chucVu: String(r.diCungChucVu || "").trim() }]) : null;
    const thieu = thieuThongTinMoi({ chucVu: them.chucVu, soNguoiMoi: soNguoi, khachDiCung });
    if (thieu) canhBao.push(`${thieu}, bổ sung trên app trước khi gửi duyệt`);
    if (soNguoi > 2) canhBao.push("File chỉ nhập được khách thứ 2, người thứ 3 trở đi bổ sung trên app");
    if (them.linhVuc && !LINH_VUC.includes(them.linhVuc)) canhBao.push(`Lĩnh vực "${them.linhVuc}" ngoài danh sách`);
    if (them.nguonKhach && !PHAN_LOAI_KHACH.includes(them.nguonKhach)) canhBao.push(`Phân loại khách "${them.nguonKhach}" không phải Khách cũ / Khách tiềm năng`);

    // Canh bao cho BTC. Khach trung luon vao Cho duyet; con lai theo lua chon nhap.
    const ds: string[] = [];
    if (sdt && sdtDaCo.has(sdt)) ds.push("TRUNG_SDT");
    else if (khoa && tenDaCo.has(khoa)) ds.push("TRUNG_TEN");
    if (vip) ds.push("VIP");
    if (venue.quota > 0 && (dangChiem[venue.id] || 0) + soNguoi > venue.quota) ds.push("HET_QUOTA");
    const trung = ds[0] === "TRUNG_SDT" || ds[0] === "TRUNG_TEN";
    // Phat hanh ve thang chi khi khong trung; khach trung vao Cho duyet
    const trangThai: string = dich === TRANG_THAI.DA_PHAT_HANH && trung ? TRANG_THAI.CHO_DUYET : dich;
    const lyDo = trangThai !== TRANG_THAI.DA_PHAT_HANH && ds.length ? ds.join(",") : null;

    const soThuTu = capSo(venue.id);
    if (soThuTu === null) {
      kq.loi = `Hết số thứ tự trong dải ${venue.rangeStart} đến ${venue.rangeEnd}`;
      tongHop.loi++;
      return;
    }

    if (sdt) sdtDaCo.add(sdt);
    if (khoa) tenDaCo.add(khoa);
    if (CHIEM_QUOTA.includes(trangThai)) dangChiem[venue.id] = (dangChiem[venue.id] || 0) + soNguoi;
    kq.trangThai = trangThai;
    kq.soThuTu = soThuTu;
    if (ds.includes("HET_QUOTA")) canhBao.unshift(`${venue.ten} đã hết quota`);
    if (ds[0] === "TRUNG_SDT") canhBao.unshift("Trùng SĐT với khách đã có, BTC sẽ xem khi duyệt");
    if (ds[0] === "TRUNG_TEN") canhBao.unshift("Trùng tên và công ty với khách đã có, BTC sẽ xem khi duyệt");
    if (canhBao.length) kq.canhBao = canhBao.join(". ");
    tongHop.hopLe++;
    if (!sdt) tongHop.khongSdt++;
    if (trangThai === TRANG_THAI.NHAP) tongHop.nhap++;
    else if (trangThai === TRANG_THAI.CHO_DUYET) tongHop.choDuyet++;
    else tongHop.phatHanh++;
    if (ds.length) tongHop.canhBao++;

    duLieuGhi.push({
      ...them,
      soThuTu, maBiMat: sinhMa(), hoTen, sdt: sdt || null, venueId: venue.id, soNguoiMoi: soNguoi, khachDiCung,
      salesOwner, isVip: vip, ghiChu: String(r.ghiChu || "").trim() || null, trangThai, lyDoChoDuyet: lyDo,
      phatHanhLuc: trangThai === TRANG_THAI.DA_PHAT_HANH ? new Date() : null,
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
