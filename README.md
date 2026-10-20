# Capella 20 nam - He thong khach moi va check in

Web app quan ly khach moi, phat hanh thiep, xac nhan va check in cho dem tri an 20 nam Capella.
Ban v1, du lieu mau, dung de BTC trai nghiem va chot flow.

Stack: Next.js 14 (App Router) + Prisma. Demo chay SQLite, production chuyen Supabase (Postgres) chi doi bien moi truong.

## Chay thu tren may (demo)

Can Node 18 tro len.

```bash
cp .env.example .env   # tao file moi truong (mac dinh SQLite demo)
npm install
npm run setup          # tao Prisma client, dung schema, seed du lieu mau
npm run dev            # mo http://localhost:3000
```

Lenh phu:

```bash
npm run db:reset  # xoa va seed lai du lieu mau
npm run db:studio # mo Prisma Studio xem du lieu
npm run build     # build production
```

## Bon phan he (mot co so du lieu chung)

| Ma | Phan he | Duong dan | Thiet bi |
|----|---------|-----------|----------|
| A | Cong Sales | `/sales` | Dien thoai |
| B | Quan tri BTC | `/admin` | May tinh |
| C | Trang thiep khach | `/thiep/[ma]` (demo: `/thiep/demo`) | Cong khai |
| D | App check in | `/checkin` | Le tan theo ca |

Trang chu `/` la cong vao ca bon phan he.

## Tai khoan mau (demo chua co dang nhap bat buoc)

- BTC: `btc` / `capella20`
- Le tan: `letan1` ... `letan12` / `le123`
- Sales: `thuha`, `minhquan`, `ngoclan`, `giabao`, `khanhvy`, `quochung` / `sale123`

Ban v1 chua gan xac thuc dang nhap, chi phan vai o giao dien. Khi len production can them Supabase Auth hoac NextAuth (xem muc Buoc tiep theo).

## Nam nguyen tac da cai vao he thong

1. Mot khach mot ma: ma bi mat 8 ky tu trong QR, so thu tu 4 chu so, SDT lam khoa chong trung.
2. Mot QR hai ngu canh: khach quet mo `/q/[ma]` dieu huong toi trang thiep de xac nhan; app le tan quet cung ma de check in qua `/api/checkin`.
3. Dem nguoi khong dem thiep: dashboard tach so nguoi duoc moi va so nguoi xac nhan.
4. Sales giu quan he, BTC giu danh sach: sales tao khach, BTC chong trung, quota, duyet VIP, chot danh sach.
5. Cua khong ket: check in bang quet QR, nhap so, hoac tim ten / SDT; co lan VIP va quay ho tro.

## Dai so thu tu theo venue

| Dai | Venue |
|-----|-------|
| 1xxx | Riverside Palace |
| 2xxx | Gallery Hall |
| 3xxx | Parkview |
| 4xxx | Claris Palace |
| 5xxx | Chloe Gallery |
| 6xxx - 7xxx | Du phong |
| 8xxx | Khach bo sung tai cua |
| 9xxx | Khach BOD / BTC |

Sua o `src/lib/constants.ts` (DAI_VENUE) va seed lai.

## Vong doi khach

`Nhap` -> (`Cho duyet` neu trung SDT hoac VIP | `Danh sach cho` neu het quota) -> `Da phat hanh` -> `Da moi` -> `Tham du` / `Chua phan hoi` / `Khong tham du` -> `Da check in` / `Vang mat`.
Huy duoc o moi buoc truoc su kien, ma vo hieu.

## Con so mac dinh (gia dinh, BTC chinh sau)

Sua o `src/lib/constants.ts` (CHISO): nguong xac nhan 889, thiep phat hanh 977, quota binh quan 176 moi venue, 4 lan quet cong lan VIP cong quay ho tro, 12 le tan.

## Chuyen sang Supabase (production)

1. Tao project tren supabase.com, lay connection string o Project Settings > Database.
2. Trong `prisma/schema.prisma`: doi `provider = "sqlite"` thanh `provider = "postgresql"` va bo comment dong `directUrl`.
3. Trong `.env`: dat `DATABASE_URL` (cong 6543, pooler) va `DIRECT_URL` (cong 5432). Xem `.env.example`.
4. Chay: `npx prisma migrate deploy` (hoac `prisma db push`) roi `npm run db:seed`.
5. Dat `NEXT_PUBLIC_BASE_URL` ve domain that (vi du `https://thiep.capella.vn`) de QR va link thiep tro dung.
6. Deploy len Vercel: import repo, dat bien moi truong, build command mac dinh.

## Cau truc thu muc

```
prisma/schema.prisma   luoc do CSDL
prisma/seed.ts         du lieu mau
src/lib/constants.ts   trang thai, dai so, con so mac dinh
src/lib/codes.ts       sinh ma, cap so thu tu, doc QR
src/lib/actions.ts     nghiep vu BTC/Sales (chong trung, quota, duyet)
src/app/               trang theo tung phan he
src/app/api/           qr, lookup, checkin, confirm
src/components/        giao dien dung chung
```

## Con thieu cho production (de xuat)

- Dang nhap va phan quyen that (Supabase Auth / NextAuth) cho BTC, sales, le tan.
- Check in offline: hang doi cuc bo (IndexedDB) va dong bo khi co mang.
- Xuat sticker QR ca nhan (phuong an thiep B) va xuat danh sach ra Excel.
- Gui thiep qua Zalo / kenh da chon, nhac han xac nhan 07/11.
- Nhat ky thao tac va dong bo CRM sau su kien.
```
