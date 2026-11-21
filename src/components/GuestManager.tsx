"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { DUOC_XAC_NHAN, NHAN_CANH_BAO, NHAN_TRANG_THAI, TRANG_THAI } from "@/lib/constants";
import { che4SoCuoi, boDau, dinhDangGio, hienTien } from "@/lib/format";
import { taoKhach, datThiepGiay, xacNhanKhach, guiDuyet, danhDauDaMoi, huyKhach, duyetKhach, xoaKhach, traVeNhap, datVip } from "@/lib/actions";
import { NHAN_TRUONG, TRUONG_CHU, docDiCung, moTaDiCung, tenGoi, thieuThongTinMoi, type ThongTinThem } from "@/lib/khach";
import { ChipLichSu } from "./ChipLichSu";
import { HopChon, HopChonTatCa, ThanhHangLoat } from "./ThanhHangLoat";
import type { LichSu } from "@/lib/lichSu";
import { moTaChoBtc, moTaKhachTrung, moTaTrung, type CongTyBtc, type KhachTrung } from "@/lib/congTy";
import { FormKhach, OThongTin, SoNguoiDiCung, docDiCungForm, docThem } from "./FormKhach";

export interface GuestRow {
  id: string;
  soThuTu: number;
  maBiMat: string;
  hoTen: string;
  sdt: string | null;
  venueId: string;
  venueTen: string;
  venueMau: string;
  soNguoiMoi: number;
  khachDiCung: string | null;
  soNguoiXacNhan: number | null;
  traLoiKhach: string | null;
  trangThai: string;
  isVip: boolean;
  salesOwner: string;
  lyDoChoDuyet: string | null;
  xacNhanBoi: string | null;
  xacNhanLuc: string | null;
  phatHanhLuc: string | null;
  checkinLuc: string | null;
  soNguoiDen: number | null;
  createdAt: string;
  ghiChu: string | null;
  daGuiThiepGiay: boolean;
  them: ThongTinThem;
  lichSu: LichSu | null;
  congTyKhac: CongTyBtc | null;
  trung: KhachTrung[];
}
export interface VenueOpt {
  id: string;
  ten: string;
  code: string;
}

const MOI_TRANG = 100;

// Trung: trung nguoi (SDT, hoac ten va cong ty), hoac cong ty dang duoc sales khac cung moi
const coTrung = (g: GuestRow) => g.trung.length > 0 || !!g.congTyKhac?.nhieuSales;

