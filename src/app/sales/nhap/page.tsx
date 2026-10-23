import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { ImportManager } from "@/components/ImportManager";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SalesNhapPage() {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/sales/nhap");
  const venues = await prisma.venue.findMany({
    where: u.venueId ? { id: u.venueId } : { quota: { gt: 0 } },
    orderBy: { thuTu: "asc" },
    select: { id: true, ten: true },
  });
  return (
    <ImportManager
      venues={venues}
      salesTeam={[]}
      laSales={u.vaiTro === "SALES"}
      venueCoDinh={u.venueId ? venues[0] : undefined}
    />
  );
}
