// Nhan dien Capella 20 nam. Khi co file logo chinh thuc, dat vao public/brand/ va doi LOGO ben duoi.
const LOGO: string | null = "/brand/capella20-logo.png";

export function Brand({ sub, light, lon }: { sub?: string; light?: boolean; lon?: boolean }) {
  if (LOGO) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="Capella Holdings 20 năm" className={lon ? "h-16 w-auto" : "h-9 w-auto"} />
        {sub && <span className={`hidden text-[11px] uppercase tracking-[0.18em] sm:inline ${light ? "text-ivory/60" : "text-ink-muted"}`}>{sub}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="leading-none">
        <div className={`font-display font-bold tracking-[0.18em] ${lon ? "text-2xl" : "text-base"} ${light ? "text-white" : "text-ink"}`}>
          CAPELLA
        </div>
        <div className={`mt-1 text-[9px] tracking-[0.45em] ${light ? "text-white/70" : "text-ink-muted"}`}>HOLDINGS</div>
      </div>
      <div className={`self-stretch border-l ${light ? "border-white/40" : "border-ink/30"}`} />
      <div className="leading-none">
        <div className={`font-display font-bold text-brand ${lon ? "text-3xl" : "text-xl"}`}>20</div>
        <div className={`mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] ${light ? "text-white/70" : "text-ink-muted"}`}>
          {sub || "Years"}
        </div>
      </div>
    </div>
  );
}
