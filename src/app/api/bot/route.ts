import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NHAN_TRANG_THAI, TRANG_THAI } from "@/lib/constants";
import { layNguoiDung, locDuocDung, locPhamVi, quyenVoiKhach, type NguoiDung } from "@/lib/auth";
import {
  duyetKhach,
  duyetKhongCanhBao,
  traVeNhap,
  huyKhach,
  danhDauDaMoi,
  chotVangMat,
  xacNhanKhach,
  datVip,
  datThiepGiay,
  taoKhach,
  suaKhach,
  thaoTacHangLoat,
  xoaKhach,
  type LoaiHangLoat,
} from "@/lib/actions";

// API cho tro ly (H Mini): thao tac thang tren du lieu, dung phien dang nhap cua nguoi goi.
// Lenh ghi: quyen do cac server action goc kiem tra (ADMIN/SALES + pham vi venue).
// Lenh doc: route nay tu ap pham vi cua nguoi goi (locDuocDung / locPhamVi / quyenVoiKhach),
// vi truy van Prisma truc tiep thi khong co lop kiem tra nao khac.

export const dynamic = "force-dynamic";

const TEN_TRANG_THAI = NHAN_TRANG_THAI;

// Le tan khong dung API nay: tra cuu luc check in da co /api/lookup.
const VAI_TRO_DUOC_GOI = ["ADMIN", "SALES"];
const duocGoi = (u: NguoiDung | null): u is NguoiDung => !!u && !u.doiMatKhau && VAI_TRO_DUOC_GOI.includes(u.vaiTro);

const KHONG_TIM_THAY = { ok: false, thongBao: "Khong tim thay khach." };
const khongDuQuyen = () => NextResponse.json({ ok: false, thongBao: "Khong du quyen cho thao tac nay." }, { status: 403 });

// Doc mot khach theo id trong pham vi cua nguoi goi. Khach ngoai pham vi duoc coi nhu khong ton tai,
// de khong lo ten, trang thai va cung khong do duoc id nao co that.
async function khachDuocDung(u: NguoiDung, id: string) {
  const g = await prisma.guest.findUnique({ where: { id }, include: { venue: true } });
  return g && quyenVoiKhach(u, g) ? g : null;
}

function gon(g: any) {
  return {
    id: g.id,
    soThuTu: g.soThuTu,
    hoTen: g.hoTen,
    sdt: g.sdt,
    congTy: g.congTy ?? null,
    venue: g.venue?.ten ?? null,
    trangThai: g.trangThai,
    trangThaiTen: TEN_TRANG_THAI[g.trangThai] ?? g.trangThai,
    soNguoiMoi: g.soNguoiMoi,
    isVip: g.isVip,
    salesOwner: g.salesOwner,
    checkinLuc: g.checkinLuc,
  };
}

export async function GET() {
  const u = await layNguoiDung();
  return NextResponse.json({
    ok: duocGoi(u),
    nguoiDung: u ? { hoTen: u.hoTen, vaiTro: u.vaiTro, quanTri: u.quanTri, venue: u.venueTen } : null,
  });
}

