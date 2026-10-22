// Logic gieo du lieu mau, dung chung cho CLI, buoc build tren Vercel va nut "Nap du lieu mau" cua BTC

import type { PrismaClient } from "@prisma/client";
import { DAI_VENUE, TRANG_THAI } from "./constants";
import { boDau } from "./format";

const BANG_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Vũ"];
const TEN_DEM = ["Văn", "Thị", "Minh", "Thanh", "Hoàng", "Ngọc", "Gia", "Quốc", "Thu", "Hồng", "Bảo", "Khánh", "Anh", "Đức"];
const TEN = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hoa", "Hùng", "Lan", "Linh", "Mai", "Nam", "Nga", "Nhung", "Phong", "Phương", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tuấn", "Vy", "Yến"];
export const SALES_MAU = ["Thu Hà", "Minh Quân", "Ngọc Lan", "Gia Bảo", "Khánh Vy", "Quốc Hùng"];

// Doanh nghiep hu cau cho du lieu mau (khong lay tu danh sach that)
const CONG_TY_MAU = [
  "CÔNG TY TNHH SỰ KIỆN ÁNH DƯƠNG", "CÔNG TY CP TRUYỀN THÔNG BẢO MINH", "CÔNG TY TNHH CÔNG NGHỆ SAO VIỆT",
  "CÔNG TY CP DƯỢC PHẨM AN KHANG MẪU", "CÔNG TY TNHH DU LỊCH HẢI ÂU", "CÔNG TY CP BẤT ĐỘNG SẢN PHÚ THỊNH",
  "CÔNG TY TNHH THỜI TRANG LAM PHƯƠNG", "CÔNG TY CP THỰC PHẨM XANH VIỆT", "NGÂN HÀNG MẪU TMCP ĐÔNG Á",
  "CÔNG TY TNHH GIÁO DỤC TRÍ TUỆ", "CÔNG TY CP LOGISTICS HOÀNG HÀ", "CÔNG TY TNHH QUẢNG CÁO NHẬT MINH",
];
const LINH_VUC = ["Giải Trí/Tổ Chức Sự Kiện", "Công Nghệ", "Dược Phẩm", "Du Lịch", "Bất Động Sản", "Thời Trang", "Thực Phẩm", "Tài Chính", "Giáo Dục", "Vận Tải"];
const CHUC_VU = ["Giám Đốc", "Phó Giám Đốc", "Trưởng Phòng Nhân Sự", "Account Manager", "Event Executive", "Đại Diện Công Ty", "Trưởng Phòng Marketing", "Kế Toán Trưởng"];
const NHOM_MOI = ["Khách Corporate", "Khách Corporate", "Khách Corporate", "Khách Corporate", "Đối tác Capella", "Taskforce tiếp khách"];

export function tenDangNhapTu(hoTen: string): string {
  return boDau(hoTen).replace(/[^a-z0-9]/g, "");
}

