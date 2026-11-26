"use client";

import { useEffect, useRef, useState } from "react";
import { DS_QUY_CACH, MEP_AN_TOAN, SO_CACH_BEN, SO_CACH_DAY, type Nhan } from "@/lib/nhan";

// In nhan dan ngoai thiep giay. Nguoi in chon loai giay nhan (lib/nhan.ts), o bat dau va do lech cua may in.
const KHOA_LOAI = "c20_nhan_loai";
const khoaLech = (ma: string) => `c20_nhan_lech_${ma}`;

export function InNhan({ nhan: tatCaNhan }: { nhan: Nhan[] }) {
  const [ma, setMa] = useState(DS_QUY_CACH[0].ma);
  // Mac dinh moi cong ty chi in mot nhan (khach dau tien) de tiet kiem nhan; bo tick thi moi thiep mot nhan
  const [gopCty, setGopCty] = useState(true);
  const nhan = gopCty ? tatCaNhan.filter((n) => !n.gop) : tatCaNhan;
  const soGop = tatCaNhan.length - tatCaNhan.filter((n) => !n.gop).length;
  const nhomGop = tatCaNhan.filter((n) => !n.gop && n.kem.length > 0);
  const [batDau, setBatDau] = useState(1); // o dau tien se in, 1 la o tren cung ben trai
  const [lechX, setLechX] = useState(0);
  const [lechY, setLechY] = useState(0);
  const [khung, setKhung] = useState(false);
  const qc = DS_QUY_CACH.find((q) => q.ma === ma) || DS_QUY_CACH[0];
  const moiTo = qc.cot * qc.hang;
  const vung = useRef<HTMLDivElement>(null);

  // Nhan nao chu qua dai (ten, chuc vu, cong ty, dia chi deu 2 dong) thi thu nho chu cua rieng nhan do cho vua, khong de bi cat
  useEffect(() => {
    const chinh = () => {
      vung.current?.querySelectorAll<HTMLElement>("[data-chu]").forEach((nd) => {
        const o = nd.parentElement;
        if (!o) return;
        const cs = getComputedStyle(o);
        const choPhep = o.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        let heSo = 1;
        nd.style.fontSize = "1pt";
        while (nd.scrollHeight > choPhep + 0.5 && heSo > 0.56) {
          heSo -= 0.04;
          nd.style.fontSize = `${heSo}pt`;
        }
      });
    };
    chinh();
    // Chu web tai xong co the lam doi do rong chu, do lai mot lan nua
    document.fonts?.ready.then(chinh).catch(() => {});
  }, [tatCaNhan, gopCty, ma, batDau]);

  // Loai giay da chon lan truoc va do lech cua may in luu tren may nay, lan sau khoi chon lai
  useEffect(() => {
    try {
      const v = localStorage.getItem(KHOA_LOAI);
      if (v && DS_QUY_CACH.some((q) => q.ma === v)) setMa(v);
    } catch {}
  }, []);
  useEffect(() => {
    let x = 0;
    let y = 0;
    try {
      const v = JSON.parse(localStorage.getItem(khoaLech(ma)) || "null");
      if (v && typeof v.x === "number" && typeof v.y === "number") {
        x = v.x;
        y = v.y;
      }
    } catch {}
    setLechX(x);
    setLechY(y);
  }, [ma]);
  const chonLoai = (m: string) => {
    setMa(m);
    setBatDau(1);
    try {
      localStorage.setItem(KHOA_LOAI, m);
    } catch {}
  };
  const luuLech = (x: number, y: number) => {
    setLechX(x);
    setLechY(y);
    try {
      localStorage.setItem(khoaLech(ma), JSON.stringify({ x, y }));
    } catch {}
  };
  const doc = (s: string) => Math.max(-15, Math.min(15, Number(s.replace(",", ".")) || 0));
  // Ten dai thi chu nho lai de vua 2 dong
  const coTen = (s: string) => (qc.coTen.find(([dai]) => s.length <= dai) || qc.coTen[qc.coTen.length - 1])[1];

  // Cac o tren tung to: bo trong cac o truoc o bat dau
  const o: (Nhan | null)[] = [...Array.from({ length: batDau - 1 }, () => null), ...nhan];
  const to: (Nhan | null)[][] = [];
  for (let i = 0; i < o.length; i += moiTo) to.push(o.slice(i, i + moiTo));
  const huongChu = qc.huong === "landscape" ? "ngang" : "dọc";

  return (
    <div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: ${qc.kho} ${qc.huong}; margin: 0; }
@media print { html, body { background: #fff !important; } .to-nhan { break-after: page; } .to-nhan:last-child { break-after: auto; } }`,
        }}
      />

      <div className="mx-auto max-w-5xl space-y-4 px-5 pb-5 print:hidden">
        <div className="card p-5">
          <div className="label">Loại giấy nhãn</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DS_QUY_CACH.map((q) => (
              <button
                key={q.ma}
                type="button"
                onClick={() => chonLoai(q.ma)}
                aria-pressed={q.ma === ma}
                className={`rounded-xl border px-4 py-3 text-left transition ${q.ma === ma ? "border-brand bg-brand/5 ring-1 ring-brand/40" : "border-ink/15 bg-white hover:bg-ivory"}`}
              >
                <div className="font-medium text-ink">{q.ten}</div>
                <div className="text-xs text-ink-muted">
                  Tờ {q.kho}, {q.cot * q.hang} nhãn mỗi tờ, mỗi nhãn {q.nhanRong} x {q.nhanCao} mm
                </div>
              </button>
            ))}
          </div>

          {soGop > 0 && (
            <div className="mt-4 rounded-xl bg-ivory/70 px-4 py-3">
              <label className="flex items-start gap-2 text-sm text-ink">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={gopCty} onChange={(e) => { setGopCty(e.target.checked); setBatDau(1); }} />
                <span>
                  Mỗi công ty chỉ in một nhãn, cho khách đầu tiên
                  <span className="block text-xs text-ink-muted">
                    {gopCty
                      ? `Đang in ${nhan.length.toLocaleString("vi-VN")} nhãn cho ${tatCaNhan.length.toLocaleString("vi-VN")} thiệp, tiết kiệm ${soGop.toLocaleString("vi-VN")} nhãn. Thiệp của các khách cùng công ty (và khách đi kèm) bỏ chung phong bì với khách đầu tiên.`
                      : `Đang in mỗi thiệp một nhãn: ${tatCaNhan.length.toLocaleString("vi-VN")} nhãn. Tick lại để tiết kiệm ${soGop.toLocaleString("vi-VN")} nhãn.`}
                  </span>
                </span>
              </label>
              {gopCty && nhomGop.length > 0 && (
                <details className="mt-2 text-xs text-ink-soft">
                  <summary className="cursor-pointer text-brand">Xem nhãn nào đi kèm thiệp nào ({nhomGop.length} công ty có nhiều thiệp)</summary>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-2">
                    {nhomGop.map((n) => (
                      <li key={n.khoa}>
                        Nhãn <b className="font-mono">{n.so}</b> {n.ten}
                        {n.congTy ? ` (${n.congTy})` : ""}: bỏ chung thiệp số {n.kem.join(", ")}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div>
              <div className="label">Bắt đầu in từ ô</div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${qc.cot}, minmax(0, 1fr))`, width: `${qc.cot * 3.4}rem` }}>
                {Array.from({ length: moiTo }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBatDau(n)}
                    aria-pressed={batDau === n}
                    className={`h-6 rounded border text-[11px] ${batDau === n ? "border-brand bg-brand text-white" : n < batDau ? "border-ink/10 bg-ivory-deep text-ink-muted" : "border-ink/20 bg-white text-ink-soft"}`}
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
              <p className="mt-2 text-xs text-ink-muted">Chữ in lệch sang trái thì tăng số Ngang, lệch lên trên thì tăng số Dọc. Máy này nhớ số đã chỉnh cho từng loại giấy.</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={khung} onChange={(e) => setKhung(e.target.checked)} />
                In kèm khung viền nhãn (để in thử trên giấy thường)
              </label>
            </div>
            <div>
              <div className="label">Khi in</div>
              <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-ink-soft">
                <li>
                  Khổ giấy: {qc.kho}. Hướng giấy: {huongChu}.
                </li>
                <li>Lề: Không có. Tỷ lệ: 100% (không chọn vừa trang).</li>
                <li>Tắt Đầu trang và chân trang.</li>
                <li>Nên in thử một tờ giấy thường, chồng lên tờ nhãn soi cho khớp rồi mới in thật.</li>
              </ol>
              <button type="button" className="btn-brand mt-3" disabled={nhan.length === 0} onClick={() => window.print()}>
                In {nhan.length.toLocaleString("vi-VN")} nhãn ({to.length} tờ {qc.kho})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={vung} className="overflow-x-auto pb-10 print:overflow-visible print:pb-0">
        <div className="mx-auto flex w-max flex-col gap-5 px-5 print:gap-0 print:px-0">
          {to.map((cacO, i) => (
            <div
              key={`${qc.ma}-${i}`}
              className="to-nhan relative overflow-hidden bg-white shadow-card ring-1 ring-ink/10 print:shadow-none print:ring-0"
              style={{ width: `${qc.rong}mm`, height: `${qc.cao}mm` }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${qc.cot}, ${qc.nhanRong}mm)`,
                  gridTemplateRows: `repeat(${qc.hang}, ${qc.nhanCao}mm)`,
                  paddingLeft: `${qc.leNgang}mm`,
                  paddingTop: `${qc.leDoc}mm`,
                  transform: `translate(${lechX}mm, ${lechY}mm)`,
                }}
              >
                {Array.from({ length: moiTo }, (_, j) => {
                  const n = cacO[j] ?? null;
                  // Nhan nam sat mep to giay: lui chu va so vao trong, vi may in khong in duoc sat mep
                  const hang = Math.floor(j / qc.cot);
                  const cot = j % qc.cot;
                  const mepDoc = Math.max(0, MEP_AN_TOAN - qc.leDoc);
                  const mepNgang = Math.max(0, MEP_AN_TOAN - qc.leNgang);
                  const soDuoi = Math.max(SO_CACH_DAY, hang === qc.hang - 1 ? mepDoc : 0);
                  const soPhai = Math.max(SO_CACH_BEN, cot === qc.cot - 1 ? mepNgang : 0);
                  const soTrai = Math.max(SO_CACH_BEN, cot === 0 ? mepNgang : 0);
                  const caoSo = qc.coSo * 0.3528; // chieu cao chu so (mm)
                  const dem = {
                    paddingTop: `${hang === 0 ? Math.max(qc.demTren, mepDoc) : soDuoi > SO_CACH_DAY ? Math.min(qc.demTren, 1.2) : qc.demTren}mm`,
                    paddingBottom: `${soDuoi + caoSo + 0.6}mm`, // chua cho cho dong so dien thoai va so thu tu
                    paddingLeft: `${Math.max(qc.demNgang, cot === 0 ? mepNgang : 0)}mm`,
                    paddingRight: `${Math.max(qc.demNgang, cot === qc.cot - 1 ? mepNgang : 0)}mm`,
                  };
                  return (
                    <div
                      key={j}
                      className={`relative flex flex-col items-center justify-center overflow-hidden border border-dashed border-ink/25 text-center text-black ${khung ? "print:border-solid print:border-black/60" : "print:border-transparent"}`}
                      style={dem}
                    >
                      {n ? (
                        <>
                          {/* Co chu ben trong tinh theo em, de thu nho ca khoi khi chu qua dai */}
                          <div data-chu="" className="w-full" style={{ fontSize: "1pt" }}>
                            <div style={{ fontSize: `${qc.coKinhGui}em`, lineHeight: 1.2 }}>Kính gửi:</div>
                            <div className="line-clamp-2 font-semibold" style={{ fontSize: `${coTen(n.ten)}em`, lineHeight: 1.2, textWrap: "balance" }}>
                              {n.ten}
                            </div>
                            {n.chucVu && (
                              <div className="line-clamp-2" style={{ fontSize: `${qc.coPhu}em`, lineHeight: 1.2, marginTop: "0.06em" }}>
                                {n.chucVu}
                              </div>
                            )}
                            {n.congTy && (
                              <div className="line-clamp-2 font-medium" style={{ fontSize: `${qc.coPhu}em`, lineHeight: 1.2, marginTop: "0.04em" }}>
                                {n.congTy}
                              </div>
                            )}
                            {/* Dia chi de giao thiep nen cho toi 3 dong, tranh bi cat mat phan cuoi */}
                            {n.diaChi && (
                              <div className="line-clamp-3" style={{ fontSize: `${qc.coPhu}em`, lineHeight: 1.2, marginTop: "0.04em", textWrap: "balance" }}>
                                Đ/c: {n.diaChi}
                              </div>
                            )}
                          </div>
                          {n.sdt && (
                            <div className="absolute whitespace-nowrap" style={{ left: `${soTrai}mm`, bottom: `${soDuoi}mm`, fontSize: `${qc.coPhu}pt`, lineHeight: 1.1 }}>
                              ĐT: {n.sdt}
                            </div>
                          )}
                          <div data-so="" className="absolute font-mono font-bold" style={{ right: `${soPhai}mm`, bottom: `${soDuoi}mm`, fontSize: `${qc.coSo}pt`, lineHeight: 1 }}>
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
