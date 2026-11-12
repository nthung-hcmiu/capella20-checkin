import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { DA_PHAT_HANH_VE, TRANG_THAI } from "@/lib/constants";
import { dinhDangTien } from "@/lib/format";
import { rong, tongHopTheoVenue } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export default async function QuotaPage() {
  await yeuCauTrang(["ADMIN"], "/admin/quota");
  const venues = await prisma.venue.findMany({ orderBy: { thuTu: "asc" } });
  const guests = await prisma.guest.findMany({
    select: {
      venueId: true, trangThai: true, congTy: true, maCorp: true, doanhThuDuKien: true,
      soNguoiMoi: true, soNguoiXacNhan: true, soNguoiDen: true, lyDoChoDuyet: true, salesOwner: true,
    },
  });
  const soLieu = tongHopTheoVenue(guests);

  // Theo doi theo sales: moi sales da moi bao nhieu cong ty, bao nhieu khach (dung lai ham gom, khoa la ten sales)
  const salesTk = await prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, orderBy: { hoTen: "asc" } });
  const theoSales = tongHopTheoVenue(guests.map((g) => ({ ...g, venueId: g.salesOwner })));
  const demTT = (ten: string, tt: string[]) => guests.filter((g) => g.salesOwner === ten && tt.includes(g.trangThai)).length;
  const dongSales = (ten: string, venueId: string | null, coTk: boolean) => {
    const r = theoSales.get(ten) || rong();
    return {
      ten, venueId, coTk, ...r,
      nhap: demTT(ten, [TRANG_THAI.NHAP]),
      choDuyet: demTT(ten, [TRANG_THAI.CHO_DUYET]),
      coVe: demTT(ten, DA_PHAT_HANH_VE),
    };
  };
  const dsSales = salesTk.map((t) => dongSales(t.hoTen, t.venueId, true));
  // Nguoi phu trach co khach nhung chua co tai khoan sales (vd BTC)
  for (const [ten, r] of theoSales) {
    if (r.thiep > 0 && !salesTk.some((t) => t.hoTen === ten)) dsSales.push(dongSales(ten, null, false));
  }
  const nhomVenue = [
    ...venues.map((v) => ({ id: v.id as string | null, ten: v.ten, mau: v.mauSac, quota: v.quota, mucTieuCongTy: v.mucTieuCongTy })),
    { id: null, ten: "Chưa gán venue", mau: "#9a9086", quota: 0, mucTieuCongTy: 0 },
  ];
  const tongQuota = venues.reduce((s, v) => s + v.quota, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Quota và KPI venue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quota mỗi venue là số khách mục tiêu, đếm theo người (tổng {tongQuota.toLocaleString("vi-VN")} khách). Không tính khách đã hủy,
          không tham dự hoặc vắng mặt. Venue hết quota không chặn sales thêm khách, khách mới được gắn cảnh báo để BTC xem khi duyệt.
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
            const pct = v.quota > 0 ? Math.min(100, Math.round((r.soKhach / v.quota) * 100)) : 0;
            const day = v.quota > 0 && r.soKhach >= v.quota;
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
                    <span className="font-display text-2xl text-ink">{r.soKhach}</span>
                    <span className="text-sm text-ink-muted"> / {v.quota || "không giới hạn"} khách</span>
                    <span className="ml-2 text-xs text-ink-muted">{r.thiep} thiệp</span>
                  </div>
                  {vuotQuota > 0 && <span className="chip bg-wine/10 text-wine">{vuotQuota} chờ duyệt vượt quota</span>}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory-deep">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: day ? "#6b2b36" : v.mauSac }} />
                </div>
                <div className="mt-2 text-xs text-ink-muted">
                  {v.quota > 0 ? (day ? "Đã đủ quota, khách thêm mới sẽ có cảnh báo vượt quota" : `Còn ${v.quota - r.soKhach} khách`) : "Dải đặc biệt, không tính quota"}
                </div>

                {(v.mucTieuCongTy > 0 || v.doanhThuCamKet > 0) && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ivory-deep pt-3 text-xs">
                    <ChiSo nhan="Công ty" thucTe={r.soCongTy.toLocaleString("vi-VN")} mucTieu={v.mucTieuCongTy.toLocaleString("vi-VN")} />
                    {v.doanhThuCamKet > 0 && (
                      <ChiSo nhan="Doanh thu dự kiến" thucTe={r.doanhThu ? dinhDangTien(r.doanhThu) : "-"} mucTieu={dinhDangTien(v.doanhThuCamKet)} />
                    )}
                  </dl>
                )}
              </div>
            );
          })}
      </div>

      {/* Theo doi theo sales */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="font-display text-lg text-ink">Theo dõi theo sales</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Mỗi sales đã mời bao nhiêu công ty, bao nhiêu khách. Số khách đếm theo người, không tính khách đã hủy, không tham dự hoặc vắng mặt.
            Phần trăm là tỷ trọng trên quota của venue.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-ivory-deep text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3 font-medium">Sales</th>
                <th className="px-3 py-3 text-right font-medium">Công ty</th>
                <th className="px-3 py-3 text-right font-medium">Khách</th>
                <th className="px-3 py-3 text-right font-medium">Thiệp</th>
                <th className="px-3 py-3 text-right font-medium">Nháp</th>
                <th className="px-3 py-3 text-right font-medium">Chờ duyệt</th>
                <th className="px-3 py-3 text-right font-medium">Đã có vé</th>
                <th className="px-3 py-3 text-right font-medium">Xác nhận</th>
                <th className="px-3 py-3 text-right font-medium">Check in</th>
                <th className="px-5 py-3 text-right font-medium">Doanh thu dự kiến</th>
              </tr>
            </thead>
            <tbody>
              {nhomVenue.map((v) => {
                const ds = dsSales.filter((d) => d.venueId === v.id);
                if (!ds.length) return null;
                const tong = ds.reduce(
                  (t, d) => ({
                    soCongTy: t.soCongTy + d.soCongTy, soKhach: t.soKhach + d.soKhach, thiep: t.thiep + d.thiep, nhap: t.nhap + d.nhap,
                    choDuyet: t.choDuyet + d.choDuyet, coVe: t.coVe + d.coVe, xacNhan: t.xacNhan + d.xacNhan, checkin: t.checkin + d.checkin, doanhThu: t.doanhThu + d.doanhThu,
                  }),
                  { soCongTy: 0, soKhach: 0, thiep: 0, nhap: 0, choDuyet: 0, coVe: 0, xacNhan: 0, checkin: 0, doanhThu: 0 }
                );
                const o = "px-3 py-2.5 text-right";
                return [
                  <tr key={`v-${v.id}`} className="border-t border-ivory-deep bg-ivory/50">
                    <td className="px-5 py-2.5 font-medium text-ink">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mau }} />
                        {v.ten}
                      </span>
                    </td>
                    <td className={`${o} font-medium`}>
                      {tong.soCongTy}
                      {v.mucTieuCongTy > 0 && <span className="font-normal text-ink-muted"> / {v.mucTieuCongTy}</span>}
                    </td>
                    <td className={`${o} font-medium`}>
                      {tong.soKhach}
                      {v.quota > 0 && <span className="font-normal text-ink-muted"> / {v.quota}</span>}
                    </td>
                    <td className={`${o} font-medium`}>{tong.thiep}</td>
                    <td className={o}>{tong.nhap}</td>
                    <td className={o}>{tong.choDuyet}</td>
                    <td className={o}>{tong.coVe}</td>
                    <td className={o}>{tong.xacNhan}</td>
                    <td className={o}>{tong.checkin}</td>
                    <td className="px-5 py-2.5 text-right font-medium">{tong.doanhThu ? dinhDangTien(tong.doanhThu) : "-"}</td>
                  </tr>,
                  ...ds.map((d) => (
                    <tr key={`s-${v.id}-${d.ten}`} className="border-t border-ivory-deep">
                      <td className="px-5 py-2.5 pl-10 text-ink">
                        {d.ten}
                        {!d.coTk && <span className="ml-2 text-[11px] text-ink-muted">chưa có tài khoản sales</span>}
                      </td>
                      <td className={o}>{d.soCongTy}</td>
                      <td className={o}>
                        {d.soKhach}
                        {v.quota > 0 && <span className="ml-1.5 text-[11px] text-ink-muted">{Math.round((d.soKhach / v.quota) * 100)}%</span>}
                      </td>
                      <td className={o}>{d.thiep}</td>
                      <td className={`${o} text-ink-muted`}>{d.nhap}</td>
                      <td className={`${o} text-ink-muted`}>{d.choDuyet}</td>
                      <td className={`${o} text-ink-muted`}>{d.coVe}</td>
                      <td className={`${o} text-ink-muted`}>{d.xacNhan}</td>
                      <td className={`${o} text-ink-muted`}>{d.checkin}</td>
                      <td className="px-5 py-2.5 text-right text-ink-soft">{d.doanhThu ? dinhDangTien(d.doanhThu) : "-"}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
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
