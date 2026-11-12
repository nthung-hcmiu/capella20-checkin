"use client";

import { useState, useTransition } from "react";
import { chiaDeuQuotaVenue, datQuotaSales, type KetQua } from "@/lib/actions";

export interface DongQuotaSales {
  id: string | null; // null: ten phu trach chua co tai khoan sales
  hoTen: string;
  venueId: string | null;
  quota: number | null;
  soKhach: number;
  soThiep: number;
  soCongTy: number;
}
export interface NhomVenue {
  id: string | null;
  ten: string;
  mau: string;
  quota: number;
}

export function QuotaSales({ nhom, ds }: { nhom: NhomVenue[]; ds: DongQuotaSales[] }) {
  const [kq, setKq] = useState<KetQua | null>(null);
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4">
        <h2 className="font-display text-lg text-ink">Quota theo sales</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Quota tính theo số người được mời còn hiệu lực, như quota venue. Gõ quota rồi bấm ra ngoài để lưu; để trống là chưa đặt.
          Sales vượt quota vẫn thêm được khách nhưng sẽ được nhắc.
        </p>
      </div>
      {kq && <div className={`mx-5 mb-3 rounded-xl px-4 py-2 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.thongBao}</div>}
      {nhom.map((v) => {
        const dsVenue = ds.filter((d) => d.venueId === v.id);
        if (!dsVenue.length) return null;
        const tongQuota = dsVenue.reduce((s, d) => s + (d.quota || 0), 0);
        return (
          <div key={v.id || "khac"} className="border-t border-ivory-deep">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-ivory/50 px-5 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mau }} />
                {v.ten}
                {v.quota > 0 && (
                  <span className={`text-xs font-normal ${tongQuota > v.quota ? "text-wine" : "text-ink-muted"}`}>
                    đã chia {tongQuota} / {v.quota} khách của venue
                  </span>
                )}
              </span>
              {v.id && v.quota > 0 && <NutChiaDeu venueId={v.id} onKq={setKq} />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {dsVenue.map((d) => (
                    <DongSales key={d.id || d.hoTen} d={d} onKq={setKq} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NutChiaDeu({ venueId, onKq }: { venueId: string; onKq: (k: KetQua) => void }) {
  const [pending, start] = useTransition();
  const [xacNhan, setXacNhan] = useState(false);
  return xacNhan ? (
    <span className="flex gap-2">
      <button className="btn-brand btn-sm" disabled={pending} onClick={() => start(async () => { onKq(await chiaDeuQuotaVenue(venueId)); setXacNhan(false); })}>
        {pending ? "Đang chia..." : "Ghi đè quota hiện có"}
      </button>
      <button className="btn-ghost btn-sm" onClick={() => setXacNhan(false)}>Thôi</button>
    </span>
  ) : (
    <button className="btn-ghost btn-sm" onClick={() => setXacNhan(true)}>
      Chia đều quota venue
    </button>
  );
}

function DongSales({ d, onKq }: { d: DongQuotaSales; onKq: (k: KetQua) => void }) {
  const [pending, start] = useTransition();
  const [gt, setGt] = useState(d.quota == null ? "" : String(d.quota));
  const pct = d.quota ? Math.min(100, Math.round((d.soKhach / d.quota) * 100)) : 0;
  const vuot = d.quota != null && d.soKhach > d.quota;
  const luu = () => {
    if (!d.id) return;
    const so = gt.trim() === "" ? null : parseInt(gt, 10);
    if (so === d.quota || (so !== null && !Number.isFinite(so))) return;
    start(async () => onKq(await datQuotaSales(d.id!, so)));
  };
  return (
    <tr className="border-t border-ivory-deep first:border-t-0">
      <td className="w-1/4 px-5 py-2.5 text-ink">
        {d.hoTen}
        {!d.id && <div className="text-[11px] text-ink-muted">chưa có tài khoản sales</div>}
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-muted whitespace-nowrap">
        {d.soThiep} thiệp · {d.soCongTy} công ty
      </td>
      <td className="w-2/5 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ivory-deep">
            <div className={`h-full rounded-full ${vuot ? "bg-wine" : "bg-brand"}`} style={{ width: `${d.quota ? pct : 0}%` }} />
          </div>
          <span className={`whitespace-nowrap text-xs ${vuot ? "text-wine" : "text-ink-soft"}`}>
            {d.soKhach} khách
            {d.quota != null ? (vuot ? `, vượt ${d.soKhach - d.quota}` : `, còn ${d.quota - d.soKhach}`) : ""}
          </span>
        </div>
      </td>
      <td className="w-32 px-5 py-2.5 text-right">
        {d.id ? (
          <input
            className="input w-24 py-1.5 text-right"
            inputMode="numeric"
            placeholder="Quota"
            value={gt}
            disabled={pending}
            onChange={(e) => setGt(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={luu}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label={`Quota của ${d.hoTen}`}
          />
        ) : (
          <span className="text-xs text-ink-muted">-</span>
        )}
      </td>
    </tr>
  );
}
