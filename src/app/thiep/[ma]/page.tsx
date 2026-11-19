import QRCode from "qrcode";
import { Brand } from "@/components/Brand";
import { prisma } from "@/lib/db";
import { SU_KIEN, TRANG_THAI } from "@/lib/constants";
import { layNguoiDung } from "@/lib/auth";
import { khachDiKemThu, tenGoi } from "@/lib/khach";
import { urlQR } from "@/lib/codes";
import { dinhDangGioNgan } from "@/lib/format";

export const dynamic = "force-dynamic";

// Thiep online: hien thiep theo mau cua designer (file hinh co ten khach va ma QR), ben duoi la so thu tu thiep
// va huong dan dua ma QR cho le tan khi den.
// Khach khong tu xac nhan; sales xac nhan tren he thong sau khi hoi khach.
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
  const thamSo = k ? `?k=${k}` : "";
  const moTaAnh = `Thiệp mời ${tenGoi(nguoiMoi)}${[chucVuMoi, guest.congTy].filter(Boolean).length ? `, ${[chucVuMoi, guest.congTy].filter(Boolean).join(", ")}` : ""}. Dạ tiệc tri ân và kỷ niệm 20 năm Capella Holdings, ${SU_KIEN.ngay}, ${SU_KIEN.diaDiem}.`;

  return (
    <main className="min-h-screen bg-ivory px-4 py-6">
      <div className="mx-auto max-w-md">
        {nguoiNayDaDen && (
          <div className="mb-4 rounded-xl bg-sage/10 p-4 text-center">
            <div className="font-display text-lg text-ink">Quý khách đã check in</div>
            {guest.checkinLuc && (
              <p className="mt-1 text-sm text-ink-muted">Lúc {dinhDangGioNgan(guest.checkinLuc)}. Chúc quý khách một buổi tối thật vui.</p>
            )}
          </div>
        )}

        {/* Thiep theo mau cua designer: ten, chuc vu, cong ty va ma QR cua dung nguoi nay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/thiep-anh/${guest.maBiMat}${thamSo}`}
          alt={moTaAnh}
          width={900}
          height={2000}
          className="block h-auto w-full rounded-2xl bg-wine shadow-card"
        />

        <div className="card mt-4 p-6 text-center">
          <div className="text-sm text-ink-soft">
            Số thứ tự thiệp <span className="font-mono text-2xl font-medium text-ink">{guest.soThuTu}</span>
          </div>
          <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-ink-muted">
            Vui lòng đưa mã QR này (hoặc thiệp giấy có QR) cho lễ tân tại quầy đón khách. Không quét được thì đọc số thứ tự thiệp.
            {diKem ? " Đây là mã riêng của quý khách, dùng được cả khi đến trước hoặc sau người cùng đoàn." : ""}
          </p>

          {!nguoiNayDaDen && (
            <details className="mt-4">
              <summary className="btn-ghost btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">Phóng to mã QR</summary>
              <div
                className="mx-auto mt-3 w-full max-w-[260px] rounded-2xl border border-ivory-deep bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </details>
          )}
          <div className="mt-3">
            <a href={`/api/thiep-anh/${guest.maBiMat}${thamSo ? `${thamSo}&tai=1` : "?tai=1"}`} download={`thiep-capella20-${guest.soThuTu}${k ? `-khach-${k}` : ""}.jpg`} className="btn-ghost btn-sm">
              Lưu thiệp về máy
            </a>
          </div>

          {!diKem && guest.trangThai === TRANG_THAI.THAM_DU && guest.soNguoiXacNhan != null && (
            <p className="mt-4 text-xs text-sage">Capella đã ghi nhận quý khách tham dự, {guest.soNguoiXacNhan} người.</p>
          )}
          <p className="mt-4 text-[11px] text-ink-muted">Cần thay đổi, quý khách vui lòng liên hệ nhân viên Capella đã gửi thiệp.</p>
        </div>
        <p className="mt-5 text-center text-[11px] text-ink-muted">Thiệp mời online · Capella 20 năm</p>
      </div>
    </main>
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
