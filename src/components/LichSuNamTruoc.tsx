"use client";

import { useState, useTransition } from "react";
import { boDau } from "@/lib/format";
import { napLichSu, xoaLichSu, type DongNamTruoc, type KetQua } from "@/lib/actions";

export interface NamDaTai {
  nam: number;
  soKhach: number;
  soDen: number;
}

type Cot = Partial<Record<keyof DongNamTruoc | "denOnline" | "denOffline", number>>;

// Doan cot theo tieu de (khong dau); "Don vi" phai dung nguyen chu de khong lay nham "Thuoc don vi kinh doanh"
function doanCot(tieuDe: string[]): Cot {
  const h = tieuDe.map((x) => boDau(String(x ?? "")).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());
  const tim = (dk: (s: string) => boolean) => {
    const i = h.findIndex(dk);
    return i >= 0 ? i : undefined;
  };
  return {
    hoTen: tim((s) => s === "ten khach moi" || s === "ho ten" || s === "ho va ten" || s === "ten khach"),
    chucVu: tim((s) => s === "chuc vu"),
    congTy: tim((s) => s === "company name" || s === "cong ty" || s === "ten cong ty"),
    maCorp: tim((s) => s.startsWith("ma corp")),
    sdt: tim((s) => s === "sdt" || s.includes("so dien thoai")),
    donVi: tim((s) => s === "don vi" || s === "venue"),
    nhomKhachMoi: tim((s) => s === "nhom khach moi"),
    phuTrach: tim((s) => s.includes("phu trach")),
    soDangKy: tim((s) => s.includes("dang ky")) ?? tim((s) => s.includes("so luong nguoi tham du")),
    soDen: tim((s) => s.includes("tong khach check in")),
    denOnline: tim((s) => s.replace(/ /g, "") === "checkinonline"),
    denOffline: tim((s) => s.replace(/ /g, "") === "checkinoffline"),
  };
}

function soNguyen(v: unknown): number {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

// Chon sheet va dong tieu de co cot ten khach va cot check in; uu tien sheet co ca hai
function docBang(sheets: { sheet: string; data: unknown[][] }[]) {
  let tot: { sheet: string; td: number; cot: Cot; rows: string[][]; diem: number } | null = null;
  for (const s of sheets) {
    const rows = s.data.map((r) => r.map((c) => (c instanceof Date ? c.toLocaleDateString("vi-VN") : String(c ?? "").trim())));
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const cot = doanCot(rows[i]);
      if (cot.hoTen === undefined) continue;
      const coDen = cot.soDen !== undefined || cot.denOnline !== undefined || cot.denOffline !== undefined;
      const diem = (coDen ? 10 : 0) + Object.values(cot).filter((x) => x !== undefined).length;
      if (!tot || diem > tot.diem) tot = { sheet: s.sheet, td: i, cot, rows, diem };
      break;
    }
  }
  return tot;
}

export function LichSuNamTruoc({ ds }: { ds: NamDaTai[] }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tenFile, setTenFile] = useState("");
  const [nam, setNam] = useState(2024);
  const [dong, setDong] = useState<DongNamTruoc[] | null>(null);
  const [moTa, setMoTa] = useState("");
  const [coCotDen, setCoCotDen] = useState(true);

  const docFile = async (f: File) => {
    setLoi(null); setKq(null); setDong(null); setTenFile(f.name);
    try {
      if (!f.name.toLowerCase().endsWith(".xlsx")) throw new Error("Chọn file .xlsx (file check in năm trước).");
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = await readXlsxFile(f);
      const b = docBang(sheets as any);
      if (!b) throw new Error("Không tìm thấy cột Tên khách mời trong file.");
      const { cot, rows, td } = b;
      const lay = (r: string[], k: keyof Cot) => (cot[k] !== undefined ? r[cot[k]!] ?? "" : "");
      const coDen = cot.soDen !== undefined || cot.denOnline !== undefined || cot.denOffline !== undefined;
      const ketQua: DongNamTruoc[] = rows
        .slice(td + 1)
        .filter((r) => lay(r, "hoTen").trim())
        .map((r) => ({
          hoTen: lay(r, "hoTen"),
          chucVu: lay(r, "chucVu"),
          congTy: lay(r, "congTy"),
          maCorp: lay(r, "maCorp"),
          sdt: lay(r, "sdt"),
          donVi: lay(r, "donVi"),
          nhomKhachMoi: lay(r, "nhomKhachMoi"),
          phuTrach: lay(r, "phuTrach"),
          soDangKy: soNguyen(lay(r, "soDangKy")) || 1,
          soDen: cot.soDen !== undefined ? soNguyen(lay(r, "soDen")) : soNguyen(lay(r, "denOnline")) + soNguyen(lay(r, "denOffline")),
        }));
      // Nam su kien: tim trong vai dong dau (vd "DANH SACH CHECK IN KHACH NGAY 8.11.2024")
      const dau = rows.slice(0, td + 1).flat().join(" ") + " " + f.name;
      const m = dau.match(/\b(20\d{2})\b/);
      if (m) setNam(parseInt(m[1], 10));
      setCoCotDen(coDen);
      setDong(ketQua);
      setMoTa(`Sheet "${b.sheet}": ${ketQua.length} khách, ${ketQua.filter((d) => (d.soDen || 0) > 0).length} khách đã đến.`);
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

      {dong && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-ivory/60 px-4 py-3 text-sm text-ink-soft">{moTa}</div>
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
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setKq(await napLichSu(nam, dong));
                  setDong(null);
                  setTenFile("");
                })
              }
            >
              {pending ? "Đang lưu..." : `Lưu ${dong.length} khách năm ${nam}`}
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
