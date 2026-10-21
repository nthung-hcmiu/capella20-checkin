// Dinh nghia tap trung: trang thai vong doi, vai tro, dai so thu tu, con so mac dinh

// ===== Vong doi khach =====
export const TRANG_THAI = {
  NHAP: "NHAP",
  CHO_DUYET: "CHO_DUYET",
  DANH_SACH_CHO: "DANH_SACH_CHO",
  DA_PHAT_HANH: "DA_PHAT_HANH",
  DA_MOI: "DA_MOI",
  THAM_DU: "THAM_DU",
  CHUA_PHAN_HOI: "CHUA_PHAN_HOI",
  KHONG_THAM_DU: "KHONG_THAM_DU",
  DA_CHECKIN: "DA_CHECKIN",
  VANG_MAT: "VANG_MAT",
  DA_HUY: "DA_HUY",
} as const;

export type TrangThai = (typeof TRANG_THAI)[keyof typeof TRANG_THAI];

export const NHAN_TRANG_THAI: Record<string, string> = {
  NHAP: "Nháp",
  CHO_DUYET: "Chờ duyệt",
  DANH_SACH_CHO: "Danh sách chờ",
  DA_PHAT_HANH: "Đã phát hành",
  DA_MOI: "Đã mời",
  THAM_DU: "Tham dự",
  CHUA_PHAN_HOI: "Chưa phản hồi",
  KHONG_THAM_DU: "Không tham dự",
  DA_CHECKIN: "Đã check in",
  VANG_MAT: "Vắng mặt",
  DA_HUY: "Đã hủy",
};

// Mau hien thi cho tung trang thai (nen, chu)
export const MAU_TRANG_THAI: Record<string, { bg: string; text: string }> = {
  NHAP: { bg: "#efe8db", text: "#6b6255" },
  CHO_DUYET: { bg: "#f4e4c6", text: "#8a6d2f" },
  DANH_SACH_CHO: { bg: "#e7e2d4", text: "#6b6255" },
  DA_PHAT_HANH: { bg: "#e3e9df", text: "#5c6b4f" },
  DA_MOI: { bg: "#dde6ec", text: "#3a5a6b" },
  THAM_DU: { bg: "#d8e8d4", text: "#3d6b36" },
  CHUA_PHAN_HOI: { bg: "#f0e6d0", text: "#8a6d2f" },
  KHONG_THAM_DU: { bg: "#efe2e2", text: "#8a4a4a" },
  DA_CHECKIN: { bg: "#b08d42", text: "#ffffff" },
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
}

export const DAI_VENUE: DaiVenue[] = [
  { code: "RIVERSIDE", ten: "Riverside Palace", rangeStart: 1000, rangeEnd: 1999, mauSac: "#b08d42", thuTu: 1 },
  { code: "GALLERY", ten: "Gallery Hall", rangeStart: 2000, rangeEnd: 2999, mauSac: "#6b2b36", thuTu: 2 },
  { code: "PARKVIEW", ten: "Parkview", rangeStart: 3000, rangeEnd: 3999, mauSac: "#5c6b4f", thuTu: 3 },
  { code: "CLARIS", ten: "Claris Palace", rangeStart: 4000, rangeEnd: 4999, mauSac: "#3a5a6b", thuTu: 4 },
  { code: "CHLOE", ten: "Chloe Gallery", rangeStart: 5000, rangeEnd: 5999, mauSac: "#8a6d2f", thuTu: 5 },
  { code: "DUPHONG", ten: "Dự phòng", rangeStart: 6000, rangeEnd: 7999, mauSac: "#9a9086", thuTu: 6 },
  { code: "TAICUA", ten: "Khách bổ sung tại cửa", rangeStart: 8000, rangeEnd: 8999, mauSac: "#6b6255", thuTu: 7 },
  { code: "BOD", ten: "Khách BOD / BTC", rangeStart: 9000, rangeEnd: 9999, mauSac: "#1a1613", thuTu: 8 },
];

// ===== Con so mac dinh (gia dinh, BTC chinh sau) =====
export const CHISO = {
  tongKhachMucTieu: 800,
  tyLeVang: 0.1,
  nguongXacNhan: 889, // 800 cong vang 10%
  soThiepPhatHanh: 977, // nhan loi 70%, 1.3 nguoi mot thiep
  tyLeNhanLoi: 0.7,
  nguoiMotThiep: 1.3,
  quotaBinhQuan: 176, // moi venue sau khi giu 10% cho BOD/BTC
  soLanQuet: 4,
  soLeTan: 12,
};

export const SU_KIEN = {
  ten: "Capella 20 năm, Đêm tri ân khách hàng",
  ngay: "12/11/2026",
  diaDiem: "Riverside Palace",
  soKhach: 800,
};
