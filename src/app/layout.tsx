import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "Capella 20 năm | Hệ thống khách mời",
  description: "Quản lý khách mời, phát hành thiệp, xác nhận và check in cho đêm tri ân 20 năm Capella.",
  // Chan Chrome tu dich trang: dich tu dong sua chu tren trang lam React bi sap
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" translate="no" className="notranslate">
      <body>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
