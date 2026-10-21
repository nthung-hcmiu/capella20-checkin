import Link from "next/link";
import { yeuCauTrang } from "@/lib/auth";
import { CheckinApp } from "@/components/CheckinApp";
import { UserBar } from "@/components/UserBar";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const u = await yeuCauTrang(["LE_TAN", "ADMIN"], "/checkin");

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/checkin" className="font-display text-sm tracking-[0.2em] text-ink">
            CAPELLA <span className="text-gold">20</span>
          </Link>
          <UserBar u={u} />
        </div>
      </header>
      <CheckinApp ten={u.hoTen} ca={u.ca} />
    </div>
  );
}
