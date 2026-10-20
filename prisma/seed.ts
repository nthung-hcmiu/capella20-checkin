// Seed du lieu mau cho ban demo: venue, tai khoan, khach trai khap vong doi

import { PrismaClient } from "@prisma/client";
import { DAI_VENUE, TRANG_THAI, CHISO } from "../src/lib/constants";

const prisma = new PrismaClient();

const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const daDungMa = new Set<string>();
function sinhMa(): string {
  let ma = "";
  do {
    ma = "";
    for (let i = 0; i < 8; i++) ma += BANG_MA[Math.floor(Math.random() * BANG_MA.length)];
  } while (daDungMa.has(ma));
  daDungMa.add(ma);
  return ma;
}

const HO = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo", "Dang", "Bui", "Do", "Ho", "Ngo", "Duong", "Ly", "Vu"];
const TEN_DEM = ["Van", "Thi", "Minh", "Thanh", "Hoang", "Ngoc", "Gia", "Quoc", "Thu", "Hong", "Bao", "Khanh", "Anh", "Duy"];
const TEN = ["An", "Binh", "Chi", "Dung", "Giang", "Ha", "Hai", "Hoa", "Hung", "Lan", "Linh", "Mai", "Nam", "Nga", "Nhung", "Phong", "Phuong", "Quan", "Son", "Tam", "Thao", "Trang", "Tuan", "Vy", "Yen"];

function tenNgauNhien(): string {
  const ho = HO[Math.floor(Math.random() * HO.length)];
  const dem = TEN_DEM[Math.floor(Math.random() * TEN_DEM.length)];
  const ten = TEN[Math.floor(Math.random() * TEN.length)];
  return `${ho} ${dem} ${ten}`;
}

function sdtNgauNhien(): string {
  const dau = ["090", "091", "093", "097", "098", "078", "079", "088", "086", "032", "035", "070"];
  let s = dau[Math.floor(Math.random() * dau.length)];
  for (let i = 0; i < 7; i++) s += Math.floor(Math.random() * 10);
  return s;
}

const SALES_TEAM = ["Thu Ha", "Minh Quan", "Ngoc Lan", "Gia Bao", "Khanh Vy", "Quoc Hung"];

