import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SalesNav } from "@/components/SalesNav";
import { UserBar } from "@/components/UserBar";
import { yeuCauTrang } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dien thoai: khung hep, the khach. May tinh: khung rong, bang khach.
export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/sales");
  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto max-w-md px-4 py-3 lg:max-w-6xl lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/sales">
              <Brand sub="Cổng Sales" />
            </Link>
            <UserBar u={u} />
          </div>
          <div className="mt-3">
            <SalesNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5 lg:max-w-6xl lg:px-5 lg:py-7">{children}</main>
    </div>
  );
}
