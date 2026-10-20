"use client";

import { useTransition } from "react";
import Link from "next/link";
import { che4SoCuoi } from "@/lib/format";
import { duyetKhach, huyKhach } from "@/lib/actions";

export interface ChoDuyetItem {
  id: string;
  soThuTu: number;
  hoTen: string;
  sdt: string;
  venueTen: string;
  soNguoiMoi: number;
  salesOwner: string;
  lyDo: string | null;
  isVip: boolean;
  xungDot: { soThuTu: number; hoTen: string; trangThai: string; venueTen: string; salesOwner: string } | null;
}

export function ApproveQueue({ items }: { items: ChoDuyetItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="font-display text-lg text-ink">Khong co khach cho duyet</div>
        <p className="mt-1 text-sm text-ink-muted">Cac truong hop trung SDT hoac VIP se hien o day.</p>
        <Link href="/admin/khach" className="btn-ghost mt-4">
          Ve danh sach khach
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <The key={it.id} it={it} />
      ))}
    </div>
  );
}

function The({ it }: { it: ChoDuyetItem }) {
  const [pending, start] = useTransition();
  const laTrung = it.lyDo === "TRUNG_SDT";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`chip ${laTrung ? "bg-wine/12 text-wine" : "bg-gold/15 text-gold-deep"}`}
            >
              {laTrung ? "Trung SDT" : "Khach VIP"}
            </span>
            <span className="font-mono text-sm text-ink-muted">{it.soThuTu}</span>
          </div>
          <div className="mt-2 font-display text-lg text-ink">{it.hoTen}</div>
          <div className="text-sm text-ink-muted">
            {che4SoCuoi(it.sdt)} &middot; {it.venueTen} &middot; moi {it.soNguoiMoi} nguoi &middot; sales {it.salesOwner}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-gold btn-sm"
            disabled={pending}
            onClick={() => start(() => void duyetKhach(it.id))}
          >
            Duyet
          </button>
          <button
            className="btn-sm rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
            disabled={pending}
            onClick={() => start(() => void huyKhach(it.id))}
          >
            Tu choi
          </button>
        </div>
      </div>

      {laTrung && it.xungDot && (
        <div className="mt-4 rounded-xl border border-ivory-deep bg-ivory/60 p-4">
          <div className="text-xs uppercase tracking-wider text-ink-muted">Trung voi khach da co</div>
          <div className="mt-1.5 text-sm text-ink">
            <span className="font-mono text-ink-muted">{it.xungDot.soThuTu}</span> &middot;{" "}
            <span className="font-medium">{it.xungDot.hoTen}</span> &middot; {it.xungDot.venueTen} &middot; sales{" "}
            {it.xungDot.salesOwner}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Cung mot SDT. BTC quyet giu ai, hoac xac nhan day la truong hop hop le truoc khi duyet.
          </p>
        </div>
      )}
    </div>
  );
}
