"use client";

import { useMemo, useState, useTransition } from "react";
import { xepCho } from "@/lib/actions";
import { tenGoi } from "@/lib/khach";
import { boDau } from "@/lib/format";

export interface BanRow {
  id: string;
  soThuTu: number;
  hoTen: string;
  venueTen: string;
  venueMau: string;
  soNguoi: number;
  ban: string | null;
  soGhe: string | null;
  danhXung: string | null;
  congTy: string | null;
  isVip: boolean;
}

export function TableBoard({ guests }: { guests: BanRow[] }) {
  const [loc, setLoc] = useState("");

  const nhom = useMemo(() => {
    const m = new Map<string, BanRow[]>();
    for (const g of guests) {
      const key = g.ban || "__chua__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(g);
    }
    return m;
  }, [guests]);

  const chuaXep = nhom.get("__chua__") || [];
  const banCo = [...nhom.keys()].filter((k) => k !== "__chua__").sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  const tongNguoi = guests.reduce((s, g) => s + g.soNguoi, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Xếp chỗ ngồi</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {guests.length} khách đã xác nhận · {tongNguoi} người · {banCo.length} line ghế
          </p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Lọc theo tên, công ty hoặc line..."
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
        />
      </div>

      {chuaXep.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="chip bg-gold/15 text-gold-deep">Chưa xếp chỗ</span>
            <span className="text-sm text-ink-muted">{chuaXep.length} khách</span>
          </div>
          <div className="space-y-1.5">
            {chuaXep
              .filter((g) => !loc || (boDau(g.hoTen).includes(boDau(loc)) || boDau(g.congTy || "").includes(boDau(loc))))
              .map((g) => (
                <Dong key={g.id} g={g} />
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {banCo
          .filter((b) => !loc || boDau(b).includes(boDau(loc)) || (nhom.get(b) || []).some((g) => (boDau(g.hoTen).includes(boDau(loc)) || boDau(g.congTy || "").includes(boDau(loc)))))
          .map((b) => {
            const ds = nhom.get(b)!;
            const nguoi = ds.reduce((s, g) => s + g.soNguoi, 0);
            return (
              <div key={b} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-lg text-ink">{b}</span>
                  <span className="chip bg-ivory-deep text-ink-soft">{nguoi} người</span>
                </div>
                <div className="space-y-1.5">
                  {ds.map((g) => (
                    <Dong key={g.id} g={g} />
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function Dong({ g }: { g: BanRow }) {
  const [pending, start] = useTransition();
  const [line, setLine] = useState(g.ban || "");
  const [ghe, setGhe] = useState(g.soGhe || "");
  const [sua, setSua] = useState(false);

  const luu = () => {
    setSua(false);
    if (line !== (g.ban || "") || ghe !== (g.soGhe || "")) start(() => void xepCho(g.id, line, ghe));
  };

  return (
    <div className="rounded-lg px-2 py-1.5 hover:bg-ivory/60">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.venueMau }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-ink">
            {tenGoi(g)}
            {g.isVip && <span className="ml-1.5 chip bg-gold/15 text-gold-deep">VIP</span>}
            {g.soGhe && <span className="ml-1.5 chip bg-gold text-white">Ghế {g.soGhe}</span>}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {[g.congTy, g.venueTen, `${g.soNguoi} người`].filter(Boolean).join(" · ")}
          </div>
        </div>
        {!sua && (
          <button className="btn-ghost btn-sm shrink-0" disabled={pending} onClick={() => setSua(true)}>
            {pending ? "..." : g.ban ? "Đổi chỗ" : "Xếp chỗ"}
          </button>
        )}
      </div>
      {sua && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
          <input autoFocus className="input w-36 px-2 py-1 text-xs" value={line} onChange={(e) => setLine(e.target.value)} placeholder="LINE 9 & 10" />
          <input className="input w-24 px-2 py-1 text-xs" value={ghe} onChange={(e) => setGhe(e.target.value)} onKeyDown={(e) => e.key === "Enter" && luu()} placeholder="Ghế VIP" />
          <button className="btn-gold btn-sm" onClick={luu}>
            Lưu
          </button>
        </div>
      )}
    </div>
  );
}
