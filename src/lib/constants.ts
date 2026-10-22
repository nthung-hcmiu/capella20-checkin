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
  // KPI de xuat (do luong 12/11/2026 den 31/03/2027)
  quota: number; // target gui thu moi
  mucTieuCongTy: number; // muc tieu cong ty check in
  mucTieuKhach: number;
  doanhThuCamKet: number; // VND
  soHopDongDuKien: number;
  giaTriTiecTB: number; // VND
}

export const DAI_VENUE: DaiVenue[] = [
  { code: "RIVERSIDE", ten: "Riverside Palace", rangeStart: 1000, rangeEnd: 1999, mauSac: "#b5303a", thuTu: 1,
    quota: 630, mucTieuCongTy: 252, mucTieuKhach: 504, doanhThuCamKet: 20_000_000_000, soHopDongDuKien: 133, giaTriTiecTB: 150_000_000 },
  { code: "GALLERY", ten: "Gallery Hall", rangeStart: 2000, rangeEnd: 2999, mauSac: "#c2853d", thuTu: 2,
    quota: 88, mucTieuCongTy: 44, mucTieuKhach: 88, doanhThuCamKet: 3_000_000_000, soHopDongDuKien: 25, giaTriTiecTB: 120_000_000 },
  { code: "PARKVIEW", ten: "Parkview", rangeStart: 3000, rangeEnd: 3999, mauSac: "#5c6b4f", thuTu: 3,
    quota: 88, mucTieuCongTy: 44, mucTieuKhach: 88, doanhThuCamKet: 6_000_000_000, soHopDongDuKien: 60, giaTriTiecTB: 100_000_000 },
  { code: "CLARIS", ten: "Claris Palace", rangeStart: 4000, rangeEnd: 4999, mauSac: "#3a5a6b", thuTu: 4,
    quota: 16, mucTieuCongTy: 8, mucTieuKhach: 16, doanhThuCamKet: 625_000_000, soHopDongDuKien: 8, giaTriTiecTB: 80_000_000 },
  { code: "CHLOE", ten: "Chloe Gallery", rangeStart: 5000, rangeEnd: 5999, mauSac: "#7b5a8c", thuTu: 5,
    quota: 24, mucTieuCongTy: 12, mucTieuKhach: 24, doanhThuCamKet: 1_500_000_000, soHopDongDuKien: 11, giaTriTiecTB: 140_000_000 },
  { code: "CHILL", ten: "Chill", rangeStart: 6000, rangeEnd: 6999, mauSac: "#4f7a74", thuTu: 6,
    quota: 16, mucTieuCongTy: 8, mucTieuKhach: 16, doanhThuCamKet: 300_000_000, soHopDongDuKien: 3, giaTriTiecTB: 100_000_000 },
  { code: "MARKETING", ten: "Marketing", rangeStart: 7000, rangeEnd: 7999, mauSac: "#a0566b", thuTu: 7,
    quota: 32, mucTieuCongTy: 16, mucTieuKhach: 32, doanhThuCamKet: 0, soHopDongDuKien: 0, giaTriTiecTB: 0 },
  { code: "BOD", ten: "BGĐ Capella + Holdings", rangeStart: 9000, rangeEnd: 9999, mauSac: "#1a1613", thuTu: 8,
    quota: 36, mucTieuCongTy: 16, mucTieuKhach: 32, doanhThuCamKet: 0, soHopDongDuKien: 0, giaTriTiecTB: 0 },
  { code: "TAICUA", ten: "Khách bổ sung tại cửa", rangeStart: 8000, rangeEnd: 8999, mauSac: "#6b6255", thuTu: 9,
    quota: 0, mucTieuCongTy: 0, mucTieuKhach: 0, doanhThuCamKet: 0, soHopDongDuKien: 0, giaTriTiecTB: 0 },
];
// Tang khi doi KPI tren de ghi de quota va muc tieu trong CSDL o lan build ke tiep
export const PHIEN_BAN_KPI = "2026-10-kpi-1";

// ===== Con so mac dinh (gia dinh, BTC chinh sau) =====
export const CHISO = {
  tongKhachMucTieu: 800,
  tongCongTyMucTieu: 400, // muc tieu cong ty check in
  tyLeVang: 0.1,
  nguongXacNhan: 889, // 800 cong vang 10%
  soThiepPhatHanh: 930, // tong target gui thu moi theo KPI
  soLanQuet: 4,
  soLeTan: 12,
};

export const SU_KIEN = {
  ten: "Capella 20 năm, Đêm tri ân khách hàng",
  ngay: "12/11/2026",
  diaDiem: "Riverside Palace",
  soKhach: 800,
};
