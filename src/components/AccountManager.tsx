"use client";

import { useState, useTransition } from "react";
import { NHAN_VAI_TRO } from "@/lib/constants";
import {
  taoTaiKhoan, taoNhieuTaiKhoan, datMatKhau, datMatKhauChung, datVenueTaiKhoan, xoaTaiKhoan,
  type KetQua, type TaiKhoanMoi,
} from "@/lib/actions";
import { chuanHoTen, tenDangNhapGoiY } from "@/lib/taiKhoan";

export interface TaiKhoanRow {
  id: string;
  username: string;
  hoTen: string;
  vaiTro: string;
  quanTri: boolean;
  ca: string | null;
  venueId: string | null;
  venueTen: string | null;
  coMatKhau: boolean;
  doiMatKhau: boolean;
  laToi: boolean;
}

const THU_TU = ["ADMIN", "SALES", "LE_TAN"];

type VenueOpt = { id: string; ten: string };

// Mat khau tam ngau nhien phia trinh duyet, bo ky tu de nham
function matKhauNgauNhien(): string {
  const bang = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const so = new Uint32Array(10);
  crypto.getRandomValues(so);
  return Array.from(so, (n) => bang[n % bang.length]).join("");
}

export function AccountManager({ ds, quanTri, venues }: { ds: TaiKhoanRow[]; quanTri: boolean; venues: VenueOpt[] }) {
  const [kq, setKq] = useState<KetQua | null>(null);
  const [moForm, setMoForm] = useState<"" | "mot" | "nhieu">("");
  const soChuaCo = ds.filter((d) => !d.coMatKhau).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Tài khoản</h1>
          <p className="mt-1 text-sm text-ink-muted">
            BTC vào mọi phân hệ. Sales chỉ thấy khách mang đúng họ tên của mình. Lễ tân chỉ vào app check in.
            {" "}Chỉ Quản trị được tạo tài khoản, đặt mật khẩu cho người khác, xuất CSV và vào tab Dữ liệu.
          </p>
        </div>
        {quanTri && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => setMoForm((v) => (v === "nhieu" ? "" : "nhieu"))}>
              {moForm === "nhieu" ? "Đóng" : "Tạo nhiều tài khoản"}
            </button>
            <button className="btn-brand" onClick={() => setMoForm((v) => (v === "mot" ? "" : "mot"))}>
              {moForm === "mot" ? "Đóng" : "+ Thêm tài khoản"}
            </button>
          </div>
        )}
      </div>

      {kq && (
        <div className={`rounded-xl px-4 py-3 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.thongBao}</div>
      )}

      {quanTri && moForm === "mot" && <FormThem venues={venues} onKq={setKq} onXong={() => setMoForm("")} />}
      {quanTri && moForm === "nhieu" && <FormNhieu venues={venues} />}

      {quanTri && soChuaCo > 0 && <MatKhauChung soChuaCo={soChuaCo} onKq={setKq} />}

      {THU_TU.map((vt) => {
        // Sales xep theo venue roi theo ten
        const nhom = ds
          .filter((d) => d.vaiTro === vt)
          .sort(
            (a, b) =>
              Number(!a.venueTen) - Number(!b.venueTen) ||
              (a.venueTen || "").localeCompare(b.venueTen || "", "vi") ||
              a.hoTen.localeCompare(b.hoTen, "vi", { numeric: true })
          );
        if (nhom.length === 0) return null;
        return (
          <div key={vt} className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-display text-base text-ink">{NHAN_VAI_TRO[vt]}</h2>
              <span className="text-xs text-ink-muted">{nhom.length} tài khoản</span>
            </div>
            <div className="hairline" />
            {nhom.map((t) => (
              <Dong key={t.id} t={t} onKq={setKq} quanTri={quanTri} venues={venues} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Dong({ t, onKq, quanTri, venues }: { t: TaiKhoanRow; onKq: (k: KetQua) => void; quanTri: boolean; venues: VenueOpt[] }) {
  const [pending, start] = useTransition();
  const [mo, setMo] = useState(false);
  const [mk, setMk] = useState("");
  const [batDoi, setBatDoi] = useState(true);
  const [xacNhanXoa, setXacNhanXoa] = useState(false);

  return (
    <div className="border-t border-ivory-deep px-5 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink">
            {t.hoTen} {t.quanTri && <span className="chip ml-1 bg-brand text-white">Quản trị</span>}
            {t.laToi && <span className="chip ml-1 bg-ivory-deep text-ink-muted">bạn</span>}
          </div>
          <div className="text-xs text-ink-muted">
            <span className="font-mono">{t.username}</span>
            {t.ca ? ` · ${t.ca}` : ""}
          </div>
        </div>
        {t.vaiTro === "SALES" &&
          (quanTri ? (
            <select
              className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs text-ink-soft"
              value={t.venueId || ""}
              disabled={pending}
              onChange={(e) => start(async () => onKq(await datVenueTaiKhoan(t.id, e.target.value || null)))}
              aria-label="Venue của sales"
            >
              <option value="">Mọi venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.ten}
                </option>
              ))}
            </select>
          ) : (
            <span className="chip bg-ivory-deep text-ink-soft">{t.venueTen || "Mọi venue"}</span>
          ))}
        <span
          className={`chip ${!t.coMatKhau ? "bg-wine/10 text-wine" : t.doiMatKhau ? "bg-brand/15 text-brand-deep" : "bg-sage/10 text-sage"}`}
        >
          {!t.coMatKhau ? "Chưa có mật khẩu" : t.doiMatKhau ? "Phải đổi khi đăng nhập" : "Đang dùng"}
        </span>
        {quanTri && (
          <button className="btn-ghost btn-sm" onClick={() => { setMo((v) => !v); setXacNhanXoa(false); }}>
            {t.coMatKhau ? "Đặt lại mật khẩu" : "Đặt mật khẩu"}
          </button>
        )}
        {quanTri && !t.laToi &&
          (xacNhanXoa ? (
            <button
              className="rounded-full bg-wine px-3.5 py-1.5 text-xs text-white"
              disabled={pending}
              onClick={() => start(async () => onKq(await xoaTaiKhoan(t.id)))}
            >
              Bấm lần nữa để xóa
            </button>
          ) : (
            <button
              className="rounded-full border border-wine/30 px-3.5 py-1.5 text-xs text-wine hover:bg-wine/5"
              onClick={() => setXacNhanXoa(true)}
            >
              Xóa
            </button>
          ))}
      </div>
      {quanTri && mo && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-ivory/60 p-3">
          <input
            className="input max-w-[220px] py-2"
            type="text"
            placeholder="Mật khẩu mới, tối thiểu 8 ký tự"
            value={mk}
            onChange={(e) => setMk(e.target.value)}
          />
          <button type="button" className="btn-ghost btn-sm" onClick={() => setMk(matKhauNgauNhien())}>
            Ngẫu nhiên
          </button>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={batDoi} onChange={(e) => setBatDoi(e.target.checked)} />
            Bắt đổi ở lần đăng nhập đầu
          </label>
          <button
            className="btn-brand btn-sm"
            disabled={pending || mk.length < 8}
            onClick={() =>
              start(async () => {
                onKq(await datMatKhau(t.id, mk, batDoi));
                setMo(false);
                setMk("");
              })
            }
          >
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      )}
    </div>
  );
}

function MatKhauChung({ soChuaCo, onKq }: { soChuaCo: number; onKq: (k: KetQua) => void }) {
  const [pending, start] = useTransition();
  const [mk, setMk] = useState("");
  return (
    <div className="card border-brand/30 p-5">
      <div className="text-sm font-medium text-ink">{soChuaCo} tài khoản chưa có mật khẩu</div>
      <p className="mt-1 text-xs text-ink-muted">
        Tiện cho đợt dùng thử: đặt một mật khẩu chung cho tất cả tài khoản này, gửi cho mọi người. Trước sự kiện nên đặt lại riêng từng người.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-[240px] py-2"
          type="text"
          placeholder="Mật khẩu chung, tối thiểu 8 ký tự"
          value={mk}
          onChange={(e) => setMk(e.target.value)}
        />
        <button
          className="btn-ink btn-sm"
          disabled={pending || mk.length < 8}
          onClick={() => start(async () => { onKq(await datMatKhauChung(mk)); setMk(""); })}
        >
          {pending ? "Đang lưu..." : "Đặt cho tất cả"}
        </button>
      </div>
    </div>
  );
}

function FormThem({ venues, onKq, onXong }: { venues: VenueOpt[]; onKq: (k: KetQua) => void; onXong: () => void }) {
  const [pending, start] = useTransition();
  const [vaiTro, setVaiTro] = useState("SALES");
  const [hoTen, setHoTen] = useState("");
  const [username, setUsername] = useState("");
  const [sua, setSua] = useState(false);
  const [mk, setMk] = useState(() => matKhauNgauNhien());
  const gui = (fd: FormData) =>
    start(async () => {
      const r = await taoTaiKhoan({
        hoTen: chuanHoTen(hoTen),
        username,
        vaiTro,
        ca: String(fd.get("ca") || ""),
        venueId: String(fd.get("venueId") || ""),
        matKhau: mk,
        batDoi: fd.get("batDoi") === "on",
      });
      onKq(r.ok ? { ok: true, thongBao: `${r.thongBao} Mật khẩu tạm: ${mk}` } : r);
      if (r.ok) onXong();
    });
  return (
    <form action={gui} className="card space-y-4 p-6">
      <h2 className="font-display text-lg text-ink">Thêm tài khoản</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Họ tên</label>
          <input
            className="input"
            required
            placeholder="Phạm Lê Minh Thư"
            value={hoTen}
            onChange={(e) => {
              setHoTen(e.target.value);
              if (!sua) setUsername(tenDangNhapGoiY(e.target.value));
            }}
          />
          <p className="mt-1 text-xs text-ink-muted">Với sales: họ tên này phải trùng cột người phụ trách trong danh sách khách.</p>
        </div>
        <div>
          <label className="label">Tên đăng nhập</label>
          <input
            className="input font-mono"
            required
            autoCapitalize="none"
            placeholder="thuplm"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setSua(true); }}
          />
          <p className="mt-1 text-xs text-ink-muted">Tự đặt theo công thức: tên chính + chữ cái đầu của họ và tên đệm.</p>
        </div>
        <div>
          <label className="label">Vai trò</label>
          <select className="input" value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
            <option value="SALES">Sales</option>
            <option value="LE_TAN">Lễ tân</option>
            <option value="ADMIN">BTC</option>
          </select>
        </div>
        {vaiTro === "SALES" && (
          <div>
            <label className="label">Venue</label>
            <select name="venueId" className="input" defaultValue="">
              <option value="">Mọi venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.ten}
                </option>
              ))}
            </select>
          </div>
        )}
        {vaiTro === "LE_TAN" && (
          <div>
            <label className="label">Ca trực</label>
            <input name="ca" className="input" placeholder="Ca 1 (17h đến 19h)" />
          </div>
        )}
        <div>
          <label className="label">Mật khẩu tạm</label>
          <div className="flex gap-2">
            <input type="text" className="input font-mono" required minLength={8} value={mk} onChange={(e) => setMk(e.target.value)} />
            <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => setMk(matKhauNgauNhien())}>
              Ngẫu nhiên
            </button>
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm text-ink-soft">
            <input name="batDoi" type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
            Bắt đổi mật khẩu ở lần đăng nhập đầu
          </label>
        </div>
      </div>
      <button type="submit" className="btn-brand" disabled={pending}>
        {pending ? "Đang tạo..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}

// Tao nhieu tai khoan: dan danh sach ho ten, chon venue. Mat khau chi hien mot lan.
function FormNhieu({ venues }: { venues: VenueOpt[] }) {
  const [pending, start] = useTransition();
  const [vaiTro, setVaiTro] = useState("SALES");
  const [venueId, setVenueId] = useState("");
  const [danhSach, setDanhSach] = useState("");
  const [kq, setKq] = useState<{ ok: boolean; thongBao: string; ds: TaiKhoanMoi[] } | null>(null);
  const [daChep, setDaChep] = useState(false);
  const xem = [...new Set(danhSach.split(/\r?\n|,|;/).map(chuanHoTen).filter(Boolean))];
  const venueTen = venues.find((v) => v.id === venueId)?.ten;

  const chep = async () => {
    if (!kq) return;
    const link = typeof window !== "undefined" ? `${window.location.origin}/dang-nhap` : "";
    const noiDung = kq.ds
      .filter((d) => d.matKhau)
      .map((d) => `${d.hoTen}${venueTen ? ` (${venueTen})` : ""}\nTên đăng nhập: ${d.username}\nMật khẩu tạm: ${d.matKhau}`)
      .join("\n\n");
    const loi = `Tài khoản app khách mời Capella 20 năm: ${link}\nĐăng nhập lần đầu sẽ được yêu cầu đổi mật khẩu.\n\n${noiDung}`;
    try {
      await navigator.clipboard.writeText(loi);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch {
      window.prompt("Sao chép:", loi);
    }
  };

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="font-display text-lg text-ink">Tạo nhiều tài khoản</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Mỗi dòng một họ tên. Tên đăng nhập theo công thức tên chính + chữ cái đầu của họ và tên đệm (Phạm Lê Minh Thư thành thuplm).
          Mật khẩu tạm sinh ngẫu nhiên, người dùng phải đổi ở lần đăng nhập đầu.
        </p>
      </div>
      {!kq ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Vai trò</label>
              <select className="input" value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
                <option value="SALES">Sales</option>
                <option value="LE_TAN">Lễ tân</option>
              </select>
            </div>
            {vaiTro === "SALES" && (
              <div>
                <label className="label">Venue</label>
                <select className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                  <option value="">Mọi venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.ten}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">Danh sách họ tên</label>
            <textarea
              className="input min-h-[120px]"
              placeholder={"Phạm Lê Minh Thư\nĐỗ Tuấn Như Phượng\nNguyễn Minh Phượng"}
              value={danhSach}
              onChange={(e) => setDanhSach(e.target.value)}
            />
          </div>
          {xem.length > 0 && (
            <div className="rounded-xl bg-ivory/60 p-3 text-sm">
              <div className="text-xs text-ink-muted">Xem trước {xem.length} tài khoản</div>
              <ul className="mt-1.5 space-y-0.5">
                {xem.map((t) => (
                  <li key={t} className="text-ink-soft">
                    {t} <span className="text-ink-muted">→</span> <span className="font-mono text-ink">{tenDangNhapGoiY(t) || "?"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="btn-brand"
            disabled={pending || xem.length === 0}
            onClick={() =>
              start(async () => setKq(await taoNhieuTaiKhoan({ danhSach, vaiTro, venueId: vaiTro === "SALES" ? venueId : undefined })))
            }
          >
            {pending ? "Đang tạo..." : `Tạo ${xem.length} tài khoản${venueTen && vaiTro === "SALES" ? ` cho ${venueTen}` : ""}`}
          </button>
        </>
      ) : (
        <>
          <div className={`rounded-xl px-4 py-3 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>
            {kq.thongBao} Mật khẩu tạm chỉ hiện một lần, hãy chép và gửi riêng cho từng người ngay bây giờ.
          </div>
          <div className="overflow-x-auto rounded-xl border border-ivory-deep">
            <table className="w-full text-sm">
              <thead className="bg-ivory/70 text-left text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Họ tên</th>
                  <th className="px-3 py-2 font-medium">Tên đăng nhập</th>
                  <th className="px-3 py-2 font-medium">Mật khẩu tạm</th>
                </tr>
              </thead>
              <tbody>
                {kq.ds.map((d) => (
                  <tr key={d.hoTen} className="border-t border-ivory-deep">
                    <td className="px-3 py-2 text-ink">{d.hoTen}</td>
                    <td className="px-3 py-2 font-mono text-ink">{d.username || "-"}</td>
                    <td className="px-3 py-2 font-mono text-ink">{d.matKhau || <span className="font-sans text-xs text-wine">{d.ghiChu}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-brand" onClick={chep}>
              {daChep ? "Đã chép" : "Chép tất cả để gửi"}
            </button>
            <button className="btn-ghost" onClick={() => { setKq(null); setDanhSach(""); }}>
              Tạo thêm
            </button>
          </div>
        </>
      )}
    </div>
  );
}
