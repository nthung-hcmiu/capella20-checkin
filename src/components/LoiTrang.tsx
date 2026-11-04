"use client";

import { useEffect } from "react";

// Loi do trang cu sau khi app vua cap nhat (file JS hoac server action da doi): tu tai lai mot lan
function laLoiPhienBanCu(e: Error): boolean {
  const s = `${e?.name || ""} ${e?.message || ""}`;
  return /ChunkLoadError|Loading chunk|Failed to find Server Action|unexpected response was received from the server|Failed to fetch dynamically imported module/i.test(s);
}

export function LoiTrang({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!laLoiPhienBanCu(error)) return;
    try {
      // Chi tu tai lai mot lan moi phut de khong lap vo han
      const lan = Number(sessionStorage.getItem("c20_taiLai") || 0);
      if (Date.now() - lan > 60_000) {
        sessionStorage.setItem("c20_taiLai", String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* khong co sessionStorage thi de nguoi dung tu bam */
    }
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-5">
      <div className="card max-w-md p-7 text-center">
        <div className="font-display text-xl text-ink">Trang gặp lỗi khi tải</div>
        <p className="mt-2 text-sm text-ink-muted">
          Thường do app vừa cập nhật hoặc trình duyệt đang tự dịch trang. Hãy tắt dịch trang (nếu có) rồi bấm tải lại.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-brand" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
          <button className="btn-ghost" onClick={() => reset()}>
            Thử lại
          </button>
        </div>
        {error?.digest && <p className="mt-4 text-[11px] text-ink-muted">Mã lỗi: {error.digest}</p>}
      </div>
    </main>
  );
}
