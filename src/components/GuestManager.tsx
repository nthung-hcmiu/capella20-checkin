"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { NHAN_TRANG_THAI, TRANG_THAI } from "@/lib/constants";
import { che4SoCuoi, boDau } from "@/lib/format";
import { taoKhach, phatHanh, danhDauDaMoi, huyKhach, duyetKhach } from "@/lib/actions";

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
  const [moForm, setMoForm] = useState(false);
  const [dangLoc, setDangLoc] = useState(false);

  const locKq = useMemo(() => {
    return guests.filter((g) => {
      if (tt && g.trangThai !== tt) return false;
      if (vn && g.venueId !== vn) return false;
      if (q) {
        const s = boDau(q);
        return (
          boDau(g.hoTen).includes(s) ||
          g.sdt.includes(q) ||
          String(g.soThuTu).includes(q) ||
          g.maBiMat.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [guests, q, tt, vn]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Danh sach khach</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {locKq.length} / {guests.length} khach
          </p>
        </div>
        <button className="btn-gold" onClick={() => setMoForm((v) => !v)}>
          {moForm ? "Dong" : "+ Tao khach"}
        </button>
      </div>

      {moForm && <FormTao venues={venues} salesTeam={salesTeam} onXong={() => setMoForm(false)} />}

      {/* Bo loc */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input max-w-xs flex-1"
          placeholder="Tim ten, SDT, so thu tu, ma..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-auto" value={tt} onChange={(e) => setTt(e.target.value)}>
          <option value="">Moi trang thai</option>
          {Object.keys(NHAN_TRANG_THAI).map((k) => (
            <option key={k} value={k}>
              {NHAN_TRANG_THAI[k]}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={vn} onChange={(e) => setVn(e.target.value)}>
          <option value="">Moi venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.ten}
            </option>
          ))}
        </select>
        {(q || tt || vn) && (
          <button className="btn-ghost btn-sm" onClick={() => { setQ(""); setTt(""); setVn(""); }}>
            Xoa loc
          </button>
        )}
      </div>

      {/* Bang */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-medium">So</th>
                <th className="px-3 py-3 font-medium">Khach</th>
                <th className="px-3 py-3 font-medium">Venue</th>
                <th className="px-3 py-3 text-center font-medium">Moi / XN</th>
                <th className="px-3 py-3 font-medium">Trang thai</th>
                <th className="px-4 py-3 text-right font-medium">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {locKq.map((g) => (
                <Dong key={g.id} g={g} />
              ))}
              {locKq.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                    Khong co khach khop bo loc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Dong({ g }: { g: GuestRow }) {
  const [pending, start] = useTransition();
  const [mo, setMo] = useState(false);

  const act = (fn: () => Promise<void>) => start(() => void fn());

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
            {che4SoCuoi(g.sdt)} &middot; {g.salesOwner}
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
        <td className="px-3 py-3"><StatusBadge trangThai={g.trangThai} /></td>
        <td className="px-4 py-3 text-right">
          <button
            className="btn-ghost btn-sm"
            disabled={pending}
            onClick={() => setMo((v) => !v)}
          >
            {pending ? "..." : "Thao tac"}
          </button>
        </td>
      </tr>
      {mo && (
        <tr className="border-t border-ivory-deep bg-ivory/40">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {g.trangThai === TRANG_THAI.CHO_DUYET && (
                <button className="btn-gold btn-sm" onClick={() => act(() => duyetKhach(g.id))}>
                  Duyet &amp; phat hanh
                </button>
              )}
              {[TRANG_THAI.NHAP, TRANG_THAI.DANH_SACH_CHO].includes(g.trangThai as any) && (
                <button className="btn-gold btn-sm" onClick={() => act(() => phatHanh(g.id))}>
                  Phat hanh thiep
                </button>
              )}
              {g.trangThai === TRANG_THAI.DA_PHAT_HANH && (
                <button className="btn-ink btn-sm" onClick={() => act(() => danhDauDaMoi(g.id))}>
                  Danh dau da moi
                </button>
              )}
              <Link href={`/thiep/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
                Trang thiep
              </Link>
              <a href={`/api/qr/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
                Xem QR
              </a>
              <span className="text-xs text-ink-muted">Ma: <span className="font-mono">{g.maBiMat}</span></span>
              {g.trangThai !== TRANG_THAI.DA_HUY && g.trangThai !== TRANG_THAI.DA_CHECKIN && (
                <button
                  className="btn-sm ml-auto rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
                  onClick={() => act(() => huyKhach(g.id))}
                >
                  Huy
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FormTao({
  venues,
  salesTeam,
  onXong,
}: {
  venues: VenueOpt[];
  salesTeam: string[];
  onXong: () => void;
}) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

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
      setOk(r.ok);
      setKq(r.thongBao + (r.soThuTu ? ` (so ${r.soThuTu})` : ""));
    });
  };

  return (
    <form action={guiForm} className="card space-y-4 p-6">
      <h2 className="font-display text-lg text-ink">Tao khach moi</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Ho ten</label>
          <input name="hoTen" required className="input" placeholder="Nguyen Van A" />
        </div>
        <div>
          <label className="label">So dien thoai</label>
          <input name="sdt" required className="input" placeholder="0901234567" />
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
          <label className="label">Sales phu trach</label>
          <select name="salesOwner" className="input">
            {salesTeam.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">So nguoi duoc moi</label>
          <input name="soNguoiMoi" type="number" min={1} max={10} defaultValue={1} className="input" />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input name="isVip" type="checkbox" className="h-4 w-4 accent-gold" />
            Khach VIP (can BTC duyet)
          </label>
        </div>
      </div>
      <div>
        <label className="label">Ghi chu</label>
        <input name="ghiChu" className="input" placeholder="Tuy chon" />
      </div>
      {kq && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>
          {kq}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-gold" disabled={pending}>
          {pending ? "Dang luu..." : "Tao khach"}
        </button>
        <button type="button" className="btn-ghost" onClick={onXong}>
          Dong
        </button>
      </div>
    </form>
  );
}
