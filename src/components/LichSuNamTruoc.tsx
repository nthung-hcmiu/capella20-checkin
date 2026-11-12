"use client";

import { useState, useTransition } from "react";
import { boDau } from "@/lib/format";
import { napLichSu, xoaLichSu, type DongNamTruoc, type KetQua } from "@/lib/actions";

export interface NamDaTai {
  nam: number;
  soKhach: number;
  soDen: number;
}

type Truong = keyof DongNamTruoc | "denGiay" | "denOnline" | "denOffline" | "diKemTen" | "diKemChucVu";
type Cot = Partial<Record<Truong, number>>;

const gon = (s: string) => s.replace(/ /g, "");

// Doan cot theo tieu de (khong dau); "Don vi" phai dung nguyen chu de khong lay nham "Thuoc don vi kinh doanh"
function doanCot(tieuDe: string[]): Cot {
  const h = tieuDe.map((x) => boDau(String(x ?? "")).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());
  const tim = (dk: (s: string) => boolean) => {
    const i = h.findIndex(dk);
    return i >= 0 ? i : undefined;
  };
  return {
    hoTen: tim((s) => ["ten khach moi", "ten khach moi chinh", "ho ten", "ho va ten", "ten khach"].includes(s)),
    chucVu: tim((s) => s === "chuc vu" || s === "chuc vu khach moi chinh"),
    congTy: tim((s) => s === "company name" || s === "cong ty" || s === "ten cong ty"),
    maCorp: tim((s) => s.startsWith("ma corp")),
    sdt: tim((s) => s === "sdt" || s.includes("so dien thoai")),
    donVi: tim((s) => s === "don vi" || s === "venue"),
    nhomKhachMoi: tim((s) => s === "nhom khach moi"),
    phuTrach: tim((s) => s.includes("phu trach")),
    soDangKy: tim((s) => s.includes("dang ky")) ?? tim((s) => s.includes("so luong nguoi tham du")),
    soDen: tim((s) => s.includes("tong khach check in")),
    denGiay: tim((s) => gon(s) === "checkinthiepgiay"),
    denOnline: tim((s) => gon(s) === "checkinonline" || gon(s) === "checkinthieponline"),
    denOffline: tim((s) => gon(s) === "checkinoffline"),
    diKemTen: tim((s) => s.startsWith("ten khach di kem")),
    diKemChucVu: tim((s) => s.startsWith("chuc vu khach di kem")),
  };
}

function soNguyen(v: unknown): number {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

interface SheetDoc {
  ten: string;
  kieu: string; // tieu de cot ten khach, de nhan ra sheet khac cau truc (vd chep tu nam khac)
  coDen: boolean;
  chinh: DongNamTruoc[];
  diKem: DongNamTruoc[];
}

// Doc mot sheet: tim dong tieu de co cot ten khach, lay khach chinh va nguoi di kem
function docSheet(ten: string, data: unknown[][]): SheetDoc | null {
  const rows = data.map((r) => r.map((c) => (c instanceof Date ? c.toLocaleDateString("vi-VN") : String(c ?? "").trim())));
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const cot = doanCot(rows[i]);
    if (cot.hoTen === undefined) continue;
    // O "0" do cong thuc trong file tong hop coi la trong
    const lay = (r: string[], k: Truong) => {
      const v = cot[k] !== undefined ? r[cot[k]!] ?? "" : "";
      return v === "0" ? "" : v;
    };
    const coDen = [cot.soDen, cot.denGiay, cot.denOnline, cot.denOffline].some((x) => x !== undefined);
    const chinh: DongNamTruoc[] = [];
    const diKem: DongNamTruoc[] = [];
    for (const r of rows.slice(i + 1)) {
      const hoTen = lay(r, "hoTen");
      if (!hoTen) continue;
      const tong = soNguyen(lay(r, "soDen"));
      const soDen = tong || soNguyen(lay(r, "denGiay")) + soNguyen(lay(r, "denOnline")) + soNguyen(lay(r, "denOffline"));
      const chung = { congTy: lay(r, "congTy"), maCorp: lay(r, "maCorp"), donVi: lay(r, "donVi"), nhomKhachMoi: lay(r, "nhomKhachMoi"), phuTrach: lay(r, "phuTrach") };
      chinh.push({ ...chung, hoTen, chucVu: lay(r, "chucVu"), sdt: lay(r, "sdt"), soDangKy: soNguyen(lay(r, "soDangKy")) || 1, soDen });
      const kem = lay(r, "diKemTen");
      // Nguoi di kem: tinh la da den khi the co tu 2 nguoi check in
      if (kem) diKem.push({ ...chung, hoTen: kem, chucVu: lay(r, "diKemChucVu"), soDangKy: 1, soDen: soDen >= 2 ? 1 : 0, laDiKem: true });
    }
    return { ten, kieu: boDau(rows[i][cot.hoTen]).replace(/[^a-z ]/g, "").trim(), coDen, chinh, diKem };
  }
  return null;
}

