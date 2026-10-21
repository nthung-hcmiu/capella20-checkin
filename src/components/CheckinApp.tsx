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
  hetPhien?: boolean;
}
interface Gan {
  hoTen: string;
  soThuTu: number;
  gio: string;
  ok: boolean;
  trungLap?: boolean;
}

type Che = "quet" | "so" | "ten";

export function CheckinApp({ ten, ca }: { ten: string; ca: string | null }) {
  const [lan, setLan] = useState<string | null>(null);
  const [che, setChe] = useState<Che>("so");
  const [kq, setKq] = useState<KetQua | null>(null);
  const [gan, setGan] = useState<Gan[]>([]);

  useEffect(() => {
    try {
      const c = localStorage.getItem("ci_lan");
      if (c && LAN_CHECKIN.includes(c)) setLan(c);
    } catch {}
  }, []);

  const chonLan = (l: string) => {
    setLan(l);
    try {
      localStorage.setItem("ci_lan", l);
    } catch {}
  };

  const checkin = async (payload: { ma?: string; id?: string }) => {
    try {
      const r = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, lan }),
      });
      const data: KetQua = await r.json();
      if (r.status === 401) data.hetPhien = true;
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
          ].slice(0, 15)
        );
      }
    } catch {
      setKq({ ok: false, ketQua: "KHONG_HOP_LE", thongBao: "Mất kết nối mạng. Kiểm tra wifi hoặc 4G rồi thử lại." });
    }
  };

  if (!lan) {
    return (
      <div className="mx-auto max-w-sm px-5 py-10">
        <div className="card p-7">
          <h1 className="font-display text-xl text-ink">Vào ca check in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {ten}
            {ca ? ` · ${ca}` : ""}. Chọn làn bạn phụ trách.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {LAN_CHECKIN.map((l) => (
              <button
                key={l}
                onClick={() => chonLan(l)}
                className="rounded-xl border border-ink/15 bg-white px-2 py-3 text-sm font-medium text-ink-soft transition hover:border-ink hover:bg-ink hover:text-ivory"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-ivory">
        <div className="text-sm">
          <span className="font-medium">{ten}</span>
          <span className="text-ivory/60"> · {lan}</span>
        </div>
        <button className="text-xs text-ivory/70 underline" onClick={() => setLan(null)}>
          Đổi làn
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-ivory-deep p-1">
        {([
          ["quet", "Quét QR"],
          ["so", "Nhập số"],
          ["ten", "Tìm tên / SĐT"],
        ] as [Che, string][]).map(([c, nhan]) => (
          <button
            key={c}
            onClick={() => setChe(c)}
            className={`rounded-lg py-2 text-xs font-medium transition ${che === c ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}
          >
            {nhan}
          </button>
        ))}
      </div>

      {che === "quet" && <QuetQR onMa={(ma) => checkin({ ma })} />}
      {che === "so" && <NhapSo onMa={(ma) => checkin({ ma })} />}
      {che === "ten" && <TimTen onChon={(id) => checkin({ id })} />}

      {kq && <KetQuaCard kq={kq} onDong={() => setKq(null)} />}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm text-ink">Vừa check in</h2>
          <span className="chip bg-sage/15 text-sage">{gan.filter((g) => g.ok).length} thành công</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {gan.length === 0 && <p className="text-xs text-ink-muted">Chưa có lượt nào trong phiên này.</p>}
          {gan.map((g, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${g.ok ? "bg-sage" : "bg-wine"}`} />
                <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span>
                <span className="text-ink">{g.hoTen}</span>
              </span>
              <span className="text-xs text-ink-muted">{g.trungLap ? "trùng lặp" : g.gio}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NhapSo({ onMa }: { onMa: (ma: string) => void }) {
  const [v, setV] = useState("");
  const gui = () => {
    if (!v.trim()) return;
    onMa(v.trim());
    setV("");
  };
  return (
    <div className="card p-5">
      <label className="label">Số thứ tự hoặc mã QR</label>
      <input
        className="input text-center font-mono text-lg"
        value={v}
        inputMode="numeric"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && gui()}
        placeholder="1234"
        autoFocus
      />
      <button className="btn-gold mt-3 w-full" disabled={!v.trim()} onClick={gui}>
        Check in
      </button>
      <p className="mt-2 text-center text-xs text-ink-muted">
        Cửa không kẹt: quét QR, nhập số, hoặc tìm tên. Ca khó chuyển sang quầy hỗ trợ.
      </p>
    </div>
  );
}

function TimTen({ onChon }: { onChon: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [ds, setDs] = useState<KhachGon[]>([]);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setDs([]);
      return;
    }
    const t = setTimeout(async () => {
      setDang(true);
      setLoi(null);
      try {
        const r = await fetch(`/api/lookup?q=${encodeURIComponent(q.trim())}`);
        const data = await r.json();
        if (!r.ok) setLoi(data.loi || "Không tra cứu được");
        setDs(data.ket_qua || []);
      } catch {
        setLoi("Mất kết nối mạng");
      } finally {
        setDang(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="card p-5">
      <label className="label">Tìm tên hoặc số điện thoại</label>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nguyen van an hoặc 0901..." autoFocus />
      <div className="mt-3 space-y-1.5">
        {dang && <p className="text-xs text-ink-muted">Đang tìm...</p>}
        {loi && <p className="text-xs text-wine">{loi}</p>}
        {!dang && !loi && q.trim().length >= 2 && ds.length === 0 && <p className="text-xs text-ink-muted">Không tìm thấy khách.</p>}
        {ds.map((g) => (
          <button
            key={g.id}
            onClick={() => onChon(g.id)}
            className="flex w-full items-center justify-between rounded-lg border border-ivory-deep bg-white px-3 py-2.5 text-left hover:border-gold"
          >
            <span>
              <span className="font-mono text-xs text-ink-muted">{g.soThuTu}</span> <span className="text-sm text-ink">{g.hoTen}</span>
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
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setLoi("Trình duyệt này chưa hỗ trợ quét QR trực tiếp (thường gặp trên iPhone). Dùng Nhập số hoặc Tìm tên, hoặc mở bằng Chrome trên Android.");
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
      setLoi("Không mở được camera. Kiểm tra quyền camera của trình duyệt, hoặc dùng Nhập số.");
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
              <p className="text-xs">Hướng camera vào mã QR trên thiệp</p>
            </div>
          </div>
        )}
        {chay && <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-gold/80" />}
      </div>
      {loi && <div className="mt-3 rounded-xl bg-wine/10 px-3 py-2 text-xs text-wine">{loi}</div>}
      <div className="mt-3">
        {chay ? (
          <button className="btn-ghost w-full" onClick={dung}>
            Dừng quét
          </button>
        ) : (
          <button className="btn-gold w-full" onClick={bat}>
            Bật camera
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
              <span className="font-mono">{kq.guest.soThuTu}</span> · {kq.guest.venue}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {kq.guest.isVip && <span className="chip bg-gold/15 text-gold-deep">VIP</span>}
              {kq.guest.ban && <span className="chip bg-ink text-ivory">{kq.guest.ban}</span>}
              <span className="chip bg-ivory-deep text-ink-soft">{kq.guest.soNguoiXacNhan ?? kq.guest.soNguoiMoi} người</span>
            </div>
            {kq.canhBao && <div className="mt-4 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold-deep">{kq.canhBao}</div>}
          </div>
        )}
        <div className="px-6 pb-5">
          {kq.hetPhien ? (
            <a href="/dang-nhap?tiep=/checkin" className="btn-ink w-full">
              Đăng nhập lại
            </a>
          ) : (
            <button className="btn-ink w-full" onClick={onDong}>
              Tiếp tục
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
