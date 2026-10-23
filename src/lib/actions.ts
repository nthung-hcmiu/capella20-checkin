"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { CHIEM_QUOTA, CHUA_PHAT_HANH, DUOC_XAC_NHAN, NHAN_CANH_BAO, TRANG_THAI } from "./constants";
import { capSoThuTu, sinhMaBiMatDuyNhat } from "./codes";
import { chuanHoaSdt, sdtHopLe } from "./format";
import { ghiDiCung, khoaTen, lamSach, lamSachDiCung, thieuThongTinMoi, type NguoiDiCung, type ThongTinThem } from "./khach";
import { batBuocQuanTri, batBuocQuyen, bamMatKhau } from "./auth";
import { gieoDuLieu } from "./seedData";
import { chuanHoTen, tenDangNhapGoiY } from "./taiKhoan";
import crypto from "crypto";

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

// Tim khach trung: theo SDT neu co, khong thi theo ten + ma CORP / cong ty
async function timKhachTrung(
  k: { sdt: string | null; hoTen: string; maCorp?: string | null; congTy?: string | null },
  boQuaId?: string
) {
  const khongTinh = { trangThai: { not: TRANG_THAI.DA_HUY }, ...(boQuaId ? { id: { not: boQuaId } } : {}) };
  if (k.sdt) {
    const g = await prisma.guest.findFirst({ where: { sdt: k.sdt, ...khongTinh } });
    if (g) return { g, lyDo: "TRUNG_SDT" };
  }
  const khoa = khoaTen(k.hoTen, k.maCorp, k.congTy);
  if (!khoa) return null;
  const ungVien = await prisma.guest.findMany({
    where: { ...khongTinh, OR: [k.maCorp ? { maCorp: k.maCorp } : {}, k.congTy ? { congTy: k.congTy } : {}].filter((o) => Object.keys(o).length) },
    take: 200,
  });
  const g = ungVien.find((x) => khoaTen(x.hoTen, x.maCorp, x.congTy) === khoa);
  return g ? { g, lyDo: "TRUNG_TEN" } : null;
}

// Tinh canh bao cho BTC khi duyet: trung SDT, trung ten cung cong ty, VIP, venue het quota.
// Luu trong lyDoChoDuyet, ngan cach dau phay. Canh bao khong chan, chi de BTC xem.
async function tinhCanhBao(
  k: { sdt: string | null; hoTen: string; maCorp?: string | null; congTy?: string | null; isVip: boolean; venueId: string },
  boQuaId?: string
) {
  const ds: string[] = [];
  const trung = await timKhachTrung(k, boQuaId);
  if (trung) ds.push(trung.lyDo);
  if (k.isVip) ds.push("VIP");
  const venue = await prisma.venue.findUnique({ where: { id: k.venueId } });
  if (venue && venue.quota > 0) {
    const dangChiem = await prisma.guest.count({
      where: { venueId: k.venueId, trangThai: { in: CHIEM_QUOTA }, ...(boQuaId ? { id: { not: boQuaId } } : {}) },
    });
    if (dangChiem >= venue.quota) ds.push("HET_QUOTA");
  }
  return { lyDo: ds.length ? ds.join(",") : null, trung };
}

function moTaCanhBao(lyDo: string | null) {
  if (!lyDo) return "";
  return lyDo.split(",").map((x) => NHAN_CANH_BAO[x] || x).join(", ");
}

