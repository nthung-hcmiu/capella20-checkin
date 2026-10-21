# Deploy len Vercel

Khoang 10 phut, chi bam tren web. Khong copy chuoi ket noi, khong dien bien moi truong, khong go lenh.
Repo tu tao bang va tu gieo du lieu mau trong luc build.

## Buoc 1. Dang nhap Vercel bang GitHub

1. Vao https://vercel.com > **Sign Up** (hoac Log In) > **Continue with GitHub**, dung tai khoan `nthung-hcmiu`.
2. Neu Vercel hoi quyen truy cap repo: chon **Only select repositories** > chon `capella20-checkin` > **Install**.

## Buoc 2. Import repo va deploy lan dau

1. **Add New...** > **Project** > dong `capella20-checkin` > **Import**.
2. Khong sua gi. Bam **Deploy**.
3. Build se xanh. Mo link luc nay se bao loi vi **chua co co so du lieu**. Dung roi, sang buoc 3.

## Buoc 3. Gan co so du lieu Supabase ngay trong Vercel

1. Vao project vua tao > tab **Storage** > **Create Database** (hoac **Browse Marketplace**).
2. Chon **Supabase** > **Continue**. Chon goi **Free**, region **Singapore**, dat ten tuy y > **Create**.
3. Khi duoc hoi gan vao project: chon `capella20-checkin`, tich du **Production / Preview / Development** > **Connect**.

Vercel tu dua thong tin ket noi vao project. Khong can tai khoan Supabase rieng.

## Buoc 4. Deploy lai

1. Tab **Deployments** > dong tren cung > nut **...** > **Redeploy** > **Redeploy**.
2. Trong log build se thay:
   `[capella] Da gieo 68 khach, 8 venue.`
3. Mo link `https://capella20-checkin.vercel.app` (hoac link Vercel hien thi). Xong.

QR va link trang thiep tu tro dung domain Vercel, khong can cai dat them.

---

## Neu khong thay Supabase trong Storage

Dung cach thu cong:

1. Tao project tai https://supabase.com (region Singapore), vao **Project Settings > Database > Connection string > URI**,
   lay chuoi cong 5432, thay `[YOUR-PASSWORD]` bang mat khau da dat.
2. Trong Vercel > project > **Settings > Environment Variables**: them `DATABASE_URL` = chuoi do.
3. Redeploy nhu buoc 4.

## Ve sau

- **Domain that** (vi du `thiep.capella.vn`): Vercel > **Settings > Domains** them domain,
  roi them bien `NEXT_PUBLIC_BASE_URL=https://thiep.capella.vn` va Redeploy de QR tro ve domain nay.
- **Gieo lai du lieu mau**: them bien `SETUP_KEY` (chuoi bi mat tu dat), Redeploy, roi mo
  `https://<app>/api/setup?key=<SETUP_KEY>&seed=1`. Lenh nay xoa het va gieo lai, chi dung cho demo.
- **Truoc khi nhap khach that**: phai xoa du lieu mau. Bao lai de them nut xoa sach co xac nhan.
