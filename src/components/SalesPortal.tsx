"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { FormKhach, OThongTin, docThem } from "./FormKhach";
import { che4SoCuoi, boDau, dinhDangGio } from "@/lib/format";
import { taoKhach, danhDauDaMoi, datThiepGiay, xacNhanKhach, guiDuyet, xoaNhap } from "@/lib/actions";
import { DANH_XUNG, NHAN_TRUONG, tenGoi, type ThongTinThem } from "@/lib/khach";
import { CHUA_PHAT_HANH, DUOC_XAC_NHAN, NHAN_CANH_BAO, SU_KIEN, TRANG_THAI } from "@/lib/constants";

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
  venueId: string;
  venueTen: string;
  venueMau: string;
  soNguoiMoi: number;
  soNguoiXacNhan: number | null;
  soNguoiDen: number | null;
  trangThai: string;
  isVip: boolean;
  ghiChu: string | null;
  lyDoChoDuyet: string | null;
  phatHanhLuc: string | null;
  xacNhanLuc: string | null;
  checkinLuc: string | null;
  them: ThongTinThem;
}
export interface SalesVenue {
  id: string;
  ten: string;
  quota: number;
  dangDung: number;
}

const NHOM = [
  { key: "tatCa", nhan: "Tất cả", tt: null as string[] | null },
  { key: "nhap", nhan: "Nháp", tt: [TRANG_THAI.NHAP] as string[] },
  { key: "choDuyet", nhan: "Chờ duyệt", tt: [TRANG_THAI.CHO_DUYET] as string[] },
  { key: "canGui", nhan: "Cần gửi thiệp", tt: [TRANG_THAI.DA_PHAT_HANH] as string[] },
  { key: "choXN", nhan: "Chờ xác nhận", tt: [TRANG_THAI.DA_MOI] as string[] },
  { key: "daXN", nhan: "Đã xác nhận", tt: [TRANG_THAI.THAM_DU, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN, TRANG_THAI.VANG_MAT] as string[] },
];

export function SalesPortal({
  guests,
  venues,
  venuesSua,
  nhomDau,
}: {
  guests: SalesGuest[];
  venues: SalesVenue[];
  venuesSua: { id: string; ten: string }[];
  nhomDau?: string;
}) {
  const [q, setQ] = useState("");
  const [nhom, setNhom] = useState(NHOM.some((n) => n.key === nhomDau) ? nhomDau! : "tatCa");
  const ds = useMemo(() => {
    const s = boDau(q);
    const tt = NHOM.find((n) => n.key === nhom)?.tt;
    return guests.filter(
      (g) =>
        (!tt || tt.includes(g.trangThai)) &&
        (!s || boDau(g.hoTen).includes(s) || boDau(g.congTy || "").includes(s) || (g.sdt || "").includes(q.trim()) || String(g.soThuTu).includes(q.trim()))
    );
  }, [guests, q, nhom]);
  const loc = { q, setQ, nhom, setNhom };

  return (
    <>
      <div className="lg:hidden">
        <DienThoai guests={guests} ds={ds} venues={venues} venuesSua={venuesSua} loc={loc} />
      </div>
      <div className="hidden lg:block">
        <MayTinh guests={guests} ds={ds} venues={venues} venuesSua={venuesSua} loc={loc} />
      </div>
    </>
  );
}

type Loc = { q: string; setQ: (s: string) => void; nhom: string; setNhom: (s: string) => void };
type ViewProps = { guests: SalesGuest[]; ds: SalesGuest[]; venues: SalesVenue[]; venuesSua: { id: string; ten: string }[]; loc: Loc };

