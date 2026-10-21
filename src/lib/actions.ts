"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { TRANG_THAI } from "./constants";
import { capSoThuTu, sinhMaBiMatDuyNhat } from "./codes";
import { chuanHoaSdt } from "./format";

// Cac trang thai duoc tinh la dang chiem cho trong quota
const CHIEM_QUOTA = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_CHECKIN,
];

function lamTuoi() {
  revalidatePath("/admin");
  revalidatePath("/admin/khach");
  revalidatePath("/admin/duyet");
  revalidatePath("/admin/quota");
  revalidatePath("/admin/xepban");
  revalidatePath("/sales");
  revalidatePath("/");
}

export interface KetQuaTao {
  ok: boolean;
  thongBao: string;
  trangThai?: string;
  soThuTu?: number;
  maBiMat?: string;
}

// Tao khach moi voi quy tac chong trung, VIP, quota
export async function taoKhach(input: {
  hoTen: string;
  sdt: string;
  venueId: string;
  soNguoiMoi: number;
  salesOwner: string;
  isVip?: boolean;
  ghiChu?: string;
}): Promise<KetQuaTao> {
  const hoTen = input.hoTen?.trim();
  const sdt = chuanHoaSdt(input.sdt);
  if (!hoTen || !sdt || !input.venueId) {
    return { ok: false, thongBao: "Thieu ho ten, SDT hoac venue" };
  }

  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) return { ok: false, thongBao: "Venue khong hop le" };

  // Kiem tra trung SDT (bo qua khach da huy)
  const trung = await prisma.guest.findFirst({
    where: { sdt, trangThai: { not: TRANG_THAI.DA_HUY } },
  });

  // Kiem tra quota venue
  const dangChiem = await prisma.guest.count({
    where: { venueId: input.venueId, trangThai: { in: CHIEM_QUOTA } },
  });

  let trangThai: string = TRANG_THAI.NHAP;
  let lyDo: string | null = null;
  if (trung) {
    trangThai = TRANG_THAI.CHO_DUYET;
    lyDo = "TRUNG_SDT";
  } else if (input.isVip) {
    trangThai = TRANG_THAI.CHO_DUYET;
    lyDo = "VIP";
  } else if (venue.quota > 0 && dangChiem >= venue.quota) {
    trangThai = TRANG_THAI.DANH_SACH_CHO;
  }

  const soThuTu = await capSoThuTu(input.venueId);
  const maBiMat = await sinhMaBiMatDuyNhat();

  await prisma.guest.create({
    data: {
      soThuTu,
      maBiMat,
      hoTen,
      sdt,
      venueId: input.venueId,
      soNguoiMoi: input.soNguoiMoi || 1,
      salesOwner: input.salesOwner || "Sales",
      isVip: !!input.isVip,
      ghiChu: input.ghiChu || null,
      trangThai,
      lyDoChoDuyet: lyDo,
    },
  });

  lamTuoi();
  const note =
    trangThai === TRANG_THAI.CHO_DUYET
      ? lyDo === "TRUNG_SDT"
        ? "Trung SDT, chuyen hang cho BTC duyet"
        : "Khach VIP, cho BTC duyet"
      : trangThai === TRANG_THAI.DANH_SACH_CHO
      ? "Het quota venue, vao danh sach cho"
      : "Da tao ban nhap";
  return { ok: true, thongBao: note, trangThai, soThuTu, maBiMat };
}

// Duyet khach o hang cho -> phat hanh
export async function duyetKhach(id: string) {
  await prisma.guest.update({
    where: { id },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, lyDoChoDuyet: null, phatHanhLuc: new Date() },
  });
  lamTuoi();
}

// Tu choi / huy khach
export async function huyKhach(id: string) {
  await prisma.guest.update({ where: { id }, data: { trangThai: TRANG_THAI.DA_HUY } });
  lamTuoi();
}

// Phat hanh thiep (tu NHAP hoac DANH_SACH_CHO)
export async function phatHanh(id: string) {
  await prisma.guest.update({
    where: { id },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, phatHanhLuc: new Date() },
  });
  lamTuoi();
}

// Danh dau da gui thiep / da moi
export async function danhDauDaMoi(id: string) {
  await prisma.guest.update({ where: { id }, data: { trangThai: TRANG_THAI.DA_MOI } });
  lamTuoi();
}

// Doi trang thai tong quat
export async function doiTrangThai(id: string, trangThai: string) {
  await prisma.guest.update({ where: { id }, data: { trangThai } });
  lamTuoi();
}

// Xep ban
export async function xepBan(id: string, ban: string) {
  await prisma.guest.update({ where: { id }, data: { ban: ban.trim() || null } });
  lamTuoi();
}

// Cap nhat thong tin khach
export async function capNhatKhach(
  id: string,
  data: { hoTen?: string; sdt?: string; soNguoiMoi?: number; ghiChu?: string; isVip?: boolean }
) {
  await prisma.guest.update({ where: { id }, data });
  lamTuoi();
}
