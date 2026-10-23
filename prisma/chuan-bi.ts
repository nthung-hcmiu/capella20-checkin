// Chay trong luc build (scripts/prepare-db.sh): dong bo venue, nang cap du lieu mau, in ma khoi tao BTC.
// Khong bao gio gieo lai khi CSDL da co du lieu that.

import { PrismaClient } from "@prisma/client";
import { dongBoVenue, gieoDuLieu } from "../src/lib/seedData";
import { damBaoMaKhoiTao, docCaiDat, ghiCaiDat } from "../src/lib/caiDat";
import { PHIEN_BAN_KPI } from "../src/lib/constants";
import { chuanLinhVuc, chuanPhanLoai } from "../src/lib/khach";

const PHIEN_BAN_MAU = "2";
// Tai khoan cua ban demo dau tien (khong dau, mat khau ghi trong README cu)
const TAI_KHOAN_DEMO_CU = new Set([
  "btc", "thuha", "minhquan", "ngoclan", "giabao", "khanhvy", "quochung",
  ...Array.from({ length: 12 }, (_, i) => `letan${i + 1}`),
]);

const prisma = new PrismaClient();

async function main() {
  const phienBan = await docCaiDat(prisma, "phienBanMau");
  const [soVenue, soKhach] = await Promise.all([prisma.venue.count(), prisma.guest.count()]);

  if (soVenue === 0 && soKhach === 0) {
    const kq = await gieoDuLieu(prisma);
    await ghiCaiDat(prisma, "phienBanMau", PHIEN_BAN_MAU);
    console.log(`[capella] CSDL moi: da gieo ${kq.tong} khach mau, ${kq.venue} venue.`);
  } else if (!phienBan) {
    const taiKhoan = await prisma.staffUser.findMany({ select: { username: true } });
    const laDemoCu = taiKhoan.every((t) => TAI_KHOAN_DEMO_CU.has(t.username));
    if (laDemoCu) {
      const kq = await gieoDuLieu(prisma);
      console.log(`[capella] Thay du lieu demo cu bang ban tieng Viet: ${kq.tong} khach mau.`);
    } else {
      console.log("[capella] CSDL da co du lieu that, giu nguyen.");
    }
    await ghiCaiDat(prisma, "phienBanMau", PHIEN_BAN_MAU);
  } else {
    console.log(`[capella] CSDL da co ${soKhach} khach, giu nguyen.`);
  }

  // KPI venue: ghi de quota va muc tieu mot lan cho moi phien ban KPI
  const kpiDaApDung = (await docCaiDat(prisma, "phienBanKpi")) === PHIEN_BAN_KPI;
  await dongBoVenue(prisma, !kpiDaApDung);
  if (!kpiDaApDung) {
    await ghiCaiDat(prisma, "phienBanKpi", PHIEN_BAN_KPI);
    console.log(`[capella] Ap dung KPI venue ${PHIEN_BAN_KPI}: quota theo target gui thu moi.`);
  }

  // Trang thai cu da bo: Danh sach cho thanh Cho duyet, Chua phan hoi thanh Da moi
  const doi1 = await prisma.guest.updateMany({
    where: { trangThai: "DANH_SACH_CHO" },
    data: { trangThai: "CHO_DUYET", lyDoChoDuyet: "HET_QUOTA" },
  });
  const doi2 = await prisma.guest.updateMany({ where: { trangThai: "CHUA_PHAN_HOI" }, data: { trangThai: "DA_MOI" } });
  if (doi1.count + doi2.count > 0) {
    console.log(`[capella] Chuyen trang thai cu: ${doi1.count} Danh sach cho, ${doi2.count} Chua phan hoi.`);
  }

  // Phan loai khach chi con Khach cu / Khach tiem nang; linh vuc gop theo danh sach co dinh
  const canChuan = await prisma.guest.findMany({
    where: { OR: [{ nguonKhach: { not: null } }, { linhVuc: { not: null } }] },
    select: { id: true, nguonKhach: true, linhVuc: true },
  });
  let soChuan = 0;
  for (const g of canChuan) {
    const nguonKhach = g.nguonKhach ? chuanPhanLoai(g.nguonKhach) : null;
    const linhVuc = g.linhVuc ? chuanLinhVuc(g.linhVuc) : null;
    if (nguonKhach !== g.nguonKhach || linhVuc !== g.linhVuc) {
      await prisma.guest.update({ where: { id: g.id }, data: { nguonKhach, linhVuc } });
      soChuan++;
    }
  }
  if (soChuan) console.log(`[capella] Chuan hoa phan loai khach / linh vuc: ${soChuan} khach.`);

  // Dam bao co mot tai khoan Quan tri: uu tien nthung, khong thi tai khoan BTC tao som nhat
  const coQuanTri = await prisma.staffUser.count({ where: { vaiTro: "ADMIN", quanTri: true } });
  if (!coQuanTri) {
    const btc = await prisma.staffUser.findMany({
      where: { vaiTro: "ADMIN", matKhau: { startsWith: "scrypt$" } },
      orderBy: { createdAt: "asc" },
    });
    const chon = btc.find((t) => t.username === "nthung") || btc.find((t) => t.username.includes("nthung")) || btc[0];
    if (chon) {
      await prisma.staffUser.update({ where: { id: chon.id }, data: { quanTri: true } });
      console.log(`[capella] Tai khoan Quan tri: ${chon.username}`);
    }
  }

  const ma = await damBaoMaKhoiTao(prisma);
  if (ma) {
    console.log("[capella] ==================================================");
    console.log(`[capella] Ma khoi tao tai khoan BTC: ${ma}`);
    console.log("[capella] Mo /dang-nhap > Khoi tao tai khoan BTC, nhap ma nay.");
    console.log("[capella] ==================================================");
  } else {
    console.log("[capella] Da co tai khoan BTC.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
