// Dinh nghia tap trung: trang thai vong doi, vai tro, dai so thu tu, con so mac dinh

// ===== Vong doi khach =====
export const TRANG_THAI = {
  NHAP: "NHAP",
  CHO_DUYET: "CHO_DUYET",
  DA_PHAT_HANH: "DA_PHAT_HANH",
  DA_MOI: "DA_MOI",
  THAM_DU: "THAM_DU",
  KHONG_THAM_DU: "KHONG_THAM_DU",
  DA_CHECKIN: "DA_CHECKIN",
  VANG_MAT: "VANG_MAT",
  DA_HUY: "DA_HUY",
} as const;

export type TrangThai = (typeof TRANG_THAI)[keyof typeof TRANG_THAI];

// Nhom trang thai dung chung
export const CHUA_PHAT_HANH: string[] = [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET];
// Ve da phat hanh (da qua BTC duyet), dung de dem thiep va doi soat
export const DA_PHAT_HANH_VE: string[] = [
  TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU,
  TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN, TRANG_THAI.VANG_MAT,
];
// Dang chiem cho trong quota venue
export const CHIEM_QUOTA: string[] = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN,
];
// Sales duoc xac nhan thay khach
export const DUOC_XAC_NHAN: string[] = [TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU, TRANG_THAI.KHONG_THAM_DU];

// Canh bao khi duyet (luu trong lyDoChoDuyet, ngan cach dau phay)
export const NHAN_CANH_BAO: Record<string, string> = {
  TRUNG_SDT: "Trùng SĐT",
  TRUNG_TEN: "Trùng tên và công ty",
  VIP: "Khách VIP",
  HET_QUOTA: "Venue hết quota",
};

export const NHAN_TRANG_THAI: Record<string, string> = {
  NHAP: "Nháp",
  CHO_DUYET: "Chờ duyệt",
  DA_PHAT_HANH: "Đã phát hành vé",
  DA_MOI: "Đã mời",
  THAM_DU: "Tham dự",
  KHONG_THAM_DU: "Không tham dự",
  DA_CHECKIN: "Đã check in",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
};

// Mau hien thi cho tung trang thai (nen, chu)
export const MAU_TRANG_THAI: Record<string, { bg: string; text: string }> = {
  NHAP: { bg: "#efe8db", text: "#6b6255" },
  CHO_DUYET: { bg: "#f4e4c6", text: "#8a6d2f" },
  DA_PHAT_HANH: { bg: "#e3e9df", text: "#5c6b4f" },
  DA_MOI: { bg: "#dde6ec", text: "#3a5a6b" },
  THAM_DU: { bg: "#d8e8d4", text: "#3d6b36" },
  KHONG_THAM_DU: { bg: "#efe2e2", text: "#8a4a4a" },
  DA_CHECKIN: { bg: "#b5303a", text: "#ffffff" },
  VANG_MAT: { bg: "#e8d9d9", text: "#6b2b36" },
  DA_HUY: { bg: "#e4e0da", text: "#9a9086" },
};

// ===== Vai tro =====
export const VAI_TRO = {
  ADMIN: "ADMIN",
  LE_TAN: "LE_TAN",
  SALES: "SALES",
} as const;

export const NHAN_VAI_TRO: Record<string, string> = {
  ADMIN: "BTC",
  SALES: "Sales",
  LE_TAN: "Lễ tân",
};

// Trang mac dinh sau khi dang nhap theo vai tro
export const TRANG_CHINH: Record<string, string> = {
  ADMIN: "/admin",
  SALES: "/sales",
  LE_TAN: "/checkin",
};

// ===== Lan check in =====
export const LAN_CHECKIN = ["Làn 1", "Làn 2", "Làn 3", "Làn 4", "Làn VIP", "Quầy hỗ trợ"];