export function GuestManager({
  guests,
  venues,
  salesTeam,
  quanTri,
}: {
  guests: GuestRow[];
  venues: VenueOpt[];
  salesTeam: string[];
  quanTri: boolean;
}) {
  const [q, setQ] = useState("");
  const [tt, setTt] = useState("");
  const [vn, setVn] = useState("");
  const [sl, setSl] = useState("");
  const [nh, setNh] = useState("");
  const [ls, setLs] = useState("");
  const [ct, setCt] = useState("");
  const [tr, setTr] = useState("");
  const [vip, setVip] = useState("");
  const [ng, setNg] = useState(""); // nganh hang (truong Linh vuc); "-" la chua ghi
  const [moForm, setMoForm] = useState(false);
  const [soHien, setSoHien] = useState(MOI_TRANG);

  const locKq = useMemo(() => {
    const s = boDau(q);
    return guests.filter((g) => {
      if (tt && g.trangThai !== tt) return false;
      if (vn && g.venueId !== vn) return false;
      if (sl && g.salesOwner !== sl) return false;
      if (nh && (g.them.nguonKhach || "") !== nh) return false;
      if (ls && g.lichSu?.loai !== ls) return false;
      if (ng === "-" ? !!g.them.linhVuc : ng && (g.them.linhVuc || "") !== ng) return false;
      if (vip === "vip" && !g.isVip) return false;
      if (vip === "thuong" && g.isVip) return false;
      if (tr === "khach" && !g.trung.length) return false;
      if (tr === "congTy" && !g.congTyKhac?.nhieuSales) return false;
      if (tr === "tatCa" && !coTrung(g)) return false;
      if (ct === "nhieuSales" && !g.congTyKhac?.nhieuSales) return false;
      if (ct === "tren2" && !((g.congTyKhac?.tongNguoi ?? g.soNguoiMoi) > 2)) return false;
      if (s) {
        return (
          boDau(g.hoTen).includes(s) ||
          boDau(g.them.congTy || "").includes(s) ||
          boDau(g.them.maCorp || "").includes(s) ||
          (g.sdt || "").includes(q.trim()) ||
          String(g.soThuTu).includes(q.trim()) ||
          g.maBiMat.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [guests, q, tt, vn, sl, nh, ls, ct, tr, vip, ng]);
  const soTrung = useMemo(
    () => ({
      khach: guests.filter((g) => g.trung.length).length,
      congTy: guests.filter((g) => g.congTyKhac?.nhieuSales).length,
      tatCa: guests.filter(coTrung).length,
    }),
    [guests]
  );

  const dsSales = useMemo(() => [...new Set(guests.map((g) => g.salesOwner))].sort(), [guests]);
  // Nganh hang dang co trong danh sach, kem so dong cua tung nganh
  const dsNganh = useMemo(() => {
    const dem = new Map<string, number>();
    for (const g of guests) if (g.them.linhVuc) dem.set(g.them.linhVuc, (dem.get(g.them.linhVuc) || 0) + 1);
    return [...dem.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [guests]);
  const soChuaNganh = useMemo(() => guests.filter((g) => !g.them.linhVuc).length, [guests]);
  const dsNhom = useMemo(() => [...new Set(guests.map((g) => g.them.nguonKhach).filter(Boolean) as string[])].sort(), [guests]);
  const coLoc = q || tt || vn || sl || nh || ls || ct || tr || vip || ng;
  const coLichSu = guests.some((g) => g.lichSu);

  // Tick chon khach de thao tac hang loat; doi bo loc thi bo chon cho khoi nham
  const [chon, setChon] = useState<Set<string>>(new Set());
  useEffect(() => setChon(new Set()), [q, tt, vn, sl, nh, ls, ct, tr, vip, ng]);
  const doiChon = (id: string) =>
    setChon((s) => {
      const m = new Set(s);
      if (m.has(id)) m.delete(id);
      else m.add(id);
      return m;
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Danh sách khách</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {locKq.length.toLocaleString("vi-VN")} / {guests.length.toLocaleString("vi-VN")} dòng ·{" "}
            {locKq.reduce((t, g) => t + g.soNguoiMoi, 0).toLocaleString("vi-VN")} thiệp (mỗi khách một thiệp, kể cả khách đi kèm)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/nhap" className="btn-ghost">
            Nhập từ Excel
          </Link>
          {quanTri && (
            <a href="/api/xuat" className="btn-ghost">
              Xuất CSV
            </a>
          )}
          <a href="/in-qr" target="_blank" className="btn-ghost">
            In số thiệp giấy
          </a>
          <button className="btn-brand" onClick={() => setMoForm((v) => !v)}>
            {moForm ? "Đóng" : "+ Thêm khách"}
          </button>
        </div>
      </div>

      {moForm && <FormTao venues={venues} salesTeam={salesTeam} mienBatBuoc={quanTri} onXong={() => setMoForm(false)} />}

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input min-w-[200px] max-w-xs flex-1"
          placeholder="Tìm tên, công ty, mã CORP, SĐT, số thứ tự..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-auto" value={tt} onChange={(e) => setTt(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.keys(NHAN_TRANG_THAI).map((k) => (
            <option key={k} value={k}>
              {NHAN_TRANG_THAI[k]}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={vn} onChange={(e) => setVn(e.target.value)}>
          <option value="">Mọi venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.ten}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={sl} onChange={(e) => setSl(e.target.value)}>
          <option value="">Mọi sales</option>
          {dsSales.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {dsNhom.length > 0 && (
          <select className="input w-auto" value={nh} onChange={(e) => setNh(e.target.value)}>
            <option value="">Mọi phân loại khách</option>
            {dsNhom.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        )}
        {coLichSu && (
          <select className="input w-auto" value={ls} onChange={(e) => setLs(e.target.value)}>
            <option value="">Năm trước: tất cả</option>
            <option value="den">Năm trước đã đến</option>
            <option value="khongDen">Năm trước mời, không đến</option>
            <option value="congTy">Cùng công ty năm trước</option>
            <option value="moi">Khách mới</option>
          </select>
        )}
        <select className="input w-auto" value={ng} onChange={(e) => setNg(e.target.value)} aria-label="Lọc theo ngành hàng">
          <option value="">Mọi ngành hàng</option>
          {dsNganh.map(([x, n]) => (
            <option key={x} value={x}>
              {x} ({n})
            </option>
          ))}
          {soChuaNganh > 0 && <option value="-">Chưa ghi ngành hàng ({soChuaNganh})</option>}
        </select>
        <select className="input w-auto" value={vip} onChange={(e) => setVip(e.target.value)}>
          <option value="">VIP: tất cả</option>
          <option value="vip">Chỉ khách VIP ({guests.filter((g) => g.isVip).length})</option>
          <option value="thuong">Chỉ khách thường</option>
        </select>
        <select className="input w-auto" value={ct} onChange={(e) => setCt(e.target.value)}>
          <option value="">Công ty: tất cả</option>
          <option value="nhieuSales">Nhiều sales cùng mời một công ty</option>
          <option value="tren2">Công ty được mời trên 2 người</option>
        </select>
        <select
          className={`input w-auto ${tr ? "border-wine bg-wine/10 text-wine" : soTrung.tatCa ? "border-wine/40 text-wine" : ""}`}
          value={tr}
          onChange={(e) => setTr(e.target.value)}
        >
          <option value="">Khách trùng: không lọc</option>
          <option value="tatCa">Mọi khách trùng ({soTrung.tatCa})</option>
          <option value="congTy">Trùng công ty giữa các sales ({soTrung.congTy})</option>
          <option value="khach">Trùng người: SĐT, hoặc tên và công ty ({soTrung.khach})</option>
        </select>
        {coLoc && (
          <button className="btn-ghost btn-sm" onClick={() => { setQ(""); setTt(""); setVn(""); setSl(""); setNh(""); setLs(""); setCt(""); setTr(""); setVip(""); setNg(""); }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <ThanhHangLoat ids={[...chon]} laSales={false} salesTeam={salesTeam} quanTri={quanTri} onXong={() => setChon(new Set())} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="w-10 pl-4 pr-1 py-3">
                  <HopChonTatCa
                    tong={locKq.length}
                    daChon={chon.size}
                    onDoi={(het) => setChon(het ? new Set(locKq.map((g) => g.id)) : new Set())}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Số</th>
                <th className="px-3 py-3 font-medium">Khách</th>
                <th className="px-3 py-3 font-medium">Venue</th>
                <th className="px-3 py-3 text-right font-medium">Doanh thu dự kiến</th>
                <th className="px-3 py-3 text-center font-medium">Mời / XN</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {locKq.slice(0, soHien).map((g) => (
                <Dong key={g.id} g={g} salesTeam={salesTeam} venues={venues} quanTri={quanTri} chon={chon.has(g.id)} onChon={() => doiChon(g.id)} />
              ))}
              {locKq.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                    {guests.length === 0 ? "Chưa có khách nào. Thêm khách hoặc nhập từ Excel." : "Không có khách khớp bộ lọc."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {locKq.length > soHien && (
          <div className="border-t border-ivory-deep p-3 text-center">
            <button className="btn-ghost btn-sm" onClick={() => setSoHien((n) => n + MOI_TRANG)}>
              Xem thêm ({(locKq.length - soHien).toLocaleString("vi-VN")} khách)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Dong({
  g, salesTeam, venues, quanTri, chon, onChon,
}: { g: GuestRow; salesTeam: string[]; venues: VenueOpt[]; quanTri: boolean; chon: boolean; onChon: () => void }) {
  const [pending, start] = useTransition();
  const [mo, setMo] = useState(false);
  const [sua, setSua] = useState(false);
  const [xacNhanXoa, setXacNhanXoa] = useState(false);
  const [soXN, setSoXN] = useState(g.soNguoiXacNhan || g.soNguoiMoi);
  const [tb, setTb] = useState<string | null>(null);

  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      const r = (await fn()) as { thongBao?: string } | undefined;
      setTb(r?.thongBao || null);
    });
  const batTat = () => {
    setMo((v) => !v);
    setXacNhanXoa(false);
    setSua(false);
    setTb(null);
  };
  const canhBao = (g.lyDoChoDuyet || "").split(",").filter(Boolean);
  const chuaPhatHanh = g.trangThai === TRANG_THAI.NHAP || g.trangThai === TRANG_THAI.CHO_DUYET;
  const thieu = thieuThongTinMoi({ sdt: g.sdt, diaChi: g.them.diaChi, chucVu: g.them.chucVu, soNguoiMoi: g.soNguoiMoi, khachDiCung: g.khachDiCung, linhVuc: g.them.linhVuc ?? null, congTy: g.them.congTy });

  return (
    <>
      <tr
        className={`cursor-pointer border-t ${
          coTrung(g)
            ? `border-wine/30 ${chon ? "bg-wine/15" : "bg-wine/[0.07] hover:bg-wine/[0.12]"}`
            : `border-ivory-deep ${chon ? "bg-brand/5" : mo ? "bg-ivory/60" : "hover:bg-ivory/50"}`
        }`}
        onClick={batTat}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); batTat(); } }}
        aria-expanded={mo}
      >
        <HopChon chon={chon} onDoi={onChon} />
        <td className="px-4 py-3">
          <span className="font-mono text-ink">{g.soThuTu}</span>
          {g.isVip && <span className="ml-1.5 chip bg-brand/15 text-brand-deep">VIP</span>}
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-ink">{tenGoi({ danhXung: g.them.danhXung, hoTen: g.hoTen })}</span>
            {coTrung(g) && <span className="chip bg-wine text-white">{g.trung.length ? "Trùng" : "Trùng công ty"}</span>}
            <ChipLichSu ls={g.lichSu} />
          </div>
          {(g.them.chucVu || g.them.congTy) && (
            <div className="text-xs text-ink-soft">{[g.them.chucVu, g.them.congTy].filter(Boolean).join(" · ")}</div>
          )}
          {g.trung.slice(0, 3).map((x) => (
            <div key={x.id} className="text-xs font-medium text-wine">{moTaKhachTrung(x)}</div>
          ))}
          {g.trung.length > 3 && <div className="text-xs font-medium text-wine">và {g.trung.length - 3} khách trùng khác, bấm vào dòng để xem</div>}
          {g.congTyKhac && (
            <div className={`text-xs ${g.congTyKhac.nhieuSales ? "text-wine" : "text-ink-muted"}`} title={moTaChoBtc(g.congTyKhac) || ""}>
              Cùng công ty: +{g.congTyKhac.soKhac} khách, tổng {g.congTyKhac.tongNguoi} người
              {g.congTyKhac.nhieuSales ? " · có sales khác cùng mời" : ""}
            </div>
          )}
          <div className="text-xs text-ink-muted">
            {che4SoCuoi(g.sdt)} · {g.salesOwner}
            {g.daGuiThiepGiay ? " · đã gửi thiệp giấy" : ""}
          </div>
        </td>
        <td className="px-3 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.venueMau }} />
            {g.venueTen}
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-ink-soft">{hienTien(g.them.doanhThuDuKien) || "-"}</td>
        <td className="px-3 py-3 text-center">
          <span className="text-ink">{g.soNguoiMoi}</span>
          <span className="text-ink-muted"> / {g.soNguoiXacNhan ?? "-"}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge trangThai={g.trangThai} />
            <span className={`text-ink-muted transition ${mo ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </div>
          {chuaPhatHanh && canhBao.length > 0 && (
            <div className="mt-1 text-[11px] text-wine">{canhBao.map((c) => NHAN_CANH_BAO[c] || c).join(", ")}</div>
          )}
          {chuaPhatHanh && thieu && <div className="mt-1 text-[11px] text-wine">{thieu}</div>}
        </td>
      </tr>
      {mo && (
        <tr className="border-t border-ivory-deep bg-ivory/40">
          <td colSpan={7} className="px-4 py-4">
            <ChiTiet g={g} canhBao={canhBao} />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {g.trangThai === TRANG_THAI.NHAP && (
                <button className="btn-ink btn-sm" disabled={pending} onClick={() => act(() => guiDuyet([g.id]))}>
                  Gửi duyệt
                </button>
              )}
              {chuaPhatHanh && (
                <button className="btn-brand btn-sm" disabled={pending} onClick={() => act(() => duyetKhach(g.id))}>
                  Duyệt, phát hành thiệp
                </button>
              )}
              {g.trangThai === TRANG_THAI.DA_PHAT_HANH && (
                <button className="btn-ink btn-sm" disabled={pending} onClick={() => act(() => danhDauDaMoi(g.id))}>
                  Đã gửi thiệp online
                </button>
              )}
              {DUOC_XAC_NHAN.includes(g.trangThai) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white py-0.5 pl-3 pr-0.5">
                  <span className="text-xs text-ink-muted">Xác nhận</span>
                  <select className="bg-transparent text-xs outline-none" value={soXN} onChange={(e) => setSoXN(parseInt(e.target.value, 10))}>
                    {Array.from({ length: g.soNguoiMoi }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} người
                      </option>
                    ))}
                  </select>
                  <button className="btn-brand btn-sm" disabled={pending} onClick={() => act(() => xacNhanKhach(g.id, "THAM_DU", soXN))}>
                    Tham dự
                  </button>
                  <button className="btn-ghost btn-sm" disabled={pending} onClick={() => act(() => xacNhanKhach(g.id, "KHONG_THAM_DU"))}>
                    Không
                  </button>
                  {(g.trangThai === TRANG_THAI.THAM_DU || g.trangThai === TRANG_THAI.KHONG_THAM_DU) && (
                    <button className="btn-ghost btn-sm" disabled={pending} onClick={() => act(() => xacNhanKhach(g.id, "DA_MOI"))}>
                      Bỏ xác nhận
                    </button>
                  )}
                </span>
              )}
              {!chuaPhatHanh && g.trangThai !== TRANG_THAI.DA_HUY && (
                <a href={`/api/thiep-anh/${g.maBiMat}?tai=1`} download={`thiep-capella20-${g.soThuTu}.jpg`} className="btn-ghost btn-sm">
                  Tải thiệp
                </a>
              )}
              {/* Khach di kem: tai file hinh thiep rieng cua nguoi do */}
              {!chuaPhatHanh &&
                g.trangThai !== TRANG_THAI.DA_HUY &&
                docDiCung(g.khachDiCung)
                  .slice(0, Math.max(0, g.soNguoiMoi - 1))
                  .map((x, i) =>
                    x.hoTen.trim() ? (
                      <a
                        key={i}
                        href={`/api/thiep-anh/${g.maBiMat}?k=${i + 2}&tai=1`}
                        download={`thiep-capella20-${g.soThuTu}-khach-${i + 2}.jpg`}
                        className="btn-ghost btn-sm"
                        title={[x.danhXung, x.hoTen].filter(Boolean).join(" ")}
                      >
                        Tải thiệp khách thứ {i + 2}
                      </a>
                    ) : null
                  )}
              <Link href={`/thiep/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
                Trang thiệp
              </Link>
              <a href={`/api/qr/${g.maBiMat}`} target="_blank" className="btn-ghost btn-sm">
                Xem QR
              </a>
              <button className="btn-ghost btn-sm" onClick={() => setSua((v) => !v)}>
                {sua ? "Đóng sửa" : "Sửa thông tin"}
              </button>
              {quanTri && (
                <button
                  className={g.isVip ? "btn-ghost btn-sm" : "rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand-deep hover:bg-brand/15"}
                  disabled={pending}
                  onClick={() => act(() => datVip(g.id, !g.isVip))}
                >
                  {g.isVip ? "Bỏ VIP" : "Xếp vào VIP"}
                </button>
              )}
              <button className="btn-ghost btn-sm" disabled={pending} onClick={() => act(() => datThiepGiay(g.id, !g.daGuiThiepGiay))}>
                {g.daGuiThiepGiay ? "Bỏ đánh dấu thiệp giấy" : "Đã gửi thiệp giấy"}
              </button>
              <span className="ml-auto flex gap-2">
                {g.trangThai !== TRANG_THAI.NHAP && g.trangThai !== TRANG_THAI.DA_CHECKIN && (
                  <button
                    className="btn-ghost btn-sm"
                    disabled={pending}
                    title="Thu hồi thiệp để sales sửa lại rồi gửi duyệt. Số thứ tự và mã QR giữ nguyên."
                    onClick={() => act(() => traVeNhap(g.id))}
                  >
                    Trả về nháp
                  </button>
                )}
                {g.trangThai !== TRANG_THAI.DA_HUY && g.trangThai !== TRANG_THAI.DA_CHECKIN && (
                  <button
                    className="rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
                    disabled={pending}
                    onClick={() => act(() => huyKhach(g.id))}
                  >
                    Hủy thiệp
                  </button>
                )}
                {xacNhanXoa ? (
                  <button
                    className="rounded-full bg-wine px-3.5 py-1.5 text-xs text-white"
                    disabled={pending}
                    onClick={() => act(() => xoaKhach(g.id))}
                  >
                    Bấm lần nữa để xóa hẳn
                  </button>
                ) : (
                  <button
                    className="rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
                    onClick={() => setXacNhanXoa(true)}
                  >
                    Xóa khách
                  </button>
                )}
              </span>
            </div>
            {tb && <div className="mt-3 rounded-xl bg-white px-4 py-2 text-sm text-ink-soft">{tb}</div>}
            {sua && <FormKhach g={g} venues={venues} salesTeam={salesTeam} mienBatBuoc={quanTri} onXong={() => setSua(false)} />}
          </td>
        </tr>
      )}
    </>
  );
}

// Toan bo thong tin khach khi bam vao dong
function ChiTiet({ g, canhBao }: { g: GuestRow; canhBao: string[] }) {
  const gio = (d: string | null) => (d ? dinhDangGio(d) : null);
  const o: [string, React.ReactNode][] = [
    ["Số điện thoại", g.sdt],
    ["Mã thiệp", <span key="ma" className="font-mono">{g.maBiMat}</span>],
    ...TRUONG_CHU.filter((k) => k !== "danhXung" && k !== "chucVu" && k !== "congTy").map(
      (k) => [NHAN_TRUONG[k], g.them[k]] as [string, React.ReactNode]
    ),
    ["Người phụ trách", g.salesOwner],
    ["Số người mời", g.soNguoiMoi],
    ["Khách đi cùng", moTaDiCung(g.khachDiCung) || null],
    ["Số người xác nhận", g.soNguoiXacNhan],
    ["Khách tự trả lời trên thiệp", g.traLoiKhach],
    ["Xác nhận bởi", g.xacNhanBoi ? `${g.xacNhanBoi}${g.xacNhanLuc ? `, ${gio(g.xacNhanLuc)}` : ""}` : null],
    [g.trangThai === TRANG_THAI.NHAP || g.trangThai === TRANG_THAI.CHO_DUYET ? "Phát hành lần trước" : "Phát hành thiệp", gio(g.phatHanhLuc)],
    ["Check in", g.checkinLuc ? `${gio(g.checkinLuc)}${g.soNguoiDen ? `, ${g.soNguoiDen} người` : ""}` : null],
    ["Thiệp giấy", g.daGuiThiepGiay ? "Đã gửi" : "Chưa gửi"],
    ["Cảnh báo khi duyệt", canhBao.length ? canhBao.map((c) => NHAN_CANH_BAO[c] || c).join(", ") : null],
    ["Ghi chú", g.ghiChu],
    ["Năm trước", g.lichSu?.chiTiet ?? null],
    ["Khách trùng", moTaTrung(g.trung)],
    ["Cùng công ty", moTaChoBtc(g.congTyKhac)],
    ["Tạo lúc", gio(g.createdAt)],
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

// mienBatBuoc: chi Quan tri duoc them khach khi con thieu truong bat buoc
function FormTao({ venues, salesTeam, mienBatBuoc, onXong }: { venues: VenueOpt[]; salesTeam: string[]; mienBatBuoc: boolean; onXong: () => void }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<{ ok: boolean; msg: string } | null>(null);

  const guiForm = (fd: FormData) => {
    start(async () => {
      const r = await taoKhach({
        hoTen: String(fd.get("hoTen") || ""),
        sdt: String(fd.get("sdt") || ""),
        venueId: String(fd.get("venueId") || ""),
        soNguoiMoi: parseInt(String(fd.get("soNguoiMoi") || "1"), 10),
        salesOwner: String(fd.get("salesOwner") || ""),
        isVip: fd.get("isVip") === "on",
        ghiChu: String(fd.get("ghiChu") || ""),
        them: docThem(fd),
        diCung: docDiCungForm(fd),
      });
      setKq({ ok: r.ok, msg: r.thongBao + (r.soThuTu ? ` (số ${r.soThuTu})` : "") });
    });
  };

  return (
    <form action={guiForm} className="card space-y-4 p-6">
      <h2 className="font-display text-lg text-ink">Thêm khách</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Tên khách mời</label>
          <input name="hoTen" required className="input" placeholder="Nguyễn Văn An" />
        </div>
        <div>
          <label className="label">
            Số điện thoại {!mienBatBuoc && <span className="text-wine">*</span>}
          </label>
          <input name="sdt" inputMode="tel" className="input" placeholder="0901234567" required={!mienBatBuoc} />
        </div>
        <div>
          <label className="label">Venue</label>
          <select name="venueId" required className="input">
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sales phụ trách</label>
          <select name="salesOwner" className="input">
            <option value="">BTC</option>
            {salesTeam.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm text-ink-soft">
            <input name="isVip" type="checkbox" className="h-4 w-4 accent-brand" />
            Khách VIP (cần BTC duyệt)
          </label>
        </div>
        <OThongTin mienBatBuoc={mienBatBuoc} />
        <SoNguoiDiCung mienBatBuoc={mienBatBuoc} />
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <input name="ghiChu" className="input" placeholder="Không bắt buộc" />
      </div>
      {kq && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.msg}</div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-brand" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu khách"}
        </button>
        <button type="button" className="btn-ghost" onClick={onXong}>
          Đóng
        </button>
      </div>
    </form>
  );
}
