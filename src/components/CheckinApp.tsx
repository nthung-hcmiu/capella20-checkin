"use client";

import { useEffect, useRef, useState } from "react";
import { LAN_CHECKIN } from "@/lib/constants";
import { dinhDangGioNgan } from "@/lib/format";

interface KhachGon {
  id: string;
  soThuTu: number;
  hoTen: string;
  venue?: string;
  soNguoiMoi: number;
  soNguoiXacNhan: number | null;
  isVip: boolean;
  ban: string | null;
  trangThai: string;
}
interface KetQua {
  ok: boolean;
  ketQua: string;
  thongBao: string;
  canhBao?: string | null;
  guest?: KhachGon;
}
interface Gan {
  hoTen: string;
  soThuTu: number;
  gio: string;
  ok: boolean;
  trungLap?: boolean;
}

type Che = "quet" | "so" | "ten";

export function CheckinApp({ leTans }: { leTans: string[] }) {
  const [leTan, setLeTan] = useState("");
  const [lan, setLan] = useState(LAN_CHECKIN[0]);
  const [vaoCa, setVaoCa] = useState(false);
  const [che, setChe] = useState<Che>("so");
  const [kq, setKq] = useState<KetQua | null>(null);
  const [gan, setGan] = useState<Gan[]>([]);

  useEffect(() => {
    try {
      const l = localStorage.getItem("ci_letan");
      const c = localStorage.getItem("ci_lan");
      if (l) setLeTan(l);
      if (c) setLan(c);
      if (l) setVaoCa(true);
    } catch {}
  }, []);

  const batDau = () => {
    if (!leTan) return;
    try {
      localStorage.setItem("ci_letan", leTan);
      localStorage.setItem("ci_lan", lan);
    } catch {}
    setVaoCa(true);
  };

  const checkin = async (payload: { ma?: string; id?: string }) => {
    try {
      const r = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, lan, leTan }),
      });
      const data: KetQua = await r.json();
      setKq(data);
      if (data.guest) {
        setGan((g) =>
          [
            {
              hoTen: data.guest!.hoTen,
              soThuTu: data.guest!.soThuTu,
              gio: dinhDangGioNgan(new Date()),
              ok: data.ok,
              trungLap: data.ketQua === "TRUNG_LAP",
            },
            ...g,
          ].slice(0, 12)
        );
      }
    } catch {
      setKq({ ok: false, ketQua: "KHONG_HOP_LE", thongBao: "Loi ket noi, kiem tra mang" });
    }
  };

  if (!vaoCa) {
    return (
      <div className="mx-auto max-w-sm px-5 py-10">
        <div className="card p-7">
          <h1 className="font-display text-xl text-ink">Vao ca check in</h1>
          <p className="mt-1 text-sm text-ink-muted">Chon le tan va lan phu trach.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Le tan</label>
              <select className="input" value={leTan} onChange={(e) => setLeTan(e.target.value)}>
                <option value="">Chon le tan</option>
                {leTans.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Lan</label>
              <div className="grid grid-cols-3 gap-2">
                {LAN_CHECKIN.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLan(l)}
                    className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                      lan === l ? "border-ink bg-ink text-ivory" : "border-ink/15 bg-white text-ink-soft"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-gold w-full" disabled={!leTan} onClick={batDau}>
              Bat dau
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      {/* Thanh ca */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-ivory">
        <div className="text-sm">
          <span className="font-medium">{leTan}</span>
          <span className="text-ivory/60"> &middot; {lan}</span>
        </div>
        <button className="text-xs text-ivory/70 underline" onClick={() => setVaoCa(false)}>
          Doi ca
        </button>
      </div>

      {/* Tab che do */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-ivory-deep p-1">
        {([
          ["quet", "Quet QR"],
          ["so", "Nhap so"],
          ["ten", "Tim ten / SDT"],
        ] as [Che, string][]).map(([c, nhan]) => (
          <button
            key={c}
            onClick={() => setChe(c)}
            className={`rounded-lg py-2 text-xs font-medium transition ${
              che === c ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {nhan}
          </button>
        ))}
      </div>

      {che === "quet" && <QuetQR onMa={(ma) => checkin({ ma })} />}
      {che === "so" && <NhapSo onMa={(ma) => checkin({ ma })} />}
      {che === "ten" && <TimTen onChon={(id) => checkin({ id })} />}

      {kq && <KetQuaCard kq={kq} onDong={() => setKq(null)} />}

      {/* Dem va gan day */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm text-ink">Vua check in</h2>
          <span className="chip bg-sage/15 text-sage">
            {gan.filter((g) => g.ok).length} thanh cong
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {gan.length === 0 && <p className="text-xs text-ink-muted">Chua co luot nao trong phien nay.</p>}
          {gan.map((g, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${g.ok ? "bg-sage" : "bg-wine"}`} />
                <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
                <span className="text-ink">{g.hoTen}</span>
              </span>
              <span className="text-xs text-ink-muted">
                {g.trungLap ? "trung lap" : g.gio}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NhapSo({ onMa }: { onMa: (ma: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="card p-5">
      <label className="label">So thu tu hoac ma QR</label>
      <input
        className="input text-center font-mono text-lg"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            onMa(v.trim());
            setV("");
          }
        }}
        placeholder="1234"
        autoFocus
      />
      <button
        className="btn-gold mt-3 w-full"
        disabled={!v.trim()}
        onClick={() => {
          onMa(v.trim());
          setV("");
        }}
      >
        Check in
      </button>
      <p className="mt-2 text-center text-xs text-ink-muted">
        Cua khong ket: quet QR, nhap so, hoac tim ten. Quay ho tro xu ly ca kho.
      </p>
    </div>
  );
}

function TimTen({ onChon }: { onChon: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [ds, setDs] = useState<KhachGon[]>([]);
  const [dang, setDang] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setDs([]);
      return;
    }
    const t = setTimeout(async () => {
      setDang(true);
      try {
        const r = await fetch(`/api/lookup?q=${encodeURIComponent(q.trim())}`);
        const data = await r.json();
        setDs(data.ket_qua || []);
      } finally {
        setDang(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="card p-5">
      <label className="label">Tim ten hoac SDT</label>
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nguyen Van A hoac 0901..."
        autoFocus
      />
      <div className="mt-3 space-y-1.5">
        {dang && <p className="text-xs text-ink-muted">Dang tim...</p>}
        {!dang && q.trim().length >= 2 && ds.length === 0 && (
          <p className="text-xs text-ink-muted">Khong tim thay khach.</p>
        )}
        {ds.map((g) => (
          <button
            key={g.id}
            onClick={() => onChon(g.id)}
            className="flex w-full items-center justify-between rounded-lg border border-ivory-deep bg-white px-3 py-2.5 text-left hover:border-gold"
          >
            <span>
              <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>{" "}
              <span className="text-sm text-ink">{g.hoTen}</span>
              {g.isVip && <span className="ml-1.5 chip bg-gold/15 text-gold-deep">VIP</span>}
              <div className="text-xs text-ink-muted">
                {g.venue}
                {g.ban ? ` · ${g.ban}` : ""}
              </div>
            </span>
            <span className="text-xs font-medium text-gold">Check in</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuetQR({ onMa }: { onMa: (ma: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [chay, setChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const hoTro = typeof window !== "undefined" && "BarcodeDetector" in window;
  const streamRef = useRef<MediaStream | null>(null);
  const quetRef = useRef(false);

  const dung = () => {
    quetRef.current = false;
    setChay(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => dung(), []);

  const bat = async () => {
    setLoi(null);
    if (!hoTro) {
      setLoi("Trinh duyet nay chua ho tro quet QR truc tiep. Dung Nhap so hoac Tim ten.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setChay(true);
      quetRef.current = true;
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const vong = async () => {
        if (!quetRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue as string;
            dung();
            onMa(raw);
            return;
          }
        } catch {}
        requestAnimationFrame(vong);
      };
      requestAnimationFrame(vong);
    } catch {
      setLoi("Khong truy cap duoc camera. Kiem tra quyen hoac dung Nhap so.");
    }
  };

  return (
    <div className="card p-5">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-ink">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!chay && (
          <div className="absolute inset-0 grid place-items-center text-center text-ivory/70">
            <div>
              <div className="mx-auto mb-3 h-14 w-14 rounded-xl border-2 border-dashed border-ivory/40" />
              <p className="text-xs">Huong camera vao QR tren thiep</p>
            </div>
          </div>
        )}
        {chay && (
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-gold/80" />
        )}
      </div>
      {loi && <div className="mt-3 rounded-xl bg-wine/10 px-3 py-2 text-xs text-wine">{loi}</div>}
      <div className="mt-3">
        {chay ? (
          <button className="btn-ghost w-full" onClick={dung}>
            Dung quet
          </button>
        ) : (
          <button className="btn-gold w-full" onClick={bat}>
            Bat camera
          </button>
        )}
      </div>
    </div>
  );
}

function KetQuaCard({ kq, onDong }: { kq: KetQua; onDong: () => void }) {
  const thanhCong = kq.ok;
  const trungLap = kq.ketQua === "TRUNG_LAP";
  const mauNen = thanhCong ? "bg-sage" : trungLap ? "bg-gold-deep" : "bg-wine";

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/40 p-5" onClick={onDong}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className={`${mauNen} px-6 py-5 text-center text-white`}>
          <div className="text-3xl">{thanhCong ? "✓" : trungLap ? "!" : "✕"}</div>
          <div className="mt-1 font-display text-lg">{kq.thongBao}</div>
        </div>
        {kq.guest && (
          <div className="px-6 py-5 text-center">
            <div className="font-display text-2xl text-ink">{kq.guest.hoTen}</div>
            <div className="mt-1 text-sm text-ink-muted">
              <span className="font-mono">{kq.guest.soThuTu}</span> &middot; {kq.guest.venue}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              {kq.guest.isVip && <span className="chip bg-gold/15 text-gold-deep">VIP</span>}
              {kq.guest.ban && <span className="chip bg-ink text-ivory">{kq.guest.ban}</span>}
              <span className="chip bg-ivory-deep text-ink-soft">
                {kq.guest.soNguoiXacNhan ?? kq.guest.soNguoiMoi} nguoi
              </span>
            </div>
            {kq.canhBao && (
              <div className="mt-4 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold-deep">{kq.canhBao}</div>
            )}
          </div>
        )}
        <div className="px-6 pb-5">
          <button className="btn-ink w-full" onClick={onDong}>
            Tiep tuc
          </button>
        </div>
      </div>
    </div>
  );
}
