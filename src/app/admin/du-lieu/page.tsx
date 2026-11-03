import { prisma } from "@/lib/db";
import { yeuCauTrangQuanTri } from "@/lib/auth";
import { DataTools } from "@/components/DataTools";
import { TRANG_THAI } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function DuLieuPage() {
  await yeuCauTrangQuanTri("/admin/du-lieu");
  const [soKhach, soCheckin, soThamDu, namTruoc] = await Promise.all([
    prisma.guest.count(),
    prisma.checkinLog.count({ where: { ketQua: "THANH_CONG" } }),
    prisma.guest.count({ where: { trangThai: TRANG_THAI.THAM_DU } }),
    prisma.khachNamTruoc.groupBy({ by: ["nam"], _count: { _all: true }, orderBy: { nam: "desc" } }),
  ]);
  const daDen = await prisma.khachNamTruoc.groupBy({ by: ["nam"], where: { soDen: { gt: 0 } }, _count: { _all: true } });
  const namDaTai = namTruoc.map((n) => ({
    nam: n.nam,
    soKhach: n._count._all,
    soDen: daDen.find((d) => d.nam === n.nam)?._count._all || 0,
  }));
  return <DataTools soKhach={soKhach} soCheckin={soCheckin} soThamDu={soThamDu} namDaTai={namDaTai} />;
}
