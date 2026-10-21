// Chay trong luc build (scripts/prepare-db.sh): dong bo venue, nang cap du lieu mau, in ma khoi tao BTC.
// Khong bao gio gieo lai khi CSDL da co du lieu that.

import { PrismaClient } from "@prisma/client";
import { dongBoVenue, gieoDuLieu } from "../src/lib/seedData";
import { damBaoMaKhoiTao, docCaiDat, ghiCaiDat } from "../src/lib/caiDat";

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

  await dongBoVenue(prisma);

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
