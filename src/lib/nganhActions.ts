"use server";

// Cap nhat nganh hang hang loat tu file: moi dong gom so thu tu thiep va nganh hang moi.
// Dung khi can ra lai nganh cho nhieu khach (khach chua ghi nganh, ghi "Khac", ghi sai).
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { batBuocQuyen, locPhamVi } from "./auth";
import { LINH_VUC, chuanLinhVuc } from "./khach";

export interface DongNganh {
  soThuTu: number;
  linhVuc: string;
}

export interface KetQuaNganh {
  ok: boolean;
  thongBao: string;
  ghi: boolean;
  doi: { soThuTu: number; hoTen: string; congTy: string | null; cu: string | null; moi: string }[];
  daDung: number; // khach da dung nganh
  khongThay: number[]; // so thu tu khong co trong app (hoac ngoai venue duoc giao)
  saiNganh: { soThuTu: number; linhVuc: string }[]; // nganh ngoai danh muc
}

export async function capNhatNganh(rows: DongNganh[], ghi: boolean): Promise<KetQuaNganh> {
  const u = await batBuocQuyen(["ADMIN"]);
  const kq: KetQuaNganh = { ok: false, thongBao: "", ghi: false, doi: [], daDung: 0, khongThay: [], saiNganh: [] };
  if (rows.length > 5000) return { ...kq, thongBao: "Mỗi lần tối đa 5.000 dòng." };

  // Mot so thu tu xuat hien nhieu lan thi lay dong cuoi
  const theoSo = new Map<number, string>();
  for (const r of rows) {
    const so = Number(r.soThuTu);
    const nganh = String(r.linhVuc || "").trim();
    if (!Number.isInteger(so) || so <= 0 || !nganh) continue;
    theoSo.set(so, nganh);
  }
  if (!theoSo.size) return { ...kq, thongBao: "Không có dòng nào vừa có số thứ tự thiệp vừa có ngành hàng." };

  const khach = await prisma.guest.findMany({
    where: { soThuTu: { in: [...theoSo.keys()] }, ...locPhamVi(u) },
    select: { id: true, soThuTu: true, hoTen: true, congTy: true, linhVuc: true },
  });
  const coTrongApp = new Set(khach.map((g) => g.soThuTu));
  kq.khongThay = [...theoSo.keys()].filter((so) => !coTrongApp.has(so)).sort((a, b) => a - b);

  const capNhat: { id: string; moi: string }[] = [];
  for (const g of khach.sort((a, b) => a.soThuTu - b.soThuTu)) {
    const goc = theoSo.get(g.soThuTu)!;
    const moi = chuanLinhVuc(goc);
    if (!moi || !LINH_VUC.includes(moi)) {
      kq.saiNganh.push({ soThuTu: g.soThuTu, linhVuc: goc });
      continue;
    }
    if (g.linhVuc === moi) kq.daDung++;
    else {
      kq.doi.push({ soThuTu: g.soThuTu, hoTen: g.hoTen, congTy: g.congTy, cu: g.linhVuc, moi });
      capNhat.push({ id: g.id, moi });
    }
  }

  if (ghi && capNhat.length) {
    await prisma.$transaction(capNhat.map((x) => prisma.guest.update({ where: { id: x.id }, data: { linhVuc: x.moi } })));
    revalidatePath("/", "layout");
  }
  return {
    ...kq,
    ok: true,
    ghi,
    thongBao: ghi
      ? `Đã cập nhật ngành hàng cho ${capNhat.length} khách.`
      : `Kiểm tra xong: ${kq.doi.length} khách sẽ đổi ngành hàng, ${kq.daDung} khách đã đúng.`,
  };
}
