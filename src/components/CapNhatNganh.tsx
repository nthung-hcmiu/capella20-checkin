"use client";

import { useState, useTransition } from "react";
import { boDau } from "@/lib/format";
import { capNhatNganh, type DongNganh, type KetQuaNganh } from "@/lib/nganhActions";
import { docCsv, oThanhChu } from "./ImportManager";

// Tim cot so thu tu thiep va cot nganh hang trong dong tieu de
function doanCot(tieuDe: string[]) {
  const h = tieuDe.map((x) => boDau(String(x ?? "")).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());
  return {
    so: h.findIndex((s) => s === "so thu tu thiep" || s === "so thu tu" || s === "so thiep moi"),
    nganh: h.findIndex((s) => s === "nganh hang" || s === "linh vuc" || s === "nganh hang moi" || s === "nganh"),
  };
}

function chonBang(sheets: { sheet: string; data: string[][] }[]) {
  for (const s of sheets) {
    for (let i = 0; i < Math.min(15, s.data.length); i++) {
      const cot = doanCot(s.data[i]);
      if (cot.so >= 0 && cot.nganh >= 0) return { td: i, cot, rows: s.data };
    }
  }
  return null;
}

// Cap nhat nganh hang hang loat: file can cot "So thu tu thiep" va cot "Nganh hang" (file xuat CSV cua app co san hai cot nay)
export function CapNhatNganh() {
  const [pending, start] = useTransition();
  const [tenFile, setTenFile] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dong, setDong] = useState<DongNganh[] | null>(null);
  const [kq, setKq] = useState<KetQuaNganh | null>(null);

  const docFile = async (f: File) => {
    setLoi(null); setKq(null); setDong(null); setTenFile(f.name);
    try {
      let sheets: { sheet: string; data: string[][] }[];
      if (/\.(csv|txt)$/i.test(f.name)) sheets = [{ sheet: f.name, data: docCsv(await f.text()) }];
      else if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const ds = await readXlsxFile(f);
        sheets = (ds as any[]).map((x) => ({ sheet: x.sheet, data: x.data.map((r: unknown[]) => r.map(oThanhChu)) }));
      } else throw new Error("Chọn file .xlsx hoặc .csv.");
      const b = chonBang(sheets);
      if (!b) throw new Error('Không thấy cột "Số thứ tự thiệp" và cột "Ngành hàng" trong file.');
      const ds = b.rows
        .slice(b.td + 1)
        .map((r) => ({ soThuTu: parseInt(String(r[b.cot.so] ?? "").replace(/\D/g, ""), 10), linhVuc: String(r[b.cot.nganh] ?? "").trim() }))
        .filter((r) => r.soThuTu > 0 && r.linhVuc);
      if (!ds.length) throw new Error("File không có dòng nào vừa có số thứ tự thiệp vừa có ngành hàng.");
      setDong(ds);
    } catch (e: any) {
      setLoi(e?.message || "Không đọc được file.");
    }
  };

  const chay = (ghi: boolean) =>
    start(async () => {
      if (!dong) return;
      try {
        setKq(await capNhatNganh(dong, ghi));
      } catch {
        setLoi("Máy chủ chưa xử lý được. Tải lại trang rồi thử lại.");
      }
    });

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg text-ink">Cập nhật ngành hàng từ file</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Dùng khi cần rà lại ngành hàng cho nhiều khách. File cần cột <b>Số thứ tự thiệp</b> và cột <b>Ngành hàng</b>; có thể dùng chính file
        Xuất CSV, sửa cột Ngành hàng rồi tải lên. Chỉ đổi ngành hàng, không đổi thông tin hay thiệp của khách.
      </p>
      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-ivory/50 px-4 py-4 text-center hover:border-brand">
        <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && docFile(e.target.files[0])} />
        <span className="text-sm font-medium text-ink">{tenFile || "Bấm để chọn file .xlsx hoặc .csv"}</span>
        {dong && <span className="mt-1 text-xs text-ink-muted">{dong.length.toLocaleString("vi-VN")} dòng có số thứ tự và ngành hàng</span>}
      </label>
      {loi && <div className="mt-3 rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">{loi}</div>}

      {dong && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-ink" disabled={pending} onClick={() => chay(false)}>
            {pending && !kq ? "Đang kiểm tra..." : "Kiểm tra trước"}
          </button>
          {kq && !kq.ghi && kq.doi.length > 0 && (
            <button className="btn-brand" disabled={pending} onClick={() => chay(true)}>
              {pending ? "Đang cập nhật..." : `Hoàn tất: đổi ngành hàng ${kq.doi.length} khách`}
            </button>
          )}
          {kq && <span className={`text-sm ${kq.ok ? "text-sage" : "text-wine"}`}>{kq.thongBao}</span>}
        </div>
      )}

      {kq && (
        <div className="mt-4 space-y-3 text-sm">
          {kq.saiNganh.length > 0 && (
            <div className="rounded-xl bg-wine/10 px-4 py-2.5 text-wine">
              {kq.saiNganh.length} dòng ghi ngành ngoài danh mục, bỏ qua:{" "}
              {kq.saiNganh.slice(0, 20).map((x) => `${x.soThuTu} (${x.linhVuc})`).join("; ")}
              {kq.saiNganh.length > 20 ? "; ..." : ""}
            </div>
          )}
          {kq.khongThay.length > 0 && (
            <div className="rounded-xl bg-ivory/60 px-4 py-2.5 text-ink-soft">
              {kq.khongThay.length} số thứ tự không có trong app hoặc ngoài venue bạn được giao: {kq.khongThay.slice(0, 40).join(", ")}
              {kq.khongThay.length > 40 ? ", ..." : ""}
            </div>
          )}
          {kq.doi.length > 0 && (
            <div className="max-h-[360px] overflow-auto rounded-xl border border-ivory-deep">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-ivory text-left text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Số</th>
                    <th className="px-3 py-2 font-medium">Khách</th>
                    <th className="px-3 py-2 font-medium">Ngành cũ</th>
                    <th className="px-3 py-2 font-medium">Ngành mới</th>
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
                      <td className="px-3 py-1.5 text-ink-muted">{x.cu || "chưa ghi"}</td>
                      <td className="px-3 py-1.5 font-medium text-ink">{x.moi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