// Tao khach moi: luon la Nhap. Sales chi tao duoc khach cho chinh minh.
export async function taoKhach(input: {
  hoTen: string;
  sdt?: string;
  venueId: string;
  soNguoiMoi: number;
  salesOwner?: string;
  isVip?: boolean;
  ghiChu?: string;
  them?: ThongTinThem;
  diCung?: NguoiDiCung[];
}): Promise<KetQuaTao> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  // Sales thuoc mot venue thi chi moi khach cho venue do
  if (u.vaiTro === "SALES" && u.venueId) input = { ...input, venueId: u.venueId };
  const hoTen = input.hoTen?.trim().replace(/\s+/g, " ");
  const sdt = chuanHoaSdt(input.sdt) || null;
  if (!hoTen || !input.venueId) {
    return { ok: false, thongBao: "Thiếu họ tên hoặc venue." };
  }
  if (sdt && !sdtHopLe(sdt)) return { ok: false, thongBao: "Số điện thoại chưa đúng (cần 10 hoặc 11 số, bắt đầu bằng 0). Không có thì để trống." };
  const them = lamSach(input.them || {});
  const soNguoiMoi = Math.min(10, Math.max(1, input.soNguoiMoi || 1));
  const khachDiCung = ghiDiCung(lamSachDiCung(input.diCung, soNguoiMoi));
  // Moi khach deu phai co ten va chuc vu, ke ca nguoi thu 2 tro di
  const thieu = thieuThongTinMoi({ chucVu: them.chucVu, soNguoiMoi, khachDiCung });
  if (thieu) return { ok: false, thongBao: `${thieu}.` };

  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) return { ok: false, thongBao: "Venue không hợp lệ." };

  const { lyDo, trung } = await tinhCanhBao({
    sdt, hoTen, maCorp: them.maCorp, congTy: them.congTy, isVip: !!input.isVip, venueId: input.venueId,
  });

  let soThuTu: number, maBiMat: string;
  try {
    soThuTu = await capSoThuTu(input.venueId);
    maBiMat = await sinhMaBiMatDuyNhat();
  } catch (e: any) {
    return { ok: false, thongBao: e?.message || "Không cấp được số thứ tự." };
  }

  await prisma.guest.create({
    data: {
      ...them,
      soThuTu,
      maBiMat,
      hoTen,
      sdt,
      venueId: input.venueId,
      soNguoiMoi,
      khachDiCung,
      salesOwner: u.vaiTro === "SALES" ? u.hoTen : input.salesOwner?.trim() || u.hoTen,
      isVip: !!input.isVip,
      ghiChu: input.ghiChu?.trim() || null,
      trangThai: TRANG_THAI.NHAP,
      lyDoChoDuyet: lyDo,
    },
  });

  lamTuoi();
  let note = "Đã lưu nháp. Kiểm tra lại rồi bấm Gửi duyệt.";
  if (lyDo) {
    note += ` Cảnh báo: ${moTaCanhBao(lyDo)}`;
    // Sales khong xem duoc ten khach cua nguoi khac
    if (trung && u.vaiTro === "ADMIN") note += ` (khách số ${trung.g.soThuTu}, ${trung.g.hoTen})`;
    note += ".";
  }
  return { ok: true, thongBao: note, trangThai: TRANG_THAI.NHAP, soThuTu, maBiMat };
}

// Gui duyet: nhap chuyen sang cho duyet, tinh lai canh bao. Sales chi gui khach cua minh.
export async function guiDuyet(ids: string[]): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const ds = await prisma.guest.findMany({
    where: { id: { in: ids }, trangThai: TRANG_THAI.NHAP, ...(u.vaiTro === "SALES" ? { salesOwner: u.hoTen } : {}) },
  });
  // Thieu ten / chuc vu (ke ca khach thu 2) thi chua gui duoc
  const du = ds.filter((g) => !thieuThongTinMoi(g));
  const thieu = ds.filter((g) => thieuThongTinMoi(g));
  for (const g of du) {
    const { lyDo } = await tinhCanhBao(g, g.id);
    await prisma.guest.update({ where: { id: g.id }, data: { trangThai: TRANG_THAI.CHO_DUYET, lyDoChoDuyet: lyDo } });
  }
  lamTuoi();
  if (!ds.length) return { ok: false, thongBao: "Không có khách nháp nào để gửi duyệt." };
  if (thieu.length === 1 && ds.length === 1) {
    return { ok: false, thongBao: `${thieuThongTinMoi(thieu[0])}. Bấm Sửa thông tin để bổ sung rồi gửi lại.` };
  }
  return {
    ok: du.length > 0,
    thongBao:
      `Đã gửi duyệt ${du.length} khách.` +
      (thieu.length ? ` ${thieu.length} khách chưa gửi vì thiếu tên hoặc chức vụ (kể cả khách thứ 2), bổ sung rồi gửi lại.` : ""),
  };
}