// Dong bo venue theo DAI_VENUE. capNhatKpi: ghi de quota va muc tieu (chi khi KPI doi phien ban).
export async function dongBoVenue(prisma: PrismaClient, capNhatKpi = false) {
  // Dai 6xxx, 7xxx truoc day la Du phong, nay la Chill va Marketing
  const duPhong = await prisma.venue.findUnique({ where: { code: "DUPHONG" }, include: { _count: { select: { guests: true } } } });
  if (duPhong && duPhong._count.guests === 0) await prisma.venue.delete({ where: { id: duPhong.id } });
  for (const v of DAI_VENUE) {
    const kpi = {
      quota: v.quota, mucTieuCongTy: v.mucTieuCongTy, mucTieuKhach: v.mucTieuKhach,
      doanhThuCamKet: v.doanhThuCamKet, soHopDongDuKien: v.soHopDongDuKien, giaTriTiecTB: v.giaTriTiecTB,
    };
    await prisma.venue.upsert({
      where: { code: v.code },
      update: { ten: v.ten, rangeStart: v.rangeStart, rangeEnd: v.rangeEnd, mauSac: v.mauSac, thuTu: v.thuTu, ...(capNhatKpi ? kpi : {}) },
      create: { code: v.code, ten: v.ten, rangeStart: v.rangeStart, rangeEnd: v.rangeEnd, mauSac: v.mauSac, thuTu: v.thuTu, ...kpi },
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
    await dongBoVenue(prisma, true);
    const ds = await prisma.staffUser.findMany({ where: { vaiTro: "SALES" }, select: { hoTen: true } });
    if (ds.length > 0) salesTeam = ds.map((d) => d.hoTen);
  } else {
    await prisma.venue.deleteMany();
    await prisma.phienDangNhap.deleteMany();
    await prisma.staffUser.deleteMany();
    await dongBoVenue(prisma, true);
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

  const phanBo: Record<string, number> = { RIVERSIDE: 18, GALLERY: 12, PARKVIEW: 10, CLARIS: 7, CHLOE: 7, CHILL: 5, MARKETING: 4 };
  const trangThaiPool = [
    TRANG_THAI.DA_CHECKIN, TRANG_THAI.DA_CHECKIN,
    TRANG_THAI.THAM_DU, TRANG_THAI.THAM_DU, TRANG_THAI.THAM_DU,
    TRANG_THAI.DA_MOI, TRANG_THAI.DA_MOI,
    TRANG_THAI.DA_PHAT_HANH,
    TRANG_THAI.DA_MOI,
    TRANG_THAI.KHONG_THAM_DU,
    TRANG_THAI.CHO_DUYET,
    TRANG_THAI.NHAP,
  ];
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
        TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN,
      ].includes(trangThai as any);
      const checkinLuc = trangThai === TRANG_THAI.DA_CHECKIN ? new Date(now - 3600000 * Math.random()) : null;


      const ct = Math.floor(Math.random() * CONG_TY_MAU.length);
      const phuTrach = chon(salesTeam);
      const hoTen = tenNgauNhien();
      const nhomMoi = chon(NHOM_MOI);
      const guest = await prisma.guest.create({
        data: {
          danhXung: hoTen.includes(" Thị ") ? "Bà" : hoTen.includes(" Văn ") ? "Ông" : chon(["Ông", "Bà"]),
          chucVu: chon(CHUC_VU),
          congTy: CONG_TY_MAU[ct],
          maCorp: `COR${String(9000000 + ct * 137).padStart(7, "0")}`,
          nhomKhachMoi: nhomMoi,
          donViKinhDoanh: nhomMoi === "Đối tác Capella" ? `Đối tác MKT ${venue.ten}` : `Capella ${venue.ten}`,
          nhomKhach: chon(["Agency/báo chí/truyền thông", "Khách end-user"]),
          linhVuc: LINH_VUC[ct % LINH_VUC.length],
          nguonKhach: chon(["Netsuite", "Netsuite", "Netsuite", "Contact mới"]),
          phongBan: nhomMoi === "Đối tác Capella" ? "Marketing" : "Phòng kinh doanh",
          doanhThuDuKien: Math.random() < 0.75 ? `${(10 + Math.floor(Math.random() * 190)) * 1000000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ" : null,
          daGuiThiepGiay: daPhatHanh && Math.random() < 0.5,
          soThuTu, maBiMat: sinhMa(), hoTen, sdt: i > 0 && Math.random() < 0.3 ? null : sdt, venueId: venue.id,
          soNguoiMoi, soNguoiXacNhan, trangThai, isVip: false, salesOwner: phuTrach, xacNhanBoi: daXacNhan ? phuTrach : null,
          phatHanhLuc: daPhatHanh ? new Date(now - 86400000 * (5 + Math.random() * 10)) : null,
          xacNhanLuc: daXacNhan ? new Date(now - 86400000 * (1 + Math.random() * 4)) : null,
          checkinLuc,
          soNguoiDen: checkinLuc ? soNguoiXacNhan || soNguoiMoi : null,
        },
      });
      if (checkinLuc) {
        await prisma.checkinLog.create({
          data: {
            guestId: guest.id, lan: `Làn ${1 + Math.floor(Math.random() * 4)}`,
            leTan: `Lễ tân ${1 + Math.floor(Math.random() * 12)}`, ketQua: "THANH_CONG", thoiGian: checkinLuc,
            cach: Math.random() < 0.4 ? "QR" : "THU_CONG",
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
        danhXung: i % 2 ? "Bà" : "Ông", chucVu: "Tổng Giám Đốc", congTy: CONG_TY_MAU[i + 4], nhomKhachMoi: "Đối tác Capella",
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

  // Mot khach trung ten va cong ty (khong co SDT) de minh hoa luat chong trung moi
  const goc = await prisma.guest.findFirst({ where: { venueId: theoCode("GALLERY").id }, orderBy: { soThuTu: "asc" } });
  if (goc) {
    await prisma.guest.create({
      data: {
        soThuTu: theoCode("GALLERY").rangeStart + 500, maBiMat: sinhMa(), hoTen: goc.hoTen, sdt: null,
        danhXung: goc.danhXung, chucVu: goc.chucVu, congTy: goc.congTy, maCorp: goc.maCorp, nhomKhachMoi: goc.nhomKhachMoi,
        venueId: goc.venueId, soNguoiMoi: 1, trangThai: TRANG_THAI.CHO_DUYET,
        salesOwner: salesTeam[3 % salesTeam.length], lyDoChoDuyet: "TRUNG_TEN",
      },
    });
  }

  return { tong: await prisma.guest.count(), venue: venues.length };
}
