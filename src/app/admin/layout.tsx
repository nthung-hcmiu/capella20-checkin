import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { TRANG_THAI } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const soCho = await prisma.guest.count({ where: { trangThai: TRANG_THAI.CHO_DUYET } });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ivory-deep bg-ivory/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-3">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Brand sub="Quan tri BTC" />
            </Link>
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="hidden sm:inline">Quan tri BTC</span>
              <Link href="/" className="btn-ghost btn-sm">
                Trang chu
              </Link>
            </div>
          </div>
          <div className="mt-3">
            <AdminNav soCho={soCho} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
    </div>
  );
}
