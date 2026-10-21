"use client";

import { useFormState, useFormStatus } from "react-dom";
import { dangNhap, doiMatKhau, khoiTaoBTC, type TrangThaiForm } from "@/lib/authActions";

function NutGui({ chu, chuDang }: { chu: string; chuDang: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-gold w-full" disabled={pending}>
      {pending ? chuDang : chu}
    </button>
  );
}

function Loi({ s }: { s: TrangThaiForm }) {
  if (!s.loi) return null;
  return <div className="rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">{s.loi}</div>;
}

export function FormDangNhap({ tiep }: { tiep?: string }) {
  const [s, action] = useFormState(dangNhap, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tiep" value={tiep || ""} />
      <div>
        <label className="label">Tên đăng nhập</label>
        <input name="username" className="input" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label">Mật khẩu</label>
        <input name="matKhau" type="password" className="input" autoComplete="current-password" required />
      </div>
      <Loi s={s} />
      <NutGui chu="Đăng nhập" chuDang="Đang đăng nhập..." />
    </form>
  );
}

export function FormKhoiTao() {
  const [s, action] = useFormState(khoiTaoBTC, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Mã khởi tạo</label>
        <input name="maKhoiTao" className="input font-mono uppercase tracking-widest" autoCapitalize="characters" required />
        <p className="mt-1.5 text-xs text-ink-muted">
          Vercel &gt; project capella20-checkin &gt; Deployments &gt; bản mới nhất &gt; Build Logs, tìm dòng
          “Ma khoi tao tai khoan BTC”.
        </p>
      </div>
      <div>
        <label className="label">Họ tên</label>
        <input name="hoTen" className="input" required />
      </div>
      <div>
        <label className="label">Tên đăng nhập</label>
        <input name="username" className="input" autoCapitalize="none" placeholder="vd: btc.hung" required />
      </div>
      <div>
        <label className="label">Mật khẩu (tối thiểu 8 ký tự)</label>
        <input name="matKhau" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <Loi s={s} />
      <NutGui chu="Tạo tài khoản BTC" chuDang="Đang tạo..." />
    </form>
  );
}

export function FormDoiMatKhau() {
  const [s, action] = useFormState(doiMatKhau, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Mật khẩu hiện tại</label>
        <input name="matKhauCu" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label">Mật khẩu mới (tối thiểu 8 ký tự)</label>
        <input name="matKhauMoi" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="label">Nhập lại mật khẩu mới</label>
        <input name="nhapLai" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <Loi s={s} />
      <NutGui chu="Lưu mật khẩu mới" chuDang="Đang lưu..." />
    </form>
  );
}
