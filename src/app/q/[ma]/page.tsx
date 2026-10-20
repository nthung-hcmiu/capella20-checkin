import { redirect } from "next/navigation";

// Mot QR, hai ngu canh: dien thoai khach mo link nay -> dieu huong toi trang thiep.
// App le tan quet cung ma nhung xu ly qua /api/checkin.
export default function QRouter({ params }: { params: { ma: string } }) {
  redirect(`/thiep/${params.ma}`);
}
