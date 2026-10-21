import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { FormDoiMatKhau } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function DoiMatKhauPage() {
  const u = await layNguoiDung();
  if (!u) redirect("/dang-nhap");
  return (
    <AuthShell
      tieuDe="Đổi mật khẩu"
      moTa={u.doiMatKhau ? `Chào ${u.hoTen}, bạn cần đặt mật khẩu riêng trước khi bắt đầu.` : `Tài khoản ${u.username}`}
    >
      <FormDoiMatKhau />
    </AuthShell>
  );
}