async function main() {
  console.log("Xoa du lieu cu...");
  await prisma.checkinLog.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.staffUser.deleteMany();

  console.log("Tao venue...");
  const venues = [];
  for (const v of DAI_VENUE) {
    const quota = ["RIVERSIDE", "GALLERY", "PARKVIEW", "CLARIS", "CHLOE"].includes(v.code)
      ? CHISO.quotaBinhQuan
      : v.code === "BOD"
      ? 98
      : 0;
    const venue = await prisma.venue.create({
      data: {
        code: v.code,
        ten: v.ten,
        rangeStart: v.rangeStart,
        rangeEnd: v.rangeEnd,
        quota,
        mauSac: v.mauSac,
        thuTu: v.thuTu,
      },
    });
    venues.push(venue);
  }

  console.log("Tao tai khoan...");
  await prisma.staffUser.create({
    data: { username: "btc", matKhau: "capella20", hoTen: "Quan tri BTC", vaiTro: "ADMIN" },
  });
  for (let i = 1; i <= 12; i++) {
    const ca = i <= 6 ? "Ca 1 (17h-19h)" : "Ca 2 (19h-21h)";
    await prisma.staffUser.create({
      data: { username: `letan${i}`, matKhau: "le123", hoTen: `Le tan ${i}`, vaiTro: "LE_TAN", ca },
    });
  }
  for (const s of SALES_TEAM) {
    const u = s.toLowerCase().replace(/\s+/g, "");
    await prisma.staffUser.create({
      data: { username: u, matKhau: "sale123", hoTen: s, vaiTro: "SALES" },
    });
  }

  console.log("Tao khach mau...");
  // Phan bo so luong khach demo tren 5 venue chinh
  const phanBo: Record<string, number> = { RIVERSIDE: 18, GALLERY: 14, PARKVIEW: 12, CLARIS: 10, CHLOE: 9 };
  // Trang thai mau theo ty le de dashboard sinh dong
  const trangThaiPool = [
    TRANG_THAI.DA_CHECKIN, TRANG_THAI.DA_CHECKIN,
    TRANG_THAI.THAM_DU, TRANG_THAI.THAM_DU, TRANG_THAI.THAM_DU,
    TRANG_THAI.DA_MOI, TRANG_THAI.DA_MOI,
    TRANG_THAI.DA_PHAT_HANH,
    TRANG_THAI.CHUA_PHAN_HOI,
    TRANG_THAI.KHONG_THAM_DU,
    TRANG_THAI.DANH_SACH_CHO,
    TRANG_THAI.NHAP,
  ];

  const soBanTheoVenue: Record<string, number> = {};
  let sdtDaTao: string[] = [];

  for (const venue of venues) {
    const n = phanBo[venue.code] || 0;
    const conTrong: number[] = [];
    for (let x = venue.rangeStart; x <= venue.rangeEnd; x++) conTrong.push(x);
    let idx = 0;

    for (let i = 0; i < n; i++) {
      const soThuTu = conTrong[idx++];
      const trangThai = trangThaiPool[Math.floor(Math.random() * trangThaiPool.length)];
      const soNguoiMoi = Math.random() < 0.35 ? 2 : 1;
      const daXacNhan = [
        TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN, TRANG_THAI.KHONG_THAM_DU,
      ].includes(trangThai as any);
      const soNguoiXacNhan =
        trangThai === TRANG_THAI.KHONG_THAM_DU
          ? 0
          : daXacNhan
          ? Math.random() < 0.3 && soNguoiMoi === 2
            ? 1
            : soNguoiMoi
          : null;

      const sdt = sdtNgauNhien();
      sdtDaTao.push(sdt);

      const salesOwner = SALES_TEAM[Math.floor(Math.random() * SALES_TEAM.length)];
      const now = new Date();

      const phatHanhLuc = [
        TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU,
        TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN,
      ].includes(trangThai as any)
        ? new Date(now.getTime() - 86400000 * (5 + Math.random() * 10))
        : null;
      const xacNhanLuc = daXacNhan ? new Date(now.getTime() - 86400000 * (1 + Math.random() * 4)) : null;
      const checkinLuc = trangThai === TRANG_THAI.DA_CHECKIN ? new Date(now.getTime() - 3600000 * Math.random()) : null;

      // Xep ban cho khach da xac nhan tham du
      let ban: string | null = null;
      if ([TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(trangThai as any)) {
        soBanTheoVenue[venue.code] = (soBanTheoVenue[venue.code] || 0) + 1;
        const banSo = Math.ceil(soBanTheoVenue[venue.code] / 10);
        ban = `Ban ${String(banSo).padStart(2, "0")}`;
      }

      const guest = await prisma.guest.create({
        data: {
          soThuTu,
          maBiMat: sinhMa(),
          hoTen: tenNgauNhien(),
          sdt,
          venueId: venue.id,
          soNguoiMoi,
          soNguoiXacNhan,
          trangThai,
          isVip: false,
          ban,
          salesOwner,
          phatHanhLuc,
          xacNhanLuc,
          checkinLuc,
        },
      });

      if (trangThai === TRANG_THAI.DA_CHECKIN) {
        await prisma.checkinLog.create({
          data: {
            guestId: guest.id,
            lan: `Lan ${1 + Math.floor(Math.random() * 4)}`,
            leTan: `Le tan ${1 + Math.floor(Math.random() * 12)}`,
            ketQua: "THANH_CONG",
            thoiGian: checkinLuc!,
          },
        });
      }
    }
  }

  // Khach VIP (dai BOD) - trang thai cho duyet vi VIP
  const bod = venues.find((v) => v.code === "BOD")!;
  for (let i = 0; i < 4; i++) {
    await prisma.guest.create({
      data: {
        soThuTu: bod.rangeStart + i,
        maBiMat: sinhMa(),
        hoTen: tenNgauNhien(),
        sdt: sdtNgauNhien(),
        venueId: bod.id,
        soNguoiMoi: 2,
        trangThai: i < 2 ? TRANG_THAI.CHO_DUYET : TRANG_THAI.DA_PHAT_HANH,
        isVip: true,
        salesOwner: SALES_TEAM[i % SALES_TEAM.length],
        lyDoChoDuyet: i < 2 ? "VIP" : null,
      },
    });
  }

  // Cap trung SDT de minh hoa hang cho duyet (TRUNG_SDT)
  const riverside = venues.find((v) => v.code === "RIVERSIDE")!;
  const sdtTrung = sdtDaTao[0];
  await prisma.guest.create({
    data: {
      soThuTu: riverside.rangeStart + 500,
      maBiMat: sinhMa(),
      hoTen: tenNgauNhien(),
      sdt: sdtTrung,
      venueId: riverside.id,
      soNguoiMoi: 1,
      trangThai: TRANG_THAI.CHO_DUYET,
      salesOwner: SALES_TEAM[2],
      lyDoChoDuyet: "TRUNG_SDT",
    },
  });

  const tong = await prisma.guest.count();
  console.log(`Xong. Tao ${tong} khach, ${venues.length} venue.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