export const KET_QUA_CHECKIN = {
  THANH_CONG: "THANH_CONG",
  TRUNG_LAP: "TRUNG_LAP",
  KHONG_HOP_LE: "KHONG_HOP_LE",
} as const;

// ===== Dai so thu tu theo venue =====
export interface DaiVenue {
  code: string;
  ten: string;
  rangeStart: number;
  rangeEnd: number;
  mauSac: string;
  thuTu: number;
  // KPI venue: quota = so khach muc tieu (dem theo nguoi), cong ty, doanh thu cam ket (VND)
  quota: number;
  mucTieuCongTy: number;
  doanhThuCamKet: number;
}

export const DAI_VENUE: DaiVenue[] = [
  { code: "BOD", ten: "Holdings", rangeStart: 9000, rangeEnd: 9999, mauSac: "#1a1613", thuTu: 0, quota: 80, mucTieuCongTy: 40, doanhThuCamKet: 0 },
  { code: "RIVERSIDE", ten: "Riverside Palace", rangeStart: 1000, rangeEnd: 1999, mauSac: "#b5303a", thuTu: 1, quota: 500, mucTieuCongTy: 250, doanhThuCamKet: 20_000_000_000 },
  { code: "GALLERY", ten: "Gallery Hall", rangeStart: 2000, rangeEnd: 2999, mauSac: "#c2853d", thuTu: 2, quota: 100, mucTieuCongTy: 50, doanhThuCamKet: 3_000_000_000 },
  { code: "PARKVIEW", ten: "Parkview", rangeStart: 3000, rangeEnd: 3999, mauSac: "#5c6b4f", thuTu: 3, quota: 60, mucTieuCongTy: 30, doanhThuCamKet: 2_500_000_000 },
  { code: "CLARIS", ten: "Claris Palace", rangeStart: 4000, rangeEnd: 4999, mauSac: "#3a5a6b", thuTu: 4, quota: 20, mucTieuCongTy: 10, doanhThuCamKet: 625_000_000 },
  { code: "CHLOE", ten: "Chloe Gallery", rangeStart: 5000, rangeEnd: 5999, mauSac: "#7b5a8c", thuTu: 5, quota: 20, mucTieuCongTy: 10, doanhThuCamKet: 2_000_000_000 },
  { code: "CHILL", ten: "Chill", rangeStart: 6000, rangeEnd: 6999, mauSac: "#4f7a74", thuTu: 6, quota: 20, mucTieuCongTy: 10, doanhThuCamKet: 300_000_000 },
  { code: "TAICUA", ten: "Khách bổ sung tại cửa", rangeStart: 8000, rangeEnd: 8999, mauSac: "#6b6255", thuTu: 9, quota: 0, mucTieuCongTy: 0, doanhThuCamKet: 0 },
];
// Venue da bo, gop vao venue khac khi dong bo (khach va tai khoan chuyen sang, so thu tu giu nguyen)
export const VENUE_GOP: Record<string, string> = { MARKETING: "BOD", DUPHONG: "BOD" };
// Tang khi doi KPI tren de ghi de quota va muc tieu trong CSDL o lan build ke tiep
export const PHIEN_BAN_KPI = "2026-10-kpi-3";

// ===== Con so mac dinh (gia dinh, BTC chinh sau) =====
export const CHISO = {
  tongKhachMucTieu: 800,
  tongCongTyMucTieu: 400,
  tyLeVang: 0.1,
  nguongXacNhan: 889, // 800 cong vang 10%
  soLanQuet: 4,
  soLeTan: 12,
};

// Giai doan demo: thanh thong bao tren dau moi trang tu an tu thoi diem launch (gio Viet Nam)
export const LAUNCH = {
  ngay: "26/10/2026",
  luc: "2026-10-26T00:00:00+07:00",
};

export const SU_KIEN = {
  ten: "Capella 20 năm, Đêm tri ân khách hàng",
  ngay: "12/11/2026",
  diaDiem: "Riverside Palace",
  soKhach: 800,
};
