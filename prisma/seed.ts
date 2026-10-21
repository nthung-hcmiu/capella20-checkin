// Gieo lai toan bo du lieu mau (CLI, chay tren may): xoa het khach va tai khoan, in ma khoi tao BTC.

import { PrismaClient } from "@prisma/client";
import { gieoDuLieu } from "../src/lib/seedData";
import { damBaoMaKhoiTao, ghiCaiDat } from "../src/lib/caiDat";

const prisma = new PrismaClient();

async function main() {
  const { tong, venue } = await gieoDuLieu(prisma);
  await ghiCaiDat(prisma, "phienBanMau", "2");
  console.log(`Xong. Tao ${tong} khach, ${venue} venue.`);
  const ma = await damBaoMaKhoiTao(prisma);
  if (ma) console.log(`Ma khoi tao tai khoan BTC: ${ma}  (mo /dang-nhap > Khoi tao tai khoan BTC)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
