import Link from "next/link";
import { Brand } from "@/components/Brand";
import { prisma } from "@/lib/db";
import { CHISO, SU_KIEN, TRANG_THAI } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MODULES = [
  {
    href: "/sales",
    ma: "A",
    ten: "Cong Sales",
    thietBi: "Dien thoai",
    mo: "Lap danh sach khach, theo doi quota, xem trang thai khach cua minh.",
    mau: "#b08d42",
  },
  {
    href: "/admin",
    ma: "B",
    ten: "Quan tri BTC",
    thietBi: "May tinh",
    mo: "Chong trung, duyet VIP, phan quota, phat hanh thiep, xep ban, bao cao.",
    mau: "#6b2b36",
  },
  {
    href: "/thiep/demo",
    ma: "C",
    ten: "Trang thiep khach",
    thietBi: "Cong khai",
    mo: "Khach quet QR, nhap so thu tu va 4 so cuoi SDT de xac nhan tham du.",
    mau: "#5c6b4f",
  },
  {
    href: "/checkin",
    ma: "D",
    ten: "App check in",
    thietBi: "Le tan theo ca",
    mo: "Quet QR, nhap so, tim ten hoac SDT. Moi ma check in mot lan.",
    mau: "#3a5a6b",
  },
];

async function laySo() {
  const [tong, xacNhan, checkin, phatHanh] = await Promise.all([
    prisma.guest.count(),
    prisma.guest.count({
      where: { trangThai: { in: [TRANG_THAI.THAM_DU, TRANG_THAI.DA_CHECKIN] } },
    }),
    prisma.guest.count({ where: { trangThai: TRANG_THAI.DA_CHECKIN } }),
    prisma.guest.count({
      where: {
        trangThai: {
          in: [
            TRANG_THAI.DA_PHAT_HANH, TRANG_THAI.DA_MOI, TRANG_THAI.THAM_DU,
            TRANG_THAI.CHUA_PHAN_HOI, TRANG_THAI.KHONG_THAM_DU, TRANG_THAI.DA_CHECKIN,
          ],
        },
      },
    }),
  ]);
  return { tong, xacNhan, checkin, phatHanh };
}

export default async function Home() {
  const so = await laySo();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-5xl px-5 pt-6 pb-14">
          <Brand light sub="He thong khach moi" />
          <div className="mt-12 text-center">
            <div className="text-xs uppercase tracking-[0.35em] text-gold-soft">Dem tri an khach hang</div>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl text-ivory">
              Capella <span className="text-gold-soft">20 nam</span>
            </h1>
            <div className="mx-auto mt-5 deco-line w-40" />
            <p className="mt-5 text-sm text-ivory/70">
              {SU_KIEN.ngay} &middot; {SU_KIEN.diaDiem} &middot; {SU_KIEN.soKhach} khach &middot; 5 venue
            </p>
          </div>
        </div>
      </section>

      {/* Con so */}
      <section className="mx-auto max-w-5xl px-5 -mt-8">
        <div className="card grid grid-cols-2 gap-px overflow-hidden bg-ivory-deep sm:grid-cols-4">
          <SoDemo nhan="Nguong xac nhan" so={CHISO.nguongXacNhan} chu="nguoi muc tieu" />
          <SoDemo nhan="Thiep phat hanh" so={CHISO.soThiepPhatHanh} chu="du kien" />
          <SoDemo nhan="Da xac nhan" so={so.xacNhan} chu={`/ ${so.tong} khach trong he`} />
          <SoDemo nhan="Da check in" so={so.checkin} chu="tren he thong" />
        </div>
      </section>

      {/* 4 phan he */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl text-ink">Bon phan he</h2>
          <span className="text-xs text-ink-muted">Mot co so du lieu chung</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="group card p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-xl text-white"
                  style={{ backgroundColor: m.mau }}
                >
                  {m.ma}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-ink">{m.ten}</h3>
                    <span className="chip bg-ivory-deep text-ink-muted">{m.thietBi}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{m.mo}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold group-hover:gap-2">
                    Mo phan he
                    <span aria-hidden>&rarr;</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Vong doi khach */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="card p-6">
          <h2 className="font-display text-lg text-ink">Vong doi khach</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {[
              "Nhap", "Cho duyet / Danh sach cho", "Da phat hanh", "Da moi",
              "Tham du / Chua phan hoi / Khong tham du", "Da check in / Vang mat",
            ].map((b, i, arr) => (
              <span key={b} className="flex items-center gap-2">
                <span className="chip bg-ivory-deep text-ink-soft">{b}</span>
                {i < arr.length - 1 && <span className="text-gold">&rarr;</span>}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Huy duoc o moi buoc truoc su kien, ma vo hieu. Con so tren la gia dinh mac dinh, BTC chinh sau.
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-ink-muted">
          Ban demo v1 &middot; du lieu mau &middot; dung de BTC trai nghiem va chot flow
        </p>
      </section>
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