export async function POST(req: NextRequest) {
  const u = await layNguoiDung();
  if (!u) return NextResponse.json({ ok: false, thongBao: "Chua dang nhap (thieu phien c20_phien)." }, { status: 401 });
  if (u.doiMatKhau) return NextResponse.json({ ok: false, thongBao: "Tai khoan phai doi mat khau truoc khi dung tro ly." }, { status: 403 });
  if (!duocGoi(u)) return khongDuQuyen();

  const body = await req.json().catch(() => ({} as any));
  const action = String(body.action || "");
  const id = body.id ? String(body.id) : undefined;

  try {
    switch (action) {
      // --- Tra cuu ---
      case "tim": {
        const q = String(body.q || "").trim();
        if (!q) return NextResponse.json({ ok: false, thongBao: "Thieu tu khoa (q)." });
        const ds = await prisma.guest.findMany({
          where: {
            // AND tach rieng tu khoa va pham vi: locDuocDung cung co the tra ve mot OR
            AND: [{ OR: [{ hoTen: { contains: q } }, { sdt: { contains: q } }, { congTy: { contains: q } }] }, locDuocDung(u)],
            ...(body.trangThai ? { trangThai: String(body.trangThai) } : {}),
          },
          include: { venue: true },
          orderBy: { updatedAt: "desc" },
          take: Math.min(Number(body.limit) || 10, 30),
        });
        return NextResponse.json({ ok: true, thongBao: `Tim thay ${ds.length} khach.`, data: ds.map(gon) });
      }
      case "cho_duyet": {
        // Hang cho duyet la viec cua BTC, trong cac venue duoc giao (giong trang /admin/duyet)
        if (u.vaiTro !== "ADMIN") return khongDuQuyen();
        const where = { trangThai: TRANG_THAI.CHO_DUYET, ...locPhamVi(u) };
        const ds = await prisma.guest.findMany({
          where,
          include: { venue: true },
          orderBy: { updatedAt: "asc" },
          take: Math.min(Number(body.limit) || 20, 100),
        });
        const tong = await prisma.guest.count({ where });
        return NextResponse.json({ ok: true, thongBao: `${tong} khach cho duyet.`, data: ds.map(gon), tong });
      }
      case "khach": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        const g = await khachDuocDung(u, id);
        if (!g) return NextResponse.json(KHONG_TIM_THAY);
        return NextResponse.json({ ok: true, thongBao: "OK", data: gon(g) });
      }
      case "venue": {
        const ds = await prisma.venue.findMany({ orderBy: { ten: "asc" } });
        return NextResponse.json({
          ok: true,
          thongBao: `${ds.length} venue.`,
          data: ds.map((v: any) => ({ id: v.id, ten: v.ten, quota: v.quota })),
        });
      }

      // --- Duyet / phat hanh ---
      case "duyet": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        const g = await khachDuocDung(u, id);
        if (!g) return NextResponse.json(KHONG_TIM_THAY);
        if (!["NHAP", "CHO_DUYET"].includes(g.trangThai)) {
          return NextResponse.json({ ok: false, thongBao: `${g.hoTen} dang o trang thai ${TEN_TRANG_THAI[g.trangThai] || g.trangThai}, khong duyet lai duoc.` });
        }
        await duyetKhach(id);
        const sau = await prisma.guest.findUnique({ where: { id }, select: { trangThai: true, soThuTu: true } });
        if (sau?.trangThai !== TRANG_THAI.DA_PHAT_HANH) {
          return NextResponse.json({ ok: false, thongBao: "Khong duyet duoc: khach ngoai pham vi venue cua ban hoac trang thai da doi." });
        }
        return NextResponse.json({ ok: true, thongBao: `Da duyet va phat hanh thiep cho ${g.hoTen} (so thu tu ${sau.soThuTu}).` });
      }
      case "duyet_khong_canh_bao":
        return NextResponse.json(await duyetKhongCanhBao());
      case "tra_nhap": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        return NextResponse.json(await traVeNhap(id));
      }
      case "huy": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        const g = await khachDuocDung(u, id);
        if (!g) return NextResponse.json(KHONG_TIM_THAY);
        await huyKhach(id);
        const sau = await prisma.guest.findUnique({ where: { id }, select: { trangThai: true } });
        return sau?.trangThai === TRANG_THAI.DA_HUY
          ? NextResponse.json({ ok: true, thongBao: `Da huy ${g.hoTen}.` })
          : NextResponse.json({ ok: false, thongBao: "Khong huy duoc: khach ngoai pham vi venue cua ban." });
      }
      case "da_moi": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        const g = await khachDuocDung(u, id);
        if (!g) return NextResponse.json(KHONG_TIM_THAY);
        if (g.trangThai !== TRANG_THAI.DA_PHAT_HANH) {
          return NextResponse.json({ ok: false, thongBao: `${g.hoTen} dang ${TEN_TRANG_THAI[g.trangThai] || g.trangThai}; chi danh dau da moi khi thiep da phat hanh.` });
        }
        await danhDauDaMoi(id);
        return NextResponse.json({ ok: true, thongBao: `Da danh dau da gui thiep cho ${g.hoTen}.` });
      }
      case "chot_vang_mat":
        return NextResponse.json(await chotVangMat());

      // --- Khach xac nhan ---
      case "xac_nhan": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        const kq = String(body.ketQua || "");
        if (!["THAM_DU", "KHONG_THAM_DU", "DA_MOI"].includes(kq)) {
          return NextResponse.json({ ok: false, thongBao: "ketQua phai la THAM_DU | KHONG_THAM_DU | DA_MOI." });
        }
        return NextResponse.json(await xacNhanKhach(id, kq as any, Number(body.soNguoi) || 1));
      }

      // --- Thong tin khach ---
      case "vip": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        await datVip(id, body.isVip !== false);
        return NextResponse.json({ ok: true, thongBao: body.isVip === false ? "Da bo VIP." : "Da dat VIP." });
      }
      case "thiep_giay": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        if (!(await khachDuocDung(u, id))) return NextResponse.json(KHONG_TIM_THAY);
        await datThiepGiay(id, body.daGui !== false);
        return NextResponse.json({ ok: true, thongBao: "Da cap nhat thiep giay." });
      }
      case "tao_khach":
        return NextResponse.json(await taoKhach(body.input || {}));
      case "sua_khach": {
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        return NextResponse.json(await suaKhach(id, body.input || {}));
      }
      case "hang_loat": {
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        return NextResponse.json(await thaoTacHangLoat(ids, String(body.loai) as LoaiHangLoat, body.giaTri ? String(body.giaTri) : undefined));
      }
      // Xoa han khoi CSDL: chi dung de don du lieu test, chi Quan tri duoc goi. KHONG khai bao trong TOOLS cua tro ly.
      case "xoa": {
        if (!u.quanTri) return khongDuQuyen();
        if (!id) return NextResponse.json({ ok: false, thongBao: "Thieu id." });
        return NextResponse.json(await xoaKhach(id));
      }

      default:
        return NextResponse.json({ ok: false, thongBao: `Action khong ho tro: ${action}` }, { status: 400 });
    }
  } catch (e: any) {
    const laQuyen = e?.name === "LoiQuyen" || /quyen/i.test(String(e?.message || ""));
    return NextResponse.json(
      { ok: false, thongBao: laQuyen ? "Khong du quyen cho thao tac nay." : `Loi: ${e?.message || e}` },
      { status: laQuyen ? 403 : 500 }
    );
  }
}
