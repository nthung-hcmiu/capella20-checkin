import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { TRANG_THAI } from "@/lib/constants";
import { ApproveQueue, ChoDuyetItem } from "@/components/ApproveQueue";
import { khoaTen, tenGoi } from "@/lib/khach";

export const dynamic = "force-dynamic";

export default async function DuyetPage() {
  await yeuCauTrang(["ADMIN"], "/admin/duyet");
  const ds = await prisma.guest.findMany({
    where: { trangThai: TRANG_THAI.CHO_DUYET },
    include: { venue: true },
    orderBy: { createdAt: "asc" },
  });

  // Lay mot lan toan bo khach con hieu luc de tim khach bi trung (tranh moi dong mot truy van)
  const conLai = await prisma.guest.findMany({
    where: { trangThai: { not: TRANG_THAI.DA_HUY } },
    select: { id: true, soThuTu: true, hoTen: true, sdt: true, maCorp: true, congTy: true, chucVu: true, trangThai: true, salesOwner: true, createdAt: true, venue: { select: { ten: true } } },
    orderBy: { createdAt: "asc" },
  });

  const items: ChoDuyetItem[] = ds.map((g) => {
    const khoa = khoaTen(g.hoTen, g.maCorp, g.congTy);
    const khac =
      g.lyDoChoDuyet === "TRUNG_SDT" && g.sdt
        ? conLai.find((x) => x.id !== g.id && x.sdt === g.sdt)
        : g.lyDoChoDuyet === "TRUNG_TEN" && khoa
        ? conLai.find((x) => x.id !== g.id && khoaTen(x.hoTen, x.maCorp, x.congTy) === khoa)
        : undefined;
    return {
      id: g.id,
      soThuTu: g.soThuTu,
      hoTen: tenGoi(g),
      moTa: [g.chucVu, g.congTy].filter(Boolean).join(" · "),
      sdt: g.sdt,
      venueTen: g.venue.ten,
      soNguoiMoi: g.soNguoiMoi,
      salesOwner: g.salesOwner,
      lyDo: g.lyDoChoDuyet,
      isVip: g.isVip,
      xungDot: khac
        ? {
            soThuTu: khac.soThuTu,
            hoTen: khac.hoTen,
            moTa: [khac.chucVu, khac.congTy].filter(Boolean).join(" · "),
            trangThai: khac.trangThai,
            venueTen: khac.venue.ten,
            salesOwner: khac.salesOwner,
          }
        : null,
    };
  });

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
