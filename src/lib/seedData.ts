// Logic gieo du lieu mau, dung chung cho CLI, buoc build tren Vercel va nut "Nap du lieu mau" cua BTC

import type { PrismaClient } from "@prisma/client";
import { DAI_VENUE, TRANG_THAI, CHISO } from "./constants";
import { boDau } from "./format";

const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Vũ"];
const TEN_DEM = ["Văn", "Thị", "Minh", "Thanh", "Hoàng", "Ngọc", "Gia", "Quốc", "Thu", "Hồng", "Bảo", "Khánh", "Anh", "Đức"];
const TEN = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hoa", "Hùng", "Lan", "Linh", "Mai", "Nam", "Nga", "Nhung", "Phong", "Phương", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tuấn", "Vy", "Yến"];
export const SALES_MAU = ["Thu Hà", "Minh Quân", "Ngọc Lan", "Gia Bảo", "Khánh Vy", "Quốc Hùng"];

export function tenDangNhapTu(hoTen: string): string {
  return boDau(hoTen).replace(/[^a-z0-9]/g, "");
}

// Tao ten venue dung theo DAI_VENUE (khong dong vao quota BTC da chinh)
export async function dongBoVenue(prisma: PrismaClient) {
  for (const v of DAI_VENUE) {
    await prisma.venue.upsert({
      where: { code: v.code },
      update: { ten: v.ten, rangeStart: v.rangeStart, rangeEnd: v.rangeEnd, mauSac: v.mauSac, thuTu: v.thuTu },
      create: {
        code: v.code, ten: v.ten, rangeStart: v.rangeStart, rangeEnd: v.rangeEnd, mauSac: v.mauSac, thuTu: v.thuTu,
        quota: ["RIVERSIDE", "GALLERY", "PARKVIEW", "CLARIS", "CHLOE"].includes(v.code) ? CHISO.quotaBinhQuan : v.code === "BOD" ? 98 : 0,
      },
    });
  }
}

