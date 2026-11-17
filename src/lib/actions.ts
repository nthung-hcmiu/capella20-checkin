"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { CHIEM_QUOTA, CHUA_PHAT_HANH, DUOC_XAC_NHAN, NHAN_CANH_BAO, TRANG_THAI } from "./constants";
import { capSoThuTu, sinhMaBiMatDuyNhat } from "./codes";
import { chuanHoaSdt, sdtHopLe } from "./format";
import { ghiDiCung, lamSach, lamSachDiCung, thieuThongTinMoi, type NguoiDiCung, type ThongTinThem } from "./khach";
import { KHONG_QUYEN_KHACH, batBuocQuanTri, batBuocQuyen, bamMatKhau, locDuocDung, locPhamVi, quyenVoiKhach } from "./auth";
import { gieoDuLieu } from "./seedData";
import { chuanHoTen, tenDangNhapGoiY } from "./taiKhoan";
import { taiBoKhop } from "./lichSu";
import { CHON_CONG_TY, choBtc, choSales, moTaChoBtc, moTaChoSales, taoBoCongTy, taoBoTrung } from "./congTy";
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

// Tim khach trung: cung SDT, hoac cung ho ten va cung ma CORP / cong ty.
// Dung chung bo doi chieu voi danh sach (congTy.ts) de noi nao cung bao giong nhau.
async function timKhachTrung(
  k: { sdt: string | null; hoTen: string; maCorp?: string | null; congTy?: string | null },
  boQuaId?: string
) {
  const tatCa = await prisma.guest.findMany({
    where: { trangThai: { not: TRANG_THAI.DA_HUY }, ...(boQuaId ? { id: { not: boQuaId } } : {}) },
    select: { ...CHON_CONG_TY, sdt: true },
  });
  const g = taoBoTrung(tatCa)(k)[0];
  return g ? { g, lyDo: g.loai as string } : null;
}

// Tinh canh bao cho BTC khi duyet: trung SDT, trung ten cung cong ty, VIP, venue het quota.
// Luu trong lyDoChoDuyet, ngan cach dau phay. Canh bao khong chan, chi de BTC xem.
async function tinhCanhBao(
  k: { sdt: string | null; hoTen: string; maCorp?: string | null; congTy?: string | null; isVip: boolean; venueId: string; soNguoiMoi: number },
  boQuaId?: string
) {
  const ds: string[] = [];
  const trung = await timKhachTrung(k, boQuaId);
  if (trung) ds.push(trung.lyDo);
  if (k.isVip) ds.push("VIP");
  const venue = await prisma.venue.findUnique({ where: { id: k.venueId } });
  if (venue && venue.quota > 0) {
    // Quota dem theo nguoi: tong so nguoi moi dang hieu luc cong khach nay vuot quota thi canh bao
    const dangChiem = await prisma.guest.aggregate({
      where: { venueId: k.venueId, trangThai: { in: CHIEM_QUOTA }, ...(boQuaId ? { id: { not: boQuaId } } : {}) },
      _sum: { soNguoiMoi: true },
    });
    if ((dangChiem._sum.soNguoiMoi || 0) + k.soNguoiMoi > venue.quota) ds.push("HET_QUOTA");
  }
  return { lyDo: ds.length ? ds.join(",") : null, trung };
}

// "khach so 1020, Nguyen Van A, sales Tran B": sales cung duoc xem de lien he nhau xu ly khach trung
function moTaKhachTrungVoi(g: { soThuTu: number; hoTen: string; salesOwner: string }, toi: string) {
  return `khách số ${g.soThuTu}, ${g.hoTen}, ${g.salesOwner === toi ? "của bạn" : `sales ${g.salesOwner}`}`;
}

