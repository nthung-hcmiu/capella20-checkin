"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { khachTraLoi } from "@/lib/khachActions";

// Khach tu xac nhan tham du tren trang thiep. traLoi: cau tra loi dang ghi nhan cua nguoi nay (null la chua co).
export function XacNhanKhach({ ma, k, traLoi, ngay }: { ma: string; k: number | null; traLoi: "+" | "-" | null; ngay: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [doi, setDoi] = useState(false);
  const [loi, setLoi] = useState("");

  const gui = (thamDu: boolean) =>
    start(async () => {
      setLoi("");
      try {
        const r = await khachTraLoi(ma, k, thamDu);
        if (!r.ok) setLoi(r.thongBao);
        else setDoi(false);
        router.refresh();
      } catch {
        setLoi("Chưa gửi được, quý khách vui lòng thử lại.");
      }
    });

  if (traLoi && !doi) {
    return (
      <div className="card mt-4 p-6 text-center">
        <div className="font-display text-lg text-ink">{traLoi === "+" ? "Quý khách đã xác nhận tham dự" : "Quý khách không tham dự được"}</div>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
          {traLoi === "+" ? `Capella hân hạnh đón quý khách ngày ${ngay}.` : "Capella đã ghi nhận. Rất tiếc vì chưa được đón quý khách lần này."}
        </p>
        <button className="btn-ghost btn-sm mt-3" onClick={() => setDoi(true)}>
          Thay đổi câu trả lời
        </button>
      </div>
    );
  }

  return (
    <div className="card mt-4 p-6 text-center">
      <div className="font-display text-lg text-ink">Quý khách có tham dự không?</div>
      <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">Vui lòng xác nhận để Capella đón tiếp quý khách chu đáo.</p>
      <div className="mt-4 flex flex-col gap-2">
        <button className="btn-brand w-full justify-center" disabled={pending} onClick={() => gui(true)}>
          Tôi sẽ tham dự
        </button>
        <button className="btn-ghost w-full justify-center" disabled={pending} onClick={() => gui(false)}>
          Tôi không tham dự được
        </button>
      </div>
      {traLoi && (
        <button className="mt-3 text-xs text-ink-muted underline" disabled={pending} onClick={() => setDoi(false)}>
          Giữ câu trả lời cũ
        </button>
      )}
      {loi && <p className="mt-3 text-xs text-wine">{loi}</p>}
    </div>
  );
}
