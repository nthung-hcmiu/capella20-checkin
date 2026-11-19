"use server";

// Thao tac cua khach tren trang thiep (khong dang nhap, nhan dien bang ma bi mat cua thiep)
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { DUOC_XAC_NHAN, TRANG_THAI } from "./constants";
import { khachDiKemThu } from "./khach";
import { KHACH_TU_XAC_NHAN, tinhSauTraLoi } from "./xacNhan";

// Khach tra loi co tham du hay khong, cho rieng nguoi thu k tren thiep (khong co k la khach chinh)
export async function khachTraLoi(ma: string, k: number | null, thamDu: boolean): Promise<{ ok: boolean; thongBao: string }> {
  const maChuan = String(ma || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(maChuan)) return { ok: false, thongBao: "Thiệp không hợp lệ." };
  const g = await prisma.guest.findUnique({ where: { maBiMat: maChuan } });
  if (!g || g.trangThai === TRANG_THAI.DA_HUY) return { ok: false, thongBao: "Thiệp không hợp lệ." };
  if (g.trangThai === TRANG_THAI.DA_CHECKIN) return { ok: false, thongBao: "Quý khách đã check in tại sự kiện." };
  if (!DUOC_XAC_NHAN.includes(g.trangThai)) {
    return { ok: false, thongBao: "Thiệp chưa nhận xác nhận. Quý khách vui lòng liên hệ nhân viên Capella đã gửi thiệp." };
  }
  const nguoi = k && k >= 2 ? k : 1;
  if (nguoi >= 2 && !khachDiKemThu(g, nguoi)) return { ok: false, thongBao: "Thiệp không hợp lệ." };

  const kq = tinhSauTraLoi(g, nguoi, thamDu ? "+" : "-");
  await prisma.guest.update({
    where: { id: g.id },
    data: { ...kq, xacNhanLuc: new Date(), xacNhanBoi: KHACH_TU_XAC_NHAN },
  });
  revalidatePath("/", "layout");
  return { ok: true, thongBao: thamDu ? "Cảm ơn quý khách đã xác nhận tham dự." : "Capella đã ghi nhận quý khách không tham dự được." };
}
