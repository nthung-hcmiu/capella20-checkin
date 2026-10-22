import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { AccountManager } from "@/components/AccountManager";

export const dynamic = "force-dynamic";

export default async function TaiKhoanPage() {
  const u = await yeuCauTrang(["ADMIN"], "/admin/tai-khoan");
  const ds = await prisma.staffUser.findMany({ orderBy: [{ vaiTro: "asc" }, { hoTen: "asc" }] });
  return (
    <AccountManager
      quanTri={u.quanTri}
      ds={ds.map((t) => ({
        id: t.id,
        username: t.username,
        hoTen: t.hoTen,
        vaiTro: t.vaiTro,
        quanTri: t.vaiTro === "ADMIN" && t.quanTri,
        ca: t.ca,
        coMatKhau: t.matKhau.startsWith("scrypt$"),
        doiMatKhau: t.doiMatKhau,
        laToi: t.id === u.id,
      }))}
    />
  );
}
