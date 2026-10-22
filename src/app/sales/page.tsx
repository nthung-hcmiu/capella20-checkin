import Link from "next/link";
import { Brand } from "@/components/Brand";
import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { SalesPortal } from "@/components/SalesPortal";
import { UserBar } from "@/components/UserBar";
import { TRANG_THAI } from "@/lib/constants";
import { urlQR } from "@/lib/codes";

export const dynamic = "force-dynamic";

const CHIEM = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_CHECKIN,
];

export default async function SalesPage() {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/sales");
  // Chi gui xuong trinh duyet khach cua chinh sales nay
  const [guests, venues, dem] = await Promise.all([
    prisma.guest.findMany({
      where: { salesOwner: u.hoTen, trangThai: { not: TRANG_THAI.DA_HUY } },
      include: { venue: true },
      orderBy: { soThuTu: "asc" },
    }),
    prisma.venue.findMany({ where: { quota: { gt: 0 } }, orderBy: { thuTu: "asc" } }),
    prisma.guest.groupBy({ by: ["venueId"], where: { trangThai: { in: CHIEM } }, _count: { _all: true } }),
  ]);

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/sales">
            <Brand />
          </Link>
          <UserBar u={u} />
        </div>
      </header>
      <SalesPortal
        ten={u.hoTen}
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
          venueTen: g.venue.ten,
          soNguoiMoi: g.soNguoiMoi,
          soNguoiXacNhan: g.soNguoiXacNhan,
          trangThai: g.trangThai,
          isVip: g.isVip,
        }))}
        venues={venues.map((v) => ({
          id: v.id,
          ten: v.ten,
          quota: v.quota,
          dangDung: dem.find((d) => d.venueId === v.id)?._count._all || 0,
        }))}
      />
    </div>
  );
}
