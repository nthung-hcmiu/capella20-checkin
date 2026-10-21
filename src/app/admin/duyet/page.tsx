import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { TRANG_THAI } from "@/lib/constants";
import { ApproveQueue, ChoDuyetItem } from "@/components/ApproveQueue";

export const dynamic = "force-dynamic";

export default async function DuyetPage() {
  await yeuCauTrang(["ADMIN"], "/admin/duyet");
  const ds = await prisma.guest.findMany({
    where: { trangThai: TRANG_THAI.CHO_DUYET },
    include: { venue: true },
    orderBy: { createdAt: "asc" },
  });

  const items: ChoDuyetItem[] = [];
  for (const g of ds) {
    let xungDot: ChoDuyetItem["xungDot"] = null;
    if (g.lyDoChoDuyet === "TRUNG_SDT") {
      const khac = await prisma.guest.findFirst({
        where: { sdt: g.sdt, id: { not: g.id }, trangThai: { not: TRANG_THAI.DA_HUY } },
        include: { venue: true },
        orderBy: { createdAt: "asc" },
      });
      if (khac) {
        xungDot = {
          soThuTu: khac.soThuTu,
          hoTen: khac.hoTen,
          trangThai: khac.trangThai,
          venueTen: khac.venue.ten,
          salesOwner: khac.salesOwner,
        };
      }
    }
    items.push({
      id: g.id,
      soThuTu: g.soThuTu,
      hoTen: g.hoTen,
      sdt: g.sdt,
      venueTen: g.venue.ten,
      soNguoiMoi: g.soNguoiMoi,
      salesOwner: g.salesOwner,
      lyDo: g.lyDoChoDuyet,
      isVip: g.isVip,
      xungDot,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Chờ duyệt</h1>
        <p className="mt-1 text-sm text-ink-muted">
          BTC chống trùng và duyệt VIP. {items.length} trường hợp đang chờ.
        </p>
      </div>
      <ApproveQueue items={items} />
    </div>
  );
}
