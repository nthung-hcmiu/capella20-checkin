import type { Metadata, Viewport } from "next";
import QRCode from "qrcode";
import { Brand } from "@/components/Brand";
import { prisma } from "@/lib/db";
import { DUOC_XAC_NHAN, TRANG_THAI } from "@/lib/constants";
import { layNguoiDung } from "@/lib/auth";
import { khachDiKemThu, tenGoi } from "@/lib/khach";
import { urlQR } from "@/lib/codes";
import { dinhDangGioNgan } from "@/lib/format";
import { docTraLoi } from "@/lib/xacNhan";
import { ThiepDong } from "@/components/ThiepDong";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Thiệp mời | Dạ tiệc tri ân & kỷ niệm 20 năm Capella Holdings",
  description: "A Legacy of Moments. 18:00 thứ Năm 03.12.2026, Grand Ballroom, Riverside Palace.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4a060d" };

// Thiep online: trang dong theo tranh cua designer (ThiepDong). Khach cuon xuong xem thoi gian, chuong trinh,
// xac nhan tham du, cuoi trang la ma QR check in va so thu tu thiep.
// Khach tu xac nhan tham du ngay tren trang nay (moi nguoi tra loi cho rieng minh); sales van xac nhan giup duoc tren dashboard.
// ?k=2: thiep rieng cua khach di kem tren cung ve, ghi ten nguoi do va ma QR rieng.
export default async function ThiepPage({ params, searchParams }: { params: { ma: string }; searchParams: { k?: string } }) {
  let ma = params.ma.toUpperCase();
  if (ma === "DEMO") {
    // Xem mau thiep cua mot khach that: chi BTC
    const u = await layNguoiDung();
    const mau =
      u?.vaiTro === "ADMIN"
        ? await prisma.guest.findFirst({
            where: { trangThai: { in: [TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU] } },
            orderBy: { soThuTu: "asc" },
          })
        : null;
    ma = mau?.maBiMat || "";
  }

  const guest = !ma ? null : await prisma.guest.findUnique({ where: { maBiMat: ma } });

  if (!guest || guest.trangThai === TRANG_THAI.DA_HUY) {
    return (
      <Khung>
        <div className="text-center">
          <div className="font-display text-xl text-ink">Thiệp không hợp lệ</div>
          <p className="mt-2 text-sm text-ink-muted">
            Mã thiệp không tồn tại hoặc đã bị hủy. Quý khách vui lòng liên hệ nhân viên Capella đã gửi thiệp.
          </p>
        </div>
      </Khung>
    );
  }

  // Khach di kem: k hop le va nguoi do da co ten; khong thi hien thiep cua khach chinh
  const kXin = parseInt(String(searchParams.k || ""), 10);
  const diKem = khachDiKemThu(guest, kXin);
  const k = diKem ? kXin : null;
  const nguoiMoi = diKem ? { danhXung: diKem.danhXung || null, hoTen: diKem.hoTen } : guest;
  const chucVuMoi = diKem ? diKem.chucVu : guest.chucVu;
  // Ai da den: ve check in kieu cu (khong ghi tung nguoi) thi coi nhu ca ve da den
  const daDen = (guest.nguoiDaDen || "").split(",").filter(Boolean);
  const nguoiNayDaDen = guest.trangThai === TRANG_THAI.DA_CHECKIN && (daDen.length === 0 || daDen.includes(String(k ?? 1)));

  const qrSvg = await QRCode.toString(urlQR(guest.maBiMat, undefined, k), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1a1613", light: "#ffffff" },
  });
  // Cau tra loi dang ghi nhan cua nguoi nay. Sales xac nhan giup "mot phan so nguoi tham du" thi khong biet ai vang,
  // nen nguoi chua tu tra loi van duoc hoi, khong hien san la khong tham du.
  const traLoiGhi = docTraLoi(guest).get(k ?? 1) ?? null;
  const traLoiHien = guest.nguoiXacNhan == null && guest.trangThai === TRANG_THAI.THAM_DU && traLoiGhi === "-" ? null : traLoiGhi;

  return (
    <ThiepDong
      ma={guest.maBiMat}
      k={k}
      ten={tenGoi(nguoiMoi)}
      chucVu={chucVuMoi || null}
      congTy={guest.congTy}
      soThuTu={guest.soThuTu}
      qrSvg={qrSvg}
      duocXacNhan={DUOC_XAC_NHAN.includes(guest.trangThai)}
      traLoi={traLoiHien}
      daDenLuc={nguoiNayDaDen ? (guest.checkinLuc ? dinhDangGioNgan(guest.checkinLuc) : "") : null}
      laKhachDiKem={!!diKem}
    />
  );
}

function Khung({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-ivory px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-5 text-center">
          <div className="flex justify-center">
            <Brand lon />
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="h-1.5 bg-brand" />
          <div className="p-7">{children}</div>
        </div>
        <p className="mt-5 text-center text-[11px] text-ink-muted">Thiệp mời online · Capella 20 năm</p>
      </div>
    </main>
  );
}
