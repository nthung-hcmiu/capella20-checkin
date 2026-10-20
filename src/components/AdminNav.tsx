"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MUC = [
  { href: "/admin", ten: "Bang dieu khien" },
  { href: "/admin/khach", ten: "Danh sach khach" },
  { href: "/admin/duyet", ten: "Cho duyet" },
  { href: "/admin/quota", ten: "Quota venue" },
  { href: "/admin/xepban", ten: "Xep ban" },
];

export function AdminNav({ soCho }: { soCho: number }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {MUC.map((m) => {
        const active = m.href === "/admin" ? path === "/admin" : path.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`chip relative px-3.5 py-2 ${
              active ? "bg-ink text-ivory" : "bg-white text-ink-soft hover:bg-ivory-deep"
            }`}
          >
            {m.ten}
            {m.href === "/admin/duyet" && soCho > 0 && (
              <span className="ml-1.5 rounded-full bg-gold px-1.5 text-[10px] text-white">{soCho}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
