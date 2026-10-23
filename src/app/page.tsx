import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { UserBar } from "@/components/UserBar";
import { prisma } from "@/lib/db";
import { layNguoiDung } from "@/lib/auth";
import { CHISO, SU_KIEN, TRANG_THAI, TRANG_CHINH } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MODULES = [
  {
    href: "/sales",
    ma: "A",
    ten: "Cổng Sales",
    thietBi: "Điện thoại, máy tính",
    mo: "Lập và nhập danh sách khách, gửi thiệp online và thiệp giấy, xác nhận tham dự thay khách, theo dõi tổng quan khách của mình.",
    mau: "#b5303a",
    vaiTro: ["ADMIN", "SALES"],
  },
  {
    href: "/admin",
    ma: "B",
    ten: "Quản trị BTC",
    thietBi: "Máy tính",
    mo: "Nhập danh sách, duyệt và phát hành vé, theo dõi KPI venue, in QR thiệp giấy, đối soát và báo cáo.",
    mau: "#6b2b36",
    vaiTro: ["ADMIN"],
  },
  {
    href: "/thiep/demo",
    ma: "C",
    ten: "Thiệp online",
    thietBi: "Công khai",
    mo: "Khách mở thiệp xem thông tin sự kiện và mã QR, đưa mã QR này (hoặc thiệp giấy) cho lễ tân khi đến.",
    mau: "#5c6b4f",
    vaiTro: ["ADMIN"],
  },
  {
    href: "/checkin",
    ma: "D",
    ten: "App check in",
    thietBi: "Lễ tân theo ca",
    mo: "Quét QR, nhập số, tìm tên hoặc số điện thoại. Mỗi mã chỉ check in một lần.",
    mau: "#3a5a6b",
    vaiTro: ["ADMIN", "LE_TAN"],
  },
];

export default async function Home({ searchParams }: { searchParams: { khongQuyen?: string } }) {
  const u = await layNguoiDung();
  if (!u) redirect("/dang-nhap");
  if (u.doiMatKhau) redirect("/doi-mat-khau");
  // Sales va le tan chi co mot phan he, dua thang vao
  if (u.vaiTro !== "ADMIN" && !searchParams.khongQuyen) redirect(TRANG_CHINH[u.vaiTro] || "/dang-nhap");

  const [tong, xacNhan, checkin] = await Promise.all([
    prisma.guest.count(),
    prisma.guest.count({ where: { trangThai: { in: [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN] } } }),
    prisma.guest.count({ where: { trangThai: TRANG_THAI.DA_CHECKIN } }),
  ]);
  const modules = MODULES.filter((m) => m.vaiTro.includes(u.vaiTro));

  return (
    <main className="min-h-screen">
      <section className="border-b border-ivory-deep bg-white">
        <div className="h-1.5 bg-brand" />
        <div className="mx-auto max-w-5xl px-5 pt-5 pb-14">
          <div className="flex items-center justify-between gap-3">
            <Brand sub="Hệ thống khách mời" />
            <UserBar u={u} />
          </div>
          <div className="mt-12 text-center">
            <div className="text-xs font-medium uppercase tracking-[0.3em] text-brand">Đêm tri ân khách hàng</div>
            <h1 className="mt-4 font-display text-4xl text-ink sm:text-5xl">
              Capella <span className="text-brand">20 năm</span>
            </h1>
            <div className="mx-auto mt-5 deco-line w-40" />
            <p className="mt-5 text-sm text-ink-muted">
              {SU_KIEN.ngay} · {SU_KIEN.diaDiem} · {SU_KIEN.soKhach} khách · 5 venue
            </p>
          </div>
        </div>
      </section>

      {searchParams.khongQuyen && (
        <div className="mx-auto mt-6 max-w-5xl px-5">
          <div className="rounded-xl bg-wine/10 px-4 py-3 text-sm text-wine">
            Tài khoản của bạn không được vào trang vừa mở.
          </div>
        </div>
      )}

      {u.vaiTro === "ADMIN" && (
        <section className="mx-auto -mt-8 max-w-5xl px-5">
          <div className="card grid grid-cols-2 gap-px overflow-hidden bg-ivory-deep sm:grid-cols-4">
            <SoDemo nhan="Ngưỡng xác nhận" so={CHISO.nguongXacNhan} chu="người mục tiêu" />
            <SoDemo nhan="Thiệp phát hành" so={CHISO.soThiepPhatHanh} chu="dự kiến" />
            <SoDemo nhan="Đã xác nhận" so={xacNhan} chu={`/ ${tong} khách trong hệ thống`} />
            <SoDemo nhan="Đã check in" so={checkin} chu="trên hệ thống" />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl text-ink">Các phân hệ</h2>
          <span className="text-xs text-ink-muted">Một cơ sở dữ liệu chung</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className="group card p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-xl text-white"
                  style={{ backgroundColor: m.mau }}
                >
                  {m.ma}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg text-ink">{m.ten}</h3>
                    <span className="chip bg-ivory-deep text-ink-muted">{m.thietBi}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{m.mo}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand group-hover:gap-2">
                    Mở phân hệ <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {u.vaiTro === "ADMIN" && (
        <section className="mx-auto max-w-5xl px-5 pb-16">
          <div className="card p-6">
            <h2 className="font-display text-lg text-ink">Vòng đời khách</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              {[
                "Nháp", "Chờ duyệt", "Đã phát hành vé", "Đã mời",
                "Tham dự / Không tham dự", "Đã check in / Vắng mặt",
              ].map((b, i, arr) => (
                <span key={b} className="flex items-center gap-2">
                  <span className="chip bg-ivory-deep text-ink-soft">{b}</span>
                  {i < arr.length - 1 && <span className="text-brand">→</span>}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              Sales lưu nháp và bấm Gửi duyệt, BTC duyệt thì phát hành vé. Hủy được ở mọi bước trước sự kiện, mã thiệp mất hiệu lực.
              Quota và mục tiêu venue lấy theo bảng KPI.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

function SoDemo({ nhan, so, chu }: { nhan: string; so: number; chu: string }) {
  return (
    <div className="bg-white px-5 py-5 text-center">
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</div>
      <div className="mt-1 font-display text-3xl text-ink">{so.toLocaleString("vi-VN")}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{chu}</div>
    </div>
  );
}