// Trang mo tu truoc ban cap nhat chua co o Danh xung cua khach di cung: nhac tai lai trang
function nhacTaiLai(thieu: string) {
  return thieu.startsWith("Thiếu danh xưng khách")
    ? " Chọn danh xưng ở ô ngay trước tên khách đi cùng. Nếu không thấy ô này, tải lại trang (F5, hoặc kéo xuống để làm mới trên điện thoại) rồi nhập lại."
    : "";
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
  // BTC co pham vi venue: them khach o venue khac thi khach do chinh minh phu trach, nhu sales
  const tuPhuTrach = u.vaiTro === "SALES" || (!!u.phamVi && !u.phamVi.includes(input.venueId));
  if (sdt && !sdtHopLe(sdt)) return { ok: false, thongBao: "Số điện thoại chưa đúng (cần 10 hoặc 11 số, bắt đầu bằng 0)." };
  const them = lamSach(input.them || {});
  const soNguoiMoi = Math.min(10, Math.max(1, input.soNguoiMoi || 1));
  const khachDiCung = ghiDiCung(lamSachDiCung(input.diCung, soNguoiMoi));
  // Moi khach deu phai co ten va chuc vu, ke ca nguoi thu 2 tro di
  const thieu = thieuThongTinMoi({ sdt, diaChi: them.diaChi, chucVu: them.chucVu, soNguoiMoi, khachDiCung, linhVuc: them.linhVuc ?? null, congTy: them.congTy });
  // Chi Quan tri duoc luu khach con thieu truong bat buoc
  if (thieu && !u.quanTri) return { ok: false, thongBao: `${thieu}.${nhacTaiLai(thieu)}` };

  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) return { ok: false, thongBao: "Venue không hợp lệ." };

  const { lyDo, trung } = await tinhCanhBao({
    sdt, hoTen, maCorp: them.maCorp, congTy: them.congTy, isVip: !!input.isVip, venueId: input.venueId, soNguoiMoi,
  });

  let soThuTu: number, maBiMat: string;
  try {
    soThuTu = await capSoThuTu(input.venueId);
    maBiMat = await sinhMaBiMatDuyNhat();
  } catch (e: any) {
    return { ok: false, thongBao: e?.message || "Không cấp được số thứ tự." };
  }

  const moi = await prisma.guest.create({
    data: {
      ...them,
      soThuTu,
      maBiMat,
      hoTen,
      sdt,
      venueId: input.venueId,
      soNguoiMoi,
      khachDiCung,
      salesOwner: tuPhuTrach ? u.hoTen : input.salesOwner?.trim() || u.hoTen,
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
    if (trung) note += ` (trùng với ${moTaKhachTrungVoi(trung.g, u.hoTen)})`;
    note += ".";
    if (trung && u.vaiTro === "SALES" && trung.g.salesOwner !== u.hoTen) note += ` Liên hệ ${trung.g.salesOwner} để thống nhất ai mời khách này.`;
  }
  // Bao cong ty nay da co khach khac duoc moi (sales thay so luong va ten sales khac)
  const boCty = taoBoCongTy(await prisma.guest.findMany({ select: CHON_CONG_TY }));
  const khacCty = boCty.timKhac(moi);
  const salesMoi = moi.salesOwner;
  const moTaCty = u.vaiTro === "SALES" ? moTaChoSales(choSales(khacCty, u.hoTen, soNguoiMoi)) : moTaChoBtc(choBtc(khacCty, salesMoi, soNguoiMoi));
  if (moTaCty) note += ` ${moTaCty}`;
  // Nhac sales lich su nam truoc cua khach nay
  const boKhop = await taiBoKhop(prisma);
  if (boKhop.coDuLieu) note += ` ${boKhop.khop({ hoTen, sdt, maCorp: them.maCorp, congTy: them.congTy })!.chiTiet}`;
  return { ok: true, thongBao: note, trangThai: TRANG_THAI.NHAP, soThuTu, maBiMat };
}

// Gui duyet: nhap chuyen sang cho duyet, tinh lai canh bao. Sales chi gui khach cua minh.
export async function guiDuyet(ids: string[]): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const ds = await prisma.guest.findMany({
    where: { id: { in: ids }, trangThai: TRANG_THAI.NHAP, ...locDuocDung(u) },
  });
  // Thieu ten / chuc vu (ke ca khach thu 2) thi chua gui duoc
  const du = ds.filter((g) => !thieuThongTinMoi(g));
  const thieu = ds.filter((g) => thieuThongTinMoi(g));
  const dsTrung: string[] = [];
  for (const g of du) {
    const { lyDo, trung } = await tinhCanhBao(g, g.id);
    await prisma.guest.update({ where: { id: g.id }, data: { trangThai: TRANG_THAI.CHO_DUYET, lyDoChoDuyet: lyDo } });
    if (trung) dsTrung.push(`${g.hoTen} trùng với ${moTaKhachTrungVoi(trung.g, u.hoTen)}`);
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
      (dsTrung.length ? ` Khách trùng: ${dsTrung.slice(0, 5).join("; ")}${dsTrung.length > 5 ? "; ..." : ""}.` : "") +
      (thieu.length ? ` ${thieu.length} khách chưa gửi vì thiếu SĐT, địa chỉ, chức vụ hoặc thông tin khách thứ 2, bổ sung rồi gửi lại.` : ""),
  };
}

