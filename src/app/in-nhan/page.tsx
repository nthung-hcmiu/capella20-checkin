import Link from "next/link";
import { prisma } from "@/lib/db";
import { yeuCauTrang } from "@/lib/auth";
import { TRANG_CHINH, TRANG_THAI } from "@/lib/constants";
import { docDiCung, tenGoi } from "@/lib/khach";
import { canThiepGiay } from "@/lib/congTy";
import { khoaCty } from "@/lib/lichSu";
import { InNhan } from "@/components/InNhan";
import { hienSdt, type Nhan } from "@/lib/nhan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Trang in nhan dan ngoai thiep giay: Kinh gui, ten, chuc vu, cong ty, dia chi; day nhan la so dien thoai (trai) va so thu tu thiep (phai).
// Nguoi in chon loai giay nhan (Tomy No. 100 hoac No. 136) ngay tren trang.
// ?so=1004,1005: chi in cac khach da chon (theo so thu tu). Khong co so: in theo bo loc.
// Sales in khach cua minh, BTC loc theo venue / sales.
export default async function InNhanPage({
  searchParams,
}: {
  searchParams: { so?: string; venue?: string; sales?: string; chuaGiay?: string };
}) {
  const u = await yeuCauTrang(["SALES", "ADMIN"], "/in-nhan");
  const laBTC = u.vaiTro === "ADMIN";
  const chuaGiay = searchParams.chuaGiay === "1";
  const dsSo = [...new Set(String(searchParams.so || "").split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0 && n < 100000))].slice(0, 800);
  const theoChon = dsSo.length > 0;
  // BTC duoc giao venue: chi in khach cua venue do, cong khach chinh minh phu trach
  const xemBtc = u.phamViXem ? { OR: [{ venueId: { in: u.phamViXem } }, { salesOwner: u.hoTen }] } : {};
  const quyen = laBTC ? { AND: [xemBtc] } : { salesOwner: u.hoTen };
  const [venues, dsSales] = laBTC && !theoChon
    ? await Promise.all([
        prisma.venue.findMany({ where: u.phamViXem ? { id: { in: u.phamViXem } } : {}, orderBy: { thuTu: "asc" }, select: { id: true, ten: true } }),
        prisma.guest.findMany({ where: xemBtc, distinct: ["salesOwner"], select: { salesOwner: true }, orderBy: { salesOwner: "asc" } }),
      ])
    : [[], []];

  const tatCa = await prisma.guest.findMany({
    where: {
      ...quyen,
      ...(theoChon
        ? { soThuTu: { in: dsSo } }
        : {
            ...(laBTC && searchParams.venue ? { venueId: searchParams.venue } : {}),
            ...(laBTC && searchParams.sales ? { salesOwner: searchParams.sales } : {}),
            ...(chuaGiay ? { daGuiThiepGiay: false } : {}),
          }),
    },
    orderBy: { soThuTu: "asc" },
    take: 1500,
  });
  // Chi in thiep da phat hanh; khach noi bo Capella Holdings khong can thiep giay
  const CHUA_IN: string[] = [TRANG_THAI.NHAP, TRANG_THAI.CHO_DUYET, TRANG_THAI.DA_HUY];
  const daPhatHanh = tatCa.filter((g) => !CHUA_IN.includes(g.trangThai));
  const canIn = daPhatHanh.filter(canThiepGiay);
  const soChuaDuyet = tatCa.length - daPhatHanh.length;
  const soNoiBo = daPhatHanh.length - canIn.length;
  const soKhongThay = theoChon ? dsSo.length - tatCa.length : 0;

  // Moi nguoi mot thiep giay: khach chinh va tung khach di kem da co ten, cung so thu tu.
  // Nhan thi gop theo cong ty: cac khach cung cong ty cua cung mot nguoi phu trach (va khach di kem tren cung thiep)
  // di chung mot phong bi, chi can nhan cua khach dau tien (so thu tu nho nhat). Nguoi in tat duoc viec gop nay tren trang.
  const nhan: Nhan[] = [];
  const dauNhom = new Map<string, Nhan>();
  for (const g of canIn) {
    const cty = khoaCty(g.congTy);
    const nhom = cty ? `${g.salesOwner}|${cty}` : `thiep:${g.id}`;
    const chung = { congTy: g.congTy || "", diaChi: (g.diaChi || "").trim(), sdt: hienSdt(g.sdt), so: g.soThuTu };
    const cuaThiep = [
      { khoa: g.id, ten: tenGoi(g), chucVu: g.chucVu || "" },
      ...docDiCung(g.khachDiCung)
        .slice(0, Math.max(0, g.soNguoiMoi - 1))
        .map((x, i) => ({ khoa: `${g.id}-${i + 2}`, ten: [x.danhXung, x.hoTen].filter(Boolean).join(" ").trim(), chucVu: x.chucVu || "" }))
        .filter((x) => x.ten),
    ];
    for (const x of cuaThiep) {
      const dau = dauNhom.get(nhom);
      const n: Nhan = { ...x, ...chung, gop: !!dau, kem: [] };
      if (!dau) dauNhom.set(nhom, n);
      else if (n.so !== dau.so && !dau.kem.includes(n.so)) dau.kem.push(n.so);
      nhan.push(n);
    }
  }
  const soKem = nhan.length - canIn.length;
  const boQua = [
    soChuaDuyet > 0 ? `${soChuaDuyet} khách chưa được duyệt hoặc đã hủy` : "",
    soNoiBo > 0 ? `${soNoiBo} khách nội bộ Capella Holdings (chỉ dùng thiệp online)` : "",
    soKhongThay > 0 ? `${soKhongThay} số thứ tự không tìm thấy hoặc không thuộc quyền của bạn` : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-ivory print:bg-white">
      <div className="mx-auto max-w-5xl px-5 py-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl text-ink">In nhãn dán thiệp giấy</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Nhãn ghi Kính gửi, tên, chức vụ, công ty, địa chỉ; dòng dưới cùng là số điện thoại (bên trái) và số thứ tự thiệp (bên phải). Chọn loại giấy nhãn đang dùng ở bên dưới rồi bấm in.
            </p>
          </div>
          <Link href={TRANG_CHINH[u.vaiTro] === "/admin" ? "/admin/khach" : "/sales"} className="btn-ghost btn-sm">
            ← Về danh sách khách
          </Link>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          <b className="font-medium text-ink">{nhan.length.toLocaleString("vi-VN")} thiệp giấy</b> của {canIn.length.toLocaleString("vi-VN")} khách
          {theoChon ? " đã chọn" : laBTC ? "" : ` của ${u.hoTen}`}
          {soKem > 0 ? `, gồm ${soKem.toLocaleString("vi-VN")} thiệp của khách đi kèm` : ""}.
          {boQua.length > 0 ? ` Không in: ${boQua.join("; ")}.` : ""}
        </p>
        {!theoChon && (
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
          </form>
        )}
        {theoChon && (
          <p className="mt-2 text-xs text-ink-muted">
            Đang in riêng các khách đã chọn.{" "}
            <Link href="/in-nhan" className="text-brand underline">
              In theo bộ lọc
            </Link>
          </p>
        )}
      </div>
      <InNhan nhan={nhan} />
    </main>
  );
}
