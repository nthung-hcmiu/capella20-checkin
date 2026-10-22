import Link from "next/link";
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { UserBar } from "@/components/UserBar";
import { TRANG_CHINH } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Muc = { tieuDe: string; buoc: (string | [string, string])[] };
type VaiTro = { ma: string; ten: string; moTa: string; muc: Muc[]; luuY: string[] };

const HUONG_DAN: VaiTro[] = [
  {
    ma: "ADMIN",
    ten: "Admin (MKT Manager)",
    moTa: "Giữ danh sách: tạo tài khoản, nhập và duyệt khách, phát hành thiệp, theo dõi số liệu.",
    muc: [
      {
        tieuDe: "Trước sự kiện",
        buoc: [
          ["Tạo tài khoản", "Tài khoản > Thêm tài khoản cho từng sales và lễ tân. Họ tên sales phải trùng cột người phụ trách trong file."],
          ["Nhập danh sách", "Nhập danh sách > Tải file mẫu nếu cần > chọn file Excel > Kiểm tra trước > Nhập."],
          ["Duyệt", "Chờ duyệt: khách trùng SĐT, trùng tên cùng công ty, hoặc VIP. Bấm Duyệt hoặc Từ chối."],
          ["Phát hành thiệp", "Danh sách khách > Thao tác > Phát hành thiệp. Chỉ thiệp đã phát hành sales mới gửi và xác nhận được."],
          ["In QR thiệp giấy", "Danh sách khách > In QR thiệp giấy. Lọc theo venue, sales, hoặc chỉ thiệp giấy chưa gửi."],
          ["Theo dõi", "Bảng điều khiển: số người xác nhận, đối soát theo nhóm khách mời và theo sales. Quota venue: số thiệp còn lại."],
        ],
      },
      {
        tieuDe: "Ngày sự kiện",
        buoc: [
          ["Đánh thức hệ thống", "15 phút trước giờ đón khách, mở trang /api/health một lần."],
          ["Theo dõi cửa", "Bảng điều khiển cập nhật số người check in theo thời gian thực, tách QR và thủ công."],
        ],
      },
      {
        tieuDe: "Sau sự kiện",
        buoc: [["Báo cáo", "Dữ liệu > Tải file CSV. File theo đúng cột mẫu năm trước, kèm trạng thái và số người thực tế đến."]],
      },
    ],
    luuY: [
      "Xóa toàn bộ danh sách không hoàn tác được. Luôn tải CSV sao lưu trước.",
      "BTC cũng xác nhận thay khách được: Danh sách khách > Thao tác > Xác nhận.",
      "Sửa thông tin khách: Danh sách khách > Thao tác > Sửa thông tin.",
    ],
  },
  {
    ma: "SALES",
    ten: "Sales",
    moTa: "Giữ quan hệ: gửi thiệp, hỏi khách, xác nhận tham dự thay khách trên hệ thống.",
    muc: [
      {
        tieuDe: "Mỗi khách đi qua 3 bước",
        buoc: [
          ["Gửi thiệp online", "Bấm Chép lời mời > dán vào Zalo gửi khách > bấm Đã gửi."],
          ["Gửi thiệp giấy", "Bấm Tải QR (hoặc In QR ở đầu danh sách) > dán QR lên thiệp giấy > gửi khách > bấm Đã gửi."],
          ["Xác nhận thay khách", "Sau khi hỏi khách: Xác nhận thay khách > chọn số người > Tham dự hoặc Không tham dự."],
        ],
      },
      {
        tieuDe: "Làm việc nhanh",
        buoc: [
          ["Lọc", "Cần gửi thiệp, Chờ xác nhận, Đã xác nhận, Chưa phát hành."],
          ["Thêm khách", "Tab Thêm khách. Khách mới cần BTC phát hành thiệp rồi mới gửi được."],
          ["Đổi xác nhận", "Khách đổi ý: mở lại Đổi xác nhận và chọn lại."],
        ],
      },
    ],
    luuY: [
      "Khách không tự xác nhận. Thiệp online chỉ để xem thông tin và mã QR check in.",
      "Khách hỏi cách vào cửa: đưa mã QR trong thiệp online hoặc trên thiệp giấy, hoặc đọc số thứ tự thiệp.",
      "Lần đầu đăng nhập, đổi mật khẩu riêng. Quên mật khẩu thì nhờ BTC đặt lại.",
    ],
  },
  {
    ma: "LE_TAN",
    ten: "Lễ tân",
    moTa: "Đón khách tại cửa: check in mỗi thiệp một lần, ghi số người thực tế đến.",
    muc: [
      {
        tieuDe: "Check in",
        buoc: [
          ["Vào ca", "Đăng nhập > chọn làn phụ trách."],
          ["Quét QR", "Tab Quét QR > Bật camera > hướng vào QR trên điện thoại hoặc thiệp giấy. Dùng Chrome trên Android."],
          ["Nhập số", "Tab Nhập số > gõ số thứ tự trên thiệp > Check in. iPhone dùng cách này."],
          ["Tìm tên", "Tab Tìm tên / SĐT > gõ tên khách, tên công ty hoặc SĐT > chọn khách."],
          ["Số người thực tế", "Trên thẻ kết quả, bấm + hoặc − nếu khách đi nhiều hoặc ít người hơn đăng ký."],
        ],
      },
      {
        tieuDe: "Đọc kết quả",
        buoc: [
          ["Xanh", "Check in thành công. Mời khách vào."],
          ["Vàng", "Mã này đã check in rồi. Kiểm tra lại với khách, chuyển quầy hỗ trợ nếu cần."],
          ["Đỏ", "Không tìm thấy mã hoặc thiệp đã hủy. Chuyển quầy hỗ trợ."],
          ["Có dòng cảnh báo", "Khách chưa được sales xác nhận hoặc đã báo không tham dự. Làm theo quy định BTC, báo sales phụ trách."],
        ],
      },
    ],
    luuY: [
      "Mất mạng: chuyển sang 4G. Nếu vẫn không được, ghi tay số thứ tự và check in lại khi có mạng.",
      "Khách không có trong hệ thống: mời sang quầy hỗ trợ hoặc báo BTC.",
    ],
  },
];

