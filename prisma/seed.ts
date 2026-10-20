// Seed du lieu mau cho ban demo (CLI). Logic nam o src/lib/seedData.ts

import { PrismaClient } from "@prisma/client";
import { gieoDuLieu } from "../src/lib/seedData";

const prisma = new PrismaClient();

gieoDuLieu(prisma)
  .then(({ tong, venue }) => {
    console.log(`Xong. Tao ${tong} khach, ${venue} venue.`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
