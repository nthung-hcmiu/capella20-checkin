"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tu tai lai so lieu cua trang (khong tai lai ca trang) moi vai giay, tam dung khi tab bi an
export function TuLamMoi({ giay = 10 }: { giay?: number }) {
  const router = useRouter();
  const [bat, setBat] = useState(true);
  const [luc, setLuc] = useState<string>("");

  useEffect(() => {
    const ghi = () => setLuc(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }));
    ghi();
    if (!bat) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      router.refresh();
      ghi();
    }, giay * 1000);
    return () => clearInterval(t);
  }, [bat, giay, router]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
      <span className={`inline-block h-2 w-2 rounded-full ${bat ? "animate-pulse bg-sage" : "bg-ink/25"}`} />
      <span>{bat ? `Tự cập nhật mỗi ${giay} giây` : "Đang tạm dừng cập nhật"}{luc ? ` · lúc ${luc}` : ""}</span>
      <button className="btn-ghost btn-sm" onClick={() => setBat((v) => !v)}>
        {bat ? "Tạm dừng" : "Bật lại"}
      </button>
      <button
        className="btn-ghost btn-sm"
        onClick={() => {
          router.refresh();
          setLuc(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }));
        }}
      >
        Cập nhật ngay
      </button>
    </div>
  );
}
