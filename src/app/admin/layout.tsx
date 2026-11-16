import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AdminNav } from "@/components/AdminNav";
import { UserBar } from "@/components/UserBar";
import { prisma } from "@/lib/db";
import { TRANG_THAI } from "@/lib/constants";
import { locPhamVi, yeuCauTrang } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await yeuCauTrang(["ADMIN"], "/admin");
  const soCho = await prisma.guest.count({ where: { trangThai: TRANG_THAI.CHO_DUYET, ...locPhamVi(u) } });
  const venuePhamVi = u.phamVi
    ? await prisma.venue.findMany({ where: { id: { in: u.phamVi } }, orderBy: { thuTu: "asc" }, select: { ten: true } })
    : [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ivory-deep bg-ivory/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin">
              <Brand sub="Quản trị BTC" />
            </Link>
            <UserBar u={u} />
          </div>
          <div className="mt-3">
            <AdminNav soCho={soCho} quanTri={u.quanTri} />
          </div>
          {u.phamVi && (
            <p className="mt-2 text-xs text-ink-muted">
              Phạm vi của bạn: duyệt và sửa khách của <span className="text-ink">{venuePhamVi.map((v) => v.ten).join(", ")}</span>
              {u.phamViXem ? ". Danh sách và số liệu chỉ hiện các venue này." : ". Vẫn xem được danh sách và số liệu mọi venue."}
            </p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
    </div>
  );
}
