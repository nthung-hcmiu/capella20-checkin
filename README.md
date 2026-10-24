# Capella 20 nam - He thong khach moi va check in

Web app quan ly khach moi, phat hanh thiep, xac nhan va check in cho dem tri an 20 nam Capella.
Ban v1, du lieu mau, dung de BTC trai nghiem va chot flow.

Stack: Next.js 14 (App Router) + Prisma. Demo chay SQLite, production chuyen Supabase (Postgres) chi doi bien moi truong.

## Chay thu tren may (demo)

Can Node 18 tro len.

Mac dinh repo dung Postgres (cho production). De chay demo nhanh tren may bang SQLite:

```bash
cp .env.example .env   # mac dinh DATABASE_URL tro toi SQLite (file:./dev.db)
npm install
npm run use:sqlite     # doi provider sang SQLite cho demo cuc bo
npm run setup          # tao Prisma client, dung schema, seed du lieu mau
npm run dev            # mo http://localhost:3000
```

Deploy production (Supabase + Vercel): xem `DEPLOY.md`. Repo da de san provider Postgres nen deploy khong can sua code.

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
| C | Thiep online (khach xem thong tin va ma QR check in) | `/thiep/[ma]` | Cong khai |
| D | App check in | `/checkin` | Le tan theo ca |

Trang chu `/` la cong vao ca bon phan he.

## Flow khach moi

1. BTC nhap danh sach (`/admin/nhap`), duyet trung / VIP, phat hanh thiep.
2. Sales gui thiep online (chep loi moi vao Zalo), gui thiep giay co QR (`/in-qr`), hoi khach roi xac nhan thay khach tren he thong.
3. Khach khong tu xac nhan. Thiep online chi hien thong tin su kien va ma QR.
4. Ngay su kien: le tan quet QR tren thiep online hoac thiep giay, hoac nhap so thu tu, tim ten / cong ty.

Huong dan su dung cho tung vai tro nam ngay trong app: `/huong-dan`.

## Dang nhap va phan quyen

- Khong co mat khau mac dinh nao trong code (repo cong khai).
- Lan dau: build tren Vercel in dong `[capella] Ma khoi tao tai khoan BTC: XXXXXXXXXX` trong Build Logs.
  Mo `/dang-nhap` > Khoi tao tai khoan BTC, nhap ma do de tao tai khoan BTC dau tien.
- BTC tao tai khoan sales, le tan trong trang `/admin/tai-khoan`. Tai khoan mau (sales, le tan) chua co mat khau,
  BTC dat mat khau chung hoac rieng tung nguoi.
- Tai khoan BTC tao bang ma khoi tao (hoac nthung) la Quan tri: tao tai khoan, dat mat khau cho nguoi khac, xuat CSV, vao tab Du lieu.
  Cac tai khoan BTC khac khong lam duoc cac viec do.
- BTC vao moi phan he. Sales chi thay khach co cot sales trung ho ten cua minh. Le tan chi vao `/checkin`.

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
| 6xxx | Chill |
| 7xxx | Du phong (Marketing cu, da gop vao Holdings) |
| 8xxx | Khach bo sung tai cua |
| 9xxx | Holdings |

Sua o `src/lib/constants.ts` (DAI_VENUE) va seed lai.

## Vong doi khach

`Nhap` (sales xoa duoc) -> `Cho duyet` (sales bam Gui duyet) -> `Da phat hanh ve` (BTC duyet) -> `Da moi` -> `Tham du` / `Khong tham du` -> `Da check in` / `Vang mat` (Quan tri bam Chot vang mat sau su kien).
Trung SDT, trung ten cung cong ty, VIP, venue het quota khong chan ma thanh canh bao cho BTC khi duyet.
Huy duoc o moi buoc truoc su kien, ma vo hieu.

## Con so mac dinh (gia dinh, BTC chinh sau)

Quota (so khach, dem theo nguoi), muc tieu cong ty, doanh thu cam ket tung venue nam o `src/lib/constants.ts` (DAI_VENUE).
Doi so roi tang PHIEN_BAN_KPI thi lan build ke tiep ghi de vao CSDL. Tong: 800 khach, 400 cong ty, 31,925 ty.

## Deploy production

Xem `DEPLOY.md`: Vercel cong Supabase tich hop san, khoang 10 phut, khong can sua code hay dien bien moi truong.
Build tren Vercel tu tao bang va tu gieo du lieu mau khi CSDL con trong.

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

- Check in offline: hang doi cuc bo (IndexedDB) va dong bo khi co mang.
- Xuat sticker QR ca nhan (phuong an thiep B).
- Gui thiep qua Zalo / kenh da chon, nhac han xac nhan 07/11.
- Nhat ky thao tac va dong bo CRM sau su kien.
```
