import Link from "next/link";
import { dangXuat } from "@/lib/authActions";
import { NHAN_VAI_TRO } from "@/lib/constants";
import type { NguoiDung } from "@/lib/auth";

// Ten nguoi dang nhap, vai tro va nut dang xuat; BTC co them loi tat sang cac phan he khac
export function UserBar({ u, light }: { u: NguoiDung; light?: boolean }) {
  const mau = light ? "text-ivory/80" : "text-ink-muted";
  return (
    <div className={`flex items-center gap-2 text-xs ${mau}`}>
      <span className="hidden sm:inline">
        <span className={light ? "text-ivory" : "text-ink"}>{u.hoTen}</span> · {u.quanTri ? "Quản trị" : NHAN_VAI_TRO[u.vaiTro] || u.vaiTro}{u.venueTen ? ` ${u.venueTen}` : ""}
      </span>
      {u.vaiTro === "ADMIN" && (
        <Link href="/" className={light ? "rounded-full border border-ivory/30 px-3 py-1.5 hover:bg-ivory/10" : "btn-ghost btn-sm"}>
          Trang chủ
        </Link>
      )}
      <Link href="/huong-dan" title="Hướng dẫn sử dụng" className={light ? "rounded-full border border-ivory/30 px-3 py-1.5 hover:bg-ivory/10" : "btn-ghost btn-sm"}>
        <span className="sm:hidden">?</span>
        <span className="hidden sm:inline">Hướng dẫn</span>
      </Link>
      <Link href="/doi-mat-khau" className={`hidden sm:inline-flex ${light ? "rounded-full border border-ivory/30 px-3 py-1.5 hover:bg-ivory/10" : "btn-ghost btn-sm"}`}>
        Đổi mật khẩu
      </Link>
      <form action={dangXuat}>
        <button className={light ? "rounded-full border border-ivory/30 px-3 py-1.5 hover:bg-ivory/10" : "btn-ghost btn-sm"}>
          Đăng xuất
        </button>
      </form>
    </div>
  );
}
