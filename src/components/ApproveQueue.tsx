"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useState } from "react";
import { che4SoCuoi } from "@/lib/format";
import { NHAN_CANH_BAO } from "@/lib/constants";
import { duyetKhach, duyetKhongCanhBao, huyKhach, type KetQua } from "@/lib/actions";

export interface ChoDuyetItem {
  id: string;
  soThuTu: number;
  hoTen: string;
  moTa: string;
  sdt: string | null;
  venueTen: string;
  soNguoiMoi: number;
  salesOwner: string;
  canhBao: string[];
  doanhThuDuKien: string | null;
  isVip: boolean;
  xungDot: { soThuTu: number; hoTen: string; moTa: string; trangThai: string; venueTen: string; salesOwner: string } | null;
}

export function ApproveQueue({ items }: { items: ChoDuyetItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="font-display text-lg text-ink">Không có khách chờ duyệt</div>
        <p className="mt-1 text-sm text-ink-muted">Khách sales bấm Gửi duyệt sẽ hiện ở đây.</p>
        <Link href="/admin/khach" className="btn-ghost mt-4">
          Về danh sách khách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DuyetLoat so={items.filter((i) => i.canhBao.length === 0).length} />
      {items.map((it) => (
        <The key={it.id} it={it} />
      ))}
    </div>
  );
}

function DuyetLoat({ so }: { so: number }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<KetQua | null>(null);
  const [xacNhan, setXacNhan] = useState(false);
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="text-sm text-ink-soft">
        {kq ? kq.thongBao : `${so} khách không có cảnh báo (không trùng, không VIP, venue còn quota).`}
      </div>
      {so > 0 &&
        (xacNhan ? (
          <div className="flex gap-2">
            <button
              className="btn-brand btn-sm"
              disabled={pending}
              onClick={() => start(async () => { setKq(await duyetKhongCanhBao()); setXacNhan(false); })}
            >
              {pending ? "Đang duyệt..." : `Xác nhận duyệt ${so} khách`}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setXacNhan(false)}>Thôi</button>
          </div>
        ) : (
          <button className="btn-brand btn-sm" onClick={() => setXacNhan(true)}>
            Duyệt tất cả khách không cảnh báo
          </button>
        ))}
    </div>
  );
}

function The({ it }: { it: ChoDuyetItem }) {
  const [pending, start] = useTransition();
  const trungSdt = it.canhBao.includes("TRUNG_SDT");
  const laTrung = trungSdt || it.canhBao.includes("TRUNG_TEN");

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {it.canhBao.length === 0 && <span className="chip bg-sage/10 text-sage">Không cảnh báo</span>}
            {it.canhBao.map((c) => (
              <span
                key={c}
                className={`chip ${c.startsWith("TRUNG") ? "bg-wine/12 text-wine" : "bg-brand/15 text-brand-deep"}`}
              >
                {NHAN_CANH_BAO[c] || c}
              </span>
            ))}
            <span className="font-mono text-sm text-ink-muted">{it.soThuTu}</span>
          </div>
          <div className="mt-2 font-display text-lg text-ink">{it.hoTen}</div>
          {it.moTa && <div className="text-sm text-ink-soft">{it.moTa}</div>}
          <div className="text-sm text-ink-muted">
            {che4SoCuoi(it.sdt)} · {it.venueTen} · mời {it.soNguoiMoi} người · sales {it.salesOwner}
            {it.doanhThuDuKien ? ` · doanh thu dự kiến ${it.doanhThuDuKien}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-brand btn-sm"
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
            {trungSdt ? "Cùng một số điện thoại." : "Cùng tên khách và cùng mã CORP hoặc công ty."} BTC quyết định giữ khách nào, hoặc xác nhận đây là hai người khác nhau rồi mới duyệt.
          </p>
        </div>
      )}
    </div>
  );
}
