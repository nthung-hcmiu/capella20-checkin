"use client";

import { useState, useTransition } from "react";
import { CHUA_PHAT_HANH } from "@/lib/constants";
import { suaKhach } from "@/lib/actions";
import { DANH_XUNG, NHAN_TRUONG, TRUONG_CHU, type ThongTinThem, type TruongChu } from "@/lib/khach";

// Cac o thong tin doanh nghiep dung chung cho them va sua
export function OThongTin({ them }: { them?: ThongTinThem }) {
  const o = (k: TruongChu, placeholder = "") => (
    <div key={k}>
      <label className="label">{NHAN_TRUONG[k]}</label>
      <input name={k} className="input" defaultValue={them?.[k] || ""} placeholder={placeholder} />
    </div>
  );
  return (
    <>
      <div>
        <label className="label">Danh xưng</label>
        <select name="danhXung" className="input" defaultValue={them?.danhXung || ""}>
          <option value="">Không ghi</option>
          {DANH_XUNG.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      {o("chucVu", "Giám đốc")}
      {o("congTy", "CÔNG TY TNHH ...")}
      {o("maCorp", "COR0001234")}
      {o("doanhThuDuKien", "95.000.000 đ")}
      {o("nhomKhachMoi", "Khách Corporate")}
      {o("nhomKhach", "Khách end-user")}
      {o("linhVuc")}
      {o("nguonKhach", "Netsuite / Contact mới")}
      {o("donViKinhDoanh")}
      {o("phongBan", "Phòng kinh doanh")}
    </>
  );
}

export function docThem(fd: FormData): ThongTinThem {
  return Object.fromEntries(TRUONG_CHU.map((k) => [k, String(fd.get(k) ?? "")])) as ThongTinThem;
}

export interface KhachSua {
  id: string;
  hoTen: string;
  sdt: string | null;
  soNguoiMoi: number;
  isVip: boolean;
  ghiChu: string | null;
  salesOwner: string;
  venueId: string;
  trangThai: string;
  them: ThongTinThem;
}

// Form sua thong tin khach. Ve da phat hanh: so thu tu, ma QR, venue giu nguyen;
// sales con khong doi duoc so nguoi moi va VIP (BTC da duyet).
export function FormKhach({
  g,
  venues,
  salesTeam,
  laSales = false,
  onXong,
}: {
  g: KhachSua;
  venues: { id: string; ten: string }[];
  salesTeam?: string[];
  laSales?: boolean;
  onXong: () => void;
}) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<{ ok: boolean; msg: string } | null>(null);
  const daPhatHanh = !CHUA_PHAT_HANH.includes(g.trangThai);
  const khoaDuyet = laSales && daPhatHanh;
  const gui = (fd: FormData) =>
    start(async () => {
      const r = await suaKhach(g.id, {
        hoTen: String(fd.get("hoTen") || ""),
        sdt: String(fd.get("sdt") || ""),
        soNguoiMoi: parseInt(String(fd.get("soNguoiMoi") || String(g.soNguoiMoi)), 10),
        isVip: khoaDuyet ? g.isVip : fd.get("isVip") === "on",
        ghiChu: String(fd.get("ghiChu") || ""),
        venueId: String(fd.get("venueId") || g.venueId),
        ...(laSales ? {} : { salesOwner: String(fd.get("salesOwner") || "") }),
        them: docThem(fd),
      });
      setKq({ ok: r.ok, msg: r.thongBao });
      if (r.ok && !r.thongBao.includes("Lưu ý")) onXong();
    });
  return (
    <form action={gui} className="mt-3 space-y-4 rounded-xl border border-ivory-deep bg-white p-4" onClick={(e) => e.stopPropagation()}>
      {daPhatHanh && (
        <p className="rounded-lg bg-ivory/70 px-3 py-2 text-xs text-ink-soft">
          Vé đã phát hành: số thứ tự, mã QR và venue giữ nguyên, thiệp đã gửi vẫn dùng được.
          {laSales ? " Số người mời và VIP do BTC duyệt, muốn đổi thì liên hệ BTC." : ""}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">Tên khách mời</label>
          <input name="hoTen" className="input" defaultValue={g.hoTen} required />
        </div>
        <div>
          <label className="label">Số điện thoại</label>
          <input name="sdt" className="input" defaultValue={g.sdt || ""} inputMode="tel" placeholder="Không bắt buộc" />
        </div>
        <div>
          <label className="label">Venue</label>
          <select name="venueId" className="input" defaultValue={g.venueId} disabled={daPhatHanh}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Số người mời</label>
          <input name="soNguoiMoi" type="number" min={1} max={10} className="input" defaultValue={g.soNguoiMoi} disabled={khoaDuyet} />
        </div>
        {!laSales && salesTeam && (
          <div>
            <label className="label">Người phụ trách</label>
            <select name="salesOwner" className="input" defaultValue={g.salesOwner}>
              {[...new Set(["BTC", g.salesOwner, ...salesTeam])].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <OThongTin them={g.them} />
        <div className="sm:col-span-2">
          <label className="label">Ghi chú</label>
          <input name="ghiChu" className="input" defaultValue={g.ghiChu || ""} />
        </div>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-ink-soft">
          <input name="isVip" type="checkbox" defaultChecked={g.isVip} disabled={khoaDuyet} className="h-4 w-4 accent-brand" />
          Khách VIP
        </label>
      </div>
      {kq && <div className={`rounded-xl px-4 py-2 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.msg}</div>}
      <div className="flex gap-2">
        <button type="submit" className="btn-brand btn-sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={onXong}>
          Đóng
        </button>
      </div>
    </form>
  );
}
