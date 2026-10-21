import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { docMaTuQR } from "@/lib/codes";
import { boDau } from "@/lib/format";
import { yeuCauQuyen } from "@/lib/auth";

// Tra cuu khach cho app check in: theo ma QR, so thu tu, ten hoac SDT
export async function GET(req: NextRequest) {
  if (!(await yeuCauQuyen(["LE_TAN", "ADMIN"]))) {
    return NextResponse.json({ ket_qua: [], loi: "Phiên đăng nhập đã hết, hãy đăng nhập lại" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ket_qua: [] });

  // 1. Thu doc nhu ma QR
  const ma = docMaTuQR(q);
  if (ma) {
    const g = await prisma.guest.findUnique({ where: { maBiMat: ma }, include: { venue: true } });
    if (g) return NextResponse.json({ ket_qua: [guiGon(g)], nguon: "qr" });
  }

  // 2. So thu tu (chi gom chu so)
  if (/^\d{3,4}$/.test(q)) {
    const g = await prisma.guest.findUnique({
      where: { soThuTu: parseInt(q, 10) },
      include: { venue: true },
    });
    if (g) return NextResponse.json({ ket_qua: [guiGon(g)], nguon: "so" });
  }

  // 3. SDT hoac ten
  const theoSdt = /^\d{4,}$/.test(q);
  if (theoSdt) {
    const ds = await prisma.guest.findMany({
      where: { sdt: { contains: q } },
      include: { venue: true },
      take: 12,
      orderBy: { soThuTu: "asc" },
    });
    return NextResponse.json({ ket_qua: ds.map(guiGon), nguon: "sdt" });
  }

  // Tim ten khong phan biet hoa thuong va dau (le tan go "nguyen" van ra "Nguyễn").
  // Loc trong bo nho de chay giong nhau tren SQLite va Postgres; quy mo vai nghin khach van nhe.
  const tuKhoa = boDau(q);
  const tatCa = await prisma.guest.findMany({
    include: { venue: true },
    orderBy: { soThuTu: "asc" },
  });
  const ds = tatCa.filter((g) => boDau(g.hoTen).includes(tuKhoa)).slice(0, 12);
  return NextResponse.json({ ket_qua: ds.map(guiGon), nguon: "ten" });
}


function guiGon(g: any) {
  return {
    id: g.id,
    soThuTu: g.soThuTu,
    maBiMat: g.maBiMat,
    hoTen: g.hoTen,
    sdt: g.sdt,
    venue: g.venue?.ten,
    venueCode: g.venue?.code,
    soNguoiMoi: g.soNguoiMoi,
    soNguoiXacNhan: g.soNguoiXacNhan,
    trangThai: g.trangThai,
    isVip: g.isVip,
    ban: g.ban,
    checkinLuc: g.checkinLuc,
  };
}
