import { redirect } from "next/navigation";

// Mot QR, hai ngu canh: dien thoai khach mo link nay -> dieu huong toi trang thiep.
// App le tan quet cung ma nhung xu ly qua /api/checkin. Tham so k la khach di kem tren cung ve.
export default function QRouter({ params, searchParams }: { params: { ma: string }; searchParams: { k?: string } }) {
  const k = parseInt(String(searchParams.k || ""), 10);
  redirect(`/thiep/${params.ma}${k >= 2 && k <= 10 ? `?k=${k}` : ""}`);
}
