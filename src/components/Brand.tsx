export function Brand({ sub, light }: { sub?: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid h-10 w-10 place-items-center rounded-full border ${
          light ? "border-ivory/40 text-ivory" : "border-gold/50 text-gold"
        }`}
      >
        <span className="font-display text-lg">C</span>
      </div>
      <div className="leading-tight">
        <div className={`font-display text-base ${light ? "text-ivory" : "text-ink"}`}>
          CAPELLA <span className="text-gold">20</span>
        </div>
        <div className={`text-[11px] uppercase tracking-[0.18em] ${light ? "text-ivory/60" : "text-ink-muted"}`}>
          {sub || "Đêm tri ân"}
        </div>
      </div>
    </div>
  );
}