// Xoa nhap: sales xoa nhap cua minh, BTC xoa nhap bat ky
export async function xoaNhap(id: string): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g) return { ok: false, thongBao: "Không tìm thấy khách." };
  if (u.vaiTro === "SALES" && g.salesOwner !== u.hoTen) return { ok: false, thongBao: "Khách này không do bạn phụ trách." };
  if (g.trangThai !== TRANG_THAI.NHAP) return { ok: false, thongBao: "Chỉ xóa được khách đang ở trạng thái Nháp." };
  await prisma.guest.delete({ where: { id } });
  lamTuoi();
  return { ok: true, thongBao: `Đã xóa nháp ${g.hoTen}.` };
}

// BTC duyet: nhap hoac cho duyet thanh da phat hanh ve
export async function duyetKhach(id: string) {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.updateMany({
    where: { id, trangThai: { in: [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET] } },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, lyDoChoDuyet: null, phatHanhLuc: new Date() },
  });
  lamTuoi();
}

// Duyet cung luc moi khach cho duyet khong co canh bao
export async function duyetKhongCanhBao(): Promise<KetQua> {
  await batBuocQuyen(["ADMIN"]);
  const r = await prisma.guest.updateMany({
    where: { trangThai: TRANG_THAI.CHO_DUYET, OR: [{ lyDoChoDuyet: null }, { lyDoChoDuyet: "" }] },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, lyDoChoDuyet: null, phatHanhLuc: new Date() },
  });
  lamTuoi();
  return { ok: true, thongBao: r.count ? `Đã duyệt ${r.count} khách không có cảnh báo.` : "Không có khách nào chờ duyệt mà không có cảnh báo." };
}

// Sau su kien: khach Tham du ma khong check in thanh Vang mat
export async function chotVangMat(): Promise<KetQua> {
  await batBuocQuanTri();
  const r = await prisma.guest.updateMany({
    where: { trangThai: TRANG_THAI.THAM_DU },
    data: { trangThai: TRANG_THAI.VANG_MAT },
  });
  lamTuoi();
  return { ok: true, thongBao: `Đã chuyển ${r.count} khách Tham dự chưa check in sang Vắng mặt.` };
}

export async function huyKhach(id: string) {
  await batBuocQuyen(["ADMIN"]);
  await prisma.guest.update({ where: { id }, data: { trangThai: TRANG_THAI.DA_HUY } });
  lamTuoi();
}

