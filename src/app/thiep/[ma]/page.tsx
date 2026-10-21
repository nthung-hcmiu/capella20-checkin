import { prisma } from "@/lib/db";
import { SU_KIEN, TRANG_THAI, NHAN_TRANG_THAI } from "@/lib/constants";
import { ConfirmForm } from "@/components/ConfirmForm";
import { layNguoiDung } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ThiepPage({ params }: { params: { ma: string } }) {
  // Che do demo: lay mot thiep mau da phat hanh de trai nghiem
  let ma = params.ma.toUpperCase();
  let laDemo = false;
  if (params.ma === "demo" || ma === "DEMO") {
    // Trang demo hien so thu tu va 4 so cuoi SDT cua mot khach that: chi BTC duoc xem
    const u = await layNguoiDung();
    if (u?.vaiTro !== "ADMIN") ma = "";
    laDemo = true;
    const mau = await prisma.guest.findFirst({
      where: { trangThai: { in: [TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI] } },
      orderBy: { soThuTu: "asc" },
    });
    if (mau && ma) ma = mau.maBiMat;
  }

  const guest = !ma ? null : await prisma.guest.findUnique({
    where: { maBiMat: ma },
    include: { venue: true },
  });

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

  const daPhanHoi = [TRANG_THAI.THAM_DU, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN].includes(
    guest.trangThai as any
  );

  return (
    <Khung>
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-gold-deep">Trân trọng kính mời</div>
        <h1 className="mt-3 font-display text-2xl text-ink">{guest.hoTen}</h1>
        <div className="mx-auto mt-4 deco-line w-28" />
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Đến dự Đêm tri ân khách hàng nhân dịp kỷ niệm <b>20 năm Capella</b>.
        </p>
        <div className="mt-5 rounded-xl bg-ivory/70 px-4 py-3 text-sm text-ink">
          <div className="font-display text-base">{SU_KIEN.ngay}</div>
          <div className="text-ink-muted">{SU_KIEN.diaDiem}</div>
        </div>
      </div>

      <div className="mt-6 hairline pt-6">
        {daPhanHoi ? (
          <div className="rounded-xl bg-sage/10 p-5 text-center">
            <div className="font-display text-base text-ink">
              Đã ghi nhận: {NHAN_TRANG_THAI[guest.trangThai]}
            </div>
            {guest.soNguoiXacNhan != null && guest.trangThai !== TRANG_THAI.KHONG_THAM_DU && (
              <div className="mt-1 text-sm text-ink-muted">{guest.soNguoiXacNhan} người tham dự</div>
            )}
            <p className="mt-2 text-xs text-ink-muted">Cần thay đổi, quý khách vui lòng liên hệ nhân viên Capella đã gửi thiệp.</p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-center font-display text-lg text-ink">Xác nhận tham dự</h2>
            <ConfirmForm
              ma={ma}
              soNguoiMoi={guest.soNguoiMoi}
              daXacNhan={guest.soNguoiXacNhan}
              trangThai={guest.trangThai}
              goiYSo={laDemo ? guest.soThuTu : undefined}
              goiYLast4={laDemo ? guest.sdt.slice(-4) : undefined}
            />
          </>
        )}
      </div>
    </Khung>
  );
}

function Khung({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-ivory px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-5 text-center">
          <span className="font-display text-sm tracking-[0.25em] text-ink-muted">
            CAPELLA <span className="text-gold">20</span>
          </span>
        </div>
        <div className="card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-gold-soft via-gold to-gold-deep" />
          <div className="p-7">{children}</div>
        </div>
        <p className="mt-5 text-center text-[11px] text-ink-muted">
          Trang xác nhận khách mời · Capella 20 năm
        </p>
      </div>
    </main>
  );
}
