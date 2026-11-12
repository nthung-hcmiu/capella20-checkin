"use client";

import { useState, useTransition } from "react";
import { boDau } from "@/lib/format";
import { capNhatPhuTrach, type DongPhuTrach, type KetQuaPhuTrach } from "@/lib/phuTrachActions";
import { docCsv, oThanhChu } from "./ImportManager";

type Cot = { hoTen: number; congTy: number; maCorp: number; sales: number };

// Doan cot: uu tien "nguoi phu trach tiep khach" hon "sales / nguoi in charge"
function doanCot(tieuDe: string[]): Cot {
  const h = tieuDe.map((x) => boDau(String(x ?? "")).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());
  const tim = (...dk: ((s: string) => boolean)[]) => {
    for (const f of dk) {
      const i = h.findIndex(f);
      if (i >= 0) return i;
    }
    return -1;
  };
  return {
    hoTen: tim((s) => s === "ten khach moi" || s === "ten khach moi chinh", (s) => s.startsWith("ten khach moi"), (s) => s === "ho ten" || s === "ho va ten"),
    congTy: tim((s) => s === "company name" || s === "cong ty" || s === "ten cong ty", (s) => s.includes("company")),
    maCorp: tim((s) => s.startsWith("ma corp")),
    sales: tim((s) => s.includes("phu trach tiep khach"), (s) => s.includes("phu trach"), (s) => s.includes("sales") || s.includes("in charge")),
  };
}

function chonBang(sheets: { sheet: string; data: string[][] }[]) {
  for (const s of sheets) {
    for (let i = 0; i < Math.min(15, s.data.length); i++) {
      const cot = doanCot(s.data[i]);
      if (cot.sales >= 0 && (cot.congTy >= 0 || cot.hoTen >= 0)) return { ten: s.sheet, td: i, cot, rows: s.data };
    }
  }
  return null;
}

