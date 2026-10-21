"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { TRANG_THAI } from "./constants";
import { capSoThuTu, sinhMaBiMatDuyNhat } from "./codes";
import { chuanHoaSdt } from "./format";
import { batBuocQuyen, bamMatKhau } from "./auth";
import { gieoDuLieu } from "./seedData";

// Cac trang thai duoc tinh la dang chiem cho trong quota
const CHIEM_QUOTA = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_CHECKIN,
];

function lamTuoi() {
  revalidatePath("/", "layout");
}

export interface KetQua {
  ok: boolean;
  thongBao: string;
}

export interface KetQuaTao extends KetQua {
  trangThai?: string;
  soThuTu?: number;
  maBiMat?: string;
}

// Tao khach moi voi quy tac chong trung, VIP, quota. Sales chi tao duoc khach cho chinh minh.
export async function taoKhach(input: {
  hoTen: string;
  sdt: string;
  venueId: string;
  soNguoiMoi: number;
  salesOwner?: string;
  isVip?: boolean;
  ghiChu?: string;
}): Promise<KetQuaTao> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const hoTen = input.hoTen?.trim();
  const sdt = chuanHoaSdt(input.sdt);
  if (!hoTen || !sdt || !input.venueId) {
    return { ok: false, thongBao: "Thiếu họ tên, số điện thoại hoặc venue." };
  }
  if (!/^0\d{9,10}$/.test(sdt)) return { ok: false, thongBao: "Số điện thoại chưa đúng (cần 10 hoặc 11 số, bắt đầu bằng 0)." };

  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) return { ok: false, thongBao: "Venue không hợp lệ." };

  const trung = await prisma.guest.findFirst({ where: { sdt, trangThai: { not: TRANG_THAI.DA_HUY } } });
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

  let soThuTu: number, maBiMat: string;
  try {
    soThuTu = await capSoThuTu(input.venueId);
    maBiMat = await sinhMaBiMatDuyNhat();
  } catch (e: any) {
    return { ok: false, thongBao: e?.message || "Không cấp được số thứ tự." };
  }

  await prisma.guest.create({
    data: {
      soThuTu,
      maBiMat,
      hoTen,
      sdt,
      venueId: input.venueId,
      soNguoiMoi: Math.min(10, Math.max(1, input.soNguoiMoi || 1)),
      salesOwner: u.vaiTro === "SALES" ? u.hoTen : input.salesOwner?.trim() || u.hoTen,
      isVip: !!input.isVip,
      ghiChu: input.ghiChu?.trim() || null,
      trangThai,
      lyDoChoDuyet: lyDo,
    },
  });

  lamTuoi();
  const note =
    trangThai === TRANG_THAI.CHO_DUYET
      ? lyDo === "TRUNG_SDT"
        ? "Trùng số điện thoại, đã chuyển BTC duyệt"
        : "Khách VIP, chờ BTC duyệt"
      : trangThai === TRANG_THAI.DANH_SACH_CHO
      ? "Venue đã hết quota, khách vào danh sách chờ"
      : "Đã tạo bản nháp";
  return { ok: true, thongBao: note, trangThai, soThuTu, maBiMat };
}

export async function duyetKhach(id: string) {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.update({
    where: { id },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, lyDoChoDuyet: null, phatHanhLuc: new Date() },
  });
  lamTuoi();
}

export async function huyKhach(id: string) {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.update({ where: { id }, data: { trangThai: TRANG_THAI.DA_HUY } });
  lamTuoi();
}

export async function phatHanh(id: string) {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.update({
    where: { id },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, phatHanhLuc: new Date() },
  });
  lamTuoi();
}

// Danh dau da gui thiep: BTC, hoac sales cho khach cua chinh minh
export async function danhDauDaMoi(id: string) {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g) return;
  if (u.vaiTro === "SALES" && g.salesOwner !== u.hoTen) return;
  if (g.trangThai !== TRANG_THAI.DA_PHAT_HANH) return;
  await prisma.guest.update({ where: { id }, data: { trangThai: TRANG_THAI.DA_MOI } });
  lamTuoi();
}

export async function xepBan(id: string, ban: string) {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.update({ where: { id }, data: { ban: ban.trim() || null } });
  lamTuoi();
}

// ===== Xoa du lieu =====

export async function xoaKhach(id: string): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.delete({ where: { id } }).catch(() => null);
  lamTuoi();
  return { ok: true, thongBao: "Đã xóa khách." };
}

