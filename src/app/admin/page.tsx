import Link from "next/link";
import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { CHISO, TRANG_THAI, NHAN_TRANG_THAI, MAU_TRANG_THAI } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const PIPELINE = [
  TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU,
  TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN,
];

function soNguoi(g: { soNguoiXacNhan: number | null; soNguoiMoi: number }) {
  return g.soNguoiXacNhan ?? g.soNguoiMoi;
}

export default async function Dashboard() {
  await yeuCauTrang(["ADMIN"], "/admin");
  const guests = await prisma.guest.findMany({ include: { venue: true } });
  const venues = await prisma.venue.findMany({ orderBy: { thuTu: "asc" } });

  const demTrangThai: Record<string, number> = {};
  for (const g of guests) demTrangThai[g.trangThai] = (demTrangThai[g.trangThai] || 0) + 1;

  const daPhatHanh = guests.filter((g) => PIPELINE.includes(g.trangThai as any)).length;
  const daXacNhanKhach = guests.filter((g) =>
    [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(g.trangThai as any)
  );
  const nguoiXacNhan = daXacNhanKhach.reduce((s, g) => s + soNguoi(g), 0);
  const daCheckin = guests.filter((g) => g.trangThai === TRANG_THAI.DA_CHECKIN);
  const nguoiCheckin = daCheckin.reduce((s, g) => s + soNguoi(g), 0);
  const soCho = demTrangThai[TRANG_THAI.CHO_DUYET] || 0;

  const tiLeXacNhan = Math.min(100, Math.round((nguoiXacNhan / CHISO.nguongXacNhan) * 100));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl text-ink">Bảng điều khiển</h1>
        <p className="mt-1 text-sm text-ink-muted">Đếm người, không đếm thiệp. Số liệu cập nhật theo thời gian thực.</p>
      </div>

      {/* KPI chinh */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          nhan="Người đã xác nhận"
          so={nguoiXacNhan}
          phu={`ngưỡng ${CHISO.nguongXacNhan} người`}
          tiLe={tiLeXacNhan}
          noiBat
        />
        <Kpi nhan="Thiệp đã phát hành" so={daPhatHanh} phu={`dự kiến ${CHISO.soThiepPhatHanh}`} />
        <Kpi nhan="Người đã check in" so={nguoiCheckin} phu={`${daCheckin.length} thiệp đã đến`} />
        <Kpi nhan="Chờ BTC duyệt" so={soCho} phu="trùng SĐT hoặc VIP" canhBao={soCho > 0} />
      </div>

      {/* Phan bo trang thai */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Phân bổ theo trạng thái</h2>
          <span className="text-xs text-ink-muted">{guests.length} khách trong hệ thống</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {Object.keys(NHAN_TRANG_THAI)
            .filter((k) => demTrangThai[k])
            .sort((a, b) => demTrangThai[b] - demTrangThai[a])
            .map((k) => {
              const n = demTrangThai[k];
              const pct = guests.length ? Math.round((n / guests.length) * 100) : 0;
              const mau = MAU_TRANG_THAI[k];
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-xs text-ink-soft">{NHAN_TRANG_THAI[k]}</div>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-ivory-deep">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: mau.text === "#ffffff" ? mau.bg : mau.text }} />
                  </div>
                  <div className="w-10 shrink-0 text-right text-xs font-medium text-ink">{n}</div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Theo venue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display text-lg text-ink">Theo venue</h2>
          <Link href="/admin/quota" className="text-xs font-medium text-gold hover:underline">
            Xem quota →
          </Link>
        </div>
        <div className="hairline" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-6 py-3 font-medium">Venue</th>
                <th className="px-3 py-3 font-medium">Dải số</th>
                <th className="px-3 py-3 text-right font-medium">Khách</th>
                <th className="px-3 py-3 text-right font-medium">Xác nhận</th>
                <th className="px-3 py-3 text-right font-medium">Check in</th>
                <th className="px-6 py-3 text-right font-medium">Quota</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => {
                const ds = guests.filter((g) => g.venueId === v.id);
                if (ds.length === 0 && v.quota === 0) return null;
                const xn = ds.filter((g) => [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(g.trangThai as any));
                const ci = ds.filter((g) => g.trangThai === TRANG_THAI.DA_CHECKIN);
                return (
                  <tr key={v.id} className="border-t border-ivory-deep">
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mauSac }} />
                        {v.ten}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{v.rangeStart} đến {v.rangeEnd}</td>
                    <td className="px-3 py-3 text-right">{ds.length}</td>
                    <td className="px-3 py-3 text-right">{xn.length}</td>
                    <td className="px-3 py-3 text-right">{ci.length}</td>
                    <td className="px-6 py-3 text-right text-ink-muted">{v.quota || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  nhan, so, phu, tiLe, noiBat, canhBao,
}: {
  nhan: string; so: number; phu: string; tiLe?: number; noiBat?: boolean; canhBao?: boolean;
}) {
  return (
    <div className={`card p-5 ${noiBat ? "ring-1 ring-gold/30" : ""} ${canhBao ? "ring-1 ring-wine/30" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</div>
      <div className={`mt-1.5 font-display text-3xl ${canhBao && so > 0 ? "text-wine" : "text-ink"}`}>
        {so.toLocaleString("vi-VN")}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{phu}</div>
      {typeof tiLe === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory-deep">
          <div className="h-full rounded-full bg-gold" style={{ width: `${tiLe}%` }} />
        </div>
      )}
    </div>
  );
}
