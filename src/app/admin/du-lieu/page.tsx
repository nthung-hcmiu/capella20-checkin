import { prisma } from "@/lib/db";
import { yeuCauTrangQuanTri } from "@/lib/auth";
import { DataTools } from "@/components/DataTools";
import { TRANG_THAI } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function DuLieuPage() {
  await yeuCauTrangQuanTri("/admin/du-lieu");
  const [soKhach, soCheckin, soThamDu] = await Promise.all([
    prisma.guest.count(),
    prisma.checkinLog.count({ where: { ketQua: "THANH_CONG" } }),
    prisma.guest.count({ where: { trangThai: TRANG_THAI.THAM_DU } }),
  ]);
  return <DataTools soKhach={soKhach} soCheckin={soCheckin} soThamDu={soThamDu} />;
}
