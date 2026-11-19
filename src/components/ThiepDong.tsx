"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/700.css";
import css from "./thiepDong.module.css";
import { XacNhanKhach } from "./XacNhanKhach";

// Trang thiep dong cua khach: tranh cua designer lam nen co dinh, co tia sang xoay, bui vang bay,
// noi dung hien dan theo tay cuon, ma QR nam o cuoi trang.

export interface DuLieuThiep {
  ma: string;
  k: number | null;
  ten: string; // da gom danh xung
  chucVu: string | null;
  congTy: string | null;
  soThuTu: number;
  qrSvg: string;
  duocXacNhan: boolean;
  traLoi: "+" | "-" | null;
  daDenLuc: string | null; // gio check in da dinh dang; null la chua den
  laKhachDiKem: boolean;
}

// Gio khai tiec theo gio Viet Nam
const GIO_BAT_DAU = Date.parse("2026-12-03T18:00:00+07:00");
const BAN_DO = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Riverside Palace, 360D Bến Vân Đồn, TP. Hồ Chí Minh");

const CHUONG_TRINH: { gio?: string; viec: string; moTa?: string; con?: boolean }[] = [
  { gio: "18:00", viec: "ĐÓN KHÁCH", moTa: "Không gian trưng bày di sản 20 năm Capella" },
  { gio: "19:00", viec: "KHAI MẠC" },
  { viec: "Khoảnh khắc thứ nhất · Gặp gỡ", moTa: "Khai tiệc", con: true },
  { viec: "Khoảnh khắc thứ hai · Tri ân", moTa: "Tri ân khách hàng và đối tác", con: true },
  { viec: "Khoảnh khắc thứ ba · Thăng hoa", moTa: "Trình diễn đặc biệt ca sĩ Văn Mai Hương", con: true },
  { gio: "21:30", viec: "KẾT THÚC CHƯƠNG TRÌNH" },
];

const kep = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const tre = (ms: number) => ({ "--tre": `${ms}ms` }) as CSSProperties;