// Xoa nhap: sales xoa nhap cua minh, BTC xoa nhap bat ky
export async function xoaNhap(id: string): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g) return { ok: false, thongBao: "Không tìm thấy khách." };
  if (!quyenVoiKhach(u, g)) return { ok: false, thongBao: KHONG_QUYEN_KHACH };
  if (g.trangThai !== TRANG_THAI.NHAP) return { ok: false, thongBao: "Chỉ xóa được khách đang ở trạng thái Nháp." };
  await prisma.guest.delete({ where: { id } });
  lamTuoi();
  return { ok: true, thongBao: `Đã xóa nháp ${g.hoTen}.` };
}

// BTC duyet: nhap hoac cho duyet thanh da phat hanh ve
export async function duyetKhach(id: string) {
  const u = await batBuocQuyen(["ADMIN"]);
  await prisma.guest.updateMany({
    where: { id, trangThai: { in: [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET] }, ...locPhamVi(u) },
    data: { trangThai: TRANG_THAI.DA_PHAT_HANH, lyDoChoDuyet: null, phatHanhLuc: new Date() },
  });
  lamTuoi();
}

// Duyet cung luc moi khach cho duyet khong co canh bao
export async function duyetKhongCanhBao(): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN"]);
  const r = await prisma.guest.updateMany({
    where: { trangThai: TRANG_THAI.CHO_DUYET, OR: [{ lyDoChoDuyet: null }, { lyDoChoDuyet: "" }], ...locPhamVi(u) },
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
  const u = await batBuocQuyen(["ADMIN"]);
  await prisma.guest.updateMany({ where: { id, ...locPhamVi(u) }, data: { trangThai: TRANG_THAI.DA_HUY } });
  lamTuoi();
}

// BTC thu hoi ve de sales sua lai: khach ve Nhap, giu nguyen so thu tu va ma QR.
// Sales sua xong gui duyet, BTC duyet lai thi thiep cu dung tiep. Trong luc cho, QR van quet duoc nhung le tan thay canh bao chua phat hanh.
const TRA_NHAP_DATA = {
  trangThai: TRANG_THAI.NHAP, lyDoChoDuyet: null, phatHanhLuc: null, soNguoiXacNhan: null, xacNhanLuc: null, xacNhanBoi: null,
};
const DUOC_TRA_NHAP = { notIn: [TRANG_THAI.NHAP, TRANG_THAI.DA_CHECKIN] as string[] };
export async function traVeNhap(id: string): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN"]);
  const r = await prisma.guest.updateMany({ where: { id, trangThai: DUOC_TRA_NHAP, ...locPhamVi(u) }, data: TRA_NHAP_DATA });
  lamTuoi();
  return r.count
    ? { ok: true, thongBao: "Đã trả về Nháp. Sales sửa xong gửi duyệt lại, số thứ tự và mã QR giữ nguyên." }
    : { ok: false, thongBao: "Không trả về nháp được: khách đang là Nháp, đã check in, hoặc thuộc venue ngoài phạm vi của bạn." };
}

export async function phatHanh(id: string) {
  await duyetKhach(id);
}