export function CapNhatPhuTrach({ venues }: { venues: { id: string; ten: string }[] }) {
  const [pending, start] = useTransition();
  const [venueId, setVenueId] = useState("");
  const [tenFile, setTenFile] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dong, setDong] = useState<DongPhuTrach[] | null>(null);
  const [dongDau, setDongDau] = useState(2);
  const [moTa, setMoTa] = useState("");
  const [kq, setKq] = useState<KetQuaPhuTrach | null>(null);

  const docFile = async (f: File) => {
    setLoi(null); setKq(null); setDong(null); setTenFile(f.name);
    try {
      let sheets: { sheet: string; data: string[][] }[];
      if (/\.(csv|txt)$/i.test(f.name)) sheets = [{ sheet: f.name, data: docCsv(await f.text()) }];
      else if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const ds = await readXlsxFile(f);
        sheets = (ds as any[]).map((s) => ({ sheet: s.sheet, data: s.data.map((r: unknown[]) => r.map(oThanhChu)) }));
      } else throw new Error("Chọn file .xlsx hoặc .csv (Google Sheet: Tệp > Tải xuống > .xlsx).");
      const b = chonBang(sheets);
      if (!b) throw new Error("Không thấy cột người phụ trách và cột công ty / tên khách trong file.");
      const lay = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
      const ds = b.rows
        .slice(b.td + 1)
        .map((r) => ({ hoTen: lay(r, b.cot.hoTen), congTy: lay(r, b.cot.congTy), maCorp: lay(r, b.cot.maCorp), sales: lay(r, b.cot.sales) }))
        .filter((r) => r.sales && (r.congTy || r.hoTen || r.maCorp));
      const tieuDe = b.rows[b.td];
      const ten = (i: number) => (i >= 0 ? `"${tieuDe[i]}"` : "không có");
      setDongDau(b.td + 2);
      setDong(ds);
      setMoTa(
        `${ds.length} dòng có người phụ trách. Cột dùng: tên khách ${ten(b.cot.hoTen)}, công ty ${ten(b.cot.congTy)}, mã CORP ${ten(b.cot.maCorp)}, người phụ trách ${ten(b.cot.sales)}.`
      );
    } catch (e: any) {
      setLoi(e?.message || "Không đọc được file.");
    }
  };

  const chay = (ghi: boolean) =>
    start(async () => {
      if (!dong) return;
      try {
        setKq(await capNhatPhuTrach(dong, { venueId: venueId || undefined, dongBatDau: dongDau, ghi }));
      } catch {
        setLoi("Máy chủ chưa xử lý được. Tải lại trang rồi thử lại.");
      }
    });

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg text-ink">Cập nhật người phụ trách từ file</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Dùng khi venue gửi danh sách gộp có cột người phụ trách. App khớp từng dòng với khách đã có trong app theo tên khách cùng mã CORP hoặc
        công ty; dòng chưa có tên khách thì khớp theo công ty. Chỉ đổi người phụ trách, không đổi thông tin hay vé của khách.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Chỉ khách thuộc venue</label>
          <select className="input" value={venueId} onChange={(e) => { setVenueId(e.target.value); setKq(null); }}>
            <option value="">Mọi venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-ivory/50 px-4 py-4 text-center hover:border-brand">
          <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && docFile(e.target.files[0])} />
          <span className="text-sm font-medium text-ink">{tenFile || "Bấm để chọn file .xlsx hoặc .csv"}</span>
        </label>
      </div>
      {loi && <div className="mt-3 rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">{loi}</div>}

      {dong && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-ivory/60 px-4 py-3 text-sm text-ink-soft">{moTa}</div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-ink" disabled={pending} onClick={() => chay(false)}>
              {pending && !kq ? "Đang kiểm tra..." : "Kiểm tra trước"}
            </button>
            {kq && !kq.ghi && kq.doi.length > 0 && (
              <button className="btn-brand" disabled={pending} onClick={() => chay(true)}>
                {pending ? "Đang cập nhật..." : `Áp dụng: đổi ${kq.doi.length} khách`}
              </button>
            )}
            {kq && <span className={`text-sm ${kq.ok ? "text-sage" : "text-wine"}`}>{kq.thongBao}</span>}
          </div>
        </div>
      )}

      {kq && (
        <div className="mt-4 space-y-3 text-sm">
          {kq.khongTaiKhoan.length > 0 && (
            <div className="rounded-xl bg-wine/10 px-4 py-2.5 text-wine">
              Chưa có tài khoản sales trùng tên, bỏ qua: {kq.khongTaiKhoan.map((x) => `${x.sales} (${x.soDong} dòng)`).join(", ")}. Tạo tài khoản đúng họ tên
              rồi chạy lại.
            </div>
          )}
          {kq.xungDot.length > 0 && (
            <div className="rounded-xl bg-wine/10 px-4 py-2.5 text-wine">
              {kq.xungDot.length} khách bị file gán cho nhiều sales khác nhau, chưa đổi:{" "}
              {kq.xungDot.slice(0, 20).map((x) => `${x.soThuTu} ${x.hoTen} (${x.cacSales.join(" / ")})`).join("; ")}
            </div>
          )}
          {kq.doi.length > 0 && (
            <div className="max-h-[360px] overflow-auto rounded-xl border border-ivory-deep">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-ivory text-left text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Số</th>
                    <th className="px-3 py-2 font-medium">Khách</th>
                    <th className="px-3 py-2 font-medium">Phụ trách cũ</th>
                    <th className="px-3 py-2 font-medium">Phụ trách mới</th>
                  </tr>
                </thead>
                <tbody>
                  {kq.doi.slice(0, 500).map((x) => (
                    <tr key={x.soThuTu} className="border-t border-ivory-deep">
                      <td className="px-3 py-1.5 font-mono">{x.soThuTu}</td>
                      <td className="px-3 py-1.5 text-ink">
                        {x.hoTen}
                        {x.congTy && <div className="text-ink-muted">{x.congTy}</div>}
                      </td>
                      <td className="px-3 py-1.5 text-ink-muted">{x.cu}</td>
                      <td className="px-3 py-1.5 font-medium text-ink">{x.moi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {kq.khongThay.length > 0 && (
            <details className="rounded-xl bg-ivory/60 px-4 py-2.5 text-ink-soft">
              <summary className="cursor-pointer">{kq.khongThay.length} dòng trong file chưa có khách tương ứng trong app (chưa được nhập)</summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                {kq.khongThay.slice(0, 300).map((x) => (
                  <li key={x.dong}>
                    Dòng {x.dong}: {x.hoTen || "(chưa có tên)"} · {x.congTy}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