function ChipNhom({ guests, loc }: { guests: SalesGuest[]; loc: Loc }) {
  return (
    <>
      {NHOM.map((n) => {
        const dem = n.tt ? guests.filter((g) => n.tt!.includes(g.trangThai)).length : guests.length;
        return (
          <button
            key={n.key}
            onClick={() => loc.setNhom(n.key)}
            className={`chip shrink-0 whitespace-nowrap px-3 py-1.5 ${loc.nhom === n.key ? "bg-ink text-ivory" : "bg-white text-ink-soft"}`}
          >
            {n.nhan} {dem}
          </button>
        );
      })}
    </>
  );
}

// ===== Dien thoai: the khach =====
function DienThoai({ guests, ds, venues, venuesSua, loc }: ViewProps) {
  const [tab, setTab] = useState<"cua-toi" | "them">("cua-toi");
  return (
    <>
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
      {tab === "them" ? (
        <ThemKhach venues={venues} onXong={() => setTab("cua-toi")} />
      ) : guests.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted">Chưa có khách nào. Chuyển qua tab Thêm khách, hoặc Nhập danh sách từ file Excel.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            <ChipNhom guests={guests} loc={loc} />
          </div>
          <div className="flex gap-2">
            <input className="input" placeholder="Tìm tên, công ty hoặc SĐT..." value={loc.q} onChange={(e) => loc.setQ(e.target.value)} />
            <a href="/in-qr" target="_blank" className="btn-ghost shrink-0 px-3 text-xs">
              In QR
            </a>
          </div>
          <GuiDuyetLoat ids={guests.filter((g) => g.trangThai === TRANG_THAI.NHAP).map((g) => g.id)} />
          {ds.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">Không có khách trong nhóm này.</p>}
          {ds.map((g) => (
            <div key={g.id} className="card p-4">
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
                    {g.them.doanhThuDuKien ? ` · ${g.them.doanhThuDuKien}` : ""}
                  </div>
                </div>
                <StatusBadge trangThai={g.trangThai} />
              </div>
              <HanhDong g={g} venuesSua={venuesSua} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ===== May tinh: bang khach, bam dong mo chi tiet =====
function MayTinh({ guests, ds, venues, venuesSua, loc }: ViewProps) {
  const [moThem, setMoThem] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Khách của tôi</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {ds.length.toLocaleString("vi-VN")} / {guests.length.toLocaleString("vi-VN")} khách. Bấm vào dòng để xem chi tiết và thao tác.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/nhap" className="btn-ghost">
            Nhập từ Excel
          </Link>
          <a href="/in-qr" target="_blank" className="btn-ghost">
            In QR thiệp giấy
          </a>
          <button className="btn-brand" onClick={() => setMoThem((v) => !v)}>
            {moThem ? "Đóng" : "+ Thêm khách"}
          </button>
        </div>
      </div>

      {moThem && <ThemKhach venues={venues} onXong={() => setMoThem(false)} rong />}

      <GuiDuyetLoat ids={guests.filter((g) => g.trangThai === TRANG_THAI.NHAP).map((g) => g.id)} />

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <input
          className="input mr-2 min-w-[240px] max-w-xs flex-1"
          placeholder="Tìm tên, công ty, SĐT, số thứ tự..."
          value={loc.q}
          onChange={(e) => loc.setQ(e.target.value)}
        />
        <ChipNhom guests={guests} loc={loc} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3 font-medium">Số</th>
              <th className="px-3 py-3 font-medium">Khách</th>
              <th className="px-3 py-3 font-medium">Venue</th>
              <th className="px-3 py-3 text-right font-medium">Doanh thu dự kiến</th>
              <th className="px-3 py-3 text-center font-medium">Mời / XN</th>
              <th className="px-3 py-3 font-medium">Thiệp</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((g) => (
              <DongMayTinh key={g.id} g={g} venuesSua={venuesSua} />
            ))}
            {ds.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                  {guests.length === 0 ? "Chưa có khách nào. Bấm + Thêm khách hoặc Nhập từ Excel." : "Không có khách khớp bộ lọc."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DongMayTinh({ g, venuesSua }: { g: SalesGuest; venuesSua: { id: string; ten: string }[] }) {
  const [mo, setMo] = useState(false);
  const canhBao = (g.lyDoChoDuyet || "").split(",").filter(Boolean);
  const daPhatHanh = !CHUA_PHAT_HANH.includes(g.trangThai);
  const daGuiOnline = daPhatHanh && g.trangThai !== TRANG_THAI.DA_PHAT_HANH;
  return (
    <>
      <tr
        className={`cursor-pointer border-t border-ivory-deep ${mo ? "bg-ivory/60" : "hover:bg-ivory/50"}`}
        onClick={() => setMo((v) => !v)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMo((v) => !v); } }}
        aria-expanded={mo}
      >
        <td className="px-4 py-3">
          <span className="font-mono text-ink">{g.soThuTu}</span>
          {g.isVip && <span className="ml-1.5 chip bg-brand/15 text-brand-deep">VIP</span>}
        </td>
        <td className="px-3 py-3">
          <div className="font-medium text-ink">{tenGoi(g)}</div>
          {(g.chucVu || g.congTy) && <div className="text-xs text-ink-soft">{[g.chucVu, g.congTy].filter(Boolean).join(" · ")}</div>}
          <div className="text-xs text-ink-muted">{che4SoCuoi(g.sdt)}</div>
        </td>
        <td className="px-3 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.venueMau }} />
            {g.venueTen}
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-ink-soft">{g.them.doanhThuDuKien || "-"}</td>
        <td className="px-3 py-3 text-center">
          <span className="text-ink">{g.soNguoiMoi}</span>
          <span className="text-ink-muted"> / {g.soNguoiXacNhan ?? "-"}</span>
        </td>
        <td className="px-3 py-3 text-xs">
          {daPhatHanh ? (
            <div className="space-y-0.5">
              <div className={daGuiOnline ? "text-sage" : "text-ink-muted"}>{daGuiOnline ? "✓" : "○"} Online</div>
              <div className={g.daGuiThiepGiay ? "text-sage" : "text-ink-muted"}>{g.daGuiThiepGiay ? "✓" : "○"} Giấy</div>
            </div>
          ) : (
            <span className="text-ink-muted">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge trangThai={g.trangThai} />
            <span className={`text-ink-muted transition ${mo ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </div>
          {!daPhatHanh && canhBao.length > 0 && (
            <div className="mt-1 text-[11px] text-wine">{canhBao.map((c) => NHAN_CANH_BAO[c] || c).join(", ")}</div>
          )}
        </td>
      </tr>
      {mo && (
        <tr className="border-t border-ivory-deep bg-ivory/40">
          <td colSpan={7} className="px-4 py-4">
            <ChiTiet g={g} />
            <div className="mt-2 max-w-3xl">
              <HanhDong g={g} venuesSua={venuesSua} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ChiTiet({ g }: { g: SalesGuest }) {
  const gio = (d: string | null) => (d ? dinhDangGio(d) : null);
  const o: [string, React.ReactNode][] = [
    ["Số điện thoại", g.sdt],
    [NHAN_TRUONG.maCorp, g.them.maCorp],
    [NHAN_TRUONG.nhomKhachMoi, g.them.nhomKhachMoi],
    [NHAN_TRUONG.nhomKhach, g.them.nhomKhach],
    [NHAN_TRUONG.linhVuc, g.them.linhVuc],
    [NHAN_TRUONG.nguonKhach, g.them.nguonKhach],
    [NHAN_TRUONG.phongBan, g.them.phongBan],
    ["Phát hành vé", gio(g.phatHanhLuc)],
    ["Xác nhận lúc", gio(g.xacNhanLuc)],
    ["Check in", g.checkinLuc ? `${gio(g.checkinLuc)}${g.soNguoiDen ? `, ${g.soNguoiDen} người` : ""}` : null],
    ["Ghi chú", g.ghiChu],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
      {o.map(([nhan, gt]) => (
        <div key={nhan} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</dt>
          <dd className="break-words text-ink">{gt === null || gt === undefined || gt === "" ? <span className="text-ink-muted">-</span> : gt}</dd>
        </div>
      ))}
    </dl>
  );
}

// Gui duyet ca loat moi khach nhap
function GuiDuyetLoat({ ids }: { ids: string[] }) {
  const [pending, start] = useTransition();
  const [tb, setTb] = useState<string | null>(null);
  if (ids.length === 0) return tb ? <p className="rounded-xl bg-sage/10 px-4 py-2.5 text-sm text-sage">{tb}</p> : null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-white px-4 py-3">
      <span className="text-sm text-ink-soft">{ids.length} khách đang ở trạng thái Nháp</span>
      <button
        className="btn-brand btn-sm shrink-0"
        disabled={pending}
        onClick={() => start(async () => setTb((await guiDuyet(ids)).thongBao))}
      >
        {pending ? "Đang gửi..." : "Gửi duyệt tất cả"}
      </button>
    </div>
  );
}

// Cac thao tac tren mot khach, dung chung cho the (dien thoai) va dong mo rong (may tinh)
function HanhDong({ g, venuesSua }: { g: SalesGuest; venuesSua: { id: string; ten: string }[] }) {
  const [pending, start] = useTransition();
  const [daChep, setDaChep] = useState(false);
  const [moXN, setMoXN] = useState(false);
  const [sua, setSua] = useState(false);
  const [so, setSo] = useState(g.soNguoiXacNhan || g.soNguoiMoi);
  const [tb, setTb] = useState<string | null>(null);
  const [xoa, setXoa] = useState(false);
  const daPhatHanh = !CHUA_PHAT_HANH.includes(g.trangThai);
  const duocXN = DUOC_XAC_NHAN.includes(g.trangThai);
  const daGuiOnline = daPhatHanh && g.trangThai !== TRANG_THAI.DA_PHAT_HANH;
  const duocSua = g.trangThai !== TRANG_THAI.DA_HUY;

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

  const xn = (kq: "THAM_DU" | "KHONG_THAM_DU" | "DA_MOI") =>
    start(async () => {
      const r = await xacNhanKhach(g.id, kq, so);
      setTb(r.thongBao);
      if (r.ok) setMoXN(false);
    });

  const nutSua = duocSua && (
    <button className={sua ? "btn-ink btn-sm" : "btn-ghost btn-sm"} onClick={() => setSua((v) => !v)}>
      {sua ? "Đóng sửa" : "Sửa thông tin"}
    </button>
  );
  const formSua = sua && (
    <FormKhach
      g={{ ...g, venueId: g.venueId, salesOwner: "", them: g.them }}
      venues={venuesSua}
      laSales
      onXong={() => setSua(false)}
    />
  );

  if (g.trangThai === TRANG_THAI.NHAP) {
    return (
      <div className="mt-3 border-t border-ivory-deep pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-brand btn-sm" disabled={pending} onClick={() => start(async () => setTb((await guiDuyet([g.id])).thongBao))}>
            Gửi duyệt
          </button>
          {nutSua}
          {xoa ? (
            <button
              className="rounded-full bg-wine px-3.5 py-1.5 text-xs text-white"
              disabled={pending}
              onClick={() => start(async () => setTb((await xoaNhap(g.id)).thongBao))}
            >
              Bấm lần nữa để xóa
            </button>
          ) : (
            <button className="rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine" onClick={() => setXoa(true)}>
              Xóa nháp
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-muted">Kiểm tra lại thông tin rồi gửi BTC duyệt.</p>
        {tb && <p className="mt-1 text-xs text-sage">{tb}</p>}
        {formSua}
      </div>
    );
  }

  if (!daPhatHanh) {
    return (
      <div className="mt-3 border-t border-ivory-deep pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted">Đã gửi, chờ BTC duyệt và phát hành vé.</span>
          {nutSua}
        </div>
        {formSua}
      </div>
    );
  }

  return (
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
        <a href={`/thiep/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
          Xem thiệp
        </a>
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
      {duocXN && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`w-24 shrink-0 text-xs ${g.trangThai === TRANG_THAI.THAM_DU || g.trangThai === TRANG_THAI.KHONG_THAM_DU ? "text-sage" : "text-ink-muted"}`}
          >
            {g.trangThai === TRANG_THAI.THAM_DU || g.trangThai === TRANG_THAI.KHONG_THAM_DU ? "✓ " : ""}Xác nhận
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
            {(g.trangThai === TRANG_THAI.THAM_DU || g.trangThai === TRANG_THAI.KHONG_THAM_DU) && (
              <button className="btn-ghost btn-sm" disabled={pending} onClick={() => xn("DA_MOI")}>
                Bỏ xác nhận
              </button>
            )}
          </div>
        </div>
      )}
      {/* 4. Sua thong tin: khong anh huong ve da phat hanh */}
      {duocSua && <div className="flex flex-wrap items-center gap-2"><span className="w-24 shrink-0 text-xs text-ink-muted">Thông tin</span>{nutSua}</div>}
      {tb && <p className="text-xs text-sage">{tb}</p>}
      {formSua}
    </div>
  );
}

function ThemKhach({ venues, onXong, rong }: { venues: SalesVenue[]; onXong: () => void; rong?: boolean }) {
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
        ghiChu: String(fd.get("ghiChu") || ""),
        them: docThem(fd),
      });
      setKq({ ok: r.ok, msg: r.thongBao + (r.soThuTu ? ` (số ${r.soThuTu})` : "") });
    });
  };

  const oVenue = (
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
          {conLai > 0 ? `Venue còn ${conLai} thiệp trong quota` : "Venue đã đủ quota, vẫn thêm được nhưng BTC sẽ thấy cảnh báo khi duyệt"}
        </p>
      )}
    </div>
  );

  // May tinh: form rong, du cac truong nhu file mau
  if (rong) {
    return (
      <form action={gui} className="card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Tên khách mời</label>
            <input name="hoTen" required className="input" placeholder="Nguyễn Văn An" />
          </div>
          <div>
            <label className="label">Số điện thoại</label>
            <input name="sdt" inputMode="tel" className="input" placeholder="Không bắt buộc" />
          </div>
          {oVenue}
          <div>
            <label className="label">Số người mời</label>
            <input name="soNguoiMoi" type="number" min={1} max={10} defaultValue={1} className="input" />
          </div>
          <OThongTin />
          <div className="sm:col-span-2">
            <label className="label">Ghi chú</label>
            <input name="ghiChu" className="input" />
          </div>
          <label className="flex items-end gap-2 pb-2.5 text-sm text-ink-soft">
            <input name="isVip" type="checkbox" className="h-4 w-4 accent-brand" />
            Khách VIP
          </label>
        </div>
        {kq && <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.msg}</div>}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-brand" disabled={pending}>
            {pending ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button type="button" className="btn-ghost" onClick={onXong}>
            Xong
          </button>
          <span className="text-xs text-ink-muted">Khách mới lưu ở trạng thái Nháp, bấm Gửi duyệt để chuyển BTC.</span>
        </div>
      </form>
    );
  }

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
        <label className="label">Doanh thu dự kiến</label>
        <input name="doanhThuDuKien" className="input" placeholder="95.000.000 đ" />
      </div>
      {oVenue}
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
        Khách mới lưu ở trạng thái Nháp. Bấm Gửi duyệt để chuyển BTC. Trùng SĐT, trùng tên cùng công ty, VIP, venue hết quota sẽ hiện cảnh báo cho BTC.
      </p>
    </form>
  );
}
