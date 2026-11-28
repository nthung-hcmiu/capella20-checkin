import { NextRequest, NextResponse } from "next/server";
import { DUOC_CHECKIN } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { docMaTuQR, docNguoiTuQR } from "@/lib/codes";
import { docDiCung, docSoThiep, soThiep } from "@/lib/khach";
import { boDau } from "@/lib/format";
import { yeuCauQuyen } from "@/lib/auth";

// Tra cuu khach cho app check in: theo ma QR, so thu tu, ten hoac SDT.
// Moi dong ket qua la mot nguoi: khach chinh, hoac khach di kem (co ten rieng trong khachDiCung, so rieng dang 1004-2).
// Tim ten phai ra ca khach di kem; tim thay thiep nao thi liet ke luon khach di kem cua thiep do de le tan chon dung nguoi.
export async function GET(req: NextRequest) {
  if (!(await yeuCauQuyen(DUOC_CHECKIN))) {
    return NextResponse.json({ ket_qua: [], loi: "Phiên đăng nhập đã hết, hãy đăng nhập lại" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ket_qua: [] });

  // 1. Thu doc nhu ma QR (co the kem ?k=2 cua khach di kem)
  const ma = docMaTuQR(q);
  if (ma) {
    const g = await prisma.guest.findUnique({ where: { maBiMat: ma }, include: { venue: true } });
    if (g) return NextResponse.json({ ket_qua: caThiep(g, docNguoiTuQR(q)), nguon: "qr" });
  }

  // 2. So thu tu: 1004, hoac 1004-2 (so cua khach di kem)
  const theoSo = /^\d{3,4}(\s*[-.,/]\s*\d{1,2})?$/.test(q) ? docSoThiep(q) : null;
  if (theoSo) {
    const g = await prisma.guest.findUnique({ where: { soThuTu: theoSo.so }, include: { venue: true } });
    if (g) return NextResponse.json({ ket_qua: caThiep(g, theoSo.nguoi), nguon: "so" });
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
    return NextResponse.json({ ket_qua: ds.flatMap((g) => caThiep(g)).slice(0, TOI_DA), nguon: "sdt" });
  }

  // Tim ten khong phan biet hoa thuong va dau (le tan go "nguyen" van ra "Nguyễn").
  // Loc trong bo nho de chay giong nhau tren SQLite va Postgres; quy mo vai nghin khach van nhe.
  const tuKhoa = boDau(q);
  const tatCa = await prisma.guest.findMany({
    include: { venue: true },
    orderBy: { soThuTu: "asc" },
  });
  const kq: ReturnType<typeof guiGon>[] = [];
  const daCo = new Set<string>();
  const them = (dong: ReturnType<typeof guiGon>) => {
    const khoa = `${dong.id}-${dong.nguoi || 1}`;
    if (daCo.has(khoa) || kq.length >= TOI_DA) return;
    daCo.add(khoa);
    kq.push(dong);
  };
  // Thu tu uu tien: ten khach chinh, ten khach di kem, roi moi den ten cong ty
  for (const g of tatCa) if (boDau(g.hoTen).includes(tuKhoa)) caThiep(g).forEach(them);
  for (const g of tatCa) {
    if (!g.khachDiCung) continue;
    cacDiKem(g).forEach((x) => {
      if (boDau(x.hoTen).includes(tuKhoa)) them(guiGon(g, x));
    });
  }
  if (tuKhoa.length >= 3) for (const g of tatCa) if (boDau(g.congTy || "").includes(tuKhoa)) caThiep(g).forEach(them);
  return NextResponse.json({ ket_qua: kq, nguon: "ten" });
}

const TOI_DA = 20;

// Khach di kem da co ten tren thiep, kem thu tu nguoi (2 tro di)
function cacDiKem(g: { soNguoiMoi: number; khachDiCung: string | null }) {
  return docDiCung(g.khachDiCung)
    .slice(0, Math.max(0, g.soNguoiMoi - 1))
    .map((x, i) => ({ ...x, k: i + 2 }))
    .filter((x) => x.hoTen.trim());
}
// Mot thiep thanh cac dong: khach chinh roi cac khach di kem. Chi dinh nguoi (quet QR / go so cua khach di kem) thi dua nguoi do len dau.
function caThiep(g: any, nguoi?: number | null) {
  const kem = cacDiKem(g).map((x) => guiGon(g, x));
  const ds = [guiGon(g), ...kem];
  const chon = nguoi ? ds.find((d) => d.nguoi === nguoi) : null;
  return chon ? [chon, ...ds.filter((d) => d !== chon)] : ds;
}

function guiGon(g: any, diKem?: { k: number; danhXung?: string; hoTen: string; chucVu?: string }) {
  return {
    // Dong cua khach di kem: nguoi la thu tu tren thiep, so la so rieng (1004-2) de check in dung nguoi do
    nguoi: diKem ? diKem.k : null,
    tenNguoi: diKem ? [diKem.danhXung, diKem.hoTen].filter(Boolean).join(" ") : null,
    chucVuNguoi: diKem ? diKem.chucVu || null : null,
    so: soThiep(g.soThuTu, diKem?.k),
    id: g.id,
    soThuTu: g.soThuTu,
    maBiMat: g.maBiMat,
    hoTen: g.hoTen,
    danhXung: g.danhXung,
    chucVu: g.chucVu,
    congTy: g.congTy,
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
