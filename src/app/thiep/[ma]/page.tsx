import QRCode from "qrcode";
import { Brand } from "@/components/Brand";
import { prisma } from "@/lib/db";
import { SU_KIEN, TRANG_THAI } from "@/lib/constants";
import { layNguoiDung } from "@/lib/auth";
import { tenGoi } from "@/lib/khach";
import { urlQR } from "@/lib/codes";
import { dinhDangGioNgan } from "@/lib/format";

export const dynamic = "force-dynamic";

// Thiep online: khach xem thong tin su kien va dua ma QR nay cho le tan khi den.
// Khach khong tu xac nhan; sales xac nhan tren he thong sau khi hoi khach.
export default async function ThiepPage({ params }: { params: { ma: string } }) {
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

  const qrSvg = await QRCode.toString(urlQR(guest.maBiMat), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1a1613", light: "#ffffff" },
  });

  return (
    <Khung>
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-brand-deep">Trân trọng kính mời</div>
        <h1 className="mt-3 font-display text-2xl text-ink">{tenGoi(guest)}</h1>
        {(guest.chucVu || guest.congTy) && (
          <p className="mt-1 text-sm text-ink-muted">{[guest.chucVu, guest.congTy].filter(Boolean).join(" · ")}</p>
        )}
        <div className="mx-auto mt-4 deco-line w-28" />
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Đến dự Đêm tri ân khách hàng nhân dịp kỷ niệm <b>20 năm Capella</b>.
        </p>
        <div className="mt-5 rounded-xl bg-ivory/70 px-4 py-3 text-sm text-ink">
          <div className="font-display text-base">{SU_KIEN.ngay}</div>
          <div className="text-ink-muted">{SU_KIEN.diaDiem}</div>
        </div>
      </div>

      <div className="mt-6 hairline pt-6 text-center">
        {guest.trangThai === TRANG_THAI.DA_CHECKIN ? (
          <div className="rounded-xl bg-sage/10 p-5">
            <div className="font-display text-lg text-ink">Quý khách đã check in</div>
            {guest.checkinLuc && (
              <p className="mt-1 text-sm text-ink-muted">
                Lúc {dinhDangGioNgan(guest.checkinLuc)}. Chúc quý khách một buổi tối thật vui.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="text-xs font-medium uppercase tracking-wider text-ink-muted">Mã check in của quý khách</div>
            <div
              className="mx-auto mt-3 w-full max-w-[260px] rounded-2xl border border-ivory-deep bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="mt-3 text-sm text-ink-soft">
              Số thứ tự thiệp <span className="font-mono text-lg font-medium text-ink">{guest.soThuTu}</span>
            </div>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-ink-muted">
              Vui lòng đưa mã QR này (hoặc thiệp giấy có QR) cho lễ tân tại quầy đón khách. Không quét được thì đọc số thứ tự thiệp.
            </p>
            <a href={`/api/qr/${guest.maBiMat}`} download={`capella20-qr-${guest.soThuTu}.png`} className="btn-ghost btn-sm mt-4">
              Lưu ảnh mã QR
            </a>
          </>
        )}

        {guest.trangThai === TRANG_THAI.THAM_DU && guest.soNguoiXacNhan != null && (
          <p className="mt-4 text-xs text-sage">Capella đã ghi nhận quý khách tham dự, {guest.soNguoiXacNhan} người.</p>
        )}
        <p className="mt-4 text-[11px] text-ink-muted">Cần thay đổi, quý khách vui lòng liên hệ nhân viên Capella đã gửi thiệp.</p>
      </div>
    </Khung>
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