// Danh dau da gui thiep: BTC, hoac sales cho khach cua chinh minh
export async function danhDauDaMoi(id: string) {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g) return;
  if (!quyenVoiKhach(u, g)) return;
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
  const cu = await prisma.guest.findUnique({ where: { id } });
  if (!cu) return { ok: false, thongBao: "Không tìm thấy khách." };
  const quyen = quyenVoiKhach(u, cu);
  if (!quyen) return { ok: false, thongBao: KHONG_QUYEN_KHACH };
  // BTC sua khach minh phu trach o venue ngoai pham vi thi theo luat cua sales
  const laSales = quyen === "SALES";
  if (laSales && cu.trangThai === TRANG_THAI.DA_HUY) return { ok: false, thongBao: "Thiệp đã hủy, liên hệ BTC nếu cần mời lại." };
  // Ve da duyet: sales khong tu sua. Quan ly tra ve nhap, sales sua roi gui duyet lai.
  if (laSales && !CHUA_PHAT_HANH.includes(cu.trangThai)) {
    return { ok: false, thongBao: "Thiệp đã được duyệt nên không sửa được. Báo quản lý trả thiệp về nháp, sửa xong gửi duyệt lại." };
  }
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
  const thieu = thieuThongTinMoi({ sdt, diaChi: them.diaChi, chucVu: them.chucVu, soNguoiMoi, khachDiCung, linhVuc: them.linhVuc !== undefined ? them.linhVuc : cu.linhVuc, congTy: them.congTy !== undefined ? them.congTy : cu.congTy });
  // Chi Quan tri duoc luu khach con thieu truong bat buoc
  if (thieu && !u.quanTri) return { ok: false, thongBao: `${thieu}.${nhacTaiLai(thieu)}` };

  // Doi venue chi khi chua phat hanh ve: cap so thu tu moi theo dai cua venue moi
  let venueId = cu.venueId;
  let soThuTu = cu.soThuTu;
  if (input.venueId && input.venueId !== cu.venueId) {
    if (laSales && u.venueId && input.venueId !== u.venueId) {
      return { ok: false, thongBao: `Tài khoản của bạn chỉ mời khách cho ${u.venueTen || "venue được giao"}.` };
    }
    if (u.phamVi && !u.phamVi.includes(input.venueId) && !laSales) {
      return { ok: false, thongBao: "Venue mới nằm ngoài phạm vi bạn được giao." };
    }
    if (!chuaPhatHanh) return { ok: false, thongBao: "Thiệp đã phát hành, không đổi venue được. Liên hệ BTC." };
    if (!(await prisma.venue.findUnique({ where: { id: input.venueId } }))) return { ok: false, thongBao: "Venue không hợp lệ." };
    try {
      soThuTu = await capSoThuTu(input.venueId);
    } catch (e: any) {
      return { ok: false, thongBao: e?.message || "Không cấp được số thứ tự." };
    }
    venueId = input.venueId;
  }

  const { lyDo, trung } = await tinhCanhBao({ sdt, hoTen, maCorp: them.maCorp, congTy: them.congTy, isVip, venueId, soNguoiMoi }, id);
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
        thongBao:
          `Đã lưu.${doiSo} Lưu ý: trùng với ${moTaKhachTrungVoi(trung.g, u.hoTen)}.` +
          (laSales ? (trung.g.salesOwner !== u.hoTen ? ` Liên hệ ${trung.g.salesOwner} để thống nhất ai mời khách này.` : " BTC sẽ xem khi duyệt.") : ""),
      }
    : { ok: true, thongBao: `Đã lưu thông tin khách.${doiSo}` };
}

// Sales (hoac BTC) xac nhan thay khach sau khi da hoi khach
export async function xacNhanKhach(id: string, ketQua: "THAM_DU" | "KHONG_THAM_DU" | "DA_MOI", soNguoi = 1): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const g = await prisma.guest.findUnique({ where: { id } });
  if (!g) return { ok: false, thongBao: "Không tìm thấy khách." };
  if (!quyenVoiKhach(u, g)) return { ok: false, thongBao: KHONG_QUYEN_KHACH };
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
  if (!g || !quyenVoiKhach(u, g)) return;
  await prisma.guest.update({ where: { id }, data: { daGuiThiepGiay: daGui } });
  lamTuoi();
}

