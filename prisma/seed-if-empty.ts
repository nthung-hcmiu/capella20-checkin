// Gieo du lieu mau chi khi CSDL chua co khach (dung khi build tren Vercel)

import { PrismaClient } from "@prisma/client";
import { gieoDuLieu } from "../src/lib/seedData";

const prisma = new PrismaClient();

async function main() {
  const tong = await prisma.guest.count();
  if (tong > 0) {
    console.log(`[capella] CSDL da co ${tong} khach, khong gieo lai.`);
    return;
  }
  const kq = await gieoDuLieu(prisma);
  console.log(`[capella] Da gieo ${kq.tong} khach, ${kq.venue} venue.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
