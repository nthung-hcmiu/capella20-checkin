import Link from "next/link";
import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { CHUA_PHAT_HANH, MAU_TRANG_THAI, NHAN_TRANG_THAI, TRANG_THAI } from "@/lib/constants";
import { dinhDangTien } from "@/lib/format";
import { cong, rong, tongHopTheoVenue } from "@/lib/kpi";

export const dynamic = "force-dynamic";

// Bang dieu khien cua sales: chi khach do chinh sales nay phu trach
export default async function SalesTongQuan() {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/sales/tong-quan");
  const [guests, venues] = await Promise.all([
    prisma.guest.findMany({ where: { salesOwner: u.hoTen } }),
    prisma.venue.findMany({ orderBy: { thuTu: "asc" } }),
  ]);
  const conHieuLuc = guests.filter((g) => g.trangThai !== TRANG_THAI.DA_HUY);
  const soLieu = tongHopTheoVenue(guests);
  const dongVenue = venues.map((v) => ({ v, r: soLieu.get(v.id) || rong() })).filter(({ r }) => r.soKhach > 0);
  const tong = dongVenue.reduce((t, { r }) => cong(t, r), rong());

  const dem = (tt: string) => guests.filter((g) => g.trangThai === tt).length;
  const chuaGiay = conHieuLuc.filter((g) => !CHUA_PHAT_HANH.includes(g.trangThai) && !g.daGuiThiepGiay && g.trangThai !== TRANG_THAI.DA_CHECKIN).length;
  const viec = [
    { nhan: "Nháp chưa gửi duyệt", so: dem(TRANG_THAI.NHAP), href: "/sales?nhom=nhap" },
    { nhan: "Đang chờ BTC duyệt", so: dem(TRANG_THAI.CHO_DUYET), href: "/sales?nhom=choDuyet" },
    { nhan: "Cần gửi thiệp online", so: dem(TRANG_THAI.DA_PHAT_HANH), href: "/sales?nhom=canGui" },
    { nhan: "Chưa gửi thiệp giấy", so: chuaGiay, href: "/in-qr?chuaGiay=1" },
    { nhan: "Chờ xác nhận tham dự", so: dem(TRANG_THAI.DA_MOI), href: "/sales?nhom=choXN" },
  ];

  const demTrangThai: Record<string, number> = {};
  for (const g of guests) demTrangThai[g.trangThai] = (demTrangThai[g.trangThai] || 0) + 1;
  const tiLeXN = tong.soKhach ? Math.round((tong.xacNhan / tong.soKhach) * 100) : 0;

  return (
    <div className="space-y-5 lg:space-y-7">
      <div>
        <h1 className="font-display text-2xl text-ink">Tổng quan của tôi</h1>
        <p className="mt-1 text-sm text-ink-muted">Số liệu các khách do {u.hoTen} phụ trách, cập nhật theo thời gian thực.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <The nhan="Khách phụ trách" gt={conHieuLuc.length.toLocaleString("vi-VN")} phu={`${tong.soKhach} người được mời`} />
        <The nhan="Công ty" gt={tong.soCongTy.toLocaleString("vi-VN")} phu="theo mã CORP hoặc tên" />
        <The nhan="Doanh thu dự kiến" gt={tong.doanhThu ? dinhDangTien(tong.doanhThu) : "0"} phu="mỗi công ty tính một lần" />
        <The nhan="Người xác nhận" gt={tong.xacNhan.toLocaleString("vi-VN")} phu={`${tiLeXN}% số người mời`} tiLe={tiLeXN} />
        <The nhan="Người đã check in" gt={tong.checkin.toLocaleString("vi-VN")} phu={`${dem(TRANG_THAI.DA_CHECKIN)} thiệp đã đến`} rong />
      </div>

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-7">
        {/* Viec can lam */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-4">
            <h2 className="font-display text-lg text-ink">Việc cần làm</h2>
            <p className="text-xs text-ink-muted">Bấm để mở đúng nhóm khách.</p>
          </div>
          {viec.map((v) => (
            <Link key={v.nhan} href={v.href} className="flex items-center justify-between border-t border-ivory-deep px-5 py-3 text-sm hover:bg-ivory/50">
              <span className="text-ink-soft">{v.nhan}</span>
              <span className={`font-display text-lg ${v.so > 0 ? "text-brand" : "text-ink-muted"}`}>{v.so}</span>
            </Link>
          ))}
        </div>

        {/* Phan bo trang thai */}
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Theo trạng thái</h2>
            <span className="text-xs text-ink-muted">{guests.length} khách</span>
          </div>
          {guests.length === 0 && <p className="mt-4 text-sm text-ink-muted">Chưa có khách nào.</p>}
          <div className="mt-4 space-y-2.5">
            {Object.keys(NHAN_TRANG_THAI)
              .filter((k) => demTrangThai[k])
              .map((k) => {
                const n = demTrangThai[k];
                const pct = Math.round((n / guests.length) * 100);
                const mau = MAU_TRANG_THAI[k];
                return (
                  <div key={k} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-xs text-ink-soft">{NHAN_TRANG_THAI[k]}</div>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-ivory-deep">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: mau.text === "#ffffff" ? mau.bg : mau.text }} />
                    </div>
                    <div className="w-8 shrink-0 text-right text-xs font-medium text-ink">{n}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Theo venue */}
      {dongVenue.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="font-display text-lg text-ink">Theo venue</h2>
          </div>
          {/* Dien thoai: danh sach gon */}
          <div className="lg:hidden">
            {[...dongVenue, ...(dongVenue.length > 1 ? [{ v: null, r: tong }] : [])].map(({ v, r }) => (
              <div key={v?.id || "tong"} className={`border-t border-ivory-deep px-5 py-3 ${v ? "" : "bg-ivory/50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                    {v && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mauSac }} />}
                    {v ? v.ten : "Tổng"}
                  </span>
                  <span className="text-sm text-ink">{r.doanhThu ? dinhDangTien(r.doanhThu) : "-"}</span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {r.soCongTy} công ty · {r.soKhach} khách · {r.xacNhan} xác nhận · {r.checkin} check in · {r.thiep} thiệp
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-medium">Venue</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Doanh thu dự kiến</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Số công ty</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Số khách</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Xác nhận</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Check in</th>
                  <th className="px-5 py-3 text-right font-medium">Thiệp</th>
                </tr>
              </thead>
              <tbody>
                {dongVenue.map(({ v, r }) => (
                  <tr key={v.id} className="border-t border-ivory-deep">
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mauSac }} />
                        {v.ten}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{r.doanhThu ? dinhDangTien(r.doanhThu) : "-"}</td>
                    <td className="px-3 py-3 text-right">{r.soCongTy}</td>
                    <td className="px-3 py-3 text-right">{r.soKhach}</td>
                    <td className="px-3 py-3 text-right">{r.xacNhan}</td>
                    <td className="px-3 py-3 text-right">{r.checkin}</td>
                    <td className="px-5 py-3 text-right">{r.thiep}</td>
                  </tr>
                ))}
                {dongVenue.length > 1 && (
                  <tr className="border-t border-ivory-deep bg-ivory/50 font-medium">
                    <td className="px-5 py-3 text-ink">Tổng</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{tong.doanhThu ? dinhDangTien(tong.doanhThu) : "-"}</td>
                    <td className="px-3 py-3 text-right">{tong.soCongTy}</td>
                    <td className="px-3 py-3 text-right">{tong.soKhach}</td>
                    <td className="px-3 py-3 text-right">{tong.xacNhan}</td>
                    <td className="px-3 py-3 text-right">{tong.checkin}</td>
                    <td className="px-5 py-3 text-right">{tong.thiep}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function The({ nhan, gt, phu, tiLe, rong }: { nhan: string; gt: string; phu: string; tiLe?: number; rong?: boolean }) {
  return (
    <div className={`card p-4 lg:p-5 ${rong ? "col-span-2 lg:col-span-1" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</div>
      <div className="mt-1 font-display text-2xl text-ink lg:text-3xl">{gt}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{phu}</div>
      {typeof tiLe === "number" && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ivory-deep">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, tiLe)}%` }} />
        </div>
      )}
    </div>
  );
}