export async function phatHanh(id: string) {
  await duyetKhach(id);
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

// Sua thong tin khach: BTC, hoac sales cho khach cua minh. Khong doi so thu tu, ma thiep, trang thai.
// Ve da phat hanh: khong doi venue; sales khong doi so nguoi moi va VIP (BTC da duyet).
export async function suaKhach(
  id: string,
  input: {
    hoTen: string;
    sdt?: string;
    soNguoiMoi: number;
    isVip: boolean;
    ghiChu?: string;
    salesOwner?: string;
    venueId?: string;
    them?: ThongTinThem;
    diCung?: NguoiDiCung[];
  }
): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const laSales = u.vaiTro === "SALES";
  const cu = await prisma.guest.findUnique({ where: { id } });
  if (!cu) return { ok: false, thongBao: "Không tìm thấy khách." };
  if (laSales && cu.salesOwner !== u.hoTen) return { ok: false, thongBao: "Khách này không do bạn phụ trách." };
  if (laSales && cu.trangThai === TRANG_THAI.DA_HUY) return { ok: false, thongBao: "Thiệp đã hủy, liên hệ BTC nếu cần mời lại." };
  const hoTen = input.hoTen?.trim().replace(/\s+/g, " ");
  if (!hoTen) return { ok: false, thongBao: "Thiếu họ tên." };
  const sdt = chuanHoaSdt(input.sdt) || null;
  if (sdt && !sdtHopLe(sdt)) return { ok: false, thongBao: "Số điện thoại chưa đúng." };
  const them = lamSach(input.them || {});

  const chuaPhatHanh = CHUA_PHAT_HANH.includes(cu.trangThai);
  const khoaDuyet = laSales && !chuaPhatHanh;
  const soNguoiMoi = khoaDuyet ? cu.soNguoiMoi : Math.min(10, Math.max(1, input.soNguoiMoi || 1));
  const isVip = khoaDuyet ? cu.isVip : input.isVip;
  const khachDiCung = ghiDiCung(lamSachDiCung(input.diCung, soNguoiMoi));
  // Sales: moi khach tren thiep deu phai co ten va chuc vu
  const thieu = thieuThongTinMoi({ chucVu: them.chucVu, soNguoiMoi, khachDiCung });
  if (laSales && thieu) return { ok: false, thongBao: `${thieu}.` };

  // Doi venue chi khi chua phat hanh ve: cap so thu tu moi theo dai cua venue moi
  let venueId = cu.venueId;
  let soThuTu = cu.soThuTu;
  if (input.venueId && input.venueId !== cu.venueId) {
    if (laSales && u.venueId && input.venueId !== u.venueId) {
      return { ok: false, thongBao: `Tài khoản của bạn chỉ mời khách cho ${u.venueTen || "venue được giao"}.` };
    }
    if (!chuaPhatHanh) return { ok: false, thongBao: "Vé đã phát hành, không đổi venue được. Liên hệ BTC." };
    if (!(await prisma.venue.findUnique({ where: { id: input.venueId } }))) return { ok: false, thongBao: "Venue không hợp lệ." };
    try {
      soThuTu = await capSoThuTu(input.venueId);
    } catch (e: any) {
      return { ok: false, thongBao: e?.message || "Không cấp được số thứ tự." };
    }
    venueId = input.venueId;
  }

  const { lyDo, trung } = await tinhCanhBao({ sdt, hoTen, maCorp: them.maCorp, congTy: them.congTy, isVip, venueId }, id);
  await prisma.guest.update({
    where: { id },
    data: {
      ...them,
      hoTen,
      sdt,
      soNguoiMoi,
      khachDiCung,
      isVip,
      venueId,
      soThuTu,
      ghiChu: input.ghiChu?.trim() || null,
      // Chua phat hanh ve thi cap nhat lai canh bao cho BTC
      ...(chuaPhatHanh ? { lyDoChoDuyet: lyDo } : {}),
      ...(!laSales && input.salesOwner !== undefined ? { salesOwner: input.salesOwner.trim() || "BTC" } : {}),
    },
  });
  lamTuoi();
  const doiSo = soThuTu !== cu.soThuTu ? ` Số thứ tự mới: ${soThuTu}.` : "";
  return trung
    ? {
        ok: true,
        thongBao: laSales
          ? `Đã lưu.${doiSo} Lưu ý: trùng với một khách đã có, BTC sẽ xem khi duyệt.`
          : `Đã lưu.${doiSo} Lưu ý: trùng với khách số ${trung.g.soThuTu} (${trung.g.hoTen}).`,
      }
    : { ok: true, thongBao: `Đã lưu thông tin khách.${doiSo}` };
}

