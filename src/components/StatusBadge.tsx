import { NHAN_TRANG_THAI, MAU_TRANG_THAI } from "@/lib/constants";

export function StatusBadge({ trangThai }: { trangThai: string }) {
  const mau = MAU_TRANG_THAI[trangThai] || { bg: "#efe8db", text: "#6b6255" };
  return (
    <span className="chip" style={{ backgroundColor: mau.bg, color: mau.text }}>
      {NHAN_TRANG_THAI[trangThai] || trangThai}
    </span>
  );
}
