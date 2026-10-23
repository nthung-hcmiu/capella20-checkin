// Quy uoc tai khoan: ten dang nhap theo cong thuc, mat khau tam ngau nhien
import { boDau } from "./format";

// Ten chinh + chu cai dau cua ho va ten dem, khong dau: "Pham Le Minh Thu" -> "thuplm"
export function tenDangNhapGoiY(hoTen: string): string {
  const p = boDau(hoTen || "").replace(/[^a-z ]/g, " ").split(" ").filter(Boolean);
  if (p.length === 0) return "";
  return p[p.length - 1] + p.slice(0, -1).map((x) => x[0]).join("");
}

// Chuan hoa ho ten: bo khoang trang thua, viet hoa chu dau moi tu
export function chuanHoTen(hoTen: string): string {
  return (hoTen || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toLocaleUpperCase("vi") + w.slice(1).toLocaleLowerCase("vi") : w))
    .join(" ");
}