// ===== Xoa du lieu =====

export async function xoaKhach(id: string): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN"]);
  const r = await prisma.guest.deleteMany({ where: { id, ...locPhamVi(u) } });
  lamTuoi();
  return r.count ? { ok: true, thongBao: "Đã xóa khách." } : { ok: false, thongBao: KHONG_QUYEN_KHACH };
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

// Giao venue cho tai khoan BTC: chi duyet va sua khach cua cac venue nay. Khong chon venue nao = moi venue.
export async function datPhamViBtc(id: string, venueIds: string[], xemTatCa: boolean): Promise<KetQua> {
  await batBuocQuanTri();
  const t = await prisma.staffUser.findUnique({ where: { id } });
  if (!t || t.vaiTro !== "ADMIN") return { ok: false, thongBao: "Chỉ giao venue cho tài khoản BTC." };
  if (t.quanTri) return { ok: false, thongBao: "Tài khoản Quản trị luôn làm việc với mọi venue." };
  const hopLe = await prisma.venue.findMany({ where: { id: { in: venueIds } }, orderBy: { thuTu: "asc" }, select: { id: true, ten: true } });
  await prisma.staffUser.update({
    where: { id },
    data: { venueBtc: hopLe.length ? hopLe.map((v) => v.id).join(",") : null, xemTatCa: hopLe.length ? xemTatCa : false },
  });
  lamTuoi();
  return {
    ok: true,
    thongBao: hopLe.length
      ? `${t.hoTen} giờ chỉ duyệt và sửa khách của ${hopLe.map((v) => v.ten).join(", ")}${xemTatCa ? ", vẫn xem được mọi venue" : ""}. Có hiệu lực ngay ở lần tải trang kế tiếp.`
      : `${t.hoTen} giờ làm việc với mọi venue.`,
  };
}

// ===== Danh sach khach nam truoc =====

export interface DongNamTruoc {
  hoTen: string;
  chucVu?: string;
  congTy?: string;
  maCorp?: string;
  sdt?: string;
  donVi?: string;
  nhomKhachMoi?: string;
  phuTrach?: string;
  soDangKy?: number;
  soDen?: number;
  laDiKem?: boolean;
}

// Thay toan bo danh sach cua mot nam bang file moi
export async function napLichSu(nam: number, rows: DongNamTruoc[]): Promise<KetQua> {
  await batBuocQuanTri();
  if (!Number.isInteger(nam) || nam < 2000 || nam > 2100) return { ok: false, thongBao: "Năm không hợp lệ." };
  // File tong hop hay de "0" o o trong (do cong thuc): coi la trong
  const lam = (s?: string) => {
    const t = (s ?? "").toString().trim().replace(/\s+/g, " ");
    return t && t !== "0" ? t : null;
  };
  const so = (n?: number) => (Number.isFinite(n) ? Math.max(0, Math.min(20, Math.round(n as number))) : 0);
  const data = rows
    .filter((r) => lam(r.hoTen))
    .slice(0, 5000)
    .map((r) => ({
      nam,
      hoTen: lam(r.hoTen)!,
      chucVu: lam(r.chucVu),
      congTy: lam(r.congTy),
      maCorp: lam(r.maCorp),
      sdt: chuanHoaSdt(r.sdt) || null,
      donVi: lam(r.donVi),
      nhomKhachMoi: lam(r.nhomKhachMoi),
      phuTrach: lam(r.phuTrach),
      soDangKy: so(r.soDangKy),
      soDen: so(r.soDen),
      laDiKem: !!r.laDiKem,
    }));
  if (data.length === 0) return { ok: false, thongBao: "File không có dòng khách nào." };
  await prisma.$transaction([prisma.khachNamTruoc.deleteMany({ where: { nam } }), prisma.khachNamTruoc.createMany({ data })]);
  lamTuoi();
  const chinh = data.filter((d) => !d.laDiKem);
  const den = chinh.filter((d) => d.soDen > 0).length;
  const kem = data.length - chinh.length;
  return { ok: true, thongBao: `Đã lưu ${chinh.length} khách năm ${nam} (${den} khách đã đến)${kem ? `, kèm ${kem} người đi kèm` : ""}.` };
}

