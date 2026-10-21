// Chon chuoi ket noi CSDL cho runtime, chap nhan ten bien cua Supabase, Neon hoac dat tay.

export const BIEN_KET_NOI = ["POSTGRES_PRISMA_URL", "DATABASE_URL", "POSTGRES_URL"] as const;

export function tenBienDangDung(): string | null {
  return BIEN_KET_NOI.find((t) => process.env[t]) || null;
}

// Ket noi qua pooler (PgBouncer che do transaction) can pgbouncer=true de Prisma khong dung prepared statement
export function chuoiKetNoi(): string | undefined {
  const ten = tenBienDangDung();
  if (!ten) return undefined;
  const raw = process.env[ten]!;
  try {
    const u = new URL(raw);
    if (u.hostname.includes("pooler") && !u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
      return u.toString();
    }
  } catch {}
  return raw;
}
