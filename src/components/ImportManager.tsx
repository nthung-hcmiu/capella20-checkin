"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { boDau } from "@/lib/format";
import { nhapDanhSach, type DongNhap, type KetQuaNhap } from "@/lib/nhapActions";
import { StatusBadge } from "./StatusBadge";

type Truong = keyof DongNhap;

const TRUONG: { key: Truong; nhan: string; batBuoc?: boolean; dongNghia: string[] }[] = [
  { key: "hoTen", nhan: "Họ tên", batBuoc: true, dongNghia: ["ho ten", "ho va ten", "ten khach", "ten khach hang", "khach hang", "khach moi", "ten", "full name", "name"] },
  { key: "sdt", nhan: "Số điện thoại", batBuoc: true, dongNghia: ["sdt", "so dien thoai", "dien thoai", "so dt", "dt", "phone", "mobile", "di dong"] },
  { key: "venue", nhan: "Venue", dongNghia: ["venue", "chi nhanh", "nha hang", "dia diem", "co so", "sanh", "trung tam"] },
  { key: "soNguoiMoi", nhan: "Số người mời", dongNghia: ["so nguoi moi", "so nguoi duoc moi", "so nguoi", "so khach", "so luong", "sl"] },
  { key: "sales", nhan: "Sales phụ trách", dongNghia: ["sales phu trach", "sales", "sale", "nhan vien phu trach", "nguoi phu trach", "phu trach", "nhan vien", "nv"] },
  { key: "vip", nhan: "VIP", dongNghia: ["vip", "khach vip", "hang khach"] },
  { key: "ghiChu", nhan: "Ghi chú", dongNghia: ["ghi chu", "note", "notes", "chu thich"] },
];

// Doc CSV theo chuan (dau ngoac kep, xuong dong trong o), tu nhan dau phay hoac cham phay
function docCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const dongDau = t.split(/\r?\n/, 1)[0] || "";
  const sep = (dongDau.match(/;/g) || []).length > (dongDau.match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let trongNgoac = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (trongNgoac) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') trongNgoac = false;
      else cell += c;
    } else if (c === '"') trongNgoac = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function oThanhChu(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("vi-VN");
  // Mot so file de SDT o dang ="0909..." khi xuat tu he thong khac
  return String(v).replace(/^="(.*)"$/, "$1").trim();
}

function doanCot(tieuDe: string[]): Record<Truong, number> {
  const chuan = tieuDe.map((h) => boDau(h).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());
  const ketQua = {} as Record<Truong, number>;
  const daDung = new Set<number>();
  for (const f of TRUONG) {
    let idx = chuan.findIndex((h, i) => !daDung.has(i) && f.dongNghia.includes(h));
    if (idx < 0) {
      // Khop mot phan, uu tien tu dong nghia dai nhat
      for (const d of [...f.dongNghia].sort((a, b) => b.length - a.length)) {
        if (d.length < 3) continue;
        idx = chuan.findIndex((h, i) => !daDung.has(i) && h.includes(d));
        if (idx >= 0) break;
      }
    }
    ketQua[f.key] = idx;
    if (idx >= 0) daDung.add(idx);
  }
  return ketQua;
}

