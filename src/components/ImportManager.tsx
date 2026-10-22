"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { boDau } from "@/lib/format";
import { nhapDanhSach, type DongNhap, type KetQuaNhap } from "@/lib/nhapActions";
import { StatusBadge } from "./StatusBadge";

type Truong = keyof DongNhap;

const TRUONG: { key: Truong; nhan: string; batBuoc?: boolean; phu?: boolean; dongNghia: string[] }[] = [
  { key: "hoTen", nhan: "Tên khách mời", batBuoc: true, dongNghia: ["ten khach moi", "ho ten", "ho va ten", "ten khach", "ten khach hang", "khach hang", "khach moi", "ten", "full name", "name"] },
  { key: "sdt", nhan: "Số điện thoại", dongNghia: ["sdt", "so dien thoai", "dien thoai", "so dt", "dt", "phone", "mobile", "di dong"] },
  { key: "venue", nhan: "Đơn vị (venue)", dongNghia: ["don vi", "venue", "chi nhanh", "nha hang", "dia diem", "co so", "sanh", "trung tam"] },
  { key: "soNguoiMoi", nhan: "Số lượng người tham dự", dongNghia: ["so luong nguoi tham du", "so nguoi moi", "so nguoi duoc moi", "so nguoi tham du", "so nguoi", "so khach", "so luong", "sl"] },
  { key: "sales", nhan: "Người phụ trách tiếp khách", dongNghia: ["ho va ten nguoi phu trach tiep khach", "nguoi phu trach tiep khach", "sales phu trach", "nguoi phu trach", "sales", "sale", "nhan vien phu trach", "phu trach", "nhan vien", "nv"] },
  { key: "vip", nhan: "Phân loại khách VIP", dongNghia: ["phan loai khach vip", "khach vip", "vip", "hang khach"] },
  { key: "danhXung", nhan: "Danh xưng", phu: true, dongNghia: ["danh xung", "xung ho", "gioi tinh"] },
  { key: "chucVu", nhan: "Chức vụ", phu: true, dongNghia: ["chuc vu", "chuc danh", "position", "title"] },
  { key: "congTy", nhan: "Company Name", phu: true, dongNghia: ["company name", "ten cong ty", "cong ty", "company", "doanh nghiep"] },
  { key: "maCorp", nhan: "Mã CORP Netsuite", phu: true, dongNghia: ["ma corp netsuite", "ma corp", "ma netsuite", "ma khach hang"] },
  { key: "nhomKhachMoi", nhan: "Nhóm khách mời", phu: true, dongNghia: ["nhom khach moi"] },
  { key: "donViKinhDoanh", nhan: "Thuộc đơn vị kinh doanh", phu: true, dongNghia: ["thuoc don vi kinh doanh", "don vi kinh doanh"] },
  { key: "nhomKhach", nhan: "Nhóm khách", phu: true, dongNghia: ["nhom khach"] },
  { key: "linhVuc", nhan: "Lĩnh vực", phu: true, dongNghia: ["linh vuc", "nganh nghe", "nganh"] },
  { key: "nguonKhach", nhan: "Phân loại khách", phu: true, dongNghia: ["phan loai khach", "nguon khach"] },
  { key: "doanhThuDuKien", nhan: "Doanh thu dự kiến", phu: true, dongNghia: ["doanh thu du kien", "doanh thu"] },
  { key: "phongBan", nhan: "Phòng ban", phu: true, dongNghia: ["phong ban", "bo phan"] },
  { key: "soGhe", nhan: "Số ghế cho khách VIP", phu: true, dongNghia: ["so ghe ngoi cho khach vip", "so ghe cho khach vip", "so ghe"] },
  { key: "thiepGiay", nhan: "Round 2: Đã gửi thiệp giấy", phu: true, dongNghia: ["round 2 da gui thiep giay", "da gui thiep giay", "thiep giay"] },
  { key: "ghiChu", nhan: "Ghi chú", phu: true, dongNghia: ["ghi chu", "note", "notes", "chu thich"] },
];

const TRUONG_XEM = TRUONG.filter((f) => ["danhXung", "hoTen", "chucVu", "congTy", "sdt", "venue", "soNguoiMoi", "vip", "sales"].includes(f.key))
  .sort((a, b) => ["danhXung", "hoTen", "chucVu", "congTy", "sdt", "venue", "soNguoiMoi", "vip", "sales"].indexOf(a.key) - ["danhXung", "hoTen", "chucVu", "congTy", "sdt", "venue", "soNguoiMoi", "vip", "sales"].indexOf(b.key));

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
  const chuan = tieuDe.map((h) => boDau(String(h)).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());
  const ketQua = Object.fromEntries(TRUONG.map((f) => [f.key, -1])) as Record<Truong, number>;
  const daDung = new Set<number>();
  // Luot 1: khop dung nguyen tieu de cho moi truong, de "Phan loai khach" khong lay nham cot "Phan loai khach VIP"
  for (const f of TRUONG) {
    const idx = chuan.findIndex((h, i) => !daDung.has(i) && f.dongNghia.includes(h));
    if (idx >= 0) { ketQua[f.key] = idx; daDung.add(idx); }
  }
  // Luot 2: khop mot phan cho truong con thieu, uu tien tu dong nghia dai nhat
  for (const f of TRUONG) {
    if (ketQua[f.key] >= 0) continue;
    for (const d of [...f.dongNghia].sort((a, b) => b.length - a.length)) {
      if (d.length < 3) continue;
      const idx = chuan.findIndex((h, i) => !daDung.has(i) && h.includes(d));
      if (idx >= 0) { ketQua[f.key] = idx; daDung.add(idx); break; }
    }
  }
  return ketQua;
}

