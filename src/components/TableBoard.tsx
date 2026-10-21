"use client";

import { useMemo, useState, useTransition } from "react";
import { xepBan } from "@/lib/actions";
import { boDau } from "@/lib/format";

export interface BanRow {
  id: string;
  soThuTu: number;
  hoTen: string;
  venueTen: string;
  venueMau: string;
  soNguoi: number;
  ban: string | null;
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
  const banCo = [...nhom.keys()].filter((k) => k !== "__chua__").sort();
  const tongNguoi = guests.reduce((s, g) => s + g.soNguoi, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Xếp bàn</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {guests.length} khách đã xác nhận · {tongNguoi} người · {banCo.length} bàn
          </p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Lọc theo tên hoặc bàn..."
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
        />
      </div>

      {chuaXep.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="chip bg-gold/15 text-gold-deep">Chưa xếp bàn</span>
            <span className="text-sm text-ink-muted">{chuaXep.length} khách</span>
          </div>
          <div className="space-y-1.5">
            {chuaXep
              .filter((g) => !loc || boDau(g.hoTen).includes(boDau(loc)))
              .map((g) => (
                <Dong key={g.id} g={g} />
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {banCo
          .filter((b) => !loc || boDau(b).includes(boDau(loc)) || (nhom.get(b) || []).some((g) => boDau(g.hoTen).includes(boDau(loc))))
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
  const [val, setVal] = useState(g.ban || "");
  const [sua, setSua] = useState(false);

  const luu = () => {
    setSua(false);
    if (val !== (g.ban || "")) start(() => void xepBan(g.id, val));
  };

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-ivory/60">
      <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.venueMau }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-ink">
          {g.hoTen}
          {g.isVip && <span className="ml-1.5 chip bg-gold/15 text-gold-deep">VIP</span>}
        </div>
        <div className="text-xs text-ink-muted">{g.venueTen} · {g.soNguoi} người</div>
      </div>
      {sua ? (
        <input
          autoFocus
          className="input w-28 px-2 py-1 text-xs"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={luu}
          onKeyDown={(e) => e.key === "Enter" && luu()}
          placeholder="Bàn 01"
        />
      ) : (
        <button
          className="btn-ghost btn-sm shrink-0"
          disabled={pending}
          onClick={() => setSua(true)}
        >
          {pending ? "..." : g.ban ? "Đổi bàn" : "Xếp bàn"}
        </button>
      )}
    </div>
  );
}
