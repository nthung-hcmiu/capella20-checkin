"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MUC = [
  { href: "/admin", ten: "Bảng điều khiển" },
  { href: "/admin/khach", ten: "Danh sách khách" },
  { href: "/admin/nhap", ten: "Nhập danh sách" },
  { href: "/admin/duyet", ten: "Chờ duyệt" },
  { href: "/admin/quota", ten: "Quota venue" },
  { href: "/admin/tai-khoan", ten: "Tài khoản" },
  { href: "/admin/du-lieu", ten: "Dữ liệu", quanTri: true },
];

export function AdminNav({ soCho, quanTri }: { soCho: number; quanTri: boolean }) {
  const path = usePathname();
  return (
    <nav className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
      {MUC.filter((m) => quanTri || !m.quanTri).map((m) => {
        const active = m.href === "/admin" ? path === "/admin" : path.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`chip shrink-0 px-3.5 py-2 ${active ? "bg-ink text-ivory" : "bg-white text-ink-soft hover:bg-ivory-deep"}`}
          >
            {m.ten}
            {m.href === "/admin/duyet" && soCho > 0 && (
              <span className="ml-1.5 rounded-full bg-brand px-1.5 text-[10px] text-white">{soCho}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
