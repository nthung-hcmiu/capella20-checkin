"use client";

import { useState, useTransition } from "react";
import { NHAN_VAI_TRO } from "@/lib/constants";
import { taoTaiKhoan, datMatKhau, datMatKhauChung, xoaTaiKhoan, type KetQua } from "@/lib/actions";

export interface TaiKhoanRow {
  id: string;
  username: string;
  hoTen: string;
  vaiTro: string;
  ca: string | null;
  coMatKhau: boolean;
  doiMatKhau: boolean;
  laToi: boolean;
}

const THU_TU = ["ADMIN", "SALES", "LE_TAN"];

export function AccountManager({ ds }: { ds: TaiKhoanRow[] }) {
  const [kq, setKq] = useState<KetQua | null>(null);
  const [moForm, setMoForm] = useState(false);
  const soChuaCo = ds.filter((d) => !d.coMatKhau).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Tài khoản</h1>
          <p className="mt-1 text-sm text-ink-muted">
            BTC vào mọi phân hệ. Sales chỉ thấy khách mang đúng họ tên của mình. Lễ tân chỉ vào app check in.
          </p>
        </div>
        <button className="btn-gold" onClick={() => setMoForm((v) => !v)}>
          {moForm ? "Đóng" : "+ Thêm tài khoản"}
        </button>
      </div>

      {kq && (
        <div className={`rounded-xl px-4 py-3 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.thongBao}</div>
      )}

      {moForm && <FormThem onKq={setKq} onXong={() => setMoForm(false)} />}

      {soChuaCo > 0 && <MatKhauChung soChuaCo={soChuaCo} onKq={setKq} />}

      {THU_TU.map((vt) => {
        const nhom = ds.filter((d) => d.vaiTro === vt).sort((a, b) => a.hoTen.localeCompare(b.hoTen, "vi", { numeric: true }));
        if (nhom.length === 0) return null;
        return (
          <div key={vt} className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-display text-base text-ink">{NHAN_VAI_TRO[vt]}</h2>
              <span className="text-xs text-ink-muted">{nhom.length} tài khoản</span>
            </div>
            <div className="hairline" />
            {nhom.map((t) => (
              <Dong key={t.id} t={t} onKq={setKq} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Dong({ t, onKq }: { t: TaiKhoanRow; onKq: (k: KetQua) => void }) {
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
            {t.hoTen} {t.laToi && <span className="chip ml-1 bg-ivory-deep text-ink-muted">bạn</span>}
          </div>
          <div className="text-xs text-ink-muted">
            <span className="font-mono">{t.username}</span>
            {t.ca ? ` · ${t.ca}` : ""}
          </div>
        </div>
        <span
          className={`chip ${!t.coMatKhau ? "bg-wine/10 text-wine" : t.doiMatKhau ? "bg-gold/15 text-gold-deep" : "bg-sage/10 text-sage"}`}
        >
          {!t.coMatKhau ? "Chưa có mật khẩu" : t.doiMatKhau ? "Phải đổi khi đăng nhập" : "Đang dùng"}
        </span>
        <button className="btn-ghost btn-sm" onClick={() => { setMo((v) => !v); setXacNhanXoa(false); }}>
          {t.coMatKhau ? "Đặt lại mật khẩu" : "Đặt mật khẩu"}
        </button>
        {!t.laToi &&
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
      {mo && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-ivory/60 p-3">
          <input
            className="input max-w-[220px] py-2"
            type="text"
            placeholder="Mật khẩu mới, tối thiểu 8 ký tự"
            value={mk}
            onChange={(e) => setMk(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" className="h-4 w-4 accent-gold" checked={batDoi} onChange={(e) => setBatDoi(e.target.checked)} />
            Bắt đổi ở lần đăng nhập đầu
          </label>
          <button
            className="btn-gold btn-sm"
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
    <div className="card border-gold/30 p-5">
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

function FormThem({ onKq, onXong }: { onKq: (k: KetQua) => void; onXong: () => void }) {
  const [pending, start] = useTransition();
  const [vaiTro, setVaiTro] = useState("SALES");
  const gui = (fd: FormData) =>
    start(async () => {
      const r = await taoTaiKhoan({
        hoTen: String(fd.get("hoTen") || ""),
        username: String(fd.get("username") || ""),
        vaiTro,
        ca: String(fd.get("ca") || ""),
        matKhau: String(fd.get("matKhau") || ""),
        batDoi: fd.get("batDoi") === "on",
      });
      onKq(r);
      if (r.ok) onXong();
    });
  return (
    <form action={gui} className="card space-y-4 p-6">
      <h2 className="font-display text-lg text-ink">Thêm tài khoản</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Họ tên</label>
          <input name="hoTen" className="input" required placeholder="Nguyễn Thu Hà" />
          <p className="mt-1 text-xs text-ink-muted">Với sales: họ tên này phải trùng cột Sales trong danh sách khách.</p>
        </div>
        <div>
          <label className="label">Tên đăng nhập</label>
          <input name="username" className="input" required autoCapitalize="none" placeholder="thuha" />
        </div>
        <div>
          <label className="label">Vai trò</label>
          <select className="input" value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
            <option value="SALES">Sales</option>
            <option value="LE_TAN">Lễ tân</option>
            <option value="ADMIN">BTC</option>
          </select>
        </div>
        {vaiTro === "LE_TAN" && (
          <div>
            <label className="label">Ca trực</label>
            <input name="ca" className="input" placeholder="Ca 1 (17h đến 19h)" />
          </div>
        )}
        <div>
          <label className="label">Mật khẩu tạm</label>
          <input name="matKhau" type="text" className="input" required minLength={8} placeholder="Tối thiểu 8 ký tự" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm text-ink-soft">
            <input name="batDoi" type="checkbox" defaultChecked className="h-4 w-4 accent-gold" />
            Bắt đổi mật khẩu ở lần đăng nhập đầu
          </label>
        </div>
      </div>
      <button type="submit" className="btn-gold" disabled={pending}>
        {pending ? "Đang tạo..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}
