# Deploy len Vercel (production)

Repo da de san provider Postgres va co san `vercel-build` tu tao bang khi deploy.
Khong can sua code. Tong thoi gian khoang 15 phut, chi thao tac tren web.

Thu tu phu thuoc: (1) code tren GitHub -> (2) tao CSDL Supabase -> (3) deploy Vercel -> (4) gieo du lieu.

---

## Buoc 1. Dua code len GitHub

Xem huong dan trong tin nhan truoc, hoac tu day neu da co repo:

```bash
git remote add origin https://github.com/<tai-khoan>/capella20-checkin.git
git push -u origin main
```

---

## Buoc 2. Tao co so du lieu Supabase (mien phi)

1. Vao https://supabase.com, dang nhap, bam **New project**.
2. Dat ten, chon **Region: Southeast Asia (Singapore)**, dat **Database Password** va luu lai.
3. Cho project tao xong (khoang 2 phut).
4. Vao **Project Settings** (bieu tuong banh rang) > **Database** > muc **Connection string** > chon tab **URI**.
5. Copy chuoi ket noi. No dang:
   `postgresql://postgres.[ref]:[PASSWORD]@aws-0-...pooler.supabase.com:5432/postgres`
   - Thay `[PASSWORD]` bang mat khau da dat o buoc 2.
   - Dung **cong 5432** (ket noi truc tiep) cho don gian. Du cho quy mo su kien nay.

Giu chuoi nay lai, se dan vao Vercel o buoc sau.

---

## Buoc 3. Deploy len Vercel

1. Vao https://vercel.com, dang nhap bang GitHub.
2. **Add New** > **Project** > chon repo `capella20-checkin` > **Import**.
3. Vercel tu nhan dien Next.js. **Khong** can sua Build Command (repo da co `vercel-build` tu tao bang).
4. Mo **Environment Variables**, them 3 bien:

   | Ten | Gia tri |
   |-----|---------|
   | `DATABASE_URL` | Chuoi ket noi Supabase o buoc 2 |
   | `NEXT_PUBLIC_BASE_URL` | De tam `https://capella20-checkin.vercel.app` (sua lai sau khi co domain that) |
   | `SETUP_KEY` | Mot chuoi bi mat tu dat, vi du `capella-seed-2026-x7k9` |

5. Bam **Deploy**. Cho build xong (vai phut). Lan build dau se tu tao bang trong Supabase.

---

## Buoc 4. Gieo du lieu mau

Sau khi deploy thanh cong, mo trinh duyet va dan dia chi (thay SETUP_KEY bang gia tri da dat):

```
https://<ten-app>.vercel.app/api/setup?key=SETUP_KEY&seed=1
```

Thay `?key=...&seed=1` hien thong bao `Da gieo 68 khach, 8 venue.` la xong.
Mo `https://<ten-app>.vercel.app` se thay he thong chay voi du lieu mau.

> Luu y: endpoint nay xoa va gieo lai toan bo. Sau khi di vao dung that, nen go bien `SETUP_KEY`
> trong Vercel de khoa lai, tranh gieo nham de len du lieu that.

---

## Sau khi co domain that

1. Trong Vercel > project > **Settings** > **Domains**, them domain (vi du `thiep.capella.vn`).
2. Sua bien `NEXT_PUBLIC_BASE_URL` thanh `https://thiep.capella.vn` roi **Redeploy**.
   Buoc nay quan trong: QR va link trang thiep se tro dung domain that.

---

## Nang cap ve sau (khi can)

- **Chong qua tai ket noi**: doi `DATABASE_URL` sang cong 6543 (pooler) co `?pgbouncer=true`,
  them bien `DIRECT_URL` (cong 5432) va bo comment dong `directUrl` trong `prisma/schema.prisma`.
- **Dang nhap that**: them Supabase Auth hoac NextAuth cho BTC, sales, le tan.
- **Check in offline**: hang doi cuc bo (IndexedDB) va dong bo khi co mang.
