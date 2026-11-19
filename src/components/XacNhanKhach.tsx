"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { khachTraLoi } from "@/lib/khachActions";
import css from "./thiepDong.module.css";

// Khach tu xac nhan tham du tren trang thiep. traLoi: cau tra loi dang ghi nhan cua nguoi nay (null la chua co).
export function XacNhanKhach({ ma, k, traLoi }: { ma: string; k: number | null; traLoi: "+" | "-" | null }) {
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
      <div>
        <div className={css.xnTieuDe}>{traLoi === "+" ? "Quý khách đã xác nhận tham dự" : "Quý khách không tham dự được"}</div>
        <p className={css.xnPhu}>
          {traLoi === "+" ? "Capella hân hạnh đón Quý khách ngày 03.12.2026." : "Capella đã ghi nhận. Rất tiếc vì chưa được đón Quý khách lần này."}
        </p>
        <button className={css.nutChu} onClick={() => setDoi(true)}>
          Thay đổi câu trả lời
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={css.xnTieuDe}>Quý khách có tham dự không?</div>
      <p className={css.xnPhu}>Vui lòng xác nhận để Capella đón tiếp Quý khách chu đáo.</p>
      <div className={css.nutCot}>
        <button className={css.nutVang} disabled={pending} onClick={() => gui(true)}>
          Tôi sẽ tham dự
        </button>
        <button className={css.nutVien} disabled={pending} onClick={() => gui(false)}>
          Tôi không tham dự được
        </button>
      </div>
      {traLoi && (
        <button className={css.nutChu} disabled={pending} onClick={() => setDoi(false)}>
          Giữ câu trả lời cũ
        </button>
      )}
      {loi && <p className={css.loiBao}>{loi}</p>}
    </div>
  );
}
