"use client";

import "./globals.css";
import { LoiTrang } from "@/components/LoiTrang";

// Loi o layout goc: phai tu dung the html, body
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi" translate="no" className="notranslate">
      <body>
        <LoiTrang error={error} reset={reset} />
      </body>
    </html>
  );
}
