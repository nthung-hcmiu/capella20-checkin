import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { quyenVoiKhach, yeuCauQuyen } from "@/lib/auth";
import { CHUA_PHAT_HANH, SU_KIEN, TRANG_THAI } from "@/lib/constants";
import { urlQR } from "@/lib/codes";
import { khachDiKemThu, tenGoi } from "@/lib/khach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Thiep online dang file hinh 1080 x 2400 (9:20) de sales tai ve va tu gui cho khach.
// Phan tren 1080 x 1920 (9:16) la noi dung thiep, phan duoi 480 px la ma QR check in.
// ?k=2: thiep rieng cua khach di kem, ghi ten nguoi do va ma QR rieng.

const THU_MUC = path.join(process.cwd(), "src", "assets", "thiep");
type Dam = 400 | 600 | 700;
// Moi do dam gom 3 file (Latin, Latin mo rong, dau tieng Viet). Dat ten rieng tung file va liet ke dung thu tu
// trong fontFamily, de chu co dau lay dung do dam chu khong roi sang file cua do dam khac.
const BO_CHU = ["latin", "latin-ext", "vietnamese"] as const;
const ff = (dam: Dam) => BO_CHU.map((bo) => `BVP-${dam}-${bo}`).join(", ");

// Font va logo doc mot lan, dung lai cho cac lan sau
let taiNguyen: Promise<{ fonts: { name: string; data: Buffer; weight: Dam; style: "normal" }[]; logo: string }> | null = null;
function taiTaiNguyen() {
  if (!taiNguyen) {
    taiNguyen = (async () => {
      const fonts: { name: string; data: Buffer; weight: Dam; style: "normal" }[] = [];
      for (const dam of [400, 600, 700] as Dam[]) {
        for (const bo of BO_CHU) {
          fonts.push({
            name: `BVP-${dam}-${bo}`,
            data: await readFile(path.join(THU_MUC, `be-vietnam-pro-${bo}-${dam}-normal.woff`)),
            weight: dam,
            style: "normal",
          });
        }
      }
      const logo = `data:image/png;base64,${(await readFile(path.join(THU_MUC, "logo.png"))).toString("base64")}`;
      return { fonts, logo };
    })();
  }
  return taiNguyen;
}

const MAU = { nen: "#f6f4f3", muc: "#1a1613", nhat: "#6b6255", do: "#b5303a", doDam: "#8c2029", vien: "#e2dbd6" };

