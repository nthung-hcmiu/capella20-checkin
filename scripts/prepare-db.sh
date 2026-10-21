#!/bin/sh
# Chay trong luc build tren Vercel: tao bang, chuan bi du lieu va in ma khoi tao BTC neu can.
# Tao bang can ket noi truc tiep (khong qua pooler): uu tien bien unpooled cua Supabase / Neon,
# sau do moi den DATABASE_URL dat tay.
URL="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL_UNPOOLED:-$DATABASE_URL}}"
if [ -z "$URL" ]; then
  echo "[capella] Chua ket noi CSDL, bo qua buoc tao bang. Ket noi Storage roi Redeploy."
  exit 0
fi
export DATABASE_URL="$URL"
npx prisma db push --skip-generate --accept-data-loss
npx tsx prisma/chuan-bi.ts
