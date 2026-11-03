"use client";

import { useState, useTransition } from "react";
import { thaoTacHangLoat, type KetQua, type LoaiHangLoat } from "@/lib/actions";

const THAO_TAC: { loai: LoaiHangLoat; nhan: string; btc?: boolean; sales?: boolean; nguyHiem?: boolean }[] = [
  { loai: "GUI_DUYET", nhan: "Gửi duyệt", sales: true, btc: true },
  { loai: "DUYET", nhan: "Duyệt, phát hành vé", btc: true },
  { loai: "DA_GUI_ONLINE", nhan: "Đã gửi thiệp online", sales: true, btc: true },
  { loai: "DA_GUI_GIAY", nhan: "Đã gửi thiệp giấy", sales: true, btc: true },
  { loai: "THAM_DU", nhan: "Xác nhận tham dự (đủ số người)", sales: true, btc: true },
  { loai: "KHONG_THAM_DU", nhan: "Không tham dự", sales: true, btc: true },
  { loai: "DOI_SALES", nhan: "Đổi người phụ trách", btc: true },
  { loai: "HUY", nhan: "Hủy thiệp", btc: true, nguyHiem: true },
  { loai: "XOA_NHAP", nhan: "Xóa nháp", sales: true, nguyHiem: true },
  { loai: "XOA", nhan: "Xóa khách", btc: true, nguyHiem: true },
];

// Thanh hien khi da tick chon khach: chon thao tac roi ap dung cho tat ca khach da chon
export function ThanhHangLoat({
  ids,
  laSales,
  salesTeam = [],
  onXong,
}: {
  ids: string[];
  laSales: boolean;
  salesTeam?: string[];
  onXong: () => void;
}) {
  const [pending, start] = useTransition();
  const [loai, setLoai] = useState<LoaiHangLoat | "">("");
  const [sales, setSales] = useState("");
  const [xacNhan, setXacNhan] = useState(false);
  const [kq, setKq] = useState<KetQua | null>(null);
  const ds = THAO_TAC.filter((t) => (laSales ? t.sales : t.btc));
  const chon = ds.find((t) => t.loai === loai);

  const chay = () => {
    if (!loai) return;
    if (chon?.nguyHiem && !xacNhan) {
      setXacNhan(true);
      return;
    }
    start(async () => {
      const r = await thaoTacHangLoat(ids, loai, sales);
      setKq(r);
      setXacNhan(false);
      if (r.ok) {
        setLoai("");
        onXong();
      }
    });
  };

  if (ids.length === 0) return kq ? <ThongBao kq={kq} /> : null;
  return (
    <div className="sticky top-2 z-10 space-y-2">
      <div className="card flex flex-wrap items-center gap-2 border-brand/40 p-3 shadow-lg">
        <span className="chip bg-brand text-white">Đã chọn {ids.length} khách</span>
        <select
          className="input w-auto py-2"
          value={loai}
          onChange={(e) => { setLoai(e.target.value as LoaiHangLoat); setXacNhan(false); setKq(null); }}
          aria-label="Thao tác hàng loạt"
        >
          <option value="">Chọn thao tác</option>
          {ds.map((t) => (
            <option key={t.loai} value={t.loai}>
              {t.nhan}
            </option>
          ))}
        </select>
        {loai === "DOI_SALES" && (
          <select className="input w-auto py-2" value={sales} onChange={(e) => setSales(e.target.value)} aria-label="Người phụ trách mới">
            <option value="">Chọn người phụ trách</option>
            {["BTC", ...salesTeam].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <button
          className={chon?.nguyHiem ? "rounded-full bg-wine px-4 py-2 text-sm text-white disabled:opacity-50" : "btn-brand btn-sm"}
          disabled={pending || !loai || (loai === "DOI_SALES" && !sales)}
          onClick={chay}
        >
          {pending ? "Đang làm..." : xacNhan ? `Bấm lần nữa để ${chon?.nhan.toLowerCase()} ${ids.length} khách` : "Áp dụng"}
        </button>
        <button className="btn-ghost btn-sm" onClick={() => { onXong(); setKq(null); }}>
          Bỏ chọn
        </button>
        <span className="text-xs text-ink-muted">Khách không phù hợp trạng thái sẽ được bỏ qua.</span>
      </div>
      {kq && <ThongBao kq={kq} />}
    </div>
  );
}

function ThongBao({ kq }: { kq: KetQua }) {
  return <div className={`rounded-xl px-4 py-2.5 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.thongBao}</div>;
}

// O tick "chon tat ca" co trang thai chon mot phan
export function HopChonTatCa({ tong, daChon, onDoi }: { tong: number; daChon: number; onDoi: (chonHet: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer accent-brand"
      aria-label="Chọn tất cả khách đang lọc"
      checked={tong > 0 && daChon === tong}
      ref={(el) => {
        if (el) el.indeterminate = daChon > 0 && daChon < tong;
      }}
      onChange={(e) => onDoi(e.target.checked)}
    />
  );
}

// O tick tren tung dong; khong lam mo / dong dong khi bam
export function HopChon({ chon, onDoi }: { chon: boolean; onDoi: () => void }) {
  return (
    <td className="w-10 pl-4 pr-1 py-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-brand" aria-label="Chọn khách" checked={chon} onChange={onDoi} />
    </td>
  );
}