export async function GET(req: NextRequest, { params }: { params: { ma: string } }) {
  const u = await yeuCauQuyen(["ADMIN", "SALES"]);
  if (!u) return new NextResponse("Phiên đăng nhập đã hết, hãy đăng nhập lại.", { status: 401 });
  const guest = await prisma.guest.findUnique({ where: { maBiMat: params.ma.toUpperCase() } });
  if (!guest || !quyenVoiKhach(u, guest)) return new NextResponse("Không tìm thấy thiệp.", { status: 404 });
  if (CHUA_PHAT_HANH.includes(guest.trangThai) || guest.trangThai === TRANG_THAI.DA_HUY) {
    return new NextResponse("Vé chưa được duyệt hoặc đã hủy, chưa tải thiệp được.", { status: 409 });
  }

  const kXin = parseInt(req.nextUrl.searchParams.get("k") || "", 10);
  const diKem = khachDiKemThu(guest, kXin);
  const k = diKem ? kXin : null;
  const ten = diKem ? [diKem.danhXung, diKem.hoTen].filter(Boolean).join(" ") : tenGoi(guest);
  const chucVu = diKem ? diKem.chucVu : guest.chucVu;
  const dongPhu = [chucVu, guest.congTy].filter(Boolean).join(" · ");
  const coTen = ten.length > 34 ? 56 : ten.length > 24 ? 66 : 78;

  const [{ fonts, logo }, qr] = await Promise.all([
    taiTaiNguyen(),
    QRCode.toDataURL(urlQR(guest.maBiMat, undefined, k), {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 704,
      color: { dark: "#1a1613", light: "#ffffff" },
    }),
  ]);

  const anh = new ImageResponse(
    (
      <div style={{ width: 1080, height: 2400, display: "flex", flexDirection: "column", fontFamily: ff(400), color: MAU.muc }}>
        {/* Phan 9:16: noi dung thiep. Chu nam giua y = 270 va y = 1540 de story khong che */}
        <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: MAU.nen }}>
          <div style={{ width: 1080, height: 28, backgroundColor: MAU.do }} />
          <div style={{ height: 242, display: "flex" }} />
          <div style={{ width: 952, height: 1270, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src={logo} width={420} height={140} alt="" />
            <div style={{ marginTop: 72, fontSize: 30, fontWeight: 600, fontFamily: ff(600), letterSpacing: 10, color: MAU.doDam }}>TRÂN TRỌNG KÍNH MỜI</div>
            <div style={{ marginTop: 36, fontSize: coTen, fontWeight: 700, fontFamily: ff(700), lineHeight: 1.15, textAlign: "center", display: "flex", justifyContent: "center" }}>
              {ten}
            </div>
            {dongPhu ? (
              <div style={{ marginTop: 20, fontSize: 34, lineHeight: 1.3, color: MAU.nhat, textAlign: "center", display: "flex", justifyContent: "center" }}>
                {dongPhu}
              </div>
            ) : null}
            {diKem ? (
              <div style={{ marginTop: 12, fontSize: 28, color: MAU.nhat, display: "flex" }}>Cùng đoàn với {tenGoi(guest)}</div>
            ) : null}
            <div style={{ marginTop: 48, width: 140, height: 4, backgroundColor: MAU.do }} />
            <div style={{ marginTop: 48, fontSize: 30, color: MAU.nhat }}>đến dự</div>
            <div style={{ marginTop: 12, fontSize: 58, fontWeight: 600, fontFamily: ff(600), textAlign: "center" }}>Đêm tri ân khách hàng</div>
            <div style={{ marginTop: 10, fontSize: 36, color: MAU.nhat }}>Kỷ niệm 20 năm Capella</div>
            <div style={{ marginTop: 64, width: 952, display: "flex", justifyContent: "space-between" }}>
              <div style={{ width: 460, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 28, padding: "36px 24px", border: `2px solid ${MAU.vien}` }}>
                <div style={{ fontSize: 24, fontWeight: 600, fontFamily: ff(600), letterSpacing: 4, color: MAU.nhat }}>THỜI GIAN</div>
                <div style={{ marginTop: 10, fontSize: 46, fontWeight: 600, fontFamily: ff(600) }}>{SU_KIEN.ngay}</div>
              </div>
              <div style={{ width: 460, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 28, padding: "36px 24px", border: `2px solid ${MAU.vien}` }}>
                <div style={{ fontSize: 24, fontWeight: 600, fontFamily: ff(600), letterSpacing: 4, color: MAU.nhat }}>ĐỊA ĐIỂM</div>
                <div style={{ marginTop: 10, fontSize: 46, fontWeight: 600, fontFamily: ff(600) }}>{SU_KIEN.diaDiem}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Phan duoi: ma QR check in, khong nam trong anh story */}
        <div style={{ width: 1080, height: 480, display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderTop: `4px solid ${MAU.do}`, padding: "0 64px" }}>
          <img src={qr} width={352} height={352} alt="" />
          <div style={{ marginLeft: 56, display: "flex", flexDirection: "column", width: 544 }}>
            <div style={{ fontSize: 24, fontWeight: 600, fontFamily: ff(600), letterSpacing: 4, color: MAU.nhat }}>MÃ CHECK IN CỦA QUÝ KHÁCH</div>
            <div style={{ marginTop: 18, fontSize: 28, color: MAU.nhat }}>Số thứ tự thiệp</div>
            <div style={{ fontSize: 104, fontWeight: 700, fontFamily: ff(700), lineHeight: 1.05 }}>{String(guest.soThuTu)}</div>
            <div style={{ marginTop: 14, fontSize: 26, lineHeight: 1.35, color: MAU.nhat, display: "flex" }}>
              Đưa mã này cho lễ tân khi đến. Vui lòng không chia sẻ phần này.
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 2400, fonts }
  );
  // Tra ve dang file tai xuong, khong luu dem vi thong tin khach co the doi
  return new NextResponse(anh.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="thiep-capella20-${guest.soThuTu}${k ? `-khach-${k}` : ""}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
