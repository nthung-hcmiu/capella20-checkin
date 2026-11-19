// Khach tu xac nhan tham du tren trang thiep: moi nguoi tren thiep (khach chinh, khach di kem) tra loi cho rieng minh.
// Luu trong Guest.nguoiXacNhan dang "1+,2-": 1 la khach chinh, 2 tro di la khach di kem; + la tham du, - la khong tham du.
// Sales va BTC van xac nhan giup khach tren dashboard nhu cu; lan xac nhan sau cung la ket qua dang dung.
import { TRANG_THAI } from "./constants";
import { docDiCung, tenGoi } from "./khach";

export type TraLoi = "+" | "-";
export const KHACH_TU_XAC_NHAN = "Khách tự xác nhận trên thiệp";

interface KhachXN {
  danhXung?: string | null;
  hoTen: string;
  soNguoiMoi: number;
  khachDiCung: string | null;
  trangThai: string;
  soNguoiXacNhan: number | null;
  nguoiXacNhan: string | null;
}

// Nhung nguoi co thiep rieng tren ve: khach chinh va cac khach di kem da co ten
export function nguoiTrenThiep(g: Pick<KhachXN, "danhXung" | "hoTen" | "soNguoiMoi" | "khachDiCung">): { k: number; ten: string }[] {
  return [
    { k: 1, ten: tenGoi(g) },
    ...docDiCung(g.khachDiCung)
      .slice(0, Math.max(0, g.soNguoiMoi - 1))
      .map((x, i) => ({ k: i + 2, ten: [x.danhXung, x.hoTen].filter(Boolean).join(" ").trim() }))
      .filter((x) => x.ten),
  ];
}

// Cau tra loi hien tai cua tung nguoi. Khach chua tu tra loi ma sales da xac nhan giup thi suy ra tu so nguoi sales ghi.
export function docTraLoi(g: KhachXN): Map<number, TraLoi> {
  const nguoi = nguoiTrenThiep(g);
  const kq = new Map<number, TraLoi>();
  if (g.nguoiXacNhan != null) {
    for (const x of g.nguoiXacNhan.split(",")) {
      const khop = x.trim().match(/^(\d{1,2})([+-])$/);
      if (khop && nguoi.some((n) => n.k === parseInt(khop[1], 10))) kq.set(parseInt(khop[1], 10), khop[2] as TraLoi);
    }
    return kq;
  }
  if (g.trangThai === TRANG_THAI.THAM_DU) {
    const so = g.soNguoiXacNhan ?? g.soNguoiMoi;
    nguoi.forEach((n, i) => kq.set(n.k, i < so ? "+" : "-"));
  } else if (g.trangThai === TRANG_THAI.KHONG_THAM_DU) {
    nguoi.forEach((n) => kq.set(n.k, "-"));
  }
  return kq;
}

// Ket qua cua ca thiep sau khi nguoi thu k tra loi
export function tinhSauTraLoi(g: KhachXN, k: number, traLoi: TraLoi): { nguoiXacNhan: string; trangThai: string; soNguoiXacNhan: number | null } {
  const nguoi = nguoiTrenThiep(g);
  const tl = docTraLoi(g);
  tl.set(k, traLoi);
  const soCo = nguoi.filter((n) => tl.get(n.k) === "+").length;
  const soKhong = nguoi.filter((n) => tl.get(n.k) === "-").length;
  const nguoiXacNhan = nguoi.filter((n) => tl.has(n.k)).map((n) => `${n.k}${tl.get(n.k)}`).join(",");
  if (soCo > 0) return { nguoiXacNhan, trangThai: TRANG_THAI.THAM_DU, soNguoiXacNhan: soCo };
  if (soKhong >= nguoi.length) return { nguoiXacNhan, trangThai: TRANG_THAI.KHONG_THAM_DU, soNguoiXacNhan: 0 };
  // Co nguoi tu choi, nguoi con lai chua tra loi: thiep chua co ket qua
  return { nguoiXacNhan, trangThai: g.trangThai === TRANG_THAI.DA_PHAT_HANH ? TRANG_THAI.DA_PHAT_HANH : TRANG_THAI.DA_MOI, soNguoiXacNhan: null };
}

// Cho sales va BTC: tung nguoi da tu tra loi the nao tren thiep. Khach chua tu tra loi thi tra ve null.
export function moTaTraLoi(g: KhachXN): string | null {
  if (g.nguoiXacNhan == null) return null;
  const tl = docTraLoi(g);
  return nguoiTrenThiep(g)
    .map((n) => `${n.ten}: ${tl.get(n.k) === "+" ? "tham dự" : tl.get(n.k) === "-" ? "không tham dự" : "chưa trả lời"}`)
    .join("; ");
}
