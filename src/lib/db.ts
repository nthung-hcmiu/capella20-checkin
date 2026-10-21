import { PrismaClient } from "@prisma/client";

// Giu mot instance Prisma duy nhat khi dev (tranh tao lai moi lan hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL dat tay, hoac bien do tich hop Supabase / Neon tren Vercel tu sinh
const datasourceUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