export async function xoaToanBoKhach(xacNhan: string): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  if (xacNhan.trim().toUpperCase() !== "XÓA" && xacNhan.trim().toUpperCase() !== "XOA") {
    return { ok: false, thongBao: "Gõ đúng chữ XÓA để xác nhận." };
  }
  const n = await prisma.guest.count();
  await prisma.checkinLog.deleteMany();
  await prisma.guest.deleteMany();
  lamTuoi();
  return { ok: true, thongBao: `Đã xóa toàn bộ ${n} khách và nhật ký check in. Tài khoản và venue được giữ nguyên.` };
}

export async function napDuLieuMau(): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  const { tong } = await gieoDuLieu(prisma, { giuTaiKhoan: true });
  lamTuoi();
  return { ok: true, thongBao: `Đã nạp ${tong} khách mẫu. Tài khoản được giữ nguyên.` };
}

// ===== Tai khoan =====

export async function taoTaiKhoan(input: {
  hoTen: string;
  username: string;
  vaiTro: string;
  ca?: string;
  matKhau: string;
  batDoi: boolean;
}): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  const hoTen = input.hoTen.trim();
  const username = input.username.trim().toLowerCase();
  if (!hoTen) return { ok: false, thongBao: "Nhập họ tên." };
  if (!/^[a-z0-9._]{3,32}$/.test(username)) {
    return { ok: false, thongBao: "Tên đăng nhập 3 đến 32 ký tự, chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới." };
  }
  if (!["ADMIN", "SALES", "LE_TAN"].includes(input.vaiTro)) return { ok: false, thongBao: "Vai trò không hợp lệ." };
  if (input.matKhau.length < 8) return { ok: false, thongBao: "Mật khẩu tối thiểu 8 ký tự." };
  if (await prisma.staffUser.findUnique({ where: { username } })) {
    return { ok: false, thongBao: "Tên đăng nhập đã tồn tại." };
  }
  await prisma.staffUser.create({
    data: {
      hoTen,
      username,
      vaiTro: input.vaiTro,
      ca: input.vaiTro === "LE_TAN" ? input.ca?.trim() || null : null,
      matKhau: bamMatKhau(input.matKhau),
      doiMatKhau: input.batDoi,
    },
  });
  lamTuoi();
  return { ok: true, thongBao: `Đã tạo tài khoản ${username}.` };
}

export async function datMatKhau(id: string, matKhau: string, batDoi: boolean): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  if (matKhau.length < 8) return { ok: false, thongBao: "Mật khẩu tối thiểu 8 ký tự." };
  await prisma.staffUser.update({ where: { id }, data: { matKhau: bamMatKhau(matKhau), doiMatKhau: batDoi } });
  await prisma.phienDangNhap.deleteMany({ where: { userId: id } });
  lamTuoi();
  return { ok: true, thongBao: "Đã đặt mật khẩu mới." };
}

// Dat cung mot mat khau cho moi tai khoan chua co mat khau (tien cho dot dung thu)
export async function datMatKhauChung(matKhau: string): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  if (matKhau.length < 8) return { ok: false, thongBao: "Mật khẩu tối thiểu 8 ký tự." };
  const ds = await prisma.staffUser.findMany({ where: { NOT: { matKhau: { startsWith: "scrypt$" } } } });
  for (const t of ds) {
    await prisma.staffUser.update({ where: { id: t.id }, data: { matKhau: bamMatKhau(matKhau), doiMatKhau: false } });
  }
  lamTuoi();
  return { ok: true, thongBao: `Đã đặt mật khẩu cho ${ds.length} tài khoản.` };
}

export async function xoaTaiKhoan(id: string): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN"]);
  if (id === u.id) return { ok: false, thongBao: "Không thể tự xóa tài khoản đang đăng nhập." };
  const t = await prisma.staffUser.findUnique({ where: { id } });
  if (!t) return { ok: false, thongBao: "Không tìm thấy tài khoản." };
  if (t.vaiTro === "ADMIN") {
    const soBTC = await prisma.staffUser.count({ where: { vaiTro: "ADMIN", matKhau: { startsWith: "scrypt$" } } });
    if (soBTC <= 1) return { ok: false, thongBao: "Phải giữ ít nhất một tài khoản BTC." };
  }
  await prisma.staffUser.delete({ where: { id } });
  lamTuoi();
  return { ok: true, thongBao: `Đã xóa tài khoản ${t.username}.` };
}
