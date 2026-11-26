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
    ten: "BTC (MKT Manager)",
    moTa: "Giữ danh sách: nhập và duyệt khách, phát hành thiệp, theo dõi KPI venue và số liệu.",
    muc: [
      {
        tieuDe: "Trước sự kiện",
        buoc: [
          ["Nhập danh sách", "Nhập danh sách > chọn file Excel > chọn trạng thái sau khi nhập (Chờ duyệt hoặc Đã phát hành thiệp) > Tiếp tục: kiểm tra file > Hoàn tất: lưu khách vào app."],
          ["Duyệt", "Chờ duyệt: khách sales đã gửi. Xem cảnh báo (trùng SĐT, trùng tên cùng công ty, VIP, venue hết quota) rồi Duyệt hoặc Từ chối. Khách không có cảnh báo duyệt một lần bằng nút Duyệt tất cả."],
          ["Trả về nháp", "Thiệp đã phát hành mà cần cho sales sửa số người mời, VIP hoặc venue: Danh sách khách > bấm vào khách > Trả về nháp (hoặc tick nhiều khách rồi chọn Trả về nháp để sales sửa). Sales sửa xong gửi duyệt, BTC duyệt lại. Sales không xóa được thiệp đã từng phát hành. Số thứ tự và mã QR giữ nguyên. Trong lúc chờ duyệt lại, QR vẫn quét được nhưng lễ tân sẽ thấy cảnh báo thiệp chưa phát hành, nên duyệt lại trước ngày sự kiện."],
          ["Xem khách", "Danh sách khách: bấm vào dòng nào là mở toàn bộ thông tin và các nút xử lý của khách đó."],
          ["Cùng công ty", "Danh sách khách > bộ lọc Công ty: xem công ty nào có nhiều sales cùng mời, hoặc được mời trên 2 người. Hàng Chờ duyệt cũng ghi rõ các khách cùng công ty và sales của từng người."],
          ["Theo dõi theo sales", "Quota venue > Theo dõi theo sales: mỗi sales đã mời bao nhiêu công ty, bao nhiêu thiệp; trong đó bao nhiêu thiệp đang nháp, chờ duyệt, đã phát hành, đã xác nhận, đã check in."],
          ["Khách năm trước", "Dữ liệu > Danh sách khách năm trước: tải file check in từng năm (2024, 2025...). File nhiều sheet thì app gộp và bỏ trùng, sheet khác cấu trúc được bỏ chọn sẵn. Sau đó mỗi khách có nhãn: đã đến, mời không đến, cùng công ty, hoặc khách mới. Bảng điều khiển so sánh từng năm (2024, 2025...) trong cùng một bảng: được mời, đã đến, năm nay mời lại, đã đến mà năm nay chưa mời."],
          ["In nhãn thiệp giấy", "Thiệp giấy chỉ ghi số thứ tự, không có mã QR. Nhãn dán ngoài thiệp ghi Kính gửi, tên, chức vụ, công ty, địa chỉ, số điện thoại và số thứ tự thiệp ở góc dưới bên phải. Chọn loại giấy lúc in: Tomy No. 100 (tờ A5, 8 nhãn 96 x 37 mm) hoặc Tomy No. 136 (tờ A4, 24 nhãn 70 x 35 mm). Danh sách khách > In nhãn thiệp giấy để in theo venue, sales hoặc chỉ thiệp giấy chưa gửi; hoặc tick chọn khách rồi bấm In nhãn thiệp giấy trên thanh thao tác."],
          ["Theo dõi", "Bảng điều khiển: doanh thu dự kiến, số công ty, số khách theo venue so với KPI. Quota và KPI venue: số thiệp còn lại, mục tiêu từng venue."],
        ],
      },
      {
        tieuDe: "Ngày sự kiện",
        buoc: [
          ["Đánh thức hệ thống", "15 phút trước giờ đón khách, mở trang /api/health một lần."],
          ["Theo dõi cửa", "Bảng điều khiển cập nhật số thiệp đã check in theo thời gian thực, tách QR và thủ công."],
        ],
      },
      {
        tieuDe: "Sau sự kiện (Quản trị)",
        buoc: [
          ["Chốt vắng mặt", "Dữ liệu > Chốt vắng mặt: khách Tham dự mà không check in chuyển sang Vắng mặt."],
          ["Báo cáo", "Dữ liệu > Tải file CSV, hoặc Danh sách khách > Xuất CSV. Chỉ Quản trị thấy nút này."],
          ["Xuất riêng một đơn vị", "Dữ liệu > Xuất danh sách > chọn đơn vị > Tải file CSV. Hoặc ở Danh sách khách, chọn venue ở bộ lọc rồi bấm nút Xuất CSV (nút sẽ ghi tên venue đang lọc)."],
        ],
      },
    ],
    luuY: [
      "Cách gọi thống nhất trong báo cáo: mỗi khách một thiệp, kể cả khách đi kèm, nên số thiệp là số người được mời. Số công ty đếm riêng, một công ty có thể có nhiều thiệp. Thiệp giấy bằng số thiệp trừ sales và marketing nội bộ Capella.",
      "Ngành hàng: bắt buộc chọn khi thêm khách (trừ nhân sự nội bộ Capella). Xếp theo ngành sản phẩm cuối của công ty; Hàng Tiêu Dùng chỉ gồm hàng phi thực phẩm; Sản Xuất/Công Nghiệp chỉ dành cho công nghiệp B2B. Rà lại hàng loạt: Xuất CSV > sửa cột Ngành hàng > Nhập danh sách > Cập nhật ngành hàng từ file.",
      "Tạo tài khoản sales: Tài khoản > Tạo nhiều tài khoản > dán danh sách họ tên > chọn venue. Tên đăng nhập theo công thức chữ cái đầu họ và tên đệm + tên chính (Phạm Lê Minh Thư thành plmthu), mật khẩu tạm ngẫu nhiên chỉ hiện một lần.",
      "Giao venue cho BTC: Tài khoản > bấm nút Duyệt cạnh tên tài khoản BTC > tick các venue người đó được duyệt và sửa khách > Lưu phạm vi. Người đó chỉ thấy danh sách, hàng Chờ duyệt và số liệu của các venue đã tick (tick thêm ô xem mọi venue nếu vẫn cho xem hết). Khách họ tự phụ trách ở venue khác vẫn nằm trong Cổng Sales của họ.",
      "Phân loại khách VIP (chỉ Quản trị): Danh sách khách > bấm vào khách > Xếp vào VIP hoặc Bỏ VIP. Nhiều khách một lúc: tick chọn rồi chọn Xếp vào khách VIP ở thanh thao tác. Bộ lọc VIP ở đầu danh sách để xem riêng khách VIP.",
      "Chỉ Quản trị được thêm hoặc sửa khách và lưu khi còn thiếu SĐT, địa chỉ, chức vụ hay thông tin khách đi cùng. BTC và sales phải điền đủ.",
      "Chỉ tài khoản Quản trị được tạo tài khoản, đặt mật khẩu cho người khác, xuất CSV và vào tab Dữ liệu. Tài khoản BTC khác chỉ xem danh sách tài khoản.",
      "Xóa toàn bộ danh sách không hoàn tác được. Luôn tải CSV sao lưu trước.",
      "BTC cũng xác nhận thay khách và sửa thông tin được ngay trong dòng khách đã mở.",
    ],
  },
  {
    ma: "SALES",
    ten: "Sales",
    moTa: "Giữ quan hệ: lập khách, gửi duyệt, gửi thiệp, hỏi khách, xác nhận tham dự thay khách.",
    muc: [
      {
        tieuDe: "Lập khách",
        buoc: [
          ["Thêm khách", "Khách của tôi > Thêm khách. Bắt buộc tên, SĐT, địa chỉ và chức vụ; mời 2 người thì điền cả danh xưng, tên và chức vụ khách thứ 2 (mỗi người nhận một thiệp riêng). Chọn ngành hàng (bắt buộc), phân loại khách (Khách cũ, Khách tiềm năng hoặc Đối tác), ghi doanh thu dự kiến. Khách mới lưu ở trạng thái Nháp."],
          ["Venue", "Tài khoản gắn với venue nào thì chỉ thêm và nhập khách cho venue đó."],
          ["Nhãn năm trước", "Cạnh tên khách có nhãn cho biết năm trước khách được mời chưa, có đến không. Bấm vào khách để xem chi tiết."],
          ["Cùng công ty", "Dòng \"Cùng công ty\" cho biết công ty đó đã có bao nhiêu khách khác được mời. Chữ đỏ là có sales khác cùng mời, kèm tên sales đó. Khách trùng SĐT hoặc trùng tên và công ty thì app ghi rõ trùng với khách nào, của sales nào, hai bên liên hệ nhau để thống nhất ai mời."],
          ["Lọc khách trùng", "Khách trùng người (cùng SĐT, hoặc cùng tên và công ty) và khách có công ty đang được sales khác cùng mời đều được tô nền đỏ, gắn nhãn Trùng hoặc Trùng công ty. Bấm nút \"Trùng với sales khác\" cạnh các nhóm trạng thái để chỉ xem những khách này, bấm lần nữa để bỏ lọc."],
          ["Nhập từ Excel", "Nhập danh sách > Tải file mẫu > điền > chọn file > Tiếp tục: kiểm tra file > Hoàn tất: lưu khách vào app. Mọi khách trong file do bạn phụ trách."],
          ["Thiệp khách đi kèm", "Khách mời 2 người thì mỗi người một thiệp riêng. Sau khi được duyệt, mở khách ra sẽ thấy thêm dòng Khách thứ 2 với nút Tải thiệp. Thiệp này ghi đúng tên khách đi kèm và có mã QR riêng, người đó đến trước hay sau khách chính đều check in được."],
          ["Gửi duyệt", "Kiểm tra lại rồi bấm Gửi duyệt trên từng khách, hoặc Gửi duyệt tất cả. Nháp sai thì bấm Xóa nháp."],
          ["Chờ BTC", "BTC duyệt xong khách chuyển sang Đã phát hành thiệp, lúc đó mới gửi thiệp được."],
        ],
      },
      {
        tieuDe: "Mỗi khách đã phát hành thiệp đi qua 3 bước: gửi thiệp online, gửi thiệp giấy, xác nhận tham dự",
        buoc: [
          ["Gửi thiệp online", "Bấm Tải thiệp để lấy file hình (có sẵn tên khách và mã QR check in), tự gửi cho khách qua Zalo hoặc email > bấm Đã gửi. Khách đi kèm có nút Tải thiệp riêng, thiệp ghi tên và mã QR của người đó."],
          ["In nhãn thiệp giấy", "In một khách: mở khách > In nhãn, nhãn nằm ở ô đầu tiên của tờ. In nhiều khách: tick chọn các khách > In nhãn thiệp giấy trên thanh thao tác. Trên trang in, chọn loại giấy nhãn đang dùng: Tomy No. 100 (tờ A5 in ngang, 8 nhãn 96 x 37 mm) hoặc Tomy No. 136 (tờ A4 in dọc, 24 nhãn 70 x 35 mm); máy sẽ nhớ loại đã chọn. Tờ nhãn dùng dở thì chọn ô bắt đầu là ô còn trống đầu tiên. Để tiết kiệm nhãn, các khách cùng công ty (và khách đi kèm) chỉ in một nhãn cho khách đầu tiên, thiệp của những người còn lại bỏ chung phong bì; cần mỗi thiệp một nhãn thì bỏ tick ô Mỗi công ty chỉ in một nhãn. Trong hộp thoại in chọn đúng khổ giấy và hướng giấy ghi trên trang, lề Không có, tỷ lệ 100%."],
          ["Gửi thiệp giấy", "Gửi thiệp giấy cho khách xong thì bấm Đã gửi thiệp giấy."],
          ["Khách tự xác nhận", "Khách quét mã QR trên thiệp thì mở ra trang thiệp, ở đó khách bấm Tôi sẽ tham dự hoặc Tôi không tham dự được. Mỗi người trên thiệp trả lời cho riêng mình. Kết quả hiện ngay trong danh sách của bạn, dòng Khách tự trả lời trên thiệp."],
          ["Xác nhận thay khách", "Khách báo qua điện thoại hoặc Zalo thì bạn xác nhận giúp: Xác nhận thay khách > chọn số người > Tham dự hoặc Không tham dự. Khách đổi ý thì Đổi xác nhận hoặc Bỏ xác nhận. Lần xác nhận sau cùng (của khách hoặc của bạn) là kết quả đang dùng."],
        ],
      },
      {
        tieuDe: "Theo dõi và chỉnh sửa",
        buoc: [
          ["Tổng quan", "Số thiệp, số công ty, doanh thu dự kiến, thiệp xác nhận, thiệp check in của riêng bạn, kèm danh sách việc cần làm."],
          ["Sửa thông tin", "Khách đang Nháp hoặc Chờ duyệt: mở khách > Sửa thông tin. Thiệp đã duyệt thì không tự sửa được: báo quản lý trả thiệp về nháp, sửa xong gửi duyệt lại. Số thứ tự và mã QR vẫn giữ nguyên."],
          ["Khách không đi được", "Thiệp đã phát hành thì không xóa được, kể cả khi được trả về nháp. Mở khách > Xác nhận thay khách > Không tham dự. Thiệp đó không còn tính vào quota, bạn thêm khách mới thay vào như bình thường (khách mới có số thứ tự và thiệp riêng). Chỉ khách Nháp chưa từng phát hành mới xóa được."],
          ["Xuất danh sách", "Bấm Xuất danh sách ở trang Tổng quan hoặc Khách của tôi: tải file CSV (mở bằng Excel) gồm toàn bộ khách bạn phụ trách, kèm số thứ tự thiệp, trạng thái, số thiệp xác nhận và thực tế đến."],
          ["Trên máy tính", "Khách của tôi hiện dạng bảng, bấm vào dòng để xem chi tiết và thao tác."],
        ],
      },
    ],
    luuY: [
      "Khách tự xác nhận được trên trang thiệp (mở bằng cách quét mã QR trên thiệp). Khách nào chưa trả lời thì sales hỏi rồi xác nhận thay trên app.",
      "Khách hỏi cách vào cửa: đưa mã QR ở cuối file thiệp, hoặc đọc số thứ tự thiệp.",
      "File thiệp có mã QR dùng để vào cửa. Nhắc khách không đăng nguyên file lên mạng; muốn đăng thì cắt bỏ phần mã QR ở dưới.",
      "Lần đầu đăng nhập, đổi mật khẩu riêng. Quên mật khẩu thì nhờ Quản trị đặt lại.",
    ],
  },
  {
    ma: "QL_CHECKIN",
    ten: "Quản lý check in",
    moTa: "Theo dõi cửa đón khách: số khách tổng và từng trung tâm, tình hình từng làn lễ tân. Chỉ xem số liệu, không sửa danh sách khách.",
    muc: [
      {
        tieuDe: "Trang Giám sát check in",
        buoc: [
          ["Số tổng", "Hàng trên cùng: thiệp đã mời, đã xác nhận tham dự, đã check in, số đã xác nhận mà chưa đến, và số lượt check in trong 15 phút gần nhất."],
          ["Theo trung tâm", "Bảng Theo trung tâm: mỗi trung tâm mời bao nhiêu thiệp, bao nhiêu đã xác nhận, bao nhiêu đã check in, còn bao nhiêu chưa đến."],
          ["Các làn lễ tân", "Mỗi làn một ô: tổng số lượt, lượt trong 15 phút gần nhất, bao nhiêu lượt quét QR, bao nhiêu nhập tay, bao nhiêu lượt trùng hoặc lỗi, lễ tân nào đang đứng làn đó và lần quét gần nhất lúc mấy giờ."],
          ["Xem riêng một làn", "Bấm vào ô của làn: danh sách Check in gần đây bên dưới chỉ còn các lượt của làn đó. Bấm Xem mọi làn để bỏ lọc."],
          ["Tự cập nhật", "Trang tự cập nhật mỗi 10 giây. Bấm Tạm dừng khi cần đọc kỹ, Cập nhật ngay khi muốn xem số mới nhất."],
        ],
      },
      {
        tieuDe: "Khi cần hỗ trợ cửa",
        buoc: [
          ["Tự check in giúp", "Bấm Mở app check in để quét QR, nhập số thứ tự hoặc tìm tên khách như một lễ tân, ví dụ khi đứng ở Quầy hỗ trợ."],
          ["Làn chậm hoặc nhiều lỗi", "Làn có nhiều lượt Trùng, lỗi hoặc đứng yên lâu trong khi làn khác vẫn chạy: xuống kiểm tra mạng và máy của lễ tân làn đó."],
        ],
      },
    ],
    luuY: [
      "Một lượt là một lần check in thành công. Khách chính và khách đi kèm quét mã riêng thì tính 2 lượt; số ở hàng Đã check in đếm theo số người thực tế đến.",
      "Trang Giám sát không hiện số điện thoại hay doanh thu. Vai trò này không vào được Quản trị BTC và Cổng Sales, không sửa được dữ liệu khách; chỉ check in được qua app check in như lễ tân.",
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
          ["Quét QR", "Tab Quét QR > Bật camera > hướng vào QR trên thiệp online ở điện thoại của khách. Dùng được trên iPhone (Safari, Chrome) và Android. Mở app bằng trình duyệt, không mở link trong Zalo hay Facebook."],
          ["Nhập số", "Tab Nhập số > gõ số thứ tự trên thiệp > Check in. Dùng khi khách mang thiệp giấy (chỉ có số thứ tự, không có QR), QR mờ, màn hình khách quá tối hoặc camera chưa được cho phép."],
          ["Tìm tên", "Tab Tìm tên / SĐT > gõ tên khách, tên công ty hoặc SĐT > chọn khách."],
          ["Số người thực tế", "Trên thẻ kết quả, bấm + hoặc − nếu khách đi nhiều hoặc ít người hơn số đã xác nhận."],
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
