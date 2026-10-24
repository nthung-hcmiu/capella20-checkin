import Link from "next/link";
import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { CHIEM_QUOTA, CHISO, DA_PHAT_HANH_VE, TRANG_THAI, NHAN_TRANG_THAI, MAU_TRANG_THAI } from "@/lib/constants";
import { dinhDangTien } from "@/lib/format";
import { cong, rong, tongHopTheoVenue } from "@/lib/kpi";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const PIPELINE = DA_PHAT_HANH_VE;

function soNguoi(g: { soNguoiXacNhan: number | null; soNguoiMoi: number }) {
  return g.soNguoiXacNhan ?? g.soNguoiMoi;
}

export default async function Dashboard({ searchParams }: { searchParams: { khongQuyen?: string } }) {
  await yeuCauTrang(["ADMIN"], "/admin");
  const guests = await prisma.guest.findMany({ include: { venue: true } });
  const venues = await prisma.venue.findMany({ orderBy: { thuTu: "asc" } });

  const demTrangThai: Record<string, number> = {};
  for (const g of guests) demTrangThai[g.trangThai] = (demTrangThai[g.trangThai] || 0) + 1;

  const daPhatHanh = guests.filter((g) => PIPELINE.includes(g.trangThai)).length;
  // Nguoi da co ve con hieu luc (khong tinh khong tham du, vang mat)
  const nguoiPhatHanh = guests
    .filter((g) => PIPELINE.includes(g.trangThai) && CHIEM_QUOTA.includes(g.trangThai))
    .reduce((s, g) => s + g.soNguoiMoi, 0);
  const daXacNhanKhach = guests.filter((g) =>
    [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(g.trangThai as any)
  );
  const nguoiXacNhan = daXacNhanKhach.reduce((s, g) => s + soNguoi(g), 0);
  const daCheckin = guests.filter((g) => g.trangThai === TRANG_THAI.DA_CHECKIN);
  const nguoiCheckin = daCheckin.reduce((s, g) => s + (g.soNguoiDen ?? soNguoi(g)), 0);

  // Doi soat nhu sheet Reconcile: dang ky (xac nhan) so voi thuc te check in
  const cachCheckin = await prisma.checkinLog.groupBy({ by: ["cach"], where: { ketQua: "THANH_CONG" }, _count: { _all: true } });
  const soQR = cachCheckin.find((c) => c.cach === "QR")?._count._all || 0;
  const soThuCong = cachCheckin.filter((c) => c.cach !== "QR").reduce((s, c) => s + c._count._all, 0);
  const doiSoat = (khoa: (g: (typeof guests)[number]) => string) => {
    const m = new Map<string, { khach: number; dangKy: number; den: number; thiepDen: number }>();
    for (const g of guests) {
      if (!PIPELINE.includes(g.trangThai)) continue;
      const k = khoa(g) || "Chưa phân nhóm";
      const r = m.get(k) || { khach: 0, dangKy: 0, den: 0, thiepDen: 0 };
      r.khach++;
      if ([TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(g.trangThai as any)) r.dangKy += soNguoi(g);
      if (g.trangThai === TRANG_THAI.DA_CHECKIN) {
        r.den += g.soNguoiDen ?? soNguoi(g);
        r.thiepDen++;
      }
      m.set(k, r);
    }
    return [...m.entries()].sort((a, b) => b[1].khach - a[1].khach);
  };
  const theoNhom = doiSoat((g) => g.nhomKhachMoi || "");
  const theoSales = doiSoat((g) => g.salesOwner);
  const soCho = demTrangThai[TRANG_THAI.CHO_DUYET] || 0;

  const soLieu = tongHopTheoVenue(guests);
  const dongVenue = venues
    .map((v) => ({ v, r: soLieu.get(v.id) || rong() }))
    .filter(({ v, r }) => v.quota > 0 || r.soKhach > 0);
  const tongVenue = dongVenue.reduce((t, { r }) => cong(t, r), rong());

  const tiLeXacNhan = Math.min(100, Math.round((nguoiXacNhan / CHISO.nguongXacNhan) * 100));

  return (
    <div className="space-y-7">
      {searchParams.khongQuyen && (
        <div className="rounded-xl bg-wine/10 px-4 py-3 text-sm text-wine">Trang vừa mở chỉ dành cho Quản trị.</div>
      )}
      <div>
        <h1 className="font-display text-2xl text-ink">Bảng điều khiển</h1>
        <p className="mt-1 text-sm text-ink-muted">Đếm người, không đếm thiệp. Số liệu cập nhật theo thời gian thực.</p>
      </div>

      {/* KPI chinh */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          nhan="Người đã xác nhận"
          so={nguoiXacNhan}
          phu={`ngưỡng ${CHISO.nguongXacNhan} người`}
          tiLe={tiLeXacNhan}
          noiBat
        />
        <Kpi
          nhan="Khách đã phát hành vé"
          so={nguoiPhatHanh}
          phu={`mục tiêu ${CHISO.tongKhachMucTieu} khách · ${daPhatHanh} thiệp`}
          tiLe={Math.min(100, Math.round((nguoiPhatHanh / CHISO.tongKhachMucTieu) * 100))}
        />
        <Kpi nhan="Người đã check in" so={nguoiCheckin} phu={`${daCheckin.length} thiệp đã đến`} />
        <Kpi nhan="Chờ BTC duyệt" so={soCho} phu="sales đã gửi, BTC chưa duyệt" canhBao={soCho > 0} />
        <Kpi
          nhan="Công ty được mời"
          so={tongVenue.soCongTy}
          phu={`mục tiêu ${CHISO.tongCongTyMucTieu} công ty check in`}
          tiLe={Math.min(100, Math.round((tongVenue.soCongTy / CHISO.tongCongTyMucTieu) * 100))}
        />
        <Kpi
          nhan="Doanh thu dự kiến"
          so={tongVenue.doanhThu}
          hien={dinhDangTien(tongVenue.doanhThu)}
          phu={`cam kết ${dinhDangTien(venues.reduce((t, v) => t + v.doanhThuCamKet, 0))}`}
          tiLe={(() => {
            const camKet = venues.reduce((t, v) => t + v.doanhThuCamKet, 0);
            return camKet ? Math.min(100, Math.round((tongVenue.doanhThu / camKet) * 100)) : 0;
          })()}
        />
      </div>

      {/* Doi soat */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <h2 className="font-display text-lg text-ink">Đối soát đăng ký và thực tế</h2>
            <p className="text-xs text-ink-muted">Chỉ tính thiệp đã phát hành. Tỷ lệ tham dự = người thực tế đến / người đã đăng ký.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="chip bg-sage/10 text-sage">Check in bằng QR: {soQR}</span>
            <span className="chip bg-ivory-deep text-ink-soft">Thủ công: {soThuCong}</span>
          </div>
        </div>
        <div className="hairline" />
        <div className="grid gap-px bg-ivory-deep lg:grid-cols-2">
          <BangDoiSoat tieuDe="Theo nhóm khách mời" dong={theoNhom} />
          <BangDoiSoat tieuDe="Theo người phụ trách" dong={theoSales} />
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <h2 className="font-display text-lg text-ink">Theo venue</h2>
            <p className="text-xs text-ink-muted">
              Thực tế so với KPI. Doanh thu dự kiến cộng theo công ty (mỗi công ty tính một lần), không tính khách đã hủy.
            </p>
          </div>
          <Link href="/admin/quota" className="text-xs font-medium text-brand hover:underline">
            Xem quota và KPI →
          </Link>
        </div>
        <div className="hairline" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-6 py-3 font-medium">Venue</th>
                <th className="px-3 py-3 text-right font-medium">Doanh thu dự kiến</th>
                <th className="px-3 py-3 text-right font-medium">Số công ty</th>
                <th className="px-3 py-3 text-right font-medium">Số khách</th>
                <th className="px-3 py-3 text-right font-medium">Xác nhận</th>
                <th className="px-3 py-3 text-right font-medium">Check in</th>
                <th className="px-6 py-3 text-right font-medium">Thiệp</th>
              </tr>
            </thead>
            <tbody>
              {dongVenue.map(({ v, r }) => (
                <tr key={v.id} className="border-t border-ivory-deep">
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mauSac }} />
                      {v.ten}
                    </span>
                    <div className="pl-[18px] text-[11px] text-ink-muted">{v.rangeStart} đến {v.rangeEnd}</div>
                  </td>
                  <OSoSanh thucTe={r.doanhThu} mucTieu={v.doanhThuCamKet} tien />
                  <OSoSanh thucTe={r.soCongTy} mucTieu={v.mucTieuCongTy} />
                  <OSoSanh thucTe={r.soKhach} mucTieu={v.quota} />
                  <td className="px-3 py-3 text-right">{r.xacNhan}</td>
                  <td className="px-3 py-3 text-right">{r.checkin}</td>
                  <td className="px-6 py-3 text-right">
                    {r.thiep}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-ivory-deep bg-ivory/50 font-medium">
                <td className="px-6 py-3 text-ink">Tổng</td>
                <OSoSanh thucTe={tongVenue.doanhThu} mucTieu={venues.reduce((s, v) => s + v.doanhThuCamKet, 0)} tien />
                <OSoSanh thucTe={tongVenue.soCongTy} mucTieu={venues.reduce((s, v) => s + v.mucTieuCongTy, 0)} />
                <OSoSanh thucTe={tongVenue.soKhach} mucTieu={venues.reduce((s, v) => s + v.quota, 0)} />
                <td className="px-3 py-3 text-right">{tongVenue.xacNhan}</td>
                <td className="px-3 py-3 text-right">{tongVenue.checkin}</td>
                <td className="px-6 py-3 text-right">
                  {tongVenue.thiep}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// O so sanh thuc te voi muc tieu, kem % dat
function OSoSanh({ thucTe, mucTieu, tien }: { thucTe: number; mucTieu: number; tien?: boolean }) {
  const hien = (n: number) => (tien ? dinhDangTien(n) : n.toLocaleString("vi-VN"));
  const pct = mucTieu > 0 ? Math.round((thucTe / mucTieu) * 100) : null;
  return (
    <td className="px-3 py-3 text-right align-top">
      <div className="whitespace-nowrap text-ink">{tien && !thucTe ? "-" : hien(thucTe)}</div>
      {mucTieu > 0 && (
        <div className="whitespace-nowrap text-[11px] text-ink-muted">
          / {hien(mucTieu)} · <span className={pct! >= 100 ? "text-sage" : ""}>{pct}%</span>
        </div>
      )}
    </td>
  );
}

function Kpi({
  nhan, so, hien, phu, tiLe, noiBat, canhBao,
}: {
  nhan: string; so: number; hien?: string; phu: string; tiLe?: number; noiBat?: boolean; canhBao?: boolean;
}) {
  return (
    <div className={`card p-5 ${noiBat ? "ring-1 ring-brand/30" : ""} ${canhBao ? "ring-1 ring-wine/30" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</div>
      <div className={`mt-1.5 font-display text-3xl ${canhBao && so > 0 ? "text-wine" : "text-ink"}`}>
        {hien ?? so.toLocaleString("vi-VN")}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{phu}</div>
      {typeof tiLe === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory-deep">
          <div className="h-full rounded-full bg-brand" style={{ width: `${tiLe}%` }} />
        </div>
      )}
    </div>
  );
}

function BangDoiSoat({ tieuDe, dong }: { tieuDe: string; dong: [string, { khach: number; dangKy: number; den: number; thiepDen: number }][] }) {
  const tong = dong.reduce(
    (t, [, r]) => ({ khach: t.khach + r.khach, dangKy: t.dangKy + r.dangKy, den: t.den + r.den }),
    { khach: 0, dangKy: 0, den: 0 }
  );
  const tl = (den: number, dk: number) => (dk > 0 ? `${Math.round((den / dk) * 100)}%` : "-");
  return (
    <div className="overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-5 py-3 font-medium">{tieuDe}</th>
            <th className="px-3 py-3 text-right font-medium">Thiệp</th>
            <th className="px-3 py-3 text-right font-medium">Đăng ký</th>
            <th className="px-3 py-3 text-right font-medium">Thực tế</th>
            <th className="px-5 py-3 text-right font-medium">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody>
          {dong.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-6 text-center text-xs text-ink-muted">Chưa có thiệp phát hành.</td>
            </tr>
          )}
          {dong.map(([k, r]) => (
            <tr key={k} className="border-t border-ivory-deep">
              <td className="px-5 py-2.5 text-ink">{k}</td>
              <td className="px-3 py-2.5 text-right">{r.khach}</td>
              <td className="px-3 py-2.5 text-right">{r.dangKy}</td>
              <td className="px-3 py-2.5 text-right">{r.den}</td>
              <td className="px-5 py-2.5 text-right text-ink-muted">{tl(r.den, r.dangKy)}</td>
            </tr>
          ))}
          {dong.length > 1 && (
            <tr className="border-t border-ivory-deep bg-ivory/50 font-medium">
              <td className="px-5 py-2.5 text-ink">Tổng</td>
              <td className="px-3 py-2.5 text-right">{tong.khach}</td>
              <td className="px-3 py-2.5 text-right">{tong.dangKy}</td>
              <td className="px-3 py-2.5 text-right">{tong.den}</td>
              <td className="px-5 py-2.5 text-right">{tl(tong.den, tong.dangKy)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
