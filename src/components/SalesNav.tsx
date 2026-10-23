"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MUC = [
  { href: "/sales/tong-quan", ten: "Tổng quan" },
  { href: "/sales", ten: "Khách của tôi" },
  { href: "/sales/nhap", ten: "Nhập danh sách" },
];

export function SalesNav() {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      {MUC.map((m) => {
        const active = m.href === "/sales" ? path === "/sales" : path.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`chip shrink-0 px-3.5 py-2 ${active ? "bg-ink text-ivory" : "bg-white text-ink-soft hover:bg-ivory-deep"}`}
          >
            {m.ten}
          </Link>
        );
      })}
    </nav>
  );
}
