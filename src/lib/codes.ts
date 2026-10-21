// Sinh ma bi mat, cap so thu tu, va dung/doc noi dung QR

import { prisma } from "./db";

// Bo ky tu de nham: 0 O 1 I L
const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function sinhMaBiMat(doDai = 8): string {
  let s = "";
  for (let i = 0; i < doDai; i++) {
    s += BANG_MA[Math.floor(Math.random() * BANG_MA.length)];
  }
  return s;
}

// Sinh ma bi mat chac chan chua ton tai
export async function sinhMaBiMatDuyNhat(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const ma = sinhMaBiMat(8);
    const trung = await prisma.guest.findUnique({ where: { maBiMat: ma } });
    if (!trung) return ma;
  }
  throw new Error("Khong sinh duoc ma bi mat duy nhat");
}

// Cap so thu tu tiep theo con trong trong dai cua venue
export async function capSoThuTu(venueId: string): Promise<number> {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) throw new Error("Khong tim thay venue");

  const daDung = await prisma.guest.findMany({
    where: { venueId, soThuTu: { gte: venue.rangeStart, lte: venue.rangeEnd } },
    select: { soThuTu: true },
    orderBy: { soThuTu: "asc" },
  });
  const tapDaDung = new Set(daDung.map((g) => g.soThuTu));

  for (let n = venue.rangeStart; n <= venue.rangeEnd; n++) {
    if (!tapDaDung.has(n)) return n;
  }
  throw new Error(`Het so thu tu cho dai ${venue.rangeStart}-${venue.rangeEnd}`);
}

// Noi dung QR: URL dieu huong theo ngu canh
export function urlQR(maBiMat: string, baseUrl?: string): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const base =
    baseUrl || process.env.NEXT_PUBLIC_BASE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return `${base}/q/${maBiMat}`;
}

// Doc ma bi mat tu chuoi quet duoc (URL day du hoac ma tho)
export function docMaTuQR(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // URL dang .../q/MA hoac .../thiep/MA
  const khop = s.match(/\/(?:q|thiep)\/([A-Z0-9]{6,12})/i);
  if (khop) return khop[1].toUpperCase();
  // Ma tho 8 ky tu
  if (/^[A-Z0-9]{6,12}$/i.test(s)) return s.toUpperCase();
  return null;
}
