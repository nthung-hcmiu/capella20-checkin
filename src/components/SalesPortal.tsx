"use client";

import { useMemo, useState, useTransition } from "react";
import { StatusBadge } from "./StatusBadge";
import { che4SoCuoi, boDau } from "@/lib/format";
import { taoKhach, danhDauDaMoi } from "@/lib/actions";
import { SU_KIEN, TRANG_THAI } from "@/lib/constants";

export interface SalesGuest {
  id: string;
  soThuTu: number;
  maBiMat: string;
  linkThiep: string;
  hoTen: string;
  sdt: string;
  venueTen: string;
  soNguoiMoi: number;
  soNguoiXacNhan: number | null;
  trangThai: string;
  isVip: boolean;
}
export interface SalesVenue {
  id: string;
  ten: string;
  quota: number;
  dangDung: number;
}

export function SalesPortal({ guests, venues, ten }: { guests: SalesGuest[]; venues: SalesVenue[]; ten: string }) {
  const [tab, setTab] = useState<"cua-toi" | "them">("cua-toi");

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      <div className="mb-4 rounded-xl bg-gold px-4 py-2.5 text-sm text-white">
        Sales: <span className="font-medium">{ten}</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ivory-deep p-1">
        {([
          ["cua-toi", `Khách của tôi (${guests.length})`],
          ["them", "Thêm khách"],
        ] as ["cua-toi" | "them", string][]).map(([t, nhan]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-medium transition ${tab === t ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}
          >
            {nhan}
          </button>
        ))}
      </div>

      {tab === "them" ? <ThemKhach venues={venues} onXong={() => setTab("cua-toi")} /> : <DanhSach guests={guests} />}
    </div>
  );
}

function DanhSach({ guests }: { guests: SalesGuest[] }) {
  const [q, setQ] = useState("");
  const ds = useMemo(() => {
    const s = boDau(q);
    return s ? guests.filter((g) => boDau(g.hoTen).includes(s) || g.sdt.includes(q.trim())) : guests;
  }, [guests, q]);

  if (guests.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-ink-muted">Chưa có khách nào. Chuyển qua tab Thêm khách để bắt đầu.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <input className="input" placeholder="Tìm tên hoặc SĐT..." value={q} onChange={(e) => setQ(e.target.value)} />
      {ds.map((g) => (
        <TheKhach key={g.id} g={g} />
      ))}
    </div>
  );
}

function TheKhach({ g }: { g: SalesGuest }) {
  const [pending, start] = useTransition();
  const [daChep, setDaChep] = useState(false);
  const coTheGui = [TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.CHUA_PHAN_HOI].includes(g.trangThai as any);

  const chepLoiMoi = async () => {
    const link = g.linkThiep;
    const loi =
      `Kính gửi anh/chị ${g.hoTen},\n` +
      `Capella trân trọng kính mời anh/chị đến dự Đêm tri ân khách hàng nhân dịp kỷ niệm 20 năm Capella, ` +
      `ngày ${SU_KIEN.ngay} tại ${SU_KIEN.diaDiem}.\n` +
      `Anh/chị vui lòng xác nhận tham dự tại: ${link}\n` +
      `Số thứ tự thiệp: ${g.soThuTu}. Khi xác nhận, nhập số này và 4 số cuối điện thoại.`;
    try {
      await navigator.clipboard.writeText(loi);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch {
      window.prompt("Sao chép lời mời:", loi);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
            <span className="font-medium text-ink">{g.hoTen}</span>
            {g.isVip && <span className="chip bg-gold/15 text-gold-deep">VIP</span>}
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {che4SoCuoi(g.sdt)} · {g.venueTen} · mời {g.soNguoiMoi}
            {g.soNguoiXacNhan != null ? ` · xác nhận ${g.soNguoiXacNhan}` : ""}
          </div>
        </div>
        <StatusBadge trangThai={g.trangThai} />
      </div>
      {coTheGui ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-gold btn-sm" onClick={chepLoiMoi}>
            {daChep ? "Đã chép, dán vào Zalo" : "Chép lời mời"}
          </button>
          {g.trangThai === TRANG_THAI.DA_PHAT_HANH && (
            <button className="btn-ink btn-sm" disabled={pending} onClick={() => start(() => void danhDauDaMoi(g.id))}>
              {pending ? "..." : "Đã gửi thiệp"}
            </button>
          )}
          <a href={`/api/qr/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
            QR
          </a>
        </div>
      ) : (
        [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DANH_SACH_CHO].includes(g.trangThai as any) && (
          <p className="mt-2 text-xs text-ink-muted">Chờ BTC phát hành thiệp rồi mới gửi được.</p>
        )
      )}
    </div>
  );
}

function ThemKhach({ venues, onXong }: { venues: SalesVenue[]; onXong: () => void }) {
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
        isVip: fd.get("isVip") === "on",
      });
      setKq({ ok: r.ok, msg: r.thongBao + (r.soThuTu ? ` (số ${r.soThuTu})` : "") });
    });
  };

  return (
    <form action={gui} className="card space-y-4 p-5">
      <div>
        <label className="label">Họ tên khách</label>
        <input name="hoTen" required className="input" placeholder="Nguyễn Văn An" />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input name="sdt" required inputMode="tel" className="input" placeholder="0901234567" />
      </div>
      <div>
        <label className="label">Venue</label>
        <select name="venueId" className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.ten}
            </option>
          ))}
        </select>
        {conLai != null && (
          <p className={`mt-1.5 text-xs ${conLai <= 0 ? "text-wine" : "text-ink-muted"}`}>
            {conLai > 0 ? `Venue còn ${conLai} thiệp trong quota` : "Venue đã hết quota, khách sẽ vào danh sách chờ"}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Số người mời</label>
          <input name="soNguoiMoi" type="number" min={1} max={10} defaultValue={1} className="input" />
        </div>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-ink-soft">
          <input name="isVip" type="checkbox" className="h-4 w-4 accent-gold" />
          Khách VIP
        </label>
      </div>

      {kq && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.msg}</div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-gold flex-1" disabled={pending}>
          {pending ? "Đang lưu..." : "Thêm khách"}
        </button>
        <button type="button" className="btn-ghost" onClick={onXong}>
          Xong
        </button>
      </div>
      <p className="text-center text-xs text-ink-muted">
        Trùng SĐT hoặc khách VIP sẽ tự chuyển BTC duyệt. Venue hết quota thì khách vào danh sách chờ.
      </p>
    </form>
  );
}
