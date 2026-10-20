"use client";

import { useState } from "react";

export function ConfirmForm({
  ma,
  soNguoiMoi,
  daXacNhan,
  trangThai,
  goiYSo,
  goiYLast4,
}: {
  ma: string;
  soNguoiMoi: number;
  daXacNhan: number | null;
  trangThai: string;
  goiYSo?: number;
  goiYLast4?: string;
}) {
  const [soThuTu, setSoThuTu] = useState("");
  const [last4, setLast4] = useState("");
  const [soNguoi, setSoNguoi] = useState(String(Math.min(soNguoiMoi, 1)));
  const [dang, setDang] = useState(false);
  const [kq, setKq] = useState<{ ok: boolean; msg: string } | null>(null);

  const gui = async (thamDu: boolean) => {
    setDang(true);
    setKq(null);
    try {
      const r = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ma, soThuTu, last4, thamDu, soNguoiXacNhan: soNguoi }),
      });
      const data = await r.json();
      setKq({ ok: data.ok, msg: data.thongBao });
    } catch {
      setKq({ ok: false, msg: "Co loi ket noi, thu lai" });
    } finally {
      setDang(false);
    }
  };

  if (kq?.ok) {
    return (
      <div className="rounded-2xl bg-sage/10 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-sage text-white">✓</div>
        <div className="font-display text-lg text-ink">{kq.msg}</div>
        <p className="mt-1 text-sm text-ink-muted">Hen gap quy khach tai dem tri an.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goiYSo && (
        <div className="rounded-xl border border-dashed border-gold/40 bg-gold/5 px-4 py-2.5 text-xs text-gold-deep">
          Ban demo: so thu tu <b>{goiYSo}</b>, 4 so cuoi SDT <b>{goiYLast4}</b>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">So thu tu</label>
          <input
            inputMode="numeric"
            className="input text-center font-mono"
            value={soThuTu}
            onChange={(e) => setSoThuTu(e.target.value)}
            placeholder="1234"
          />
        </div>
        <div>
          <label className="label">4 so cuoi SDT</label>
          <input
            inputMode="numeric"
            maxLength={4}
            className="input text-center font-mono"
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            placeholder="5678"
          />
        </div>
      </div>

      <div>
        <label className="label">So nguoi tham du (toi da {soNguoiMoi})</label>
        <div className="flex items-center gap-2">
          {Array.from({ length: soNguoiMoi }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSoNguoi(String(n))}
              className={`h-11 w-11 rounded-xl border text-sm font-medium transition ${
                soNguoi === String(n)
                  ? "border-gold bg-gold text-white"
                  : "border-ink/15 bg-white text-ink-soft"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {kq && !kq.ok && (
        <div className="rounded-xl bg-wine/10 px-4 py-2.5 text-sm text-wine">{kq.msg}</div>
      )}

      <div className="space-y-2 pt-1">
        <button className="btn-gold w-full" disabled={dang} onClick={() => gui(true)}>
          {dang ? "Dang gui..." : "Toi se tham du"}
        </button>
        <button className="btn-ghost w-full" disabled={dang} onClick={() => gui(false)}>
          Toi khong tham du
        </button>
      </div>

      {daXacNhan != null && (
        <p className="text-center text-xs text-ink-muted">
          Truoc do da ghi nhan {daXacNhan} nguoi. Gui lai de cap nhat.
        </p>
      )}
    </div>
  );
}
