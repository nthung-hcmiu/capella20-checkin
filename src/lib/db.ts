import { PrismaClient } from "@prisma/client";
import { chuoiKetNoi } from "./dbUrl";

// Giu mot instance Prisma duy nhat khi dev (tranh tao lai moi lan hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const datasourceUrl = chuoiKetNoi();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
