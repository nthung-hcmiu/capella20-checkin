"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { che4SoCuoi } from "@/lib/format";
import { taoKhach } from "@/lib/actions";

interface SalesGuest {
  id: string;
  soThuTu: number;
  maBiMat: string;
  hoTen: string;
  sdt: string;
  venueTen: string;
  venueMau: string;
  soNguoiMoi: number;
  soNguoiXacNhan: number | null;
  trangThai: string;
  isVip: boolean;
  salesOwner: string;
}
interface VenueOpt {
  id: string;
  ten: string;
  quota: number;
  dangDung: number;
}

export function SalesPortal({
  guests,
  venues,
  salesTeam,
}: {
  guests: SalesGuest[];
  venues: VenueOpt[];
  salesTeam: string[];
}) {
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<"them" | "cua-toi">("cua-toi");

  useEffect(() => {
    try {
      const s = localStorage.getItem("sales_me");
      if (s) setMe(s);
    } catch {}
  }, []);

  const chonMe = (v: string) => {
    setMe(v);
    try {
      localStorage.setItem("sales_me", v);
    } catch {}
  };

  const cuaToi = useMemo(() => guests.filter((g) => g.salesOwner === me), [guests, me]);

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="card p-7">
          <h1 className="font-display text-xl text-ink">Cong Sales</h1>
          <p className="mt-1 text-sm text-ink-muted">Chon ten ban de bat dau lap danh sach khach.</p>
          <div className="mt-5 space-y-2">
            {salesTeam.map((s) => (
              <button
                key={s}
                onClick={() => chonMe(s)}
                className="flex w-full items-center justify-between rounded-xl border border-ivory-deep bg-white px-4 py-3 text-left hover:border-gold"
              >
                <span className="text-sm font-medium text-ink">{s}</span>
                <span className="text-xs text-gold">Chon &rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-gold px-4 py-2.5 text-white">
        <div className="text-sm">
          Sales: <span className="font-medium">{me}</span>
        </div>
        <button className="text-xs text-white/80 underline" onClick={() => chonMe("")}>
          Doi
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ivory-deep p-1">
        {([
          ["cua-toi", `Khach cua toi (${cuaToi.length})`],
          ["them", "Them khach"],
        ] as ["cua-toi" | "them", string][]).map(([t, nhan]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-medium transition ${
              tab === t ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {nhan}
          </button>
        ))}
      </div>

      {tab === "them" ? (
        <ThemKhach venues={venues} me={me} onXong={() => setTab("cua-toi")} />
      ) : (
        <DanhSach guests={cuaToi} />
      )}
    </div>
  );
}

function DanhSach({ guests }: { guests: SalesGuest[] }) {
  if (guests.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-ink-muted">Chua co khach nao. Chuyen qua tab Them khach de bat dau.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {guests.map((g) => (
        <div key={g.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
                <span className="font-medium text-ink">{g.hoTen}</span>
                {g.isVip && <span className="chip bg-gold/15 text-gold-deep">VIP</span>}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {che4SoCuoi(g.sdt)} &middot; {g.venueTen} &middot; moi {g.soNguoiMoi}
                {g.soNguoiXacNhan != null ? ` · XN ${g.soNguoiXacNhan}` : ""}
              </div>
            </div>
            <StatusBadge trangThai={g.trangThai} />
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/thiep/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
              Trang thiep
            </Link>
            <a href={`/api/qr/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
              QR
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThemKhach({ venues, me, onXong }: { venues: VenueOpt[]; me: string; onXong: () => void }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<{ ok: boolean; msg: string } | null>(null);
  const [venueId, setVenueId] = useState(venues[0]?.id || "");

  const venueChon = venues.find((v) => v.id === venueId);
  const conLai = venueChon && venueChon.quota > 0 ? venueChon.quota - venueChon.dangDung : null;

  const gui = (fd: FormData) => {
    start(async () => {
      const r = await taoKhach({
        hoTen: String(fd.get("hoTen") || ""),
        sdt: String(fd.get("sdt") || ""),
        venueId: String(fd.get("venueId") || ""),
        soNguoiMoi: parseInt(String(fd.get("soNguoiMoi") || "1"), 10),
        salesOwner: me,
        isVip: fd.get("isVip") === "on",
      });
      setKq({ ok: r.ok, msg: r.thongBao + (r.soThuTu ? ` (so ${r.soThuTu})` : "") });
    });
  };

  return (
    <form action={gui} className="card space-y-4 p-5">
      <div>
        <label className="label">Ho ten khach</label>
        <input name="hoTen" required className="input" placeholder="Nguyen Van A" />
      </div>
      <div>
        <label className="label">So dien thoai</label>
        <input name="sdt" required inputMode="tel" className="input" placeholder="0901234567" />
      </div>
      <div>
        <label className="label">Venue</label>
        <select
          name="venueId"
          className="input"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.ten}
            </option>
          ))}
        </select>
        {conLai != null && (
          <p className={`mt-1.5 text-xs ${conLai <= 0 ? "text-wine" : "text-ink-muted"}`}>
            {conLai > 0 ? `Con ${conLai} thiep trong quota` : "Het quota, khach se vao danh sach cho"}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">So nguoi moi</label>
          <input name="soNguoiMoi" type="number" min={1} max={10} defaultValue={1} className="input" />
        </div>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-ink-soft">
          <input name="isVip" type="checkbox" className="h-4 w-4 accent-gold" />
          Khach VIP
        </label>
      </div>

      {kq && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>
          {kq.msg}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-gold flex-1" disabled={pending}>
          {pending ? "Dang luu..." : "Them khach"}
        </button>
        <button type="button" className="btn-ghost" onClick={onXong}>
          Xong
        </button>
      </div>
      <p className="text-center text-xs text-ink-muted">
        Trung SDT hoac VIP se tu dong chuyen BTC duyet. Het quota se vao danh sach cho.
      </p>
    </form>
  );
}
