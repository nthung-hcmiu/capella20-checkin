import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { GuestManager, GuestRow, VenueOpt } from "@/components/GuestManager";
import { TRUONG_CHU } from "@/lib/khach";

export const dynamic = "force-dynamic";

export default async function KhachPage() {
  const u = await yeuCauTrang(["ADMIN"], "/admin/khach");
  const [guests, venues] = await Promise.all([
    prisma.guest.findMany({ include: { venue: true }, orderBy: { soThuTu: "asc" } }),
    prisma.venue.findMany({ orderBy: { thuTu: "asc" } }),
  ]);

  const rows: GuestRow[] = guests.map((g) => ({
    id: g.id,
    soThuTu: g.soThuTu,
    maBiMat: g.maBiMat,
    hoTen: g.hoTen,
    sdt: g.sdt,
    venueId: g.venueId,
    venueTen: g.venue.ten,
    venueMau: g.venue.mauSac,
    soNguoiMoi: g.soNguoiMoi,
    soNguoiXacNhan: g.soNguoiXacNhan,
    trangThai: g.trangThai,
    isVip: g.isVip,
    salesOwner: g.salesOwner,
    lyDoChoDuyet: g.lyDoChoDuyet,
    xacNhanBoi: g.xacNhanBoi,
    xacNhanLuc: g.xacNhanLuc?.toISOString() ?? null,
    phatHanhLuc: g.phatHanhLuc?.toISOString() ?? null,
    checkinLuc: g.checkinLuc?.toISOString() ?? null,
    soNguoiDen: g.soNguoiDen,
    createdAt: g.createdAt.toISOString(),
    ghiChu: g.ghiChu,
    daGuiThiepGiay: g.daGuiThiepGiay,
    them: Object.fromEntries(TRUONG_CHU.map((k) => [k, g[k] ?? null])),
  }));

  const venueOpts: VenueOpt[] = venues.map((v) => ({ id: v.id, ten: v.ten, code: v.code }));

  const salesTeam = await prisma.staffUser.findMany({
    where: { vaiTro: "SALES" },
    select: { hoTen: true },
    orderBy: { hoTen: "asc" },
  });

  return (
    <GuestManager
      guests={rows}
      venues={venueOpts}
      salesTeam={salesTeam.map((s) => s.hoTen)}
      quanTri={u.quanTri}
    />
  );
}