// Sales (hoac BTC) xac nhan thay khach sau khi da hoi khach
export async function xacNhanKhach(id: string, ketQua: "THAM_DU" | "KHONG_THAM_DU" | "DA_MOI", soNguoi = 1): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g) return { ok: false, thongBao: "Không tìm thấy khách." };
  if (u.vaiTro === "SALES" && g.salesOwner !== u.hoTen) return { ok: false, thongBao: "Khách này không do bạn phụ trách." };
  if (!DUOC_XAC_NHAN.includes(g.trangThai)) {
    return { ok: false, thongBao: g.trangThai === TRANG_THAI.DA_CHECKIN ? "Khách đã check in tại sự kiện." : "Thiệp chưa được BTC phát hành." };
  }
  const so = Math.min(g.soNguoiMoi, Math.max(1, soNguoi || 1));
  await prisma.guest.update({
    where: { id },
    data: {
      trangThai: ketQua,
      soNguoiXacNhan: ketQua === "THAM_DU" ? so : ketQua === "KHONG_THAM_DU" ? 0 : null,
      xacNhanLuc: ketQua === "DA_MOI" ? null : new Date(),
      xacNhanBoi: ketQua === "DA_MOI" ? null : u.hoTen,
    },
  });
  lamTuoi();
  return {
    ok: true,
    thongBao: ketQua === "THAM_DU" ? `Đã xác nhận tham dự ${so} người.` : ketQua === "KHONG_THAM_DU" ? "Đã ghi nhận không tham dự." : "Đã bỏ xác nhận, khách về trạng thái Đã mời.",
  };
}

// Round 2: danh dau da gui thiep giay (BTC, hoac sales cho khach cua minh)
export async function datThiepGiay(id: string, daGui: boolean) {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g || (u.vaiTro === "SALES" && g.salesOwner !== u.hoTen)) return;
  await prisma.guest.update({ where: { id }, data: { daGuiThiepGiay: daGui } });
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
  await batBuocQuanTri();
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
  await batBuocQuanTri();
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
  venueId?: string;
  matKhau: string;
  batDoi: boolean;
}): Promise<KetQua> {
  await batBuocQuanTri();
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
  // Sales nhan khach theo ho ten, nen ho ten sales khong duoc trung
  if (input.vaiTro === "SALES" && (await prisma.staffUser.findFirst({ where: { vaiTro: "SALES", hoTen } }))) {
    return { ok: false, thongBao: `Đã có sales tên ${hoTen}. Thêm chữ phân biệt vào họ tên.` };
  }
  await prisma.staffUser.create({
    data: {
      hoTen,
      username,
      vaiTro: input.vaiTro,
      ca: input.vaiTro === "LE_TAN" ? input.ca?.trim() || null : null,
      venueId: input.vaiTro === "SALES" ? input.venueId || null : null,
      matKhau: bamMatKhau(input.matKhau),
      doiMatKhau: input.batDoi,
    },
  });
  lamTuoi();
  return { ok: true, thongBao: `Đã tạo tài khoản ${username}.` };
}

export async function datMatKhau(id: string, matKhau: string, batDoi: boolean): Promise<KetQua> {
  await batBuocQuanTri();
  if (matKhau.length < 8) return { ok: false, thongBao: "Mật khẩu tối thiểu 8 ký tự." };
  await prisma.staffUser.update({ where: { id }, data: { matKhau: bamMatKhau(matKhau), doiMatKhau: batDoi } });
  await prisma.phienDangNhap.deleteMany({ where: { userId: id } });
  lamTuoi();
  return { ok: true, thongBao: "Đã đặt mật khẩu mới." };
}

// Dat cung mot mat khau cho moi tai khoan chua co mat khau (tien cho dot dung thu)
export async function datMatKhauChung(matKhau: string): Promise<KetQua> {
  await batBuocQuanTri();
  if (matKhau.length < 8) return { ok: false, thongBao: "Mật khẩu tối thiểu 8 ký tự." };
  const ds = await prisma.staffUser.findMany({ where: { NOT: { matKhau: { startsWith: "scrypt$" } } } });
  for (const t of ds) {
    await prisma.staffUser.update({ where: { id: t.id }, data: { matKhau: bamMatKhau(matKhau), doiMatKhau: false } });
  }
  lamTuoi();
  return { ok: true, thongBao: `Đã đặt mật khẩu cho ${ds.length} tài khoản.` };
}

