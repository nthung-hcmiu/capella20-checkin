import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { layNguoiDung } from "@/lib/auth";
import { coTaiKhoanBTC } from "@/lib/caiDat";
import { TRANG_CHINH } from "@/lib/constants";
import { AuthShell } from "@/components/AuthShell";
import { FormDangNhap, FormKhoiTao } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function DangNhapPage({ searchParams }: { searchParams: { tiep?: string; khoiTao?: string } }) {
  const u = await layNguoiDung();
  if (u) redirect(u.doiMatKhau ? "/doi-mat-khau" : TRANG_CHINH[u.vaiTro] || "/");

  const daCoBTC = await coTaiKhoanBTC(prisma);
  if (!daCoBTC && searchParams.khoiTao === "1") {
    return (
      <AuthShell tieuDe="Khởi tạo tài khoản BTC" moTa="Chỉ làm một lần khi hệ thống mới được dựng.">
        <FormKhoiTao />
        <a href="/dang-nhap" className="mt-4 block text-center text-xs text-ink-muted underline">
          Quay lại đăng nhập
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell tieuDe="Đăng nhập" moTa="Dành cho BTC, sales và lễ tân.">
      <FormDangNhap tiep={searchParams.tiep} />
      {!daCoBTC && (
        <div className="mt-5 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4 text-sm text-gold-deep">
          Hệ thống chưa có tài khoản BTC.{" "}
          <a href="/dang-nhap?khoiTao=1" className="font-medium underline">
            Khởi tạo tài khoản BTC
          </a>
        </div>
      )}
      <p className="mt-5 text-center text-xs text-ink-muted">Quên mật khẩu? Liên hệ BTC để được đặt lại.</p>
    </AuthShell>
  );
}
