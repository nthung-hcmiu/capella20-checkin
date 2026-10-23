import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { SalesPortal } from "@/components/SalesPortal";
import { CHIEM_QUOTA, TRANG_THAI } from "@/lib/constants";
import { TRUONG_CHU } from "@/lib/khach";
import { urlQR } from "@/lib/codes";

export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams: { nhom?: string } }) {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/sales");
  // Chi gui xuong trinh duyet khach cua chinh sales nay
  const [guests, venues, dem] = await Promise.all([
    prisma.guest.findMany({
      where: { salesOwner: u.hoTen, trangThai: { not: TRANG_THAI.DA_HUY } },
      include: { venue: true },
      orderBy: { soThuTu: "asc" },
    }),
    prisma.venue.findMany({ orderBy: { thuTu: "asc" } }),
    prisma.guest.groupBy({ by: ["venueId"], where: { trangThai: { in: CHIEM_QUOTA } }, _count: { _all: true } }),
  ]);
  const venueThem = venues.filter((v) => v.quota > 0);
  // Venue de sua: cac venue co quota, cong venue hien tai cua khach (neu khac)
  const venuesSua = venues.filter((v) => v.quota > 0 || guests.some((g) => g.venueId === v.id)).map((v) => ({ id: v.id, ten: v.ten }));

  return (
    <SalesPortal
      nhomDau={searchParams.nhom}
      guests={guests.map((g) => ({
        id: g.id,
        soThuTu: g.soThuTu,
        maBiMat: g.maBiMat,
        linkThiep: urlQR(g.maBiMat),
        hoTen: g.hoTen,
        sdt: g.sdt,
        danhXung: g.danhXung,
        chucVu: g.chucVu,
        congTy: g.congTy,
        daGuiThiepGiay: g.daGuiThiepGiay,
        venueId: g.venueId,
        venueTen: g.venue.ten,
        venueMau: g.venue.mauSac,
        soNguoiMoi: g.soNguoiMoi,
        khachDiCung: g.khachDiCung,
        soNguoiXacNhan: g.soNguoiXacNhan,
        soNguoiDen: g.soNguoiDen,
        trangThai: g.trangThai,
        isVip: g.isVip,
        ghiChu: g.ghiChu,
        lyDoChoDuyet: g.lyDoChoDuyet,
        phatHanhLuc: g.phatHanhLuc?.toISOString() ?? null,
        xacNhanLuc: g.xacNhanLuc?.toISOString() ?? null,
        checkinLuc: g.checkinLuc?.toISOString() ?? null,
        them: Object.fromEntries(TRUONG_CHU.map((k) => [k, g[k] ?? null])),
      }))}
      venues={venueThem.map((v) => ({
        id: v.id,
        ten: v.ten,
        quota: v.quota,
        dangDung: dem.find((d) => d.venueId === v.id)?._count._all || 0,
      }))}
      venuesSua={venuesSua}
    />
  );
}