export async function xoaTaiKhoan(id: string): Promise<KetQua> {
  const u = await batBuocQuanTri();
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

// Mat khau tam ngau nhien, bo cac ky tu de nham (0 O 1 l I)
function matKhauNgauNhien(): string {
  const bang = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let mk = "";
  for (let i = 0; i < 10; i++) mk += bang[crypto.randomInt(bang.length)];
  return mk;
}

export interface TaiKhoanMoi {
  hoTen: string;
  username: string;
  matKhau: string;
  ghiChu?: string;
}

// Tao nhieu tai khoan mot lan: moi dong mot ho ten. Ten dang nhap theo cong thuc,
// mat khau tam ngau nhien chi tra ve mot lan, bat doi o lan dang nhap dau.
export async function taoNhieuTaiKhoan(input: {
  danhSach: string;
  vaiTro: string;
  venueId?: string;
  ca?: string;
}): Promise<{ ok: boolean; thongBao: string; ds: TaiKhoanMoi[] }> {
  await batBuocQuanTri();
  if (!["SALES", "LE_TAN"].includes(input.vaiTro)) return { ok: false, thongBao: "Chỉ tạo hàng loạt cho sales hoặc lễ tân.", ds: [] };
  if (input.venueId && !(await prisma.venue.findUnique({ where: { id: input.venueId } }))) {
    return { ok: false, thongBao: "Venue không hợp lệ.", ds: [] };
  }
  const ten = [...new Set(input.danhSach.split(/\r?\n|,|;/).map(chuanHoTen).filter(Boolean))];
  if (ten.length === 0) return { ok: false, thongBao: "Nhập ít nhất một họ tên.", ds: [] };
  if (ten.length > 100) return { ok: false, thongBao: "Mỗi lần tối đa 100 tài khoản.", ds: [] };

  const ds: TaiKhoanMoi[] = [];
  for (const hoTen of ten) {
    if (input.vaiTro === "SALES" && (await prisma.staffUser.findFirst({ where: { vaiTro: "SALES", hoTen } }))) {
      ds.push({ hoTen, username: "", matKhau: "", ghiChu: "Đã có sales trùng họ tên, bỏ qua" });
      continue;
    }
    const goc = tenDangNhapGoiY(hoTen);
    if (goc.length < 3) {
      ds.push({ hoTen, username: "", matKhau: "", ghiChu: "Họ tên quá ngắn, tạo tay" });
      continue;
    }
    let username = goc;
    for (let i = 2; await prisma.staffUser.findUnique({ where: { username } }); i++) username = `${goc}${i}`;
    const matKhau = matKhauNgauNhien();
    await prisma.staffUser.create({
      data: {
        hoTen,
        username,
        vaiTro: input.vaiTro,
        venueId: input.vaiTro === "SALES" ? input.venueId || null : null,
        ca: input.vaiTro === "LE_TAN" ? input.ca?.trim() || null : null,
        matKhau: bamMatKhau(matKhau),
        doiMatKhau: true,
      },
    });
    ds.push({ hoTen, username, matKhau });
  }
  lamTuoi();
  const soTao = ds.filter((d) => d.matKhau).length;
  return { ok: soTao > 0, thongBao: `Đã tạo ${soTao} tài khoản.`, ds };
}

// Doi venue cua tai khoan sales
export async function datVenueTaiKhoan(id: string, venueId: string | null): Promise<KetQua> {
  await batBuocQuanTri();
  const t = await prisma.staffUser.findUnique({ where: { id } });
  if (!t || t.vaiTro !== "SALES") return { ok: false, thongBao: "Chỉ gán venue cho tài khoản sales." };
  await prisma.staffUser.update({ where: { id }, data: { venueId: venueId || null } });
  lamTuoi();
  return { ok: true, thongBao: `Đã cập nhật venue cho ${t.hoTen}.` };
}
