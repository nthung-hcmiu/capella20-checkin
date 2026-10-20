import { prisma } from "@/lib/db";
import { TRANG_THAI, CHISO } from "@/lib/constants";

export const dynamic = "force-dynamic";

const CHIEM = [
  TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI,
  TRANG_THAI.THAM_DU, TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.DA_CHECKIN,
];

export default async function QuotaPage() {
  const venues = await prisma.venue.findMany({ orderBy: { thuTu: "asc" } });
  const guests = await prisma.guest.findMany({ select: { venueId: true, trangThai: true } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Quota venue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quota binh quan {CHISO.quotaBinhQuan} thiep moi venue sau khi giu 10% cho BOD/BTC.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {venues
          .filter((v) => v.quota > 0 || guests.some((g) => g.venueId === v.id))
          .map((v) => {
            const ds = guests.filter((g) => g.venueId === v.id);
            const dung = ds.filter((g) => CHIEM.includes(g.trangThai as any)).length;
            const cho = ds.filter((g) => g.trangThai === TRANG_THAI.DANH_SACH_CHO).length;
            const pct = v.quota > 0 ? Math.min(100, Math.round((dung / v.quota) * 100)) : 0;
            const vuot = v.quota > 0 && dung >= v.quota;
            return (
              <div key={v.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mauSac }} />
                    {v.ten}
                  </span>
                  <span className="text-xs text-ink-muted">{v.rangeStart}-{v.rangeEnd}</span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="font-display text-2xl text-ink">{dung}</span>
                    <span className="text-sm text-ink-muted"> / {v.quota || "khong gioi han"}</span>
                  </div>
                  {cho > 0 && <span className="chip bg-ivory-deep text-ink-soft">{cho} cho</span>}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory-deep">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: vuot ? "#6b2b36" : v.mauSac }}
                  />
                </div>
                <div className="mt-2 text-xs text-ink-muted">
                  {v.quota > 0
                    ? vuot
                      ? "Da day quota, khach moi vao danh sach cho"
                      : `Con ${v.quota - dung} thiep`
                    : "Dai dac biet, khong tinh quota"}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