// giuTaiKhoan: chi thay khach, giu nguyen tai khoan va venue (dung cho nut cua BTC)
export async function gieoDuLieu(
  prisma: PrismaClient,
  tuyChon: { giuTaiKhoan?: boolean } = {}
): Promise<{ tong: number; venue: number }> {
  const daDungMa = new Set<string>();
  const sinhMa = (): string => {
    let ma = "";
    do {
      ma = "";
      for (let i = 0; i < 8; i++) ma += BANG_MA[Math.floor(Math.random() * BANG_MA.length)];
    } while (daDungMa.has(ma));
    daDungMa.add(ma);
    return ma;
  };
  const chon = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const tenNgauNhien = () => `${chon(HO)} ${chon(TEN_DEM)} ${chon(TEN)}`;
  const sdtNgauNhien = () => {
    let s = chon(["090", "091", "093", "097", "098", "078", "079", "088", "086", "032", "035", "070"]);
    for (let i = 0; i < 7; i++) s += Math.floor(Math.random() * 10);
    return s;
  };

  await prisma.checkinLog.deleteMany();
  await prisma.guest.deleteMany();

  let salesTeam = SALES_MAU;
  if (tuyChon.giuTaiKhoan) {
    await dongBoVenue(prisma);
    const ds = await prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true } });
    if (ds.length > 0) salesTeam = ds.map((d) => d.hoTen);
  } else {
    await prisma.venue.deleteMany();
    await prisma.phienDangNhap.deleteMany();
    await prisma.staffUser.deleteMany();
    await dongBoVenue(prisma);
    // Tai khoan mau chua co mat khau: BTC dat mat khau trong trang Tai khoan truoc khi dung
    for (const s of SALES_MAU) {
      await prisma.staffUser.create({ data: { username: tenDangNhapTu(s), hoTen: s, vaiTro: "SALES" } });
    }
    for (let i = 1; i <= 12; i++) {
      await prisma.staffUser.create({
        data: { username: `letan${i}`, hoTen: `Lễ tân ${i}`, vaiTro: "LE_TAN", ca: i <= 6 ? "Ca 1 (17h đến 19h)" : "Ca 2 (19h đến 21h)" },
      });
    }
  }

  const venues = await prisma.venue.findMany();
  const theoCode = (c: string) => venues.find((v) => v.code === c)!;

  const phanBo: Record<string, number> = { RIVERSIDE: 18, GALLERY: 14, PARKVIEW: 12, CLARIS: 10, CHLOE: 9 };
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
  const sdtDaTao: string[] = [];

  for (const [code, n] of Object.entries(phanBo)) {
    const venue = theoCode(code);
    for (let i = 0; i < n; i++) {
      const soThuTu = venue.rangeStart + i;
      const trangThai = chon(trangThaiPool);
      const soNguoiMoi = Math.random() < 0.35 ? 2 : 1;
      const daXacNhan = [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN, TRANG_THAI.KHONG_THAM_DU].includes(trangThai as any);
      const soNguoiXacNhan =
        trangThai === TRANG_THAI.KHONG_THAM_DU ? 0 : daXacNhan ? (Math.random() < 0.3 && soNguoiMoi === 2 ? 1 : soNguoiMoi) : null;
      const sdt = sdtNgauNhien();
      sdtDaTao.push(sdt);
      const now = Date.now();
      const daPhatHanh = [
        TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU,
        TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN,
      ].includes(trangThai as any);
      const checkinLuc = trangThai === TRANG_THAI.DA_CHECKIN ? new Date(now - 3600000 * Math.random()) : null;

      let ban: string | null = null;
      if ([TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN].includes(trangThai as any)) {
        soBanTheoVenue[code] = (soBanTheoVenue[code] || 0) + 1;
        ban = `Bàn ${String(Math.ceil(soBanTheoVenue[code] / 10)).padStart(2, "0")}`;
      }

      const guest = await prisma.guest.create({
        data: {
          soThuTu, maBiMat: sinhMa(), hoTen: tenNgauNhien(), sdt, venueId: venue.id,
          soNguoiMoi, soNguoiXacNhan, trangThai, isVip: false, ban, salesOwner: chon(salesTeam),
          phatHanhLuc: daPhatHanh ? new Date(now - 86400000 * (5 + Math.random() * 10)) : null,
          xacNhanLuc: daXacNhan ? new Date(now - 86400000 * (1 + Math.random() * 4)) : null,
          checkinLuc,
        },
      });
      if (checkinLuc) {
        await prisma.checkinLog.create({
          data: {
            guestId: guest.id, lan: `Làn ${1 + Math.floor(Math.random() * 4)}`,
            leTan: `Lễ tân ${1 + Math.floor(Math.random() * 12)}`, ketQua: "THANH_CONG", thoiGian: checkinLuc,
          },
        });
      }
    }
  }

  // Khach VIP (dai BOD), 2 khach dang cho BTC duyet
  const bod = theoCode("BOD");
  for (let i = 0; i < 4; i++) {
    await prisma.guest.create({
      data: {
        soThuTu: bod.rangeStart + i, maBiMat: sinhMa(), hoTen: tenNgauNhien(), sdt: sdtNgauNhien(),
        venueId: bod.id, soNguoiMoi: 2, trangThai: i < 2 ? TRANG_THAI.CHO_DUYET : TRANG_THAI.DA_PHAT_HANH,
        isVip: true, salesOwner: salesTeam[i % salesTeam.length], lyDoChoDuyet: i < 2 ? "VIP" : null,
      },
    });
  }

  // Mot cap trung SDT de minh hoa hang cho duyet
  const riverside = theoCode("RIVERSIDE");
  await prisma.guest.create({
    data: {
      soThuTu: riverside.rangeStart + 500, maBiMat: sinhMa(), hoTen: tenNgauNhien(), sdt: sdtDaTao[0],
      venueId: riverside.id, soNguoiMoi: 1, trangThai: TRANG_THAI.CHO_DUYET,
      salesOwner: salesTeam[2 % salesTeam.length], lyDoChoDuyet: "TRUNG_SDT",
    },
  });

  return { tong: await prisma.guest.count(), venue: venues.length };
}
