import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { ImportManager } from "@/components/ImportManager";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function NhapPage() {
  await yeuCauTrang(["ADMIN"], "/admin/nhap");
  const [venues, sales] = await Promise.all([
    prisma.venue.findMany({ orderBy: { thuTu: "asc" }, select: { id: true, ten: true } }),
    prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true }, orderBy: { hoTen: "asc" } }),
  ]);
  return <ImportManager venues={venues} salesTeam={sales.map((s) => s.hoTen)} />;
}
