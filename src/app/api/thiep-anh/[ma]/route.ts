import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CHUA_PHAT_HANH, TRANG_THAI } from "@/lib/constants";
import { urlQR } from "@/lib/codes";
import { khachDiKemThu, tenGoi } from "@/lib/khach";
import { veThiep } from "@/lib/thiepAnh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Thiep moi dang file hinh (ti le 9:20) theo mau cua designer, ghi ten, chuc vu, cong ty va ma QR cua tung khach.
// Ai co ma bi mat cua thiep thi xem duoc, giong trang /thiep/MA (khach mo tu link hoac quet QR).
// ?k=2: thiep rieng cua khach di kem, ghi ten nguoi do va ma QR rieng.
// ?tai=1: tra ve dang file tai xuong (nut Tai thiep cua sales va BTC); chi thiep da duyet moi tai duoc.
export async function GET(req: NextRequest, { params }: { params: { ma: string } }) {
  const guest = await prisma.guest.findUnique({ where: { maBiMat: params.ma.toUpperCase() } });
  if (!guest || guest.trangThai === TRANG_THAI.DA_HUY) return new NextResponse("Không tìm thấy thiệp.", { status: 404 });

  const tai = req.nextUrl.searchParams.get("tai") === "1";
  if (tai && CHUA_PHAT_HANH.includes(guest.trangThai)) {
    return new NextResponse("Thiệp chưa được duyệt, chưa tải thiệp được.", { status: 409 });
  }

  const kXin = parseInt(req.nextUrl.searchParams.get("k") || "", 10);
  const diKem = khachDiKemThu(guest, kXin);
  const k = diKem ? kXin : null;

  const anh = await veThiep({
    ten: diKem ? tenGoi({ danhXung: diKem.danhXung || null, hoTen: diKem.hoTen }) : tenGoi(guest),
    chucVu: diKem ? diKem.chucVu : guest.chucVu,
    congTy: guest.congTy,
    noiDungQR: urlQR(guest.maBiMat, undefined, k),
  });

  const tenFile = `thiep-capella20-${guest.soThuTu}${k ? `-khach-${k}` : ""}.jpg`;
  // Khong luu dem vi thong tin khach co the doi
  return new NextResponse(new Uint8Array(anh), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `${tai ? "attachment" : "inline"}; filename="${tenFile}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
