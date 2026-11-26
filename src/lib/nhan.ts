// Nhan dan ngoai thiep giay: cac loai giay nhan in duoc, nguoi in chon luc in.
// Don vi: mm. De o file rieng vi ca trang may chu va thanh phan trinh duyet cung dung.
// Cac nhan xep sat nhau, khong co khe; phan thua cua to giay chia deu thanh le hai ben (leNgang) hoac tren duoi (leDoc).
export interface QuyCach {
  ma: string;
  ten: string;
  kho: "A4" | "A5";
  huong: "landscape" | "portrait";
  rong: number; // be rong to giay theo huong in
  cao: number;
  cot: number;
  hang: number;
  nhanRong: number;
  nhanCao: number;
  leNgang: number; // le trai (va phai)
  leDoc: number; // le tren (va duoi)
  // Co chu (pt): ten khach nho dan theo do dai [so ky tu toi da, co chu]; dong phu la chuc vu va cong ty
  coTen: [number, number][];
  coPhu: number;
  coKinhGui: number;
  coSo: number;
  demTren: number; // khoang dem trong nhan (mm): phia tren
  demNgang: number; // hai ben
}
// May in van phong thuong khong in duoc sat mep giay: chu va so tren cac nhan nam sat mep to giay duoc lui vao it nhat chung nay (mm)
export const MEP_AN_TOAN = 7;
// So thu tu va so dien thoai nam o day nhan, cach mep nhan it nhat chung nay (mm)
export const SO_CACH_DAY = 3;
export const SO_CACH_BEN = 5;

export const DS_QUY_CACH: QuyCach[] = [
  {
    // To A5 xoay ngang 210 x 148: 2 cot x 96 = 192, le hai ben 9; 4 hang x 37 = 148, khong co le tren duoi
    ma: "tomy100", ten: "Tomy No. 100", kho: "A5", huong: "landscape", rong: 210, cao: 148, cot: 2, hang: 4, nhanRong: 96, nhanCao: 37, leNgang: 9, leDoc: 0,
    coTen: [[22, 14], [30, 12.5], [42, 11], [999, 9.5]], coPhu: 8, coKinhGui: 8, coSo: 13, demTren: 2.2, demNgang: 4,
  },
  {
    // To A4 dung 210 x 297: 3 cot x 70 = 210, khong co le hai ben; 8 hang x 35 = 280, le tren duoi 8.5
    ma: "tomy136", ten: "Tomy No. 136", kho: "A4", huong: "portrait", rong: 210, cao: 297, cot: 3, hang: 8, nhanRong: 70, nhanCao: 35, leNgang: 0, leDoc: 8.5,
    coTen: [[22, 12], [32, 11], [44, 10], [999, 9]], coPhu: 7.5, coKinhGui: 7, coSo: 12, demTren: 1.8, demNgang: 3,
  },
];

export interface Nhan {
  khoa: string;
  ten: string; // da gom danh xung
  chucVu: string;
  congTy: string;
  sdt: string; // so dien thoai, da tach nhom cho de doc; khach di kem dung so cua khach chinh
  so: number; // so thu tu thiep
}

// 0901234567 thanh 0901 234 567
export function hienSdt(sdt: string | null | undefined): string {
  const so = String(sdt || "").replace(/\D/g, "");
  if (so.length === 10) return `${so.slice(0, 4)} ${so.slice(4, 7)} ${so.slice(7)}`;
  if (so.length === 11) return `${so.slice(0, 4)} ${so.slice(4, 7)} ${so.slice(7)}`;
  return String(sdt || "").trim();
}