// Gop cac sheet da chon. Trong cung mot sheet: trung ten + cong ty moi la mot nguoi (danh sach co the co 2 nguoi trung ten).
// Giua cac sheet (sheet tong hop va sheet tung venue chep cua nhau): trung ten la mot nguoi, du ten cong ty ghi khac.
function gopSheet(cac: SheetDoc[]): DongNamTruoc[] {
  const ten = (d: DongNamTruoc) => boDau(d.hoTen);
  const khoa = (d: DongNamTruoc) => `${ten(d)}|${boDau(d.congTy || "")}`;
  const ketQua: { d: DongNamTruoc; sheet: number }[] = [];
  const theoKhoa = new Map<string, DongNamTruoc>();
  const theoTen = new Map<string, { d: DongNamTruoc; sheet: number }[]>();
  const gopVao = (cu: DongNamTruoc, d: DongNamTruoc) => {
    for (const f of ["chucVu", "maCorp", "sdt", "donVi", "nhomKhachMoi", "phuTrach"] as const) if (!cu[f] && d[f]) cu[f] = d[f];
    cu.soDen = Math.max(cu.soDen || 0, d.soDen || 0);
    cu.soDangKy = Math.max(cu.soDangKy || 0, d.soDangKy || 0);
  };
  const them = (d: DongNamTruoc, sheet: number) => {
    const cungKhoa = theoKhoa.get(khoa(d));
    if (cungKhoa) {
      if (cungKhoa.laDiKem && !d.laDiKem) { cungKhoa.laDiKem = false; cungKhoa.chucVu = d.chucVu || cungKhoa.chucVu; }
      if (!(d.laDiKem && !cungKhoa.laDiKem)) gopVao(cungKhoa, d);
      return;
    }
    const khac = (theoTen.get(ten(d)) || []).filter((x) => x.sheet !== sheet);
    if (khac.length) {
      const cu = (khac.find((x) => x.d.maCorp && x.d.maCorp === d.maCorp) || khac[0]).d;
      if (!(d.laDiKem && !cu.laDiKem)) gopVao(cu, d);
      return;
    }
    const moi = { ...d };
    ketQua.push({ d: moi, sheet });
    theoKhoa.set(khoa(moi), moi);
    theoTen.set(ten(moi), [...(theoTen.get(ten(moi)) || []), { d: moi, sheet }]);
  };
  cac.forEach((s, i) => s.chinh.forEach((d) => them(d, i)));
  cac.forEach((s, i) => s.diKem.forEach((d) => them(d, i)));
  return ketQua.map((x) => x.d);
}