export async function xoaLichSu(nam: number): Promise<KetQua> {
  await batBuocQuanTri();
  const r = await prisma.khachNamTruoc.deleteMany({ where: { nam } });
  lamTuoi();
  return { ok: true, thongBao: `Đã xóa ${r.count} khách năm ${nam}.` };
}

// ===== Thao tac hang loat =====

export type LoaiHangLoat =
  | "DUYET" | "GUI_DUYET" | "DA_GUI_ONLINE" | "DA_GUI_GIAY" | "THAM_DU" | "KHONG_THAM_DU"
  | "DOI_SALES" | "TRA_NHAP" | "HUY" | "XOA" | "XOA_NHAP" | "VIP" | "BO_VIP";

const CHI_BTC: LoaiHangLoat[] = ["DUYET", "DOI_SALES", "TRA_NHAP", "HUY", "XOA", "VIP", "BO_VIP"];
// Phan loai khach VIP nhanh: chi Quan tri
const CHI_QUAN_TRI: LoaiHangLoat[] = ["VIP", "BO_VIP"];

// Doi co VIP cua mot nhom khach. Khach chua phat hanh thi cap nhat luon canh bao VIP de BTC thay khi duyet.
async function doiVip(where: object, isVip: boolean): Promise<number> {
  const ds = await prisma.guest.findMany({ where: { ...where, isVip: !isVip }, select: { id: true, trangThai: true, lyDoChoDuyet: true } });
  for (const g of ds) {
    const canhBao = (g.lyDoChoDuyet || "").split(",").filter((x) => x && x !== "VIP");
    if (isVip) canhBao.push("VIP");
    await prisma.guest.update({
      where: { id: g.id },
      data: { isVip, ...(CHUA_PHAT_HANH.includes(g.trangThai) ? { lyDoChoDuyet: canhBao.length ? canhBao.join(",") : null } : {}) },
    });
  }
  return ds.length;
}

// Quan tri danh dau / bo danh dau VIP cho mot khach, khong can mo form sua
export async function datVip(id: string, isVip: boolean): Promise<KetQua> {
  await batBuocQuanTri();
  const g = await prisma.guest.findUnique({ where: { id }, select: { hoTen: true } });
  if (!g) return { ok: false, thongBao: "Không tìm thấy khách." };
  await doiVip({ id }, isVip);
  lamTuoi();
  return { ok: true, thongBao: isVip ? `Đã xếp ${g.hoTen} vào khách VIP.` : `Đã bỏ VIP của ${g.hoTen}.` };
}

