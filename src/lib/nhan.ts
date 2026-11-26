// Nhan dan ngoai thiep giay. Quy cach: Tomy No. 100, to A5 xoay ngang 210 x 148 mm, 8 nhan 96 x 37 mm
// xep 2 cot x 4 hang, le trai va le phai 9 mm, khong co le tren duoi va khong co khe giua cac nhan.
// Don vi: mm. De o file rieng vi ca trang may chu va thanh phan trinh duyet cung dung.
export const QUY_CACH = { ten: "Tomy No. 100", kho: "A5", rong: 210, cao: 148, cot: 2, hang: 4, nhanRong: 96, nhanCao: 37, leNgang: 9 };

export interface Nhan {
  khoa: string;
  ten: string; // da gom danh xung
  chucVu: string;
  congTy: string;
  so: number; // so thu tu thiep
}