export function LichSuNamTruoc({ ds }: { ds: NamDaTai[] }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tenFile, setTenFile] = useState("");
  const [nam, setNam] = useState(2024);
  const [cacSheet, setCacSheet] = useState<(SheetDoc & { chon: boolean })[] | null>(null);
  const daChon = (cacSheet || []).filter((x) => x.chon);
  const dong = cacSheet ? gopSheet(daChon) : null;
  const soChinh = dong ? dong.filter((d) => !d.laDiKem).length : 0;
  const soDen = dong ? dong.filter((d) => !d.laDiKem && (d.soDen || 0) > 0).length : 0;
  const soKem = dong ? dong.length - soChinh : 0;
  const coCotDen = daChon.every((x) => x.coDen);

  const docFile = async (f: File) => {
    setLoi(null); setKq(null); setCacSheet(null); setTenFile(f.name);
    try {
      if (!f.name.toLowerCase().endsWith(".xlsx")) throw new Error("Chọn file .xlsx (file check in năm trước).");
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(f)) as { sheet: string; data: unknown[][] }[];
      const doc = sheets.map((x) => docSheet(x.sheet, x.data)).filter((x): x is SheetDoc => !!x && x.chinh.length > 0);
      if (!doc.length) throw new Error("Không tìm thấy cột Tên khách mời trong file.");
      // Chon san cac sheet cung cau truc voi da so (sheet chep tu nam khac thuong khac tieu de)
      const dem = new Map<string, number>();
      doc.forEach((x) => dem.set(x.kieu, (dem.get(x.kieu) || 0) + 1));
      const kieuChinh = [...dem.entries()].sort((a, b) => b[1] - a[1])[0][0];
      setCacSheet(doc.map((x) => ({ ...x, chon: x.kieu === kieuChinh })));
      // Nam su kien: lay tu ten file hoac vai dong dau (vd "...CHECK IN KHACH NGAY 8.11.2024")
      const dau = f.name + " " + sheets.slice(0, 3).map((x) => x.data.slice(0, 4).flat().join(" ")).join(" ");
      const m = dau.match(/(?:^|[^\d])(20\d{2})(?:[^\d]|$)/);
      if (m) setNam(parseInt(m[1], 10));
    } catch (e: any) {
      setLoi(e?.message || "Không đọc được file.");
    }
  };

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg text-ink">Danh sách khách năm trước</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Tải file check in của sự kiện năm trước. Khi sales thêm hoặc nhập khách, app tự báo cho sales và BTC khách này năm trước có được mời không,
        có đến không. Khớp theo SĐT (nếu file có), tên khách cùng mã CORP hoặc cùng công ty. Dữ liệu chỉ lưu trong app.
      </p>

      {ds.length > 0 && (
        <div className="mt-4 space-y-2">
          {ds.map((d) => (
            <div key={d.nam} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ivory/60 px-4 py-2.5 text-sm">
              <span className="text-ink">
                Năm {d.nam}: <b className="font-medium">{d.soKhach.toLocaleString("vi-VN")}</b> khách, {d.soDen.toLocaleString("vi-VN")} khách đã đến
              </span>
              <button className="text-xs text-wine hover:underline" disabled={pending} onClick={() => start(async () => setKq(await xoaLichSu(d.nam)))}>
                Xóa năm này
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-ivory/50 px-6 py-6 text-center hover:border-brand">
        <input type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && docFile(e.target.files[0])} />
        <span className="text-sm font-medium text-ink">{tenFile || "Bấm để chọn file .xlsx"}</span>
        <span className="mt-1 text-xs text-ink-muted">App tự tìm sheet có cột Tên khách mời và cột check in</span>
      </label>
      {loi && <div className="mt-3 rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">{loi}</div>}

      {cacSheet && dong && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-ivory-deep p-3">
            <div className="text-xs text-ink-muted">Chọn sheet để gộp (bỏ trùng giữa các sheet). Sheet khác cấu trúc được bỏ chọn sẵn.</div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {cacSheet.map((x, i) => (
                <label key={x.ten} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand"
                    checked={x.chon}
                    onChange={(e) => setCacSheet(cacSheet.map((y, j) => (j === i ? { ...y, chon: e.target.checked } : y)))}
                  />
                  <span className="text-ink">{x.ten}</span>
                  <span className="text-xs text-ink-muted">
                    {x.chinh.length} khách, {x.chinh.filter((d) => (d.soDen || 0) > 0).length} đã đến
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-ivory/60 px-4 py-3 text-sm text-ink-soft">
            Sau khi gộp: <b className="font-medium text-ink">{soChinh}</b> khách chính, {soDen} khách đã đến
            {soKem ? `, kèm ${soKem} người đi kèm` : ""}.
          </div>
          {!coCotDen && (
            <div className="rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">
              File không có cột check in, mọi khách sẽ được ghi là không đến.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-ink-soft">
              Năm sự kiện{" "}
              <input type="number" className="input ml-2 inline-block w-28 py-2" value={nam} onChange={(e) => setNam(parseInt(e.target.value, 10) || 0)} />
            </label>
            <button
              className="btn-brand"
              disabled={pending || soChinh === 0}
              onClick={() =>
                start(async () => {
                  setKq(await napLichSu(nam, dong));
                  setCacSheet(null);
                  setTenFile("");
                })
              }
            >
              {pending ? "Đang lưu..." : `Lưu ${soChinh} khách năm ${nam}`}
            </button>
          </div>
          {ds.some((d) => d.nam === nam) && <p className="text-xs text-ink-muted">Đã có danh sách năm {nam}, lưu sẽ thay bằng file này.</p>}
        </div>
      )}
      {kq && (
        <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.thongBao}</div>
      )}
    </div>
  );
}
