import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { AccountManager } from "@/components/AccountManager";
import { TRANG_THAI } from "@/lib/constants";
import { boDau } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TaiKhoanPage() {
  const u = await yeuCauTrang(["ADMIN"], "/admin/tai-khoan");
  const [ds, venues] = await Promise.all([
    prisma.staffUser.findMany({ include: { venue: true }, orderBy: [{ vaiTro: "asc" }, { hoTen: "asc" }] }),
    prisma.venue.findMany({ where: { quota: { gt: 0 } }, orderBy: { thuTu: "asc" }, select: { id: true, ten: true } }),
  ]);
  // Ai da co trong danh sach khach moi (so theo ho ten, khong tinh khach da huy); chi Quan tri can
  const khoaTen = (t: string) => boDau(t).replace(/\s+/g, " ").trim();
  const thiepTheoTen = new Map<string, number>();
  if (u.quanTri) {
    const khach = await prisma.guest.findMany({ where: { trangThai: { not: TRANG_THAI.DA_HUY } }, select: { hoTen: true, soThuTu: true }, orderBy: { soThuTu: "asc" } });
    for (const g of khach) if (!thiepTheoTen.has(khoaTen(g.hoTen))) thiepTheoTen.set(khoaTen(g.hoTen), g.soThuTu);
  }
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
        venueBtc: t.vaiTro === "ADMIN" && !t.quanTri ? (t.venueBtc || "").split(",").filter(Boolean) : [],
        xemTatCa: t.xemTatCa,
        coMatKhau: t.matKhau.startsWith("scrypt$"),
        doiMatKhau: t.doiMatKhau,
        laToi: t.id === u.id,
        thiepSo: thiepTheoTen.get(khoaTen(t.hoTen)) ?? null,
      }))}
    />
  );
}
