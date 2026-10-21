#!/bin/sh
# Chay trong luc build tren Vercel: tao bang va gieo du lieu mau neu CSDL con trong.
# Nhan DATABASE_URL dat tay, hoac bien tu tich hop Supabase / Neon cua Vercel.
URL="${DATABASE_URL:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL_UNPOOLED}}"
if [ -z "$URL" ]; then
  echo "[capella] Chua ket noi CSDL, bo qua buoc tao bang. Ket noi Storage roi Redeploy."
  exit 0
fi
export DATABASE_URL="$URL"
npx prisma db push --skip-generate --accept-data-loss
npx tsx prisma/seed-if-empty.ts
