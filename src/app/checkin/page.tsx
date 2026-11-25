import Link from "next/link";
import { Brand } from "@/components/Brand";
import { yeuCauTrang } from "@/lib/auth";
import { DUOC_CHECKIN, DUOC_GIAM_SAT } from "@/lib/constants";
import { CheckinApp } from "@/components/CheckinApp";
import { UserBar } from "@/components/UserBar";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const u = await yeuCauTrang(DUOC_CHECKIN, "/checkin");

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/checkin">
            <Brand />
          </Link>
          <UserBar u={u} />
        </div>
      </header>
      {DUOC_GIAM_SAT.includes(u.vaiTro) && (
        <div className="mx-auto max-w-md px-4 pt-3">
          <Link href="/giam-sat" className="btn-ghost btn-sm">
            ← Giám sát check in
          </Link>
        </div>
      )}
      <CheckinApp ten={u.hoTen} ca={u.ca} />
    </div>
  );
}
