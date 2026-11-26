"use client";

import { useEffect, useState } from "react";
import { QUY_CACH, type Nhan } from "@/lib/nhan";

// In nhan dan ngoai thiep giay theo quy cach trong lib/nhan.ts
const MOI_TO = QUY_CACH.cot * QUY_CACH.hang;
const KHOA_LECH = "c20_nhan_lech";

// Ten dai thi chu nho lai de vua 2 dong
const coTen = (s: string) => (s.length <= 22 ? 14 : s.length <= 30 ? 12.5 : s.length <= 42 ? 11 : 9.5);

export function InNhan({ nhan }: { nhan: Nhan[] }) {
  const [batDau, setBatDau] = useState(1); // o dau tien se in, 1 la o tren cung ben trai
  const [lechX, setLechX] = useState(0);
  const [lechY, setLechY] = useState(0);
  const [khung, setKhung] = useState(false);

  // Do lech cua may in luu lai tren may nay, lan sau khoi chinh lai
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KHOA_LECH) || "null");
      if (v && typeof v.x === "number" && typeof v.y === "number") {
        setLechX(v.x);
        setLechY(v.y);
      }
    } catch {}
  }, []);
  const luuLech = (x: number, y: number) => {
    setLechX(x);
    setLechY(y);
    try {
      localStorage.setItem(KHOA_LECH, JSON.stringify({ x, y }));
    } catch {}
  };
  const doc = (s: string) => Math.max(-15, Math.min(15, Number(s.replace(",", ".")) || 0));

  // Cac o tren tung to: bo trong cac o truoc o bat dau
  const o: (Nhan | null)[] = [...Array.from({ length: batDau - 1 }, () => null), ...nhan];
  const to: (Nhan | null)[][] = [];
  for (let i = 0; i < o.length; i += MOI_TO) to.push(o.slice(i, i + MOI_TO));

  return (
    <div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: ${QUY_CACH.kho} landscape; margin: 0; }
@media print { html, body { background: #fff !important; } .to-nhan { break-after: page; } .to-nhan:last-child { break-after: auto; } }`,
        }}
      />

      <div className="mx-auto max-w-5xl space-y-4 px-5 pb-5 print:hidden">
        <div className="card grid gap-5 p-5 lg:grid-cols-3">
          <div>
            <div className="label">Bắt đầu in từ ô</div>
            <div className="grid w-40 grid-cols-2 gap-1">
              {Array.from({ length: MOI_TO }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBatDau(n)}
                  aria-pressed={batDau === n}
                  className={`h-7 rounded border text-xs ${batDau === n ? "border-brand bg-brand text-white" : n < batDau ? "border-ink/10 bg-ivory-deep text-ink-muted" : "border-ink/20 bg-white text-ink-soft"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">Tờ nhãn mới thì để ô 1. Tờ đã dùng dở thì chọn ô còn trống đầu tiên.</p>
          </div>
          <div>
            <div className="label">Chỉnh lệch khi in (mm)</div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <label className="flex items-center gap-2">
                Ngang
                <input type="number" step="0.5" className="input w-20 py-1.5" value={lechX} onChange={(e) => luuLech(doc(e.target.value), lechY)} />
              </label>
              <label className="flex items-center gap-2">
                Dọc
                <input type="number" step="0.5" className="input w-20 py-1.5" value={lechY} onChange={(e) => luuLech(lechX, doc(e.target.value))} />
              </label>
            </div>
            <p className="mt-2 text-xs text-ink-muted">Chữ in lệch sang trái thì tăng số Ngang, lệch lên trên thì tăng số Dọc. Máy này sẽ nhớ số đã chỉnh.</p>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={khung} onChange={(e) => setKhung(e.target.checked)} />
              In kèm khung viền nhãn (để in thử trên giấy thường)
            </label>
          </div>
          <div>
            <div className="label">Khi in</div>
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-ink-soft">
              <li>Khổ giấy: A5. Hướng giấy: ngang.</li>
              <li>Lề: Không có. Tỷ lệ: 100% (không chọn vừa trang).</li>
              <li>Tắt Đầu trang và chân trang.</li>
              <li>Nên in thử một tờ giấy thường, chồng lên tờ nhãn soi cho khớp rồi mới in thật.</li>
            </ol>
            <button type="button" className="btn-brand mt-3" disabled={nhan.length === 0} onClick={() => window.print()}>
              In {nhan.length.toLocaleString("vi-VN")} nhãn ({to.length} tờ)
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-10 print:overflow-visible print:pb-0">
        <div className="mx-auto flex w-max flex-col gap-5 px-5 print:gap-0 print:px-0">
          {to.map((cacO, i) => (
            <div
              key={i}
              className="to-nhan relative overflow-hidden bg-white shadow-card ring-1 ring-ink/10 print:shadow-none print:ring-0"
              style={{ width: `${QUY_CACH.rong}mm`, height: `${QUY_CACH.cao}mm` }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${QUY_CACH.cot}, ${QUY_CACH.nhanRong}mm)`,
                  gridTemplateRows: `repeat(${QUY_CACH.hang}, ${QUY_CACH.nhanCao}mm)`,
                  paddingLeft: `${QUY_CACH.leNgang}mm`,
                  transform: `translate(${lechX}mm, ${lechY}mm)`,
                }}
              >
                {Array.from({ length: MOI_TO }, (_, j) => {
                  const n = cacO[j] ?? null;
                  return (
                    <div
                      key={j}
                      className={`relative flex flex-col items-center justify-center overflow-hidden border border-dashed border-ink/25 text-center text-black ${khung ? "print:border-solid print:border-black/60" : "print:border-transparent"}`}
                      style={{ padding: "2.5mm 4mm 5mm" }}
                    >
                      {n ? (
                        <>
                          <div className="line-clamp-2 font-semibold" style={{ fontSize: `${coTen(n.ten)}pt`, lineHeight: 1.2, textWrap: "balance" }}>
                            {n.ten}
                          </div>
                          {n.chucVu && (
                            <div className="mt-[0.6mm] line-clamp-2" style={{ fontSize: "8.5pt", lineHeight: 1.22 }}>
                              {n.chucVu}
                            </div>
                          )}
                          {n.congTy && (
                            <div className="mt-[0.4mm] line-clamp-2 font-medium" style={{ fontSize: "8.5pt", lineHeight: 1.22 }}>
                              {n.congTy}
                            </div>
                          )}
                          <div className="absolute font-mono font-semibold" style={{ right: "3mm", bottom: "1.6mm", fontSize: "9.5pt", lineHeight: 1 }}>
                            {n.so}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-ink/25 print:hidden">Ô {j + 1}{i === 0 && j < batDau - 1 ? ", để trống" : ""}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {nhan.length === 0 && <p className="py-10 text-center text-sm text-ink-muted print:hidden">Không có nhãn nào để in.</p>}
      </div>
    </div>
  );
}
