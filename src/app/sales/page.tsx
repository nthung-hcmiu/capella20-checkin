import Link from "next/link";
import { prisma } from "@/lib/db";
import { SalesPortal } from "@/components/SalesPortal";
import { TRANG_THAI } from "@/lib/constants";

export const dynamic = "force-dynamic";

const CHIEM = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_CHECKIN,
];

export default async function SalesPage() {
  const [guests, venues, sales] = await Promise.all([
    prisma.guest.findMany({ include: { venue: true }, orderBy: { soThuTu: "asc" } }),
    prisma.venue.findMany({ where: { quota: { gt: 0 } }, orderBy: { thuTu: "asc" } }),
    prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true }, orderBy: { hoTen: "asc" } }),
  ]);

  const rows = guests.map((g) => ({
    id: g.id,
    soThuTu: g.soThuTu,
    maBiMat: g.maBiMat,
    hoTen: g.hoTen,
    sdt: g.sdt,
    venueTen: g.venue.ten,
    venueMau: g.venue.mauSac,
    soNguoiMoi: g.soNguoiMoi,
    soNguoiXacNhan: g.soNguoiXacNhan,
    trangThai: g.trangThai,
    isVip: g.isVip,
    salesOwner: g.salesOwner,
  }));

  const venueOpts = venues.map((v) => ({
    id: v.id,
    ten: v.ten,
    quota: v.quota,
    dangDung: guests.filter((g) => g.venueId === v.id && CHIEM.includes(g.trangThai as any)).length,
  }));

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-sm tracking-[0.2em] text-ink">
            CAPELLA <span className="text-gold">20</span>
          </Link>
          <span className="text-xs text-ink-muted">Cong Sales</span>
        </div>
      </header>
      <SalesPortal guests={rows} venues={venueOpts} salesTeam={sales.map((s) => s.hoTen)} />
    </div>
  );
}
