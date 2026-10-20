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
