import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { DataTools } from "@/components/DataTools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function DuLieuPage() {
  await yeuCauTrang(["ADMIN"], "/admin/du-lieu");
  const [soKhach, soCheckin] = await Promise.all([
    prisma.guest.count(),
    prisma.checkinLog.count({ where: { ketQua: "THANH_CONG" } }),
  ]);
  return <DataTools soKhach={soKhach} soCheckin={soCheckin} />;
}
