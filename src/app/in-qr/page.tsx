import { redirect } from "next/navigation";

// Trang cu (in so thu tu thiep giay): da thay bang trang in nhan dan thiep giay
export default function InQRPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const q = new URLSearchParams();
  for (const k of ["venue", "sales", "chuaGiay"]) if (searchParams[k]) q.set(k, String(searchParams[k]));
  redirect(`/in-nhan${q.toString() ? `?${q}` : ""}`);
}
