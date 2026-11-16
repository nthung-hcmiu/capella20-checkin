import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { urlQR } from "@/lib/codes";

// Tra ve anh PNG chua QR dieu huong toi trang thiep / check in
export async function GET(req: NextRequest, { params }: { params: { ma: string } }) {
  const k = parseInt(req.nextUrl.searchParams.get("k") || "", 10);
  const noiDung = urlQR(params.ma, undefined, k >= 2 && k <= 10 ? k : null);
  const png = await QRCode.toBuffer(noiDung, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
    color: { dark: "#1a1613", light: "#ffffff" },
  });
  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
