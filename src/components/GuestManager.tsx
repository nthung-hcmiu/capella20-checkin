"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { NHAN_TRANG_THAI, TRANG_THAI } from "@/lib/constants";
import { che4SoCuoi, boDau } from "@/lib/format";
import { taoKhach, phatHanh, danhDauDaMoi, huyKhach, duyetKhach, xoaKhach } from "@/lib/actions";

export interface GuestRow {
  id: string;
  soThuTu: number;
  maBiMat: string;
  hoTen: string;
  sdt: string;
  venueId: string;
  venueTen: string;
  venueMau: string;
  soNguoiMoi: number;
  soNguoiXacNhan: number | null;
  trangThai: string;
  isVip: boolean;
  ban: string | null;
  salesOwner: string;
}
export interface VenueOpt {
  id: string;
  ten: string;
  code: string;
}

const MOI_TRANG = 100;

export function GuestManager({
  guests,
  venues,
  salesTeam,
}: {
  guests: GuestRow[];
  venues: VenueOpt[];
  salesTeam: string[];
}) {
  const [q, setQ] = useState("");
  const [tt, setTt] = useState("");
  const [vn, setVn] = useState("");
  const [sl, setSl] = useState("");
  const [moForm, setMoForm] = useState(false);
  const [soHien, setSoHien] = useState(MOI_TRANG);

  const locKq = useMemo(() => {
    const s = boDau(q);
    return guests.filter((g) => {
      if (tt && g.trangThai !== tt) return false;
      if (vn && g.venueId !== vn) return false;
      if (sl && g.salesOwner !== sl) return false;
      if (s) {
        return (
          boDau(g.hoTen).includes(s) ||
          g.sdt.includes(q.trim()) ||
          String(g.soThuTu).includes(q.trim()) ||
          g.maBiMat.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [guests, q, tt, vn, sl]);

  const dsSales = useMemo(() => [...new Set(guests.map((g) => g.salesOwner))].sort(), [guests]);
  const coLoc = q || tt || vn || sl;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Danh sách khách</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {locKq.length.toLocaleString("vi-VN")} / {guests.length.toLocaleString("vi-VN")} khách
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/nhap" className="btn-ghost">
            Nhập từ Excel
          </Link>
          <a href="/api/xuat" className="btn-ghost">
            Xuất CSV
          </a>
          <button className="btn-gold" onClick={() => setMoForm((v) => !v)}>
            {moForm ? "Đóng" : "+ Thêm khách"}
          </button>
        </div>
      </div>

      {moForm && <FormTao venues={venues} salesTeam={salesTeam} onXong={() => setMoForm(false)} />}

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input min-w-[200px] max-w-xs flex-1"
          placeholder="Tìm tên, SĐT, số thứ tự, mã thiệp..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-auto" value={tt} onChange={(e) => setTt(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.keys(NHAN_TRANG_THAI).map((k) => (
            <option key={k} value={k}>
              {NHAN_TRANG_THAI[k]}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={vn} onChange={(e) => setVn(e.target.value)}>
          <option value="">Mọi venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.ten}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={sl} onChange={(e) => setSl(e.target.value)}>
          <option value="">Mọi sales</option>
          {dsSales.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {coLoc && (
          <button className="btn-ghost btn-sm" onClick={() => { setQ(""); setTt(""); setVn(""); setSl(""); }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-medium">Số</th>
                <th className="px-3 py-3 font-medium">Khách</th>
                <th className="px-3 py-3 font-medium">Venue</th>
                <th className="px-3 py-3 text-center font-medium">Mời / XN</th>
                <th className="px-3 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {locKq.slice(0, soHien).map((g) => (
                <Dong key={g.id} g={g} />
              ))}
              {locKq.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                    {guests.length === 0 ? "Chưa có khách nào. Thêm khách hoặc nhập từ Excel." : "Không có khách khớp bộ lọc."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {locKq.length > soHien && (
          <div className="border-t border-ivory-deep p-3 text-center">
            <button className="btn-ghost btn-sm" onClick={() => setSoHien((n) => n + MOI_TRANG)}>
              Xem thêm ({(locKq.length - soHien).toLocaleString("vi-VN")} khách)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Dong({ g }: { g: GuestRow }) {
  const [pending, start] = useTransition();
  const [mo, setMo] = useState(false);
  const [xacNhanXoa, setXacNhanXoa] = useState(false);

  const act = (fn: () => Promise<unknown>) => start(() => void fn());

  return (
    <>
      <tr className="border-t border-ivory-deep hover:bg-ivory/50">
        <td className="px-4 py-3">
          <span className="font-mono text-ink">{g.soThuTu}</span>
          {g.isVip && <span className="ml-1.5 chip bg-gold/15 text-gold-deep">VIP</span>}
        </td>
        <td className="px-3 py-3">
          <div className="font-medium text-ink">{g.hoTen}</div>
          <div className="text-xs text-ink-muted">
            {che4SoCuoi(g.sdt)} · {g.salesOwner}
          </div>
        </td>
        <td className="px-3 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.venueMau }} />
            {g.venueTen}
          </span>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="text-ink">{g.soNguoiMoi}</span>
          <span className="text-ink-muted"> / {g.soNguoiXacNhan ?? "-"}</span>
        </td>
        <td className="px-3 py-3">
          <StatusBadge trangThai={g.trangThai} />
        </td>
        <td className="px-4 py-3 text-right">
          <button className="btn-ghost btn-sm" disabled={pending} onClick={() => { setMo((v) => !v); setXacNhanXoa(false); }}>
            {pending ? "..." : "Thao tác"}
          </button>
        </td>
      </tr>
      {mo && (
        <tr className="border-t border-ivory-deep bg-ivory/40">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {g.trangThai === TRANG_THAI.CHO_DUYET && (
                <button className="btn-gold btn-sm" onClick={() => act(() => duyetKhach(g.id))}>
                  Duyệt và phát hành
                </button>
              )}
              {[TRANG_THAI.NHAP, TRANG_THAI.DANH_SACH_CHO].includes(g.trangThai as any) && (
                <button className="btn-gold btn-sm" onClick={() => act(() => phatHanh(g.id))}>
                  Phát hành thiệp
                </button>
              )}
              {g.trangThai === TRANG_THAI.DA_PHAT_HANH && (
                <button className="btn-ink btn-sm" onClick={() => act(() => danhDauDaMoi(g.id))}>
                  Đánh dấu đã mời
                </button>
              )}
              <Link href={`/thiep/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
                Trang thiệp
              </Link>
              <a href={`/api/qr/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
                Xem QR
              </a>
              <span className="text-xs text-ink-muted">
                SĐT {g.sdt} · Mã <span className="font-mono">{g.maBiMat}</span>
              </span>
              <span className="ml-auto flex gap-2">
                {g.trangThai !== TRANG_THAI.DA_HUY && g.trangThai !== TRANG_THAI.DA_CHECKIN && (
                  <button
                    className="rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
                    onClick={() => act(() => huyKhach(g.id))}
                  >
                    Hủy thiệp
                  </button>
                )}
                {xacNhanXoa ? (
                  <button
                    className="rounded-full bg-wine px-3.5 py-1.5 text-xs text-white"
                    onClick={() => act(() => xoaKhach(g.id))}
                  >
                    Bấm lần nữa để xóa hẳn
                  </button>
                ) : (
                  <button
                    className="rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
                    onClick={() => setXacNhanXoa(true)}
                  >
                    Xóa khách
                  </button>
                )}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FormTao({ venues, salesTeam, onXong }: { venues: VenueOpt[]; salesTeam: string[]; onXong: () => void }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<{ ok: boolean; msg: string } | null>(null);

  const guiForm = (fd: FormData) => {
    start(async () => {
      const r = await taoKhach({
        hoTen: String(fd.get("hoTen") || ""),
        sdt: String(fd.get("sdt") || ""),
        venueId: String(fd.get("venueId") || ""),
        soNguoiMoi: parseInt(String(fd.get("soNguoiMoi") || "1"), 10),
        salesOwner: String(fd.get("salesOwner") || ""),
        isVip: fd.get("isVip") === "on",
        ghiChu: String(fd.get("ghiChu") || ""),
      });
      setKq({ ok: r.ok, msg: r.thongBao + (r.soThuTu ? ` (số ${r.soThuTu})` : "") });
    });
  };

  return (
    <form action={guiForm} className="card space-y-4 p-6">
      <h2 className="font-display text-lg text-ink">Thêm khách</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Họ tên</label>
          <input name="hoTen" required className="input" placeholder="Nguyễn Văn An" />
        </div>
        <div>
          <label className="label">Số điện thoại</label>
          <input name="sdt" required inputMode="tel" className="input" placeholder="0901234567" />
        </div>
        <div>
          <label className="label">Venue</label>
          <select name="venueId" required className="input">
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sales phụ trách</label>
          <select name="salesOwner" className="input">
            <option value="">BTC</option>
            {salesTeam.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Số người được mời</label>
          <input name="soNguoiMoi" type="number" min={1} max={10} defaultValue={1} className="input" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm text-ink-soft">
            <input name="isVip" type="checkbox" className="h-4 w-4 accent-gold" />
            Khách VIP (cần BTC duyệt)
          </label>
        </div>
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <input name="ghiChu" className="input" placeholder="Không bắt buộc" />
      </div>
      {kq && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.msg}</div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-gold" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu khách"}
        </button>
        <button type="button" className="btn-ghost" onClick={onXong}>
          Đóng
        </button>
      </div>
    </form>
  );
}
