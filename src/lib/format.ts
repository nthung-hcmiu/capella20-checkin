export function dinhDangGio(d?: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dinhDangGioNgan(d?: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function che4SoCuoi(sdt: string): string {
  if (!sdt || sdt.length < 4) return "****";
  return "***" + sdt.slice(-4);
}

// Bo dau va ha chu thuong de tim kiem ten tieng Viet ("nguyen" khop "Nguyễn")
export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Chuan hoa SDT de chong trung: bo ky tu khong phai so, doi +84 / 84 ve 0
export function chuanHoaSdt(raw: string): string {
  let s = (raw || "").replace(/\D/g, "");
  if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
  return s;
}