function taiFileMau() {
  const tieuDe = [
    "STT", "Đơn vị", "Nhóm khách mời", "Thuộc đơn vị kinh doanh", "Mã CORP Netsuite", "Company Name", "Nhóm khách",
    "Lĩnh vực", "Danh xưng", "Tên khách mời", "Chức vụ", "Số điện thoại", "Số lượng người tham dự", "Phân loại khách",
    "Phân loại khách VIP", "Doanh thu dự kiến", "Round 2: Đã gửi thiệp giấy", "Số ghế cho khách VIP",
    "Họ và tên người phụ trách tiếp khách", "Phòng ban", "Ghi chú",
  ];
  const mau = [
    ["1", "Gallery Hall", "Khách Corporate", "Capella Gallery Hall", "COR0000001", "CÔNG TY TNHH MẪU A", "Khách end-user", "Công nghệ", "Ông", "Nguyễn Văn An", "Giám đốc", "0901234567", "1", "Netsuite", "VIP", "", "", "10.01", "Thu Hà", "Phòng kinh doanh", ""],
    ["2", "Riverside Palace", "Đối tác Capella", "Riverside Palace", "COR0000002", "CÔNG TY CP MẪU B", "Agency/báo chí/truyền thông", "Sự kiện", "Bà", "Trần Thị Bình", "Trưởng phòng", "", "2", "Contact mới", "THƯỜNG", "", "", "", "Minh Quân", "Marketing", "Không có SĐT vẫn nhập được"],
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
  const [vipDaDuyet, setVipDaDuyet] = useState(false);

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
      return Object.fromEntries(TRUONG.map((f) => [f.key, lay(f.key)])) as unknown as DongNhap;
    });

  const thieuCot = !cot || cot.hoTen < 0 || (cot.venue < 0 && !venueMacDinh);
  const soCotPhu = cot ? TRUONG.filter((f) => f.phu && cot[f.key] >= 0).length : 0;

  const chay = (ghi: boolean) =>
    start(async () => {
      const r = await nhapDanhSach(dongNhap(), {
        venueMacDinh: venueMacDinh || undefined,
        vipDaDuyet,
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
            {TRUONG.filter((f) => !f.phu).map((f) => (
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
            <label className="flex items-start gap-2 text-sm text-ink-soft sm:col-span-2 lg:col-span-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold" checked={vipDaDuyet} onChange={(e) => { setVipDaDuyet(e.target.checked); setKiemTra(null); }} />
              <span>
                Khách VIP trong file này BTC đã duyệt
                <span className="block text-xs text-ink-muted">Bỏ trống thì khách VIP vào hàng Chờ duyệt như khi sales tự thêm.</span>
              </span>
            </label>
          </div>

          <details className="mt-4 rounded-xl border border-ivory-deep bg-ivory/40 p-4" open={soCotPhu < 6}>
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Thông tin doanh nghiệp và phân loại ({soCotPhu}/{TRUONG.filter((f) => f.phu).length} cột đã ghép)
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TRUONG.filter((f) => f.phu).map((f) => (
                <div key={f.key}>
                  <label className="label">{f.nhan}</label>
                  <select
                    className="input"
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
            </div>
          </details>

          <div className="mt-5 overflow-x-auto rounded-xl border border-ivory-deep">
            <table className="w-full text-xs">
              <thead className="bg-ivory/70 text-left text-ink-muted">
                <tr>
                  {TRUONG_XEM.map((f) => (
                    <th key={f.key} className="whitespace-nowrap px-3 py-2 font-medium">{f.nhan}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dongNhap().slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-ivory-deep">
                    {TRUONG_XEM.map((f) => (
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
            {thieuCot && <span className="text-xs text-wine">Cần có cột Tên khách mời, và cột Đơn vị (venue) hoặc venue mặc định.</span>}
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
          {ketQua.tongHop.khongSdt > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              {ketQua.tongHop.khongSdt.toLocaleString("vi-VN")} khách không có SĐT: chống trùng theo tên và mã CORP / công ty, khách xác nhận trên trang thiệp chỉ cần số thứ tự.
            </p>
          )}
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
                    <td className="px-3 py-2 text-ink">{d.hoTen || "-"}{d.congTy && <div className="text-ink-muted">{d.congTy}</div>}</td>
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
          <li>Dùng được thẳng file danh sách mẫu các năm trước (sheet đầu tiên). Cột SĐT không bắt buộc.</li>
          <li>Chống trùng: có SĐT thì theo SĐT (chuẩn hóa +84, dấu cách, mất số 0 do Excel). Không có SĐT thì theo tên khách cùng mã CORP, hoặc cùng công ty. Trùng thì vào hàng Chờ duyệt.</li>
          <li>Cột VIP ghi VIP, x, có hoặc 1 là khách VIP (THƯỜNG là khách thường). Khách VIP vào hàng Chờ duyệt, trừ khi tích ô BTC đã duyệt.</li>
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
