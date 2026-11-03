import type { LichSu } from "@/lib/lichSu";

// Nhan lich su nam truoc: xanh da den, hong mo moi khong den, xam cung cong ty / khach moi
const MAU: Record<LichSu["loai"], string> = {
  den: "bg-sage/15 text-sage",
  khongDen: "bg-wine/10 text-wine",
  congTy: "bg-ivory-deep text-ink-soft",
  moi: "bg-ivory-deep text-ink-muted",
};

export function ChipLichSu({ ls }: { ls: LichSu | null | undefined }) {
  if (!ls) return null;
  return (
    <span className={`chip whitespace-nowrap ${MAU[ls.loai]}`} title={ls.chiTiet}>
      {ls.nhan}
    </span>
  );
}