function taiFileMau() {
  const tieuDe = ["Họ tên", "Số điện thoại", "Venue", "Số người mời", "Sales phụ trách", "VIP", "Ghi chú"];
  const mau = [
    ["Nguyễn Văn An", "0901234567", "Riverside Palace", "2", "Thu Hà", "", ""],
    ["Trần Thị Bình", "0912345678", "Gallery Hall", "1", "Minh Quân", "x", "Khách lâu năm"],
  ];
  const csv = "﻿" + [tieuDe, ...mau].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-danh-sach-khach-capella20.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportManager({ venues, salesTeam }: { venues: { id: string; ten: string }[]; salesTeam: string[] }) {
  const [tenFile, setTenFile] = useState("");
  const [bang, setBang] = useState<string[][]>([]);
  const [dongTieuDe, setDongTieuDe] = useState(0);
  const [cot, setCot] = useState<Record<Truong, number> | null>(null);
  const [venueMacDinh, setVenueMacDinh] = useState("");
  const [salesMacDinh, setSalesMacDinh] = useState("");
  const [loiDoc, setLoiDoc] = useState<string | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [kiemTra, setKiemTra] = useState<KetQuaNhap | null>(null);
  const [daNhap, setDaNhap] = useState<KetQuaNhap | null>(null);
  const [pending, start] = useTransition();
  const [chiXemLoi, setChiXemLoi] = useState(false);

  const tieuDe = bang[dongTieuDe] || [];
  const dongDuLieu = useMemo(
    () => bang.slice(dongTieuDe + 1).filter((r) => r.some((c) => c.trim() !== "")),
    [bang, dongTieuDe]
  );

  const docFile = async (f: File) => {
    setLoiDoc(null); setKiemTra(null); setDaNhap(null); setBang([]); setCot(null);
    setTenFile(f.name);
    setDangDoc(true);
    try {
      let rows: string[][];
      const ten = f.name.toLowerCase();
      if (ten.endsWith(".csv") || ten.endsWith(".txt")) {
        rows = docCsv(await f.text());
      } else if (ten.endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/browser");
        const data = await readSheet(f);
        rows = data.map((r) => r.map(oThanhChu));
      } else {
        throw new Error("Chỉ đọc được file .xlsx hoặc .csv. File .xls đời cũ: mở bằng Excel rồi lưu lại dạng .xlsx.");
      }
      rows = rows.map((r) => r.map((c) => String(c ?? "").trim()));
      if (rows.length === 0) throw new Error("File không có dữ liệu.");
      // Dong tieu de: dong dau tien trong 10 dong dau nhan ra duoc it nhat 2 cot
      let td = 0;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const c = doanCot(rows[i]);
        if (Object.values(c).filter((x) => x >= 0).length >= 2) { td = i; break; }
      }
      setBang(rows);
      setDongTieuDe(td);
      setCot(doanCot(rows[td]));
    } catch (e: any) {
      setLoiDoc(e?.message || "Không đọc được file.");
    } finally {
      setDangDoc(false);
    }
  };

  const doiDongTieuDe = (i: number) => {
    setDongTieuDe(i);
    setCot(doanCot(bang[i] || []));
    setKiemTra(null);
  };

  const dongNhap = (): DongNhap[] =>
    dongDuLieu.map((r) => {
      const lay = (k: Truong) => (cot && cot[k] >= 0 ? r[cot[k]] ?? "" : "");
      return { hoTen: lay("hoTen"), sdt: lay("sdt"), venue: lay("venue"), soNguoiMoi: lay("soNguoiMoi"), sales: lay("sales"), vip: lay("vip"), ghiChu: lay("ghiChu") };
    });

  const thieuCot = !cot || cot.hoTen < 0 || cot.sdt < 0 || (cot.venue < 0 && !venueMacDinh);

  const chay = (ghi: boolean) =>
    start(async () => {
      const r = await nhapDanhSach(dongNhap(), {
        venueMacDinh: venueMacDinh || undefined,
        salesMacDinh: salesMacDinh || undefined,
        dongBatDau: dongTieuDe + 2,
        ghi,
      });
      if (ghi) { setDaNhap(r); setKiemTra(null); } else setKiemTra(r);
    });

  const ketQua = daNhap || kiemTra;
  const dongHien = ketQua ? (chiXemLoi ? ketQua.dong.filter((d) => d.loi || d.canhBao) : ketQua.dong).slice(0, 300) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Nhập danh sách khách</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Từ file Excel (.xlsx) hoặc CSV. Hệ thống tự chống trùng SĐT, xét VIP, quota và cấp số thứ tự theo dải của venue.
          </p>
        </div>
        <button className="btn-ghost" onClick={taiFileMau}>
          Tải file mẫu
        </button>
      </div>

      {/* Buoc 1 */}
      <div className="card p-6">
        <div className="text-xs font-medium uppercase tracking-wider text-gold-deep">Bước 1</div>
        <h2 className="mt-1 font-display text-lg text-ink">Chọn file</h2>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-ivory/50 px-6 py-8 text-center hover:border-gold">
          <input
            type="file"
            accept=".xlsx,.csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && docFile(e.target.files[0])}
          />
          <span className="text-sm font-medium text-ink">{dangDoc ? "Đang đọc file..." : tenFile || "Bấm để chọn file .xlsx hoặc .csv"}</span>
          <span className="mt-1 text-xs text-ink-muted">
            {bang.length > 0 ? `${dongDuLieu.length.toLocaleString("vi-VN")} dòng dữ liệu` : "Dòng đầu tiên nên là tiêu đề cột"}
          </span>
        </label>
        {loiDoc && <div className="mt-3 rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">{loiDoc}</div>}
      </div>

      {/* Buoc 2 */}
      {bang.length > 0 && cot && !daNhap && (
        <div className="card p-6">
          <div className="text-xs font-medium uppercase tracking-wider text-gold-deep">Bước 2</div>
          <h2 className="mt-1 font-display text-lg text-ink">Ghép cột</h2>
          <p className="mt-1 text-sm text-ink-muted">Hệ thống đã đoán theo tiêu đề. Kiểm tra lại, cột nào sai thì chọn lại.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Dòng tiêu đề</label>
              <select className="input" value={dongTieuDe} onChange={(e) => doiDongTieuDe(parseInt(e.target.value, 10))}>
                {bang.slice(0, 10).map((r, i) => (
                  <option key={i} value={i}>
                    Dòng {i + 1}: {r.filter(Boolean).slice(0, 3).join(", ").slice(0, 40)}
                  </option>
                ))}
              </select>
            </div>
            {TRUONG.map((f) => (
              <div key={f.key}>
                <label className="label">
                  {f.nhan} {f.batBuoc && <span className="text-wine">*</span>}
                </label>
                <select
                  className={`input ${f.batBuoc && cot[f.key] < 0 ? "border-wine/50" : ""}`}
                  value={cot[f.key]}
                  onChange={(e) => { setCot({ ...cot, [f.key]: parseInt(e.target.value, 10) }); setKiemTra(null); }}
                >
                  <option value={-1}>Không có cột này</option>
                  {tieuDe.map((h, i) => (
                    <option key={i} value={i}>
                      Cột {i + 1}: {h || "(trống)"}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="label">Venue mặc định {cot.venue < 0 && <span className="text-wine">*</span>}</label>
              <select className="input" value={venueMacDinh} onChange={(e) => { setVenueMacDinh(e.target.value); setKiemTra(null); }}>
                <option value="">Không dùng</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.ten}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-muted">Dùng cho dòng không ghi venue.</p>
            </div>
            <div>
              <label className="label">Sales mặc định</label>
              <select className="input" value={salesMacDinh} onChange={(e) => { setSalesMacDinh(e.target.value); setKiemTra(null); }}>
                <option value="">BTC</option>
                {salesTeam.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-muted">Dùng cho dòng không ghi sales.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-ivory-deep">
            <table className="w-full text-xs">
              <thead className="bg-ivory/70 text-left text-ink-muted">
                <tr>
                  {TRUONG.map((f) => (
                    <th key={f.key} className="px-3 py-2 font-medium">{f.nhan}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dongNhap().slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-ivory-deep">
                    {TRUONG.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-ink">{r[f.key] || <span className="text-ink-muted">-</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-muted">Xem trước 5 dòng đầu.</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn-ink" disabled={thieuCot || pending} onClick={() => chay(false)}>
              {pending && !kiemTra ? "Đang kiểm tra..." : "Kiểm tra trước"}
            </button>
            {kiemTra && kiemTra.tongHop.hopLe > 0 && (
              <button className="btn-gold" disabled={pending} onClick={() => chay(true)}>
                {pending ? "Đang nhập..." : `Nhập ${kiemTra.tongHop.hopLe.toLocaleString("vi-VN")} khách`}
              </button>
            )}
            {thieuCot && <span className="text-xs text-wine">Cần có cột Họ tên, Số điện thoại, và cột Venue hoặc venue mặc định.</span>}
          </div>
        </div>
      )}

      {/* Ket qua */}
      {ketQua && (
        <div className="card p-6">
          <div className="text-xs font-medium uppercase tracking-wider text-gold-deep">{daNhap ? "Đã nhập" : "Bước 3"}</div>
          <h2 className="mt-1 font-display text-lg text-ink">{daNhap ? "Kết quả nhập" : "Kết quả kiểm tra"}</h2>
          <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${ketQua.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>
            {ketQua.thongBao}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <O nhan="Hợp lệ" so={ketQua.tongHop.hopLe} />
            <O nhan="Nháp" so={ketQua.tongHop.nhap} />
            <O nhan="Chờ duyệt" so={ketQua.tongHop.choDuyet} />
            <O nhan="Danh sách chờ" so={ketQua.tongHop.danhSachCho} />
            <O nhan="Lỗi, bỏ qua" so={ketQua.tongHop.loi} do />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" className="h-4 w-4 accent-gold" checked={chiXemLoi} onChange={(e) => setChiXemLoi(e.target.checked)} />
              Chỉ xem dòng lỗi hoặc cần chú ý
            </label>
            {daNhap && (
              <Link href="/admin/khach" className="btn-gold btn-sm">
                Xem danh sách khách
              </Link>
            )}
          </div>
          <div className="mt-3 max-h-[480px] overflow-auto rounded-xl border border-ivory-deep">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ivory text-left text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Dòng</th>
                  <th className="px-3 py-2 font-medium">Họ tên</th>
                  <th className="px-3 py-2 font-medium">SĐT</th>
                  <th className="px-3 py-2 font-medium">Venue</th>
                  <th className="px-3 py-2 font-medium">Số</th>
                  <th className="px-3 py-2 font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {dongHien.map((d) => (
                  <tr key={d.dong} className="border-t border-ivory-deep align-top">
                    <td className="px-3 py-2 text-ink-muted">{d.dong}</td>
                    <td className="px-3 py-2 text-ink">{d.hoTen || "-"}</td>
                    <td className="px-3 py-2 font-mono text-ink-soft">{d.sdt || "-"}</td>
                    <td className="px-3 py-2 text-ink-soft">{d.venueTen || "-"}</td>
                    <td className="px-3 py-2 font-mono">{d.soThuTu ?? "-"}</td>
                    <td className="px-3 py-2">
                      {d.loi ? (
                        <span className="text-wine">{d.loi}</span>
                      ) : (
                        <div className="space-y-1">
                          {d.trangThai && <StatusBadge trangThai={d.trangThai} />}
                          {d.canhBao && <div className="text-gold-deep">{d.canhBao}</div>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {dongHien.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-ink-muted">Không có dòng nào cần chú ý.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {ketQua.dong.length > 300 && <p className="mt-2 text-xs text-ink-muted">Hiển thị 300 dòng đầu.</p>}
          {daNhap && (
            <button className="btn-ghost mt-4" onClick={() => { setDaNhap(null); setBang([]); setTenFile(""); setCot(null); }}>
              Nhập file khác
            </button>
          )}
        </div>
      )}

      <div className="card p-5 text-sm text-ink-soft">
        <div className="font-medium text-ink">Quy tắc khi nhập</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>SĐT được chuẩn hóa (+84, dấu cách, dấu chấm, mất số 0 đầu do Excel). Trùng với khách đã có hoặc trùng trong file thì vào hàng Chờ duyệt.</li>
          <li>Cột VIP ghi x, có, 1, yes hoặc VIP thì khách vào hàng Chờ duyệt.</li>
          <li>Venue hết quota thì khách vào Danh sách chờ. Venue ghi tên ngắn như “Riverside”, “Claris” vẫn nhận được.</li>
          <li>Tên sales phải trùng họ tên tài khoản sales thì sales đó mới thấy khách trong Cổng Sales.</li>
        </ul>
      </div>
    </div>
  );
}

function O({ nhan, so, do: laDo }: { nhan: string; so: number; do?: boolean }) {
  return (
    <div className="rounded-xl bg-ivory/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-muted">{nhan}</div>
      <div className={`mt-0.5 font-display text-2xl ${laDo && so > 0 ? "text-wine" : "text-ink"}`}>{so.toLocaleString("vi-VN")}</div>
    </div>
  );
}