export default async function HuongDanPage() {
  const u = await layNguoiDung();
  if (!u) redirect("/dang-nhap?tiep=/huong-dan");
  // Vai tro cua nguoi dang xem len dau; BTC xem duoc ca ba
  const ds = u.vaiTro === "ADMIN" ? HUONG_DAN : [...HUONG_DAN.filter((h) => h.ma === u.vaiTro), ...HUONG_DAN.filter((h) => h.ma !== u.vaiTro)];

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-ivory-deep bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
          <Link href={TRANG_CHINH[u.vaiTro] || "/"}>
            <Brand />
          </Link>
          <UserBar u={u} />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-7">
        <h1 className="font-display text-2xl text-ink">Hướng dẫn sử dụng</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Hệ thống khách mời và check in, đêm tri ân 20 năm Capella.{" "}
          <Link href="/doi-mat-khau" className="text-brand underline">
            Đổi mật khẩu
          </Link>
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {ds.map((h) => (
            <a key={h.ma} href={`#${h.ma}`} className={`chip px-3.5 py-2 ${h.ma === u.vaiTro ? "bg-brand text-white" : "bg-white text-ink-soft"}`}>
              {h.ten}
            </a>
          ))}
        </nav>

        <div className="mt-6 space-y-6">
          {ds.map((h) => (
            <section key={h.ma} id={h.ma} className="card scroll-mt-6 overflow-hidden">
              <div className="border-b border-ivory-deep bg-white px-6 py-4">
                <h2 className="font-display text-lg text-ink">{h.ten}</h2>
                <p className="mt-0.5 text-sm text-ink-muted">{h.moTa}</p>
              </div>
              <div className="space-y-5 px-6 py-5">
                {h.muc.map((m) => (
                  <div key={m.tieuDe}>
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand">{m.tieuDe}</div>
                    <ol className="mt-2 space-y-2">
                      {m.buoc.map((b, i) => {
                        const [ten, noiDung] = Array.isArray(b) ? b : [null, b];
                        return (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
                              {i + 1}
                            </span>
                            <span className="text-ink-soft">
                              {ten && <b className="font-medium text-ink">{ten}. </b>}
                              {noiDung}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
                <div className="rounded-xl bg-ivory/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Lưu ý</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    {h.luuY.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