// Ap dung mot thao tac cho nhieu khach. Khach khong phu hop (sai trang thai, khong thuoc sales) duoc bo qua.
export async function thaoTacHangLoat(ids: string[], loai: LoaiHangLoat, giaTri?: string): Promise<KetQua> {
  const u = await batBuocQuyen(["ADMIN", "SALES"]);
  const laSales = u.vaiTro === "SALES";
  if (laSales && CHI_BTC.includes(loai)) return { ok: false, thongBao: "Thao tác này chỉ BTC được làm." };
  if (CHI_QUAN_TRI.includes(loai) && !u.quanTri) return { ok: false, thongBao: "Chỉ Quản trị được phân loại khách VIP." };
  if (!ids.length) return { ok: false, thongBao: "Chưa chọn khách nào." };
  if (ids.length > 2000) return { ok: false, thongBao: "Mỗi lần tối đa 2.000 khách." };
  if (loai === "GUI_DUYET") return guiDuyet(ids);

  // Thao tac cua BTC chi trong venue duoc giao; thao tac muc sales thi them ca khach minh phu trach
  const pham = { id: { in: ids }, ...(CHI_BTC.includes(loai) ? locPhamVi(u) : locDuocDung(u)) };
  const daPhatHanh = { notIn: [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_HUY] };
  let n = 0;
  let viec = "";
  switch (loai) {
    case "DUYET":
      n = (await prisma.guest.updateMany({
        where: { ...pham, trangThai: { in: CHUA_PHAT_HANH } },
        data: { trangThai: TRANG_THAI.DA_PHAT_HANH, lyDoChoDuyet: null, phatHanhLuc: new Date() },
      })).count;
      viec = "duyệt, phát hành thiệp";
      break;
    case "DA_GUI_ONLINE":
      n = (await prisma.guest.updateMany({ where: { ...pham, trangThai: TRANG_THAI.DA_PHAT_HANH }, data: { trangThai: TRANG_THAI.DA_MOI } })).count;
      viec = "đánh dấu đã gửi thiệp online";
      break;
    case "DA_GUI_GIAY":
      n = (await prisma.guest.updateMany({ where: { ...pham, trangThai: daPhatHanh }, data: { daGuiThiepGiay: true } })).count;
      viec = "đánh dấu đã gửi thiệp giấy";
      break;
    case "THAM_DU": {
      // Xac nhan du so nguoi moi cua tung khach
      const ds = await prisma.guest.findMany({ where: { ...pham, trangThai: { in: DUOC_XAC_NHAN } }, select: { id: true, soNguoiMoi: true } });
      await prisma.$transaction(
        ds.map((g) =>
          prisma.guest.update({
            where: { id: g.id },
            data: { trangThai: TRANG_THAI.THAM_DU, soNguoiXacNhan: g.soNguoiMoi, xacNhanLuc: new Date(), xacNhanBoi: u.hoTen },
          })
        )
      );
      n = ds.length;
      viec = "xác nhận tham dự (đủ số người mời)";
      break;
    }
    case "KHONG_THAM_DU":
      n = (await prisma.guest.updateMany({
        where: { ...pham, trangThai: { in: DUOC_XAC_NHAN } },
        data: { trangThai: TRANG_THAI.KHONG_THAM_DU, soNguoiXacNhan: 0, xacNhanLuc: new Date(), xacNhanBoi: u.hoTen },
      })).count;
      viec = "ghi nhận không tham dự";
      break;
    case "DOI_SALES": {
      const ten = (giaTri || "").trim();
      if (!ten) return { ok: false, thongBao: "Chọn người phụ trách mới." };
      n = (await prisma.guest.updateMany({ where: pham, data: { salesOwner: ten } })).count;
      viec = `chuyển cho ${ten} phụ trách`;
      break;
    }
    case "VIP":
      n = await doiVip(pham, true);
      viec = "xếp vào khách VIP";
      break;
    case "BO_VIP":
      n = await doiVip(pham, false);
      viec = "bỏ VIP";
      break;
    case "TRA_NHAP":
      n = (await prisma.guest.updateMany({ where: { ...pham, trangThai: DUOC_TRA_NHAP }, data: TRA_NHAP_DATA })).count;
      viec = "trả về Nháp";
      break;
    case "HUY":
      n = (await prisma.guest.updateMany({
        where: { ...pham, trangThai: { notIn: [TRANG_THAI.DA_CHECKIN, TRANG_THAI.DA_HUY] } },
        data: { trangThai: TRANG_THAI.DA_HUY },
      })).count;
      viec = "hủy thiệp";
      break;
    case "XOA":
      n = (await prisma.guest.deleteMany({ where: pham })).count;
      viec = "xóa";
      break;
    case "XOA_NHAP":
      n = (await prisma.guest.deleteMany({ where: { ...pham, trangThai: TRANG_THAI.NHAP } })).count;
      viec = "xóa nháp";
      break;
  }
  lamTuoi();
  const boQua = ids.length - n;
  return {
    ok: n > 0,
    thongBao: n > 0
      ? `Đã ${viec} ${n} khách.${boQua ? ` Bỏ qua ${boQua} khách không phù hợp trạng thái.` : ""}`
      : `Không có khách nào phù hợp để ${viec}.`,
  };
}
