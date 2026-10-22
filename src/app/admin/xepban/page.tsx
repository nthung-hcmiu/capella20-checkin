import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { TRANG_THAI } from "@/lib/constants";
import { TableBoard, BanRow } from "@/components/TableBoard";

export const dynamic = "force-dynamic";

export default async function XepBanPage() {
  await yeuCauTrang(["ADMIN"], "/admin/xepban");
  const ds = await prisma.guest.findMany({
    where: { trangThai: { in: [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN] } },
    include: { venue: true },
    orderBy: { soThuTu: "asc" },
  });

  const rows: BanRow[] = ds.map((g) => ({
    id: g.id,
    soThuTu: g.soThuTu,
    hoTen: g.hoTen,
    venueTen: g.venue.ten,
    venueMau: g.venue.mauSac,
    soNguoi: g.soNguoiXacNhan ?? g.soNguoiMoi,
    ban: g.ban,
    soGhe: g.soGhe,
    danhXung: g.danhXung,
    congTy: g.congTy,
    isVip: g.isVip,
  }));

  return <TableBoard guests={rows} />;
}
