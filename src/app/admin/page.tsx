import Link from "next/link";
import { prisma } from "@/lib/db";
import { locXem, yeuCauTrang } from "@/lib/auth";
import { CHIEM_QUOTA, CHISO as CHISO_CHUNG, DA_PHAT_HANH_VE, TRANG_THAI, NHAN_TRANG_THAI, MAU_TRANG_THAI } from "@/lib/constants";
import { dinhDangTien } from "@/lib/format";
import { cong, rong, tongHopTheoVenue } from "@/lib/kpi";
import { taiBoKhop } from "@/lib/lichSu";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const PIPELINE = DA_PHAT_HANH_VE;

function soNguoi(g: { soNguoiXacNhan: number | null; soNguoiMoi: number }) {
  return g.soNguoiXacNhan ?? g.soNguoiMoi;
}

export default async function Dashboard({ searchParams }: { searchParams: { khongQuyen?: string } }) {
  const u = await yeuCauTrang(["ADMIN"], "/admin");
  // BTC duoc giao venue chi thay so lieu cac venue do
  const guests = await prisma.guest.findMany({ where: locXem(u), include: { venue: true } });
  // Doi chieu khach nam truoc: bao nhieu khach cu duoc moi lai, bao nhieu khach da den nam truoc chua duoc moi lai
  const boKhop = await taiBoKhop(prisma);
  const conHieuLuc = guests.filter((g) => g.trangThai !== TRANG_THAI.DA_HUY);
  const tkNamTruoc = boKhop.thongKe(conHieuLuc);
  const coCau = boKhop.coCau(conHieuLuc);
  const venues = await prisma.venue.findMany({ where: u.phamViXem ? { id: { in: u.phamViXem } } : {}, orderBy: { thuTu: "asc" } });
  // Muc tieu: toan su kien theo con so chung; xem theo pham vi thi cong tu cac venue duoc giao
  const tongQuotaXem = venues.reduce((t, v) => t + v.quota, 0);
  const CHISO = u.phamViXem
    ? { ...CHISO_CHUNG, tongKhachMucTieu: tongQuotaXem, tongCongTyMucTieu: venues.reduce((t, v) => t + v.mucTieuCongTy, 0), nguongXacNhan: Math.round(tongQuotaXem / (1 - CHISO_CHUNG.tyLeVang)) }
    : CHISO_CHUNG;

  // Moi khach mot thiep: moi con so deu dem theo thiep (so nguoi duoc moi, ke ca khach di kem)
  const demTrangThai: Record<string, number> = {};
  for (const g of guests) demTrangThai[g.trangThai] = (demTrangThai[g.trangThai] || 0) + g.soNguoiMoi;
  const tongThiep = guests.reduce((s, g) => s + g.soNguoiMoi, 0);

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
      const k = khoa(g) || "Chưa ghi ngành hàng";
      const r = m.get(k) || { khach: 0, dangKy: 0, den: 0, thiepDen: 0 };
      r.khach += g.soNguoiMoi;
      if ([TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(g.trangThai as any)) r.dangKy += soNguoi(g);
      if (g.trangThai === TRANG_THAI.DA_CHECKIN) {
        r.den += g.soNguoiDen ?? soNguoi(g);
        r.thiepDen++;
      }
      m.set(k, r);
    }
    return [...m.entries()].sort((a, b) => b[1].khach - a[1].khach);
  };
  // Xep theo nganh hang (truong Linh vuc cua khach)
  const theoNganh = doiSoat((g) => g.linhVuc || "");
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
        <p className="mt-1 text-sm text-ink-muted">
          Mỗi khách một thiệp, kể cả khách đi kèm, nên số thiệp là số người được mời. Số công ty đếm riêng: một công ty có thể có nhiều thiệp.
        </p>
      </div>

      {/* KPI chinh */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          nhan="Thiệp đã xác nhận"
          so={nguoiXacNhan}
          phu={`ngưỡng ${CHISO.nguongXacNhan} thiệp`}
          tiLe={tiLeXacNhan}
          noiBat
        />
        <Kpi
          nhan="Thiệp đã phát hành"
          so={nguoiPhatHanh}
          phu={`mục tiêu ${CHISO.tongKhachMucTieu} thiệp`}
          tiLe={Math.min(100, Math.round((nguoiPhatHanh / CHISO.tongKhachMucTieu) * 100))}
        />
        <Kpi nhan="Thiệp đã check in" so={nguoiCheckin} phu={`trên ${nguoiXacNhan} thiệp đã xác nhận`} />
        <Kpi nhan="Thiệp chờ BTC duyệt" so={soCho} phu="sales đã gửi, BTC chưa duyệt" canhBao={soCho > 0} />
        <Kpi
          nhan="Công ty được mời"
          so={tongVenue.soCongTy}
          phu={`mục tiêu ${CHISO.tongCongTyMucTieu} công ty`}
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

      {/* So voi cac nam truoc: moi con so deu ghi ca so khach va so cong ty, kem ti le va cach tinh */}
      {tkNamTruoc.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-2 px-6 py-4">
            <div>
              <h2 className="font-display text-lg text-ink">So với khách các năm trước</h2>
              <p className="text-xs text-ink-muted">Mỗi con số ghi cả số khách và số công ty. Phần trăm ghi rõ tính trên nhóm nào.</p>
            </div>
            <Link href="/admin/khach" className="text-xs font-medium text-brand hover:underline">
              Lọc trong danh sách khách →
            </Link>
          </div>

          {/* A. Tu danh sach nam truoc nhin sang nam nay */}
          <div className="border-t border-ivory-deep px-6 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-ink-muted">
            A. Khách các năm trước: đã đến bao nhiêu, năm nay mời lại bao nhiêu
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-6 py-3 font-medium">Năm</th>
                  <th className="px-3 py-3 font-medium">Đơn vị</th>
                  <th className="px-3 py-3 text-right font-medium">Được mời</th>
                  <th className="px-3 py-3 text-right font-medium">Đã đến</th>
                  <th className="px-3 py-3 text-right font-medium">Năm nay mời lại</th>
                  <th className="px-3 py-3 text-right font-medium">Đã đến và được mời lại</th>
                  <th className="px-6 py-3 text-right font-medium">Đã đến, năm nay chưa mời</th>
                </tr>
              </thead>
              <tbody>
                {tkNamTruoc.map((t) =>
                  (["khach", "congTy"] as const).map((dv) => (
                    <tr key={`${t.nam}-${dv}`} className={dv === "khach" ? "border-t border-ivory-deep" : ""}>
                      {dv === "khach" && (
                        <td rowSpan={2} className="px-6 py-1.5 align-top font-display text-lg text-ink">
                          {t.nam}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-2 align-top text-ink-soft">{dv === "khach" ? "Khách" : "Công ty"}</td>
                      <ONam so={t.duocMoi[dv]} />
                      <ONam so={t.daDen[dv]} tren={t.duocMoi[dv]} ghi="số được mời" />
                      <ONam so={t.moiLai[dv]} tren={t.duocMoi[dv]} ghi="số được mời" />
                      <ONam so={t.moiLaiDaDen[dv]} tren={t.daDen[dv]} ghi="số đã đến" />
                      <ONam so={t.denChuaMoi[dv]} tren={t.daDen[dv]} ghi="số đã đến" noiBat cuoi />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* B. Tu danh sach nam nay nhin ve lich su */}
          <div className="border-t border-ivory-deep px-6 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-ink-muted">
            B. Khách năm nay: cũ hay mới
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <CoCau
              tieuDe="Theo khách"
              tong={coCau.tongKhach}
              donVi="khách"
              nhom={[
                { nhan: "Khách cũ, lần gần nhất có đến", so: coCau.khach.den, mau: "#5c6b4f" },
                { nhan: "Khách cũ, lần gần nhất mời nhưng không đến", so: coCau.khach.khongDen, mau: "#c2853d" },
                { nhan: "Người mới của công ty đã từng được mời", so: coCau.khach.congTy, mau: "#3a5a6b" },
                { nhan: "Khách mới hoàn toàn (cả công ty chưa từng mời)", so: coCau.khach.moi, mau: "#b5303a" },
              ]}
              ghiChu={coCau.chuaCoTen > 0 ? `Chưa tính ${coCau.chuaCoTen.toLocaleString("vi-VN")} thiệp khách đi kèm chưa có tên.` : undefined}
            />
            <CoCau
              tieuDe="Theo công ty"
              tong={coCau.tongCongTy}
              donVi="công ty"
              nhom={[
                { nhan: "Công ty cũ, đã từng có khách đến", so: coCau.congTy.den, mau: "#5c6b4f" },
                { nhan: "Công ty cũ, từng được mời nhưng chưa đến", so: coCau.congTy.khongDen, mau: "#c2853d" },
                { nhan: "Công ty mới hoàn toàn", so: coCau.congTy.moi, mau: "#b5303a" },
              ]}
              ghiChu={coCau.khongGhiCongTy > 0 ? `${coCau.khongGhiCongTy.toLocaleString("vi-VN")} khách không ghi công ty nên không tính vào đây.` : undefined}
            />
          </div>

          <div className="border-t border-ivory-deep px-6 py-4 text-xs leading-relaxed text-ink-muted">
            <b className="font-medium text-ink-soft">Cách tính.</b> Khách các năm trước là khách chính trong file check in từng năm, không tính người đi kèm. Khách
            năm nay là mỗi thiệp chưa hủy, gồm cả khách đi kèm đã có tên. Hai dòng được coi là cùng một người khi trùng số điện thoại, hoặc trùng tên và công ty.
            Công ty được nhận theo tên đã bỏ loại hình (Công ty, TNHH, Cổ phần...) hoặc mã CORP, nên các cách viết khác nhau của một công ty được gộp làm một;
            vì vậy số công ty ở đây có thể thấp hơn số ở bảng Theo venue. Công ty tính là đã đến khi có ít nhất một khách của công ty đó đến.
          </div>
        </div>
      )}

      {/* Doi soat */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <h2 className="font-display text-lg text-ink">Đối soát xác nhận và thực tế</h2>
            <p className="text-xs text-ink-muted">Chỉ tính thiệp đã phát hành. Tỷ lệ tham dự = người thực tế đến / người đã xác nhận tham dự.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="chip bg-sage/10 text-sage">Check in bằng QR: {soQR}</span>
            <span className="chip bg-ivory-deep text-ink-soft">Thủ công: {soThuCong}</span>
          </div>
        </div>
        <div className="hairline" />
        <div className="grid gap-px bg-ivory-deep lg:grid-cols-2">
          <BangDoiSoat tieuDe="Theo ngành hàng" dong={theoNganh} />
          <BangDoiSoat tieuDe="Theo người phụ trách" dong={theoSales} />
        </div>
      </div>

      {/* Phan bo trang thai */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Phân bổ theo trạng thái</h2>
          <span className="text-xs text-ink-muted">{tongThiep} thiệp trong hệ thống</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {Object.keys(NHAN_TRANG_THAI)
            .filter((k) => demTrangThai[k])
            .sort((a, b) => demTrangThai[b] - demTrangThai[a])
            .map((k) => {
              const n = demTrangThai[k];
              const pct = tongThiep ? Math.round((n / tongThiep) * 100) : 0;
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
              Thực tế so với KPI. Doanh thu dự kiến cộng theo công ty (mỗi công ty tính một lần), không tính thiệp đã hủy.
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Số thiệp: mỗi khách một thiệp, kể cả khách đi kèm. Thiệp giấy: bằng số thiệp trừ sales và marketing nội bộ Capella.
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
                <th className="px-3 py-3 text-right font-medium">Số thiệp</th>
                <th className="px-3 py-3 text-right font-medium">Xác nhận</th>
                <th className="px-3 py-3 text-right font-medium">Check in</th>
                <th className="px-6 py-3 text-right font-medium">Thiệp giấy</th>
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
                    {r.thiepGiay}
                    {r.soKhach > r.thiepGiay && <div className="text-[11px] text-ink-muted">{r.soKhach - r.thiepGiay} nội bộ không cần</div>}
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
                  {tongVenue.thiepGiay}
                  {tongVenue.soKhach > tongVenue.thiepGiay && (
                    <div className="text-[11px] font-normal text-ink-muted">{tongVenue.soKhach - tongVenue.thiepGiay} nội bộ không cần</div>
                  )}
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

// Mot o so trong bang nam truoc: so, va ti le tren nhom ghi ro ben duoi
function ONam({ so, tren, ghi, noiBat, cuoi }: { so: number; tren?: number; ghi?: string; noiBat?: boolean; cuoi?: boolean }) {
  return (
    <td className={`${cuoi ? "px-6" : "px-3"} py-2 text-right align-top`}>
      <div className={`whitespace-nowrap ${noiBat && so > 0 ? "font-medium text-brand" : "text-ink"}`}>{so.toLocaleString("vi-VN")}</div>
      {ghi != null && (
        <div className="whitespace-nowrap text-[11px] text-ink-muted">{tren ? `${Math.round((so / tren) * 100)}% ${ghi}` : "-"}</div>
      )}
    </td>
  );
}

// Co cau: cac nhom khong chong len nhau, cong lai bang tong; kem thanh ti le
function CoCau({
  tieuDe, tong, donVi, nhom, ghiChu,
}: {
  tieuDe: string; tong: number; donVi: string; nhom: { nhan: string; so: number; mau: string }[]; ghiChu?: string;
}) {
  const pt = (so: number) => (tong ? Math.round((so / tong) * 100) : 0);
  return (
    <div className="rounded-xl bg-ivory/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">{tieuDe}</div>
        <div className="text-sm text-ink-soft">
          <span className="font-display text-2xl text-ink">{tong.toLocaleString("vi-VN")}</span> {donVi}
        </div>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-ivory-deep">
        {nhom.map((n) => (n.so > 0 ? <div key={n.nhan} style={{ width: `${(n.so / (tong || 1)) * 100}%`, backgroundColor: n.mau }} /> : null))}
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {nhom.map((n) => (
            <tr key={n.nhan} className="border-t border-ivory-deep first:border-0">
              <td className="py-1.5 pr-2 text-ink-soft">
                <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: n.mau }} />
                {n.nhan}
              </td>
              <td className="whitespace-nowrap py-1.5 text-right font-medium text-ink">{n.so.toLocaleString("vi-VN")}</td>
              <td className="w-12 whitespace-nowrap py-1.5 text-right text-xs text-ink-muted">{pt(n.so)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ghiChu && <p className="mt-2 text-[11px] text-ink-muted">{ghiChu}</p>}
    </div>
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
            <th className="px-3 py-3 text-right font-medium">Xác nhận</th>
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
