import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { AccountManager } from "@/components/AccountManager";

export const dynamic = "force-dynamic";

export default async function TaiKhoanPage() {
  const u = await yeuCauTrang(["ADMIN"], "/admin/tai-khoan");
  const [ds, venues] = await Promise.all([
    prisma.staffUser.findMany({ include: { venue: true }, orderBy: [{ vaiTro: "asc" }, { hoTen: "asc" }] }),
    prisma.venue.findMany({ where: { quota: { gt: 0 } }, orderBy: { thuTu: "asc" }, select: { id: true, ten: true } }),
  ]);
  return (
    <AccountManager
      quanTri={u.quanTri}
      venues={venues}
      ds={ds.map((t) => ({
        id: t.id,
        username: t.username,
        hoTen: t.hoTen,
        vaiTro: t.vaiTro,
        quanTri: t.vaiTro === "ADMIN" && t.quanTri,
        ca: t.ca,
        venueId: t.venueId,
        venueTen: t.venue?.ten ?? null,
        coMatKhau: t.matKhau.startsWith("scrypt$"),
        doiMatKhau: t.doiMatKhau,
        laToi: t.id === u.id,
      }))}
    />
  );
}
