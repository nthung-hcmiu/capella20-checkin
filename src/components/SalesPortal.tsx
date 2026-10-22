"use client";

import { useMemo, useState, useTransition } from "react";
import { StatusBadge } from "./StatusBadge";
import { che4SoCuoi, boDau } from "@/lib/format";
import { taoKhach, danhDauDaMoi, datThiepGiay, xacNhanKhach } from "@/lib/actions";
import { DANH_XUNG, tenGoi } from "@/lib/khach";
import { SU_KIEN, TRANG_THAI } from "@/lib/constants";

export interface SalesGuest {
  id: string;
  soThuTu: number;
  maBiMat: string;
  linkThiep: string;
  hoTen: string;
  sdt: string | null;
  danhXung: string | null;
  chucVu: string | null;
  congTy: string | null;
  daGuiThiepGiay: boolean;
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
      <div className="mb-4 rounded-xl bg-brand px-4 py-2.5 text-sm text-white">
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

const NHOM = [
  { key: "tatCa", nhan: "Tất cả", tt: null as string[] | null },
  { key: "canGui", nhan: "Cần gửi thiệp", tt: [TRANG_THAI.DA_PHAT_HANH] },
  { key: "choXN", nhan: "Chờ xác nhận", tt: [TRANG_THAI.DA_MOI, TRANG_THAI.CHUA_PHAN_HOI] },
  { key: "daXN", nhan: "Đã xác nhận", tt: [TRANG_THAI.THAM_DU, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN] },
  { key: "chuaPH", nhan: "Chưa phát hành", tt: [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DANH_SACH_CHO] },
];

function DanhSach({ guests }: { guests: SalesGuest[] }) {
  const [q, setQ] = useState("");
  const [nhom, setNhom] = useState("tatCa");
  const ds = useMemo(() => {
    const s = boDau(q);
    const tt = NHOM.find((n) => n.key === nhom)?.tt;
    return guests.filter(
      (g) =>
        (!tt || tt.includes(g.trangThai as any)) &&
        (!s || boDau(g.hoTen).includes(s) || boDau(g.congTy || "").includes(s) || (g.sdt || "").includes(q.trim()))
    );
  }, [guests, q, nhom]);

  if (guests.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-ink-muted">Chưa có khách nào. Chuyển qua tab Thêm khách để bắt đầu.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {NHOM.map((n) => {
          const dem = n.tt ? guests.filter((g) => n.tt!.includes(g.trangThai as any)).length : guests.length;
          return (
            <button
              key={n.key}
              onClick={() => setNhom(n.key)}
              className={`chip shrink-0 whitespace-nowrap px-3 py-1.5 ${nhom === n.key ? "bg-ink text-ivory" : "bg-white text-ink-soft"}`}
            >
              {n.nhan} {dem}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input className="input" placeholder="Tìm tên, công ty hoặc SĐT..." value={q} onChange={(e) => setQ(e.target.value)} />
        <a href="/in-qr" target="_blank" className="btn-ghost shrink-0 px-3 text-xs">
          In QR
        </a>
      </div>
      {ds.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">Không có khách trong nhóm này.</p>}
      {ds.map((g) => (
        <TheKhach key={g.id} g={g} />
      ))}
    </div>
  );
}

function TheKhach({ g }: { g: SalesGuest }) {
  const [pending, start] = useTransition();
  const [daChep, setDaChep] = useState(false);
  const [moXN, setMoXN] = useState(false);
  const [so, setSo] = useState(g.soNguoiXacNhan || g.soNguoiMoi);
  const [tb, setTb] = useState<string | null>(null);
  const daPhatHanh = ![TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DANH_SACH_CHO].includes(g.trangThai as any);
  const daCheckin = g.trangThai === TRANG_THAI.DA_CHECKIN;
  const daGuiOnline = daPhatHanh && g.trangThai !== TRANG_THAI.DA_PHAT_HANH;

  const chepLoiMoi = async () => {
    const goi = g.danhXung ? tenGoi(g) : `anh/chị ${g.hoTen}`;
    const ai = g.danhXung ? g.danhXung.toLowerCase() : "anh/chị";
    const loi =
      `Kính gửi ${goi},\n` +
      `Capella trân trọng kính mời ${ai} đến dự Đêm tri ân khách hàng nhân dịp kỷ niệm 20 năm Capella, ` +
      `ngày ${SU_KIEN.ngay} tại ${SU_KIEN.diaDiem}.\n` +
      `Thiệp mời online của ${ai}: ${g.linkThiep}\n` +
      `Khi đến sự kiện, ${ai} vui lòng đưa mã QR trong thiệp (hoặc thiệp giấy) cho lễ tân để check in. Số thứ tự thiệp: ${g.soThuTu}.`;
    try {
      await navigator.clipboard.writeText(loi);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch {
      window.prompt("Sao chép lời mời:", loi);
    }
  };

  const xn = (kq: "THAM_DU" | "KHONG_THAM_DU" | "CHUA_PHAN_HOI") =>
    start(async () => {
      const r = await xacNhanKhach(g.id, kq, so);
      setTb(r.thongBao);
      if (r.ok) setMoXN(false);
    });

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
            <span className="font-medium text-ink">{tenGoi(g)}</span>
            {g.isVip && <span className="chip bg-brand/15 text-brand-deep">VIP</span>}
          </div>
          {(g.chucVu || g.congTy) && <div className="mt-0.5 text-xs text-ink-soft">{[g.chucVu, g.congTy].filter(Boolean).join(" · ")}</div>}
          <div className="mt-0.5 text-xs text-ink-muted">
            {che4SoCuoi(g.sdt)} · {g.venueTen} · mời {g.soNguoiMoi}
            {g.trangThai === TRANG_THAI.THAM_DU && g.soNguoiXacNhan != null ? ` · tham dự ${g.soNguoiXacNhan}` : ""}
          </div>
        </div>
        <StatusBadge trangThai={g.trangThai} />
      </div>

      {!daPhatHanh ? (
        <p className="mt-2 text-xs text-ink-muted">Chờ BTC phát hành thiệp rồi mới gửi và xác nhận được.</p>
      ) : (
        <div className="mt-3 space-y-2 border-t border-ivory-deep pt-3">
          {/* 1. Thiep online */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-24 shrink-0 text-xs ${daGuiOnline ? "text-sage" : "text-ink-muted"}`}>{daGuiOnline ? "✓ " : ""}Thiệp online</span>
            <button className="btn-brand btn-sm" onClick={chepLoiMoi}>
              {daChep ? "Đã chép, dán vào Zalo" : "Chép lời mời"}
            </button>
            {g.trangThai === TRANG_THAI.DA_PHAT_HANH && (
              <button className="btn-ink btn-sm" disabled={pending} onClick={() => start(() => void danhDauDaMoi(g.id))}>
                Đã gửi
              </button>
            )}
          </div>
          {/* 2. Thiep giay */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-24 shrink-0 text-xs ${g.daGuiThiepGiay ? "text-sage" : "text-ink-muted"}`}>{g.daGuiThiepGiay ? "✓ " : ""}Thiệp giấy</span>
            <a href={`/api/qr/${g.maBiMat}`} download={`qr-${g.soThuTu}.png`} className="btn-ghost btn-sm">
              Tải QR
            </a>
            <button className="btn-ghost btn-sm" disabled={pending} onClick={() => start(() => void datThiepGiay(g.id, !g.daGuiThiepGiay))}>
              {g.daGuiThiepGiay ? "Bỏ đánh dấu" : "Đã gửi"}
            </button>
          </div>
          {/* 3. Xac nhan */}
          {!daCheckin && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`w-24 shrink-0 text-xs ${[TRANG_THAI.THAM_DU, TRANG_THAI.KHONG_THAM_DU].includes(g.trangThai as any) ? "text-sage" : "text-ink-muted"}`}
              >
                {[TRANG_THAI.THAM_DU, TRANG_THAI.KHONG_THAM_DU].includes(g.trangThai as any) ? "✓ " : ""}Xác nhận
              </span>
              <button className={moXN ? "btn-ink btn-sm" : "btn-ghost btn-sm"} onClick={() => setMoXN((v) => !v)}>
                {g.trangThai === TRANG_THAI.THAM_DU || g.trangThai === TRANG_THAI.KHONG_THAM_DU ? "Đổi xác nhận" : "Xác nhận thay khách"}
              </button>
            </div>
          )}
          {moXN && (
            <div className="rounded-xl bg-ivory/70 p-3">
              <div className="text-xs text-ink-muted">Sau khi đã hỏi khách. Số người tham dự (tối đa {g.soNguoiMoi}):</div>
              <div className="mt-2 flex items-center gap-2">
                {Array.from({ length: g.soNguoiMoi }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setSo(n)}
                    className={`h-9 w-9 rounded-lg border text-sm ${so === n ? "border-brand bg-brand text-white" : "border-ink/15 bg-white text-ink-soft"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-brand btn-sm" disabled={pending} onClick={() => xn("THAM_DU")}>
                  Tham dự {so} người
                </button>
                <button className="btn-sm rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine" disabled={pending} onClick={() => xn("KHONG_THAM_DU")}>
                  Không tham dự
                </button>
                <button className="btn-ghost btn-sm" disabled={pending} onClick={() => xn("CHUA_PHAN_HOI")}>
                  Chưa phản hồi
                </button>
              </div>
            </div>
          )}
          {tb && <p className="text-xs text-sage">{tb}</p>}
        </div>
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
        them: {
          danhXung: String(fd.get("danhXung") || ""),
          chucVu: String(fd.get("chucVu") || ""),
          congTy: String(fd.get("congTy") || ""),
          maCorp: String(fd.get("maCorp") || ""),
        },
      });
      setKq({ ok: r.ok, msg: r.thongBao + (r.soThuTu ? ` (số ${r.soThuTu})` : "") });
    });
  };

  return (
    <form action={gui} className="card space-y-4 p-5">
      <div>
        <label className="label">Tên khách mời</label>
        <input name="hoTen" required className="input" placeholder="Nguyễn Văn An" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Danh xưng</label>
          <select name="danhXung" className="input" defaultValue="">
            <option value="">Không ghi</option>
            {DANH_XUNG.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Chức vụ</label>
          <input name="chucVu" className="input" placeholder="Giám đốc" />
        </div>
      </div>
      <div>
        <label className="label">Công ty</label>
        <input name="congTy" className="input" placeholder="CÔNG TY TNHH ..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mã CORP Netsuite</label>
          <input name="maCorp" className="input" placeholder="COR0001234" />
        </div>
        <div>
          <label className="label">Số điện thoại</label>
          <input name="sdt" inputMode="tel" className="input" placeholder="Không bắt buộc" />
        </div>
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
          <input name="isVip" type="checkbox" className="h-4 w-4 accent-brand" />
          Khách VIP
        </label>
      </div>

      {kq && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.msg}</div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-brand flex-1" disabled={pending}>
          {pending ? "Đang lưu..." : "Thêm khách"}
        </button>
        <button type="button" className="btn-ghost" onClick={onXong}>
          Xong
        </button>
      </div>
      <p className="text-center text-xs text-ink-muted">
        Trùng SĐT, trùng tên cùng công ty, hoặc khách VIP sẽ tự chuyển BTC duyệt. Venue hết quota thì khách vào danh sách chờ.
      </p>
    </form>
  );
}
