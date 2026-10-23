// Quy uoc tai khoan: ten dang nhap theo cong thuc, mat khau tam ngau nhien
import { boDau } from "./format";

// Chu cai dau cua ho va ten dem + ten chinh, khong dau: "Pham Le Minh Thu" -> "plmthu"
export function tenDangNhapGoiY(hoTen: string): string {
  const p = tachTen(hoTen);
  if (p.length === 0) return "";
  return p.slice(0, -1).map((x) => x[0]).join("") + p[p.length - 1];
}

// Cong thuc cu (ten chinh dung truoc), dung de doi ten cac tai khoan da tao theo cach cu
export function tenDangNhapCu(hoTen: string): string {
  const p = tachTen(hoTen);
  if (p.length === 0) return "";
  return p[p.length - 1] + p.slice(0, -1).map((x) => x[0]).join("");
}

function tachTen(hoTen: string): string[] {
  return boDau(hoTen || "").replace(/[^a-z ]/g, " ").split(" ").filter(Boolean);
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
