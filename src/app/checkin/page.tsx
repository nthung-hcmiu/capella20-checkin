import Link from "next/link";
import { prisma } from "@/lib/db";
import { CheckinApp } from "@/components/CheckinApp";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const leTans = await prisma.staffUser.findMany({
    where: { vaiTro: "LE_TAN" },
    select: { hoTen: true, ca: true },
    orderBy: { hoTen: "asc" },
  });

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-sm tracking-[0.2em] text-ink">
            CAPELLA <span className="text-gold">20</span>
          </Link>
          <span className="text-xs text-ink-muted">App check in</span>
        </div>
      </header>
      <CheckinApp leTans={leTans.map((l) => `${l.hoTen}${l.ca ? ` (${l.ca})` : ""}`)} />
    </div>
  );
}
