"use server";

import { redirect } from "next/navigation";
import { prisma } from "./db";
import { bamMatKhau, kiemMatKhau, layNguoiDung, taoPhien, xoaPhien } from "./auth";
import { coTaiKhoanBTC, docCaiDat } from "./caiDat";
import { TRANG_CHINH } from "./constants";

export interface TrangThaiForm {
  loi?: string;
}

function duongDanAnToan(tiep: string | null | undefined): string | null {
  if (!tiep || !tiep.startsWith("/") || tiep.startsWith("//")) return null;
  return tiep;
}

const cho = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function dangNhap(_: TrangThaiForm, fd: FormData): Promise<TrangThaiForm> {
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const matKhau = String(fd.get("matKhau") || "");
  if (!username || !matKhau) return { loi: "Nhập tên đăng nhập và mật khẩu." };

  const u = await prisma.staffUser.findUnique({ where: { username } });
  if (!u || !kiemMatKhau(matKhau, u.matKhau)) {
    await cho(400);
    return { loi: "Sai tên đăng nhập hoặc mật khẩu." };
  }
  await taoPhien(u.id);
  if (u.doiMatKhau) redirect("/doi-mat-khau");
  redirect(duongDanAnToan(String(fd.get("tiep") || "")) || TRANG_CHINH[u.vaiTro] || "/");
}

export async function dangXuat() {
  await xoaPhien();
  redirect("/dang-nhap");
}

export async function khoiTaoBTC(_: TrangThaiForm, fd: FormData): Promise<TrangThaiForm> {
  if (await coTaiKhoanBTC(prisma)) return { loi: "Hệ thống đã có tài khoản BTC. Hãy đăng nhập." };
  const ma = String(fd.get("maKhoiTao") || "").trim().toUpperCase();
  const maDung = await docCaiDat(prisma, "maKhoiTao");
  if (!maDung || ma !== maDung) {
    await cho(600);
    return { loi: "Mã khởi tạo không đúng. Xem dòng [capella] trong Build Logs mới nhất trên Vercel." };
  }
  const hoTen = String(fd.get("hoTen") || "").trim();
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const matKhau = String(fd.get("matKhau") || "");
  if (!hoTen) return { loi: "Nhập họ tên." };
  if (!/^[a-z0-9._]{3,32}$/.test(username)) return { loi: "Tên đăng nhập 3 đến 32 ký tự, chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới." };
  if (matKhau.length < 8) return { loi: "Mật khẩu tối thiểu 8 ký tự." };

  const daCo = await prisma.staffUser.findUnique({ where: { username } });
  if (daCo && daCo.vaiTro !== "ADMIN") return { loi: "Tên đăng nhập này đang thuộc tài khoản khác. Chọn tên khác." };
  const u = daCo
    ? await prisma.staffUser.update({ where: { id: daCo.id }, data: { hoTen, matKhau: bamMatKhau(matKhau), doiMatKhau: false, quanTri: true } })
    : await prisma.staffUser.create({ data: { username, hoTen, vaiTro: "ADMIN", quanTri: true, matKhau: bamMatKhau(matKhau) } });
  await prisma.caiDat.deleteMany({ where: { khoa: "maKhoiTao" } });
  await taoPhien(u.id);
  redirect("/admin");
}

export async function doiMatKhau(_: TrangThaiForm, fd: FormData): Promise<TrangThaiForm> {
  const nd = await layNguoiDung();
  if (!nd) redirect("/dang-nhap");
  const u = await prisma.staffUser.findUnique({ where: { id: nd.id } });
  if (!u) redirect("/dang-nhap");
  const cu = String(fd.get("matKhauCu") || "");
  const moi = String(fd.get("matKhauMoi") || "");
  const lai = String(fd.get("nhapLai") || "");
  if (!kiemMatKhau(cu, u.matKhau)) return { loi: "Mật khẩu hiện tại không đúng." };
  if (moi.length < 8) return { loi: "Mật khẩu mới tối thiểu 8 ký tự." };
  if (moi !== lai) return { loi: "Hai lần nhập mật khẩu mới không khớp." };
  if (moi === cu) return { loi: "Mật khẩu mới phải khác mật khẩu hiện tại." };
  await prisma.staffUser.update({ where: { id: u.id }, data: { matKhau: bamMatKhau(moi), doiMatKhau: false } });
  // Dang xuat moi thiet bi khac, giu lai phien moi tren may nay
  await prisma.phienDangNhap.deleteMany({ where: { userId: u.id } });
  await taoPhien(u.id);
  redirect(TRANG_CHINH[u.vaiTro] || "/");
}
