import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { TRANG_THAI } from "@/lib/constants";
import { dinhDangTien } from "@/lib/format";
import { rong, tongHopTheoVenue } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export default async function QuotaPage() {
  await yeuCauTrang(["ADMIN"], "/admin/quota");
  const venues = await prisma.venue.findMany({ orderBy: { thuTu: "asc" } });
  const guests = await prisma.guest.findMany({
    select: {
      venueId: true, trangThai: true, congTy: true, maCorp: true, doanhThuDuKien: true,
      soNguoiMoi: true, soNguoiXacNhan: true, soNguoiDen: true, lyDoChoDuyet: true,
    },
  });
  const soLieu = tongHopTheoVenue(guests);
  const tongQuota = venues.reduce((s, v) => s + v.quota, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Quota và KPI venue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quota mỗi venue bằng target gửi thư mời (tổng {tongQuota.toLocaleString("vi-VN")} thiệp). KPI đo lường từ 12/11/2026 đến 31/03/2027.
          Venue hết quota không chặn sales thêm khách, khách mới được gắn cảnh báo để BTC xem khi duyệt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {venues
          .filter((v) => v.quota > 0 || guests.some((g) => g.venueId === v.id))
          .map((v) => {
            const r = soLieu.get(v.id) || rong();
            const vuotQuota = guests.filter(
              (g) => g.venueId === v.id && g.trangThai === TRANG_THAI.CHO_DUYET && (g.lyDoChoDuyet || "").includes("HET_QUOTA")
            ).length;
            const pct = v.quota > 0 ? Math.min(100, Math.round((r.thiep / v.quota) * 100)) : 0;
            const day = v.quota > 0 && r.thiep >= v.quota;
            // Ty le chuyen doi nhu bang KPI: (doanh thu cam ket / gia tri tiec TB) / so cong ty
            const tyLeChuyenDoi =
              v.mucTieuCongTy > 0 && v.giaTriTiecTB > 0 ? (v.doanhThuCamKet / v.giaTriTiecTB / v.mucTieuCongTy) * 100 : null;
            return (
              <div key={v.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mauSac }} />
                    {v.ten}
                  </span>
                  <span className="text-xs text-ink-muted">{v.rangeStart} đến {v.rangeEnd}</span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="font-display text-2xl text-ink">{r.thiep}</span>
                    <span className="text-sm text-ink-muted"> / {v.quota || "không giới hạn"} thiệp</span>
                  </div>
                  {vuotQuota > 0 && <span className="chip bg-wine/10 text-wine">{vuotQuota} chờ duyệt vượt quota</span>}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory-deep">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: day ? "#6b2b36" : v.mauSac }} />
                </div>
                <div className="mt-2 text-xs text-ink-muted">
                  {v.quota > 0 ? (day ? "Đã đủ quota, khách thêm mới sẽ có cảnh báo vượt quota" : `Còn ${v.quota - r.thiep} thiệp`) : "Dải đặc biệt, không tính quota"}
                </div>

                {(v.mucTieuCongTy > 0 || v.doanhThuCamKet > 0) && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ivory-deep pt-3 text-xs">
                    <ChiSo nhan="Công ty" thucTe={r.soCongTy.toLocaleString("vi-VN")} mucTieu={v.mucTieuCongTy.toLocaleString("vi-VN")} />
                    <ChiSo nhan="Khách" thucTe={r.soKhach.toLocaleString("vi-VN")} mucTieu={v.mucTieuKhach.toLocaleString("vi-VN")} />
                    {v.doanhThuCamKet > 0 && (
                      <ChiSo nhan="Doanh thu dự kiến" thucTe={r.doanhThu ? dinhDangTien(r.doanhThu) : "-"} mucTieu={dinhDangTien(v.doanhThuCamKet)} />
                    )}
                    {v.soHopDongDuKien > 0 && (
                      <ChiSo
                        nhan="Hợp đồng dự kiến"
                        thucTe={v.soHopDongDuKien.toLocaleString("vi-VN")}
                        mucTieu={tyLeChuyenDoi != null ? `chuyển đổi ${tyLeChuyenDoi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : ""}
                      />
                    )}
                    {v.giaTriTiecTB > 0 && <ChiSo nhan="Giá trị tiệc trung bình" thucTe={dinhDangTien(v.giaTriTiecTB)} mucTieu="" />}
                  </dl>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ChiSo({ nhan, thucTe, mucTieu }: { nhan: string; thucTe: string; mucTieu: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{nhan}</dt>
      <dd className="text-ink">
        {thucTe}
        {mucTieu && <span className="text-ink-muted"> / {mucTieu}</span>}
      </dd>
    </div>
  );
}
