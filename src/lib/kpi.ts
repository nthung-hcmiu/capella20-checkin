// Tong hop so lieu theo venue de so voi KPI: thiep, cong ty, khach, doanh thu du kien
import { CHIEM_QUOTA, TRANG_THAI } from "./constants";
import { boDau, docTien } from "./format";

export interface KhachKpi {
  venueId: string;
  trangThai: string;
  congTy: string | null;
  maCorp: string | null;
  doanhThuDuKien: string | null;
  soNguoiMoi: number;
  soNguoiXacNhan: number | null;
  soNguoiDen: number | null;
}

export interface SoLieuVenue {
  thiep: number; // so thiep con hieu luc (chiem quota)
  soCongTy: number;
  soKhach: number; // so nguoi duoc moi con hieu luc, dung de so voi quota
  doanhThu: number;
  xacNhan: number; // so nguoi tham du da xac nhan
  checkin: number; // so nguoi da den
}

// Khoa cong ty: ma CORP neu co, khong thi ten cong ty bo dau
export function khoaCongTy(g: { congTy: string | null; maCorp: string | null }): string | null {
  if (g.maCorp?.trim()) return "corp:" + g.maCorp.trim().toUpperCase();
  if (g.congTy?.trim()) return "ten:" + boDau(g.congTy);
  return null;
}

export function rong(): SoLieuVenue {
  return { thiep: 0, soCongTy: 0, soKhach: 0, doanhThu: 0, xacNhan: 0, checkin: 0 };
}

// Doanh thu tinh mot lan cho moi cong ty (lay gia tri lon nhat neu nhieu khach cung cong ty ghi)
export function tongHopTheoVenue(guests: KhachKpi[]): Map<string, SoLieuVenue> {
  const kq = new Map<string, SoLieuVenue>();
  const congTy = new Map<string, Map<string, number>>();
  for (const g of guests) {
    if (g.trangThai === TRANG_THAI.DA_HUY) continue;
    const r = kq.get(g.venueId) || rong();
    if (CHIEM_QUOTA.includes(g.trangThai)) {
      r.thiep++;
      r.soKhach += g.soNguoiMoi;
    }
    if (g.trangThai === TRANG_THAI.THAM_DU || g.trangThai === TRANG_THAI.DA_CHECKIN) r.xacNhan += g.soNguoiXacNhan ?? g.soNguoiMoi;
    if (g.trangThai === TRANG_THAI.DA_CHECKIN) r.checkin += g.soNguoiDen ?? g.soNguoiXacNhan ?? g.soNguoiMoi;
    const tien = docTien(g.doanhThuDuKien);
    const k = khoaCongTy(g);
    const ct = congTy.get(g.venueId) || new Map<string, number>();
    if (k) ct.set(k, Math.max(ct.get(k) || 0, tien));
    else r.doanhThu += tien;
    congTy.set(g.venueId, ct);
    kq.set(g.venueId, r);
  }
  for (const [venueId, ct] of congTy) {
    const r = kq.get(venueId)!;
    r.soCongTy = ct.size;
    for (const t of ct.values()) r.doanhThu += t;
  }
  return kq;
}

export function cong(a: SoLieuVenue, b: SoLieuVenue): SoLieuVenue {
  return {
    thiep: a.thiep + b.thiep, soCongTy: a.soCongTy + b.soCongTy, soKhach: a.soKhach + b.soKhach,
    doanhThu: a.doanhThu + b.doanhThu, xacNhan: a.xacNhan + b.xacNhan, checkin: a.checkin + b.checkin,
  };
}
