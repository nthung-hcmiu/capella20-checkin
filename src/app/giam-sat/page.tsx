import Link from "next/link";
import { Brand } from "@/components/Brand";
import { UserBar } from "@/components/UserBar";
import { TuLamMoi } from "@/components/TuLamMoi";
import { prisma } from "@/lib/db";
import { locXem, yeuCauTrang } from "@/lib/auth";
import { DUOC_GIAM_SAT, KET_QUA_CHECKIN, LAN_CHECKIN, TRANG_THAI } from "@/lib/constants";
import { cong, rong, tongHopTheoVenue } from "@/lib/kpi";
import { dinhDangGioNgan } from "@/lib/format";
import { tenGoi } from "@/lib/khach";

export const dynamic = "force-dynamic";

// Trang giam sat cho Quan ly check in (va BTC): so khach tong va tung trung tam, tinh hinh check in tai tung lan le tan,
// danh sach check in gan day. Chi xem, khong sua du lieu khach.
export default async function GiamSatPage({ searchParams }: { searchParams: { lan?: string } }) {
  const u = await yeuCauTrang(DUOC_GIAM_SAT, "/giam-sat");
  const loc = locXem(u); // BTC duoc giao venue chi thay cac venue do; Quan ly check in thay tat ca
  const lanChon = searchParams.lan ? String(searchParams.lan) : "";

  const [guests, venues, logs, ganDay] = await Promise.all([
    prisma.guest.findMany({
      where: loc,
      select: { venueId: true, trangThai: true, congTy: true, maCorp: true, isVip: true, doanhThuDuKien: true, soNguoiMoi: true, soNguoiXacNhan: true, soNguoiDen: true },
    }),
    prisma.venue.findMany({ where: u.phamViXem ? { id: { in: u.phamViXem } } : {}, orderBy: { thuTu: "asc" } }),
    prisma.checkinLog.findMany({ where: { guest: loc }, select: { lan: true, leTan: true, cach: true, ketQua: true, thoiGian: true } }),
    prisma.checkinLog.findMany({
      where: { guest: loc, ...(lanChon ? { lan: lanChon } : {}) },
      orderBy: { thoiGian: "desc" },
      take: 40,
      include: { guest: { select: { soThuTu: true, danhXung: true, hoTen: true, congTy: true, isVip: true, soNguoiMoi: true, soNguoiDen: true, venue: { select: { ten: true } } } } },
    }),
  ]);

  // ----- So khach: tong va tung trung tam (dem theo thiep = so nguoi) -----
  const soLieu = tongHopTheoVenue(guests);
  const chuaDen = new Map<string, number>(); // da xac nhan tham du nhung chua check in
  for (const g of guests) {
    if (g.trangThai === TRANG_THAI.THAM_DU) chuaDen.set(g.venueId, (chuaDen.get(g.venueId) || 0) + (g.soNguoiXacNhan ?? g.soNguoiMoi));
  }
  const dongVenue = venues.map((v) => ({ v, r: soLieu.get(v.id) || rong(), cho: chuaDen.get(v.id) || 0 })).filter(({ v, r }) => v.quota > 0 || r.soKhach > 0 || r.checkin > 0);
  const tong = dongVenue.reduce((t, { r }) => cong(t, r), rong());
  const tongCho = dongVenue.reduce((t, x) => t + x.cho, 0);
  const pt = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  // ----- Tung lan le tan -----
  const moc15 = Date.now() - 15 * 60 * 1000;
  type Lan = { ten: string; thanhCong: number; qr: number; thuCong: number; trung: number; khongHopLe: number; gan15: number; cuoi: Date | null; leTan: Map<string, Date> };
  const lanMap = new Map<string, Lan>();
  const layLan = (ten: string) => {
    let l = lanMap.get(ten);
    if (!l) {
      l = { ten, thanhCong: 0, qr: 0, thuCong: 0, trung: 0, khongHopLe: 0, gan15: 0, cuoi: null, leTan: new Map() };
      lanMap.set(ten, l);
    }
    return l;
  };
  for (const ten of LAN_CHECKIN) layLan(ten);
  for (const x of logs) {
    const l = layLan(x.lan || "Chưa chọn làn");
    if (x.ketQua === KET_QUA_CHECKIN.THANH_CONG) {
      l.thanhCong++;
      if (x.cach === "QR") l.qr++;
      else l.thuCong++;
      if (x.thoiGian.getTime() >= moc15) l.gan15++;
    } else if (x.ketQua === KET_QUA_CHECKIN.TRUNG_LAP) l.trung++;
    else l.khongHopLe++;
    if (!l.cuoi || x.thoiGian > l.cuoi) l.cuoi = x.thoiGian;
    const cu = l.leTan.get(x.leTan);
    if (x.leTan && (!cu || x.thoiGian > cu)) l.leTan.set(x.leTan, x.thoiGian);
  }
  const dsLan = [...lanMap.values()];
  const tongLuot = dsLan.reduce((t, l) => t + l.thanhCong, 0);
  const tongQR = dsLan.reduce((t, l) => t + l.qr, 0);
  const tong15 = dsLan.reduce((t, l) => t + l.gan15, 0);
  const lanDong = Math.max(1, ...dsLan.map((l) => l.thanhCong));

  const NHAN_KQ: Record<string, { nhan: string; lop: string }> = {
    THANH_CONG: { nhan: "Thành công", lop: "bg-sage/15 text-sage" },
    TRUNG_LAP: { nhan: "Đã check in rồi", lop: "bg-[#f4e4c6] text-[#8a6d2f]" },
    KHONG_HOP_LE: { nhan: "Không hợp lệ", lop: "bg-wine/10 text-wine" },
  };

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/giam-sat">
            <Brand sub="Giám sát check in" />
          </Link>
          <UserBar u={u} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink">Giám sát check in</h1>
            <p className="mt-1 text-sm text-ink-muted">Mỗi khách một thiệp, kể cả khách đi kèm. Trang này chỉ để xem, không sửa dữ liệu khách.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TuLamMoi giay={10} />
            <Link href="/checkin" className="btn-brand btn-sm">
              Mở app check in
            </Link>
          </div>
        </div>

        {/* So tong */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <The nhan="Thiệp đã mời" so={tong.soKhach} phu="thiệp còn hiệu lực, mọi trung tâm" />
          <The nhan="Đã xác nhận tham dự" so={tong.xacNhan} phu={`${pt(tong.xacNhan, tong.soKhach)}% số thiệp đã mời`} />
          <The nhan="Đã check in" so={tong.checkin} phu={`${pt(tong.checkin, tong.xacNhan)}% số đã xác nhận`} tiLe={pt(tong.checkin, tong.xacNhan)} noiBat />
          <The nhan="Xác nhận, chưa đến" so={tongCho} phu="còn chờ đón" />
          <The nhan="15 phút gần nhất" so={tong15} phu={`lượt check in · tổng ${tongLuot.toLocaleString("vi-VN")} lượt`} />
        </div>

        {/* Theo trung tam */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="font-display text-lg text-ink">Theo trung tâm</h2>
            <p className="text-xs text-ink-muted">Đơn vị: thiệp (mỗi người một thiệp). Tỷ lệ đến tính trên số đã xác nhận tham dự.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-ivory-deep text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-medium">Trung tâm</th>
                  <th className="px-3 py-3 text-right font-medium">Thiệp đã mời</th>
                  <th className="px-3 py-3 text-right font-medium">Đã xác nhận</th>
                  <th className="px-3 py-3 text-right font-medium">Đã check in</th>
                  <th className="px-3 py-3 text-right font-medium">Xác nhận, chưa đến</th>
                  <th className="w-56 px-5 py-3 font-medium">Tỷ lệ đến</th>
                </tr>
              </thead>
              <tbody>
                {dongVenue.map(({ v, r, cho }) => (
                  <tr key={v.id} className="border-t border-ivory-deep">
                    <td className="whitespace-nowrap px-5 py-3 text-ink">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: v.mauSac }} />
                      {v.ten}
                    </td>
                    <td className="px-3 py-3 text-right">{r.soKhach.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-3 text-right">{r.xacNhan.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-3 text-right font-medium text-ink">{r.checkin.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-3 text-right">{cho.toLocaleString("vi-VN")}</td>
                    <td className="px-5 py-3">
                      <Thanh pt={pt(r.checkin, r.xacNhan)} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-ivory-deep bg-ivory/60 font-medium text-ink">
                  <td className="px-5 py-3">Tổng</td>
                  <td className="px-3 py-3 text-right">{tong.soKhach.toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-3 text-right">{tong.xacNhan.toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-3 text-right">{tong.checkin.toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-3 text-right">{tongCho.toLocaleString("vi-VN")}</td>
                  <td className="px-5 py-3">
                    <Thanh pt={pt(tong.checkin, tong.xacNhan)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tung lan le tan */}
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg text-ink">Các làn lễ tân</h2>
            <p className="text-xs text-ink-muted">
              Lượt là số lần check in thành công tại làn ({tongQR.toLocaleString("vi-VN")} quét QR, {(tongLuot - tongQR).toLocaleString("vi-VN")} nhập tay). Bấm vào làn để xem
              riêng danh sách của làn đó.
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dsLan.map((l) => {
              const dangChon = lanChon === l.ten;
              const nguoi = [...l.leTan.entries()].sort((a, b) => b[1].getTime() - a[1].getTime()).map(([ten]) => ten);
              return (
                <Link
                  key={l.ten}
                  href={dangChon ? "/giam-sat" : `/giam-sat?lan=${encodeURIComponent(l.ten)}#gan-day`}
                  scroll={false}
                  className={`card block p-4 transition hover:border-brand/40 ${dangChon ? "ring-2 ring-brand/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-base text-ink">{l.ten}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">{l.cuoi ? `Lần gần nhất lúc ${dinhDangGioNgan(l.cuoi)}` : "Chưa có lượt nào"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl leading-none text-ink">{l.thanhCong.toLocaleString("vi-VN")}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-muted">lượt</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory-deep">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(l.thanhCong / lanDong) * 100}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <ONho nhan="15 phút" so={l.gan15} />
                    <ONho nhan="Quét QR" so={l.qr} />
                    <ONho nhan="Nhập tay" so={l.thuCong} />
                    <ONho nhan="Trùng, lỗi" so={l.trung + l.khongHopLe} canhBao={l.trung + l.khongHopLe > 0} />
                  </div>
                  <div className="mt-3 truncate text-xs text-ink-soft">
                    {nguoi.length ? `Lễ tân: ${nguoi.slice(0, 3).join(", ")}${nguoi.length > 3 ? ` và ${nguoi.length - 3} người nữa` : ""}` : "Chưa có lễ tân nào quét tại làn này"}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Danh sach gan day */}
        <div id="gan-day" className="card scroll-mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div>
              <h2 className="font-display text-lg text-ink">Check in gần đây{lanChon ? `: ${lanChon}` : ""}</h2>
              <p className="text-xs text-ink-muted">40 lượt mới nhất, gồm cả lượt trùng và lượt không hợp lệ.</p>
            </div>
            {lanChon && (
              <Link href="/giam-sat#gan-day" scroll={false} className="btn-ghost btn-sm">
                Xem mọi làn
              </Link>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-ivory-deep text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-medium">Giờ</th>
                  <th className="px-3 py-3 font-medium">Làn</th>
                  <th className="px-3 py-3 font-medium">Lễ tân</th>
                  <th className="px-3 py-3 font-medium">Số thiệp</th>
                  <th className="px-3 py-3 font-medium">Khách</th>
                  <th className="px-3 py-3 font-medium">Trung tâm</th>
                  <th className="px-3 py-3 font-medium">Cách</th>
                  <th className="px-5 py-3 font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {ganDay.map((x) => {
                  const kq = NHAN_KQ[x.ketQua] || { nhan: x.ketQua, lop: "bg-ivory-deep text-ink-soft" };
                  return (
                    <tr key={x.id} className="border-t border-ivory-deep align-top">
                      <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs text-ink">{dinhDangGioNgan(x.thoiGian)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{x.lan || "-"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{x.leTan || "-"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-ink">{x.guest.soThuTu}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-ink">
                          {tenGoi(x.guest)}
                          {x.guest.isVip && <span className="chip ml-2 bg-brand/15 text-brand-deep">VIP</span>}
                        </div>
                        {x.guest.congTy && <div className="text-xs text-ink-muted">{x.guest.congTy}</div>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{x.guest.venue.ten}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{x.cach === "QR" ? "Quét QR" : "Nhập tay"}</td>
                      <td className="whitespace-nowrap px-5 py-2.5">
                        <span className={`chip ${kq.lop}`}>{kq.nhan}</span>
                      </td>
                    </tr>
                  );
                })}
                {ganDay.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-ink-muted">
                      Chưa có lượt check in nào{lanChon ? ` tại ${lanChon}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function The({ nhan, so, phu, tiLe, noiBat }: { nhan: string; so: number; phu: string; tiLe?: number; noiBat?: boolean }) {
  return (
    <div className={`card p-4 ${noiBat ? "ring-1 ring-brand/30" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</div>
      <div className={`mt-1 font-display text-3xl ${noiBat ? "text-brand" : "text-ink"}`}>{so.toLocaleString("vi-VN")}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{phu}</div>
      {typeof tiLe === "number" && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ivory-deep">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, tiLe)}%` }} />
        </div>
      )}
    </div>
  );
}

function Thanh({ pt }: { pt: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-deep">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, pt)}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-ink-soft">{pt}%</span>
    </div>
  );
}

function ONho({ nhan, so, canhBao }: { nhan: string; so: number; canhBao?: boolean }) {
  return (
    <div className="rounded-lg bg-ivory/70 px-1 py-1.5">
      <div className={`font-medium ${canhBao ? "text-wine" : "text-ink"}`}>{so.toLocaleString("vi-VN")}</div>
      <div className="text-[10px] text-ink-muted">{nhan}</div>
    </div>
  );
}
