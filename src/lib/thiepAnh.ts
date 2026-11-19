// Ve thiep moi dang file hinh cho tung khach: lay file thiep cua designer lam nen,
// ghep them ten khach, dong "chuc vu - cong ty" va ma QR check in vao dung vi tri tren mau.
import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";

const THU_MUC = path.join(process.cwd(), "src", "assets", "thiep");

// He toa do cua file thiet ke (nen.jpg). Doi file nen co cung ti le 9:20 thi cac vi tri duoi day van dung.
const W0 = 900;
const H0 = 2000;
// Xuat lon gap doi de chu va ma QR sac net khi khach phong to
const S = 2;

// Vi tri do tren mau cua designer (don vi: diem anh cua file 900 x 2000)
const TEN = { duongChan: 496, co: 22, mau: "#FDC866" }; // ten khach: in hoa, dam
const PHU = { duongChan: 520, co: 15.3, mau: "#FABA66" }; // chuc vu - cong ty
const RONG_CHU = 760; // be rong toi da cua mot dong chu
const O_QR = { x: 113, y: 1819, canh: 144, le: 9 }; // long trong cua o vuong goc duoi trai

type Dam = 500 | 700;
const BO_CHU = ["latin", "latin-ext", "vietnamese"] as const;
// Moi do dam gom 3 file; dat ten rieng va liet ke dung thu tu de chu co dau lay dung do dam
const ff = (dam: Dam) => BO_CHU.map((bo) => `MS-${dam}-${bo}`).join(", ");

let taiNguyen: Promise<{ fonts: { name: string; data: Buffer; weight: Dam; style: "normal" }[]; nen: Buffer }> | null = null;
function taiTaiNguyen() {
  if (!taiNguyen) {
    taiNguyen = (async () => {
      const fonts: { name: string; data: Buffer; weight: Dam; style: "normal" }[] = [];
      for (const dam of [500, 700] as Dam[]) {
        for (const bo of BO_CHU) {
          fonts.push({ name: `MS-${dam}-${bo}`, data: await readFile(path.join(THU_MUC, `montserrat-${bo}-${dam}-normal.woff`)), weight: dam, style: "normal" });
        }
      }
      // Phong nen len kich thuoc xuat mot lan, dung lai cho moi thiep
      const nen = await sharp(await readFile(path.join(THU_MUC, "nen.jpg")))
        .resize(W0 * S, H0 * S, { kernel: "lanczos3" })
        .png()
        .toBuffer();
      return { fonts, nen };
    })();
  }
  return taiNguyen;
}

// Uoc luong be rong dong chu (theo don vi co chu) de thu nho khi ten hoac cong ty qua dai
function rongUoc(s: string, dam: boolean): number {
  let w = 0;
  for (const c of s) {
    if (c === " ") w += 0.28;
    else if (/[.,\-·:;'’()\/&]/.test(c)) w += 0.34;
    else if (/[0-9]/.test(c)) w += 0.62;
    else if (c === c.toLocaleUpperCase("vi") && c !== c.toLocaleLowerCase("vi")) w += dam ? 0.76 : 0.72;
    else w += dam ? 0.62 : 0.58;
  }
  return w;
}
// Co chu vua mot dong; khong duoi coNhoNhat
const coVua = (s: string, co: number, dam: boolean, coNhoNhat: number) => Math.max(coNhoNhat, Math.min(co, RONG_CHU / Math.max(1, rongUoc(s, dam))));

// Phan tu cho bo ve (khong dung JSX de chay duoc ca trong script kiem tra)
const h = (style: Record<string, unknown>, children?: unknown, type = "div", them: Record<string, unknown> = {}) =>
  ({ type, key: null, props: { style, children, ...them } }) as any;

// Montserrat: voi lineHeight 1, duong chan chu nam cach mep tren hop chu 0.8585 em
const TI_LE_DUONG_CHAN = 0.8585;

export interface ThongTinThiep {
  ten: string; // da gom danh xung neu co
  chucVu?: string | null;
  congTy?: string | null;
  noiDungQR: string;
}
// Khi "chuc vu - cong ty" qua dai: tach thanh 2 dong (chuc vu tren, cong ty duoi), chu nho hon
const PHU_2_DONG = { co: 12.5, coNhoNhat: 9.5, duongChan: [510, 526] };

export async function veThiep(t: ThongTinThiep): Promise<Buffer> {
  const { fonts, nen } = await taiTaiNguyen();
  const qr = await QRCode.toDataURL(t.noiDungQR, { errorCorrectionLevel: "M", margin: 0, width: 640, color: { dark: "#000000", light: "#ffffff" } });

  const ten = t.ten.trim().toLocaleUpperCase("vi");
  const coTen = coVua(ten, TEN.co, true, 13);
  const chucVu = (t.chucVu || "").trim();
  const congTy = (t.congTy || "").trim();
  const phu = [chucVu, congTy].filter(Boolean).join(" - ");
  // Dong phu qua dai thi thu nho; van khong vua mot dong thi tach chuc vu va cong ty thanh 2 dong
  const coPhu = coVua(phu, PHU.co, false, 11);
  const haiDong = !!chucVu && !!congTy && rongUoc(phu, false) * coPhu > RONG_CHU;
  const leChu = (W0 - RONG_CHU) / 2;

  const dong = (noiDung: string, co: number, dam: Dam, mau: string, duongChan: number) =>
    h(
      {
        position: "absolute", left: leChu * S, top: (duongChan - co * TI_LE_DUONG_CHAN) * S, width: RONG_CHU * S,
        display: "flex", justifyContent: "center", textAlign: "center",
        fontFamily: ff(dam), fontWeight: dam, fontSize: co * S, lineHeight: 1, color: mau, whiteSpace: "nowrap",
      },
      noiDung
    );

  const lop = new ImageResponse(
    h({ width: W0 * S, height: H0 * S, display: "flex", position: "relative" }, [
      dong(ten, coTen, 700, TEN.mau, TEN.duongChan),
      ...(haiDong
        ? [chucVu, congTy].map((x, i) => dong(x, coVua(x, PHU_2_DONG.co, false, PHU_2_DONG.coNhoNhat), 500, PHU.mau, PHU_2_DONG.duongChan[i]))
        : phu
        ? [dong(phu, coPhu, 500, PHU.mau, PHU.duongChan)]
        : []),
      h(
        {
          position: "absolute", left: O_QR.x * S, top: O_QR.y * S, width: O_QR.canh * S, height: O_QR.canh * S,
          display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff",
        },
        h({}, undefined, "img", { src: qr, width: (O_QR.canh - 2 * O_QR.le) * S, height: (O_QR.canh - 2 * O_QR.le) * S })
      ),
    ]),
    { width: W0 * S, height: H0 * S, fonts }
  );
  const lopPng = Buffer.from(await lop.arrayBuffer());
  return sharp(nen).composite([{ input: lopPng }]).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

export const KICH_THUOC_THIEP = { rong: W0 * S, cao: H0 * S };
