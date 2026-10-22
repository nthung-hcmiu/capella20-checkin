"use client";

import { useTransition } from "react";
import Link from "next/link";
import { che4SoCuoi } from "@/lib/format";
import { duyetKhach, huyKhach } from "@/lib/actions";

export interface ChoDuyetItem {
  id: string;
  soThuTu: number;
  hoTen: string;
  moTa: string;
  sdt: string | null;
  venueTen: string;
  soNguoiMoi: number;
  salesOwner: string;
  lyDo: string | null;
  isVip: boolean;
  xungDot: { soThuTu: number; hoTen: string; moTa: string; trangThai: string; venueTen: string; salesOwner: string } | null;
}

export function ApproveQueue({ items }: { items: ChoDuyetItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="font-display text-lg text-ink">Không có khách chờ duyệt</div>
        <p className="mt-1 text-sm text-ink-muted">Các trường hợp trùng SĐT hoặc khách VIP sẽ hiện ở đây.</p>
        <Link href="/admin/khach" className="btn-ghost mt-4">
          Về danh sách khách
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
  const laTrung = it.lyDo === "TRUNG_SDT" || it.lyDo === "TRUNG_TEN";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`chip ${laTrung ? "bg-wine/12 text-wine" : "bg-gold/15 text-gold-deep"}`}
            >
              {it.lyDo === "TRUNG_SDT" ? "Trùng SĐT" : it.lyDo === "TRUNG_TEN" ? "Trùng tên và công ty" : "Khách VIP"}
            </span>
            <span className="font-mono text-sm text-ink-muted">{it.soThuTu}</span>
          </div>
          <div className="mt-2 font-display text-lg text-ink">{it.hoTen}</div>
          {it.moTa && <div className="text-sm text-ink-soft">{it.moTa}</div>}
          <div className="text-sm text-ink-muted">
            {che4SoCuoi(it.sdt)} · {it.venueTen} · mời {it.soNguoiMoi} người · sales {it.salesOwner}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-gold btn-sm"
            disabled={pending}
            onClick={() => start(() => void duyetKhach(it.id))}
          >
            Duyệt
          </button>
          <button
            className="btn-sm rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
            disabled={pending}
            onClick={() => start(() => void huyKhach(it.id))}
          >
            Từ chối
          </button>
        </div>
      </div>

      {laTrung && it.xungDot && (
        <div className="mt-4 rounded-xl border border-ivory-deep bg-ivory/60 p-4">
          <div className="text-xs uppercase tracking-wider text-ink-muted">Trùng với khách đã có</div>
          <div className="mt-1.5 text-sm text-ink">
            <span className="font-mono text-ink-muted">{it.xungDot.soThuTu}</span> ·{" "}
            <span className="font-medium">{it.xungDot.hoTen}</span> · {it.xungDot.venueTen} · sales{" "}
            {it.xungDot.salesOwner}
          </div>
          {it.xungDot.moTa && <div className="text-xs text-ink-soft">{it.xungDot.moTa}</div>}
          <p className="mt-2 text-xs text-ink-muted">
            {it.lyDo === "TRUNG_SDT" ? "Cùng một số điện thoại." : "Cùng tên khách và cùng mã CORP hoặc công ty."} BTC quyết định giữ khách nào, hoặc xác nhận đây là hai người khác nhau rồi mới duyệt.
          </p>
        </div>
      )}
    </div>
  );
}
