import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { TRANG_THAI } from "@/lib/constants";
import { docDiCung, tenGoi } from "@/lib/khach";
import { canThiepGiay } from "@/lib/congTy";
import { urlQR } from "@/lib/codes";
import { NutIn } from "@/components/NutIn";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Trang in QR dan len thiep giay. Sales in khach cua minh, BTC loc theo venue / sales.
export default async function InQRPage({
  searchParams,
}: {
  searchParams: { venue?: string; sales?: string; chuaGiay?: string };
}) {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/in-qr");
  const laBTC = u.vaiTro === "ADMIN";
  const chuaGiay = searchParams.chuaGiay === "1";
  // BTC duoc giao venue: chi in QR khach cua venue do, cong khach chinh minh phu trach
  const xemBtc = u.phamViXem ? { OR: [{ venueId: { in: u.phamViXem } }, { salesOwner: u.hoTen }] } : {};
  const [venues, dsSales] = laBTC
    ? await Promise.all([
        prisma.venue.findMany({ where: u.phamViXem ? { id: { in: u.phamViXem } } : {}, orderBy: { thuTu: "asc" }, select: { id: true, ten: true } }),
        prisma.guest.findMany({ where: xemBtc, distinct: ["salesOwner"], select: { salesOwner: true }, orderBy: { salesOwner: "asc" } }),
      ])
    : [[], []];

  const guests = await prisma.guest.findMany({
    where: {
      trangThai: { notIn: [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_HUY] },
      ...(laBTC ? { AND: [xemBtc] } : { salesOwner: u.hoTen }),
      ...(laBTC && searchParams.venue ? { venueId: searchParams.venue } : {}),
      ...(laBTC && searchParams.sales ? { salesOwner: searchParams.sales } : {}),
      ...(chuaGiay ? { daGuiThiepGiay: false } : {}),
    },
    include: { venue: true },
    orderBy: { soThuTu: "asc" },
    take: 1500,
  });

  // Moi nguoi mot thiep giay: khach chinh va tung khach di kem da co ten, moi nguoi mot ma QR rieng.
  // Sales va marketing noi bo Capella khong can thiep giay nen khong in.
  const canIn = guests.filter(canThiepGiay);
  const soNoiBo = guests.length - canIn.length;
  const nguoi = canIn.flatMap((g) => [
    { g, k: null as number | null, ten: tenGoi(g), khoa: g.id },
    ...docDiCung(g.khachDiCung)
      .slice(0, Math.max(0, g.soNguoiMoi - 1))
      .map((x, i) => ({ g, k: i + 2, ten: [x.danhXung, x.hoTen].filter(Boolean).join(" "), khoa: `${g.id}-${i + 2}` }))
      .filter((x) => x.ten.trim()),
  ]);
  const the = await Promise.all(
    nguoi.map(async (n) => ({
      ...n,
      svg: await QRCode.toString(urlQR(n.g.maBiMat, undefined, n.k), { type: "svg", errorCorrectionLevel: "M", margin: 1 }),
    }))
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-5 py-5 print:hidden">
        <h1 className="font-display text-xl text-ink">In mã QR cho thiệp giấy</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {the.length.toLocaleString("vi-VN")} thiệp giấy cho {canIn.length.toLocaleString("vi-VN")} vé đã phát hành{laBTC ? "" : ` của ${u.hoTen}`}: mỗi
          khách một ô, khách đi kèm có ô và mã QR riêng.
          {soNoiBo > 0 ? ` Không in ${soNoiBo.toLocaleString("vi-VN")} vé của sales và marketing nội bộ Capella (chỉ dùng thiệp online).` : ""} Mỗi trang A4 in 12 ô.
          Khi in, chọn khổ A4 và tắt “Đầu trang và chân trang”.
        </p>
        <form className="mt-4 flex flex-wrap items-center gap-3">
          {laBTC && (
            <>
              <select name="venue" defaultValue={searchParams.venue || ""} className="input w-auto">
                <option value="">Mọi venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.ten}
                  </option>
                ))}
              </select>
              <select name="sales" defaultValue={searchParams.sales || ""} className="input w-auto">
                <option value="">Mọi người phụ trách</option>
                {dsSales.map((s) => (
                  <option key={s.salesOwner} value={s.salesOwner}>
                    {s.salesOwner}
                  </option>
                ))}
              </select>
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="chuaGiay" value="1" defaultChecked={chuaGiay} className="h-4 w-4 accent-brand" />
            Chỉ thiệp giấy chưa gửi
          </label>
          <button className="btn-ghost">Lọc</button>
          <NutIn />
        </form>
      </div>

      <div className="mx-auto grid max-w-[190mm] grid-cols-3 gap-[4mm] px-5 pb-10 print:max-w-none print:px-0">
        {the.map(({ g, k, ten, khoa, svg }) => (
          <div key={khoa} className="flex h-[66mm] break-inside-avoid flex-col items-center justify-center rounded-lg border border-ink/15 p-[3mm] text-center">
            <div className="w-[36mm] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-[2mm] font-mono text-[11pt] font-semibold text-ink">
              {g.soThuTu}
              {k ? <span className="font-sans text-[8pt] font-normal text-ink-muted"> · khách thứ {k}</span> : null}
            </div>
            <div className="line-clamp-1 text-[9pt] font-medium text-ink">{ten}</div>
            <div className="line-clamp-1 text-[7.5pt] text-ink-muted">{g.congTy || g.venue.ten}</div>
          </div>
        ))}
      </div>
      {the.length === 0 && <p className="py-10 text-center text-sm text-ink-muted">Không có thiệp nào để in.</p>}
    </main>
  );
}