export function ThiepDong(p: DuLieuThiep) {
  const goc = useRef<HTMLDivElement>(null);
  const canhCuon = useRef<HTMLDivElement>(null);
  const man = useRef<HTMLDivElement>(null);
  const heroTrong = useRef<HTMLDivElement>(null);
  const keo = useRef<HTMLDivElement>(null);
  const lich = useRef<HTMLDivElement>(null);
  const duongSang = useRef<HTMLDivElement>(null);
  const bui = useRef<HTMLCanvasElement>(null);
  const [san, setSan] = useState(false);
  const [conLai, setConLai] = useState<number | null>(null);

  // Dong ho dem nguoc toi gio khai tiec
  useEffect(() => {
    const cap = () => setConLai(GIO_BAT_DAU - Date.now());
    cap();
    const t = setInterval(cap, 1000);
    return () => clearInterval(t);
  }, []);

  // Hien dan khi cuon toi + chuyen dong theo tay cuon
  useEffect(() => {
    const g = goc.current;
    if (!g) return;
    setSan(true);
    const itChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (ds) => {
        for (const e of ds) {
          if (e.isIntersecting) {
            e.target.classList.add(css.hien);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -7% 0px" }
    );
    // Cho React gan xong class "san" roi moi theo doi, de phan tu dang trong man hinh khong bi nhay
    const cho = requestAnimationFrame(() => g.querySelectorAll("[data-lo]").forEach((e) => io.observe(e)));

    let dangCho = false;
    const ve = () => {
      dangCho = false;
      const vh = window.innerHeight || 1;
      const cuon = window.scrollY / vh;
      if (!itChuyenDong) {
        // Nen: tien gan dan vao dia vang
        if (canhCuon.current) canhCuon.current.style.transform = `scale(${1 + kep(cuon, 0, 3) * 0.05})`;
        // Loi moi troi len va mo dan khi roi man dau
        if (heroTrong.current) {
          heroTrong.current.style.transform = `translate3d(0, ${-kep(cuon) * 46}px, 0)`;
          heroTrong.current.style.opacity = String(1 - kep(cuon * 1.35));
        }
        if (keo.current) keo.current.style.opacity = String(1 - kep(cuon * 5));
      }
      // Sau man tieu de, nen toi dan de chu ben tren de doc
      if (man.current) man.current.style.opacity = String(kep((cuon - 1.12) * 1.7) * 0.84);
      // Duong thoi gian sang dan theo vi tri cuon
      if (lich.current && duongSang.current) {
        const r = lich.current.getBoundingClientRect();
        duongSang.current.style.transform = `scaleY(${itChuyenDong ? 1 : kep((vh * 0.78 - r.top) / Math.max(1, r.height))})`;
      }
    };
    const khiCuon = () => {
      if (!dangCho) {
        dangCho = true;
        requestAnimationFrame(ve);
      }
    };
    ve();
    window.addEventListener("scroll", khiCuon, { passive: true });
    window.addEventListener("resize", khiCuon);
    return () => {
      cancelAnimationFrame(cho);
      io.disconnect();
      window.removeEventListener("scroll", khiCuon);
      window.removeEventListener("resize", khiCuon);
    };
  }, []);

  // Bui vang bay cham tren nen
  useEffect(() => {
    const c = bui.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cx = c.getContext("2d");
    if (!cx) return;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const co = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    co();
    const hat = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.9,
      vy: 0.006 + Math.random() * 0.016, // phan man hinh moi giay
      lac: 0.5 + Math.random() * 1.5,
      pha: Math.random() * Math.PI * 2,
      nhay: 0.6 + Math.random() * 1.6,
    }));
    let id = 0;
    let truoc = performance.now();
    const ve = (luc: number) => {
      const dt = Math.min(0.05, (luc - truoc) / 1000);
      truoc = luc;
      cx.clearRect(0, 0, w, h);
      for (const o of hat) {
        o.y -= o.vy * dt;
        if (o.y < -0.03) {
          o.y = 1.03;
          o.x = Math.random();
        }
        const t = luc / 1000;
        const x = (o.x + Math.sin(t * 0.35 * o.lac + o.pha) * 0.018) * w;
        const y = o.y * h;
        const sang = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * o.nhay + o.pha));
        cx.globalAlpha = 0.13 * sang;
        cx.fillStyle = "#ffd98a";
        cx.beginPath();
        cx.arc(x, y, o.r * 3.2, 0, 6.2832);
        cx.fill();
        cx.globalAlpha = 0.85 * sang;
        cx.fillStyle = "#fff1c9";
        cx.beginPath();
        cx.arc(x, y, o.r, 0, 6.2832);
        cx.fill();
      }
      id = requestAnimationFrame(ve);
    };
    const chay = () => {
      cancelAnimationFrame(id);
      if (!document.hidden) {
        truoc = performance.now();
        id = requestAnimationFrame(ve);
      }
    };
    chay();
    window.addEventListener("resize", co);
    document.addEventListener("visibilitychange", chay);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", co);
      document.removeEventListener("visibilitychange", chay);
    };
  }, []);

  const dongPhu = [p.chucVu, p.congTy].filter(Boolean).join(" - ");
  // Ten dai thi chu nho lai de khong qua 2 dong
  const coTen = p.ten.length > 34 ? 0.046 : p.ten.length > 26 ? 0.053 : p.ten.length > 20 ? 0.058 : 0.064;
  const dem =
    conLai != null && conLai > 0
      ? [
          { so: Math.floor(conLai / 86400000), chu: "Ngày" },
          { so: Math.floor(conLai / 3600000) % 24, chu: "Giờ" },
          { so: Math.floor(conLai / 60000) % 60, chu: "Phút" },
          { so: Math.floor(conLai / 1000) % 60, chu: "Giây" },
        ]
      : null;
  const thamSo = p.k ? `?k=${p.k}&tai=1` : "?tai=1";

  return (
    <div ref={goc} className={`${css.goc} ${san ? css.san : ""}`}>
      <div className={css.canh} aria-hidden="true">
        <div ref={canhCuon} className={css.canhCuon}>
          <div className={css.canhTrong}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/thiep/nen.webp" alt="" className={css.nen} decoding="async" />
            <div className={css.tia} />
            <div className={css.tia2} />
            <div className={css.quang} />
          </div>
        </div>
        <div ref={man} className={css.man} />
        <canvas ref={bui} className={css.bui} />
      </div>
      <div className={css.mo} aria-hidden="true" />

      <main className={css.noiDung}>
        {/* Man 1: loi moi */}
        <section className={css.hero}>
          <div ref={heroTrong} className={css.heroTrong}>
            {p.daDenLuc != null && <div className={css.daDen}>Quý khách đã check in{p.daDenLuc ? ` lúc ${p.daDenLuc}` : ""}</div>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/thiep/logo.webp" alt="Capella Holdings 20 Years" width={720} height={229} className={css.logo} />
            <div className={`${css.moi1} ${css.bong}`}>CAPELLA HOLDINGS</div>
            <div className={`${css.moi2} ${css.bong}`}>Trân trọng kính mời</div>
            <h1 className={css.ten} style={{ "--coTen": coTen } as CSSProperties}>
              {p.ten}
            </h1>
            {dongPhu && (
              <div className={css.phu} style={dongPhu.length > 70 ? { fontSize: "calc(var(--cw) * 0.032)" } : undefined}>
                {dongPhu}
              </div>
            )}
            <div className={`${css.thamDu} ${css.bong}`}>Tham dự</div>
            <div className={`${css.suKien} ${css.bong}`}>
              DẠ TIỆC TRI ÂN &amp; KỶ NIỆM 20 NĂM
              <br />
              CAPELLA HOLDINGS
            </div>
          </div>
          <div ref={keo} className={css.keo}>
            Kéo xuống
            <span className={css.keoVach} />
          </div>
        </section>

        {/* Man 2: tieu de tren dia vang */}
        <section className={css.khoanhKhac}>
          <div className={css.tieuDe} data-lo="phong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/thiep/tieu-de.webp" alt="A Legacy of Moments. Di sản từ những khoảnh khắc" width={1100} height={459} />
          </div>
          <div className={`${css.ngayLon} ${css.bong}`} data-lo="">
            03.12.2026
          </div>
          <div className={`${css.noiLon} ${css.bong}`} data-lo="" style={tre(150)}>
            Grand Ballroom · Riverside Palace
          </div>
        </section>

        {/* Thoi gian va dia diem */}
        <section className={css.khoi}>
          <div className={css.the} data-lo="">
            <div className={css.nhan}>Thời gian</div>
            <div className={css.gioLon}>18:00 - 21:30</div>
            <div className={css.thu}>THỨ NĂM · 03.12.2026</div>
            {dem && (
              <div className={css.dem} aria-label="Thời gian còn lại tới sự kiện">
                {dem.map((o) => (
                  <div key={o.chu} className={css.oDem}>
                    <span key={o.so} className={css.soDem}>
                      {String(o.so).padStart(2, "0")}
                    </span>
                    <span className={css.chuDem}>{o.chu}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={css.ngan}>
              <i />
            </div>
            <div className={css.nhanVang}>Địa điểm</div>
            <div className={css.noi}>Grand Ballroom · Riverside Palace</div>
            <div className={css.diaChi}>
              360D Bến Vân Đồn, Phường Vĩnh Hội,
              <br />
              TP. Hồ Chí Minh
            </div>
            <div style={{ marginTop: 18 }}>
              <a href={BAN_DO} target="_blank" rel="noopener noreferrer" className={`${css.nutVien} ${css.nutNho}`}>
                Xem bản đồ
              </a>
            </div>
          </div>
        </section>

        {/* Chuong trinh */}
        <section className={css.khoi}>
          <div className={css.the}>
            <div className={css.nhan} data-lo="">
              Chương trình
            </div>
            <div ref={lich} className={css.lich}>
              <div className={css.duong} />
              <div ref={duongSang} className={css.duongSang} />
              {CHUONG_TRINH.map((m, i) => (
                <div key={i} className={`${css.muc} ${m.con ? css.mucCon : ""}`} data-lo="trai" style={tre(i * 70)}>
                  <div className={css.gio}>{m.gio || ""}</div>
                  <div className={m.con ? css.viecCon : css.viec}>
                    {m.viec}
                    {m.moTa && <span className={css.moTa}>{m.moTa}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Loi nhan */}
        <section className={css.loi}>
          <div className={css.ngan} data-lo="">
            <i />
          </div>
          <p className={`${css.loiChu} ${css.bong}`} data-lo="" style={tre(120)}>
            Sự hiện diện của Quý vị là <b>một khoảnh khắc</b> tiếp nối di sản hai mươi năm của Capella Holdings.
          </p>
        </section>

        {/* Xac nhan tham du */}
        {p.duocXacNhan && (
          <section className={css.khoi}>
            <div className={css.the} data-lo="">
              <XacNhanKhach ma={p.ma} k={p.k} traLoi={p.traLoi} />
            </div>
          </section>
        )}

        {/* Ma QR check in o cuoi trang */}
        <section className={css.khoi}>
          <div className={css.the} data-lo="">
            <div className={css.nhanVang}>Mã check in của Quý khách</div>
            <div className={css.qrKhung} data-lo="phong" style={tre(200)}>
              <span className={css.qrGoc} />
              <div className={css.qr} dangerouslySetInnerHTML={{ __html: p.qrSvg }} />
            </div>
            <div className={css.soNhan}>Số thứ tự thiệp</div>
            <div className={css.so}>{p.soThuTu}</div>
            <p className={css.huongDan}>
              Vui lòng đưa mã QR này cho lễ tân tại quầy đón khách. Nếu không quét được mã hoặc mang thiệp giấy, quý khách đọc số thứ tự thiệp cho lễ tân.
              {p.laKhachDiKem ? " Đây là mã riêng của quý khách, dùng được cả khi đến trước hoặc sau người cùng đoàn." : ""}
            </p>
            <div style={{ marginTop: 20 }}>
              <a href={`/api/thiep-anh/${p.ma}${thamSo}`} download={`thiep-capella20-${p.soThuTu}${p.k ? `-khach-${p.k}` : ""}.jpg`} className={`${css.nutVien} ${css.nutNho}`}>
                Lưu thiệp về máy
              </a>
            </div>
          </div>
        </section>

        <footer className={css.chan}>
          <div className={css.chanNhan} data-lo="">
            HỆ THỐNG THƯƠNG HIỆU
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thiep/thuong-hieu.webp" alt="Hệ thống thương hiệu Capella Holdings" width={1000} height={189} loading="lazy" data-lo="" style={tre(120)} />
          <div className={css.chanNho}>Cần thay đổi, quý khách vui lòng liên hệ nhân viên Capella đã gửi thiệp.</div>
        </footer>
      </main>
    </div>
  );
}
