"use client";

import { useEffect, useState } from "react";
import { LAUNCH } from "@/lib/constants";

const MOC = new Date(LAUNCH.luc).getTime();

// Thanh thong bao giai doan demo, tu an tu ngay launch
export function DemoBanner() {
  const [hien, setHien] = useState(Date.now() < MOC);
  useEffect(() => {
    setHien(Date.now() < MOC);
  }, []);
  if (!hien) return null;
  return (
    <div className="bg-wine px-4 py-2 text-center text-xs leading-relaxed text-white print:hidden sm:text-sm">
      <b className="font-semibold">Bản demo.</b> App đang chạy thử bằng dữ liệu mẫu. Chính thức launch cho các team dùng từ ngày{" "}
      <b className="font-semibold">{LAUNCH.ngay}</b>.
    </div>
  );
}
