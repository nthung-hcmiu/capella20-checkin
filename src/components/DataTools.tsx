"use client";

import { useState, useTransition } from "react";
import { napDuLieuMau, xoaToanBoKhach, type KetQua } from "@/lib/actions";

export function DataTools({ soKhach, soCheckin }: { soKhach: number; soCheckin: number }) {
  const [pending, start] = useTransition();
  const [kq, setKq] = useState<KetQua | null>(null);
  const [chuXoa, setChuXoa] = useState("");
  const [xacNhanMau, setXacNhanMau] = useState(false);

  const chay = (fn: () => Promise<KetQua>) =>
    start(async () => {
      setKq(await fn());
      setChuXoa("");
      setXacNhanMau(false);
    });

  const duocXoa = ["XÓA", "XOA"].includes(chuXoa.trim().toUpperCase());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Dữ liệu</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Hiện có {soKhach.toLocaleString("vi-VN")} khách và {soCheckin.toLocaleString("vi-VN")} lượt check in trong hệ thống.
        </p>
      </div>

      {kq && (
        <div className={`rounded-xl px-4 py-3 text-sm ${kq.ok ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>{kq.thongBao}</div>
      )}

      <div className="card p-6">
        <h2 className="font-display text-lg text-ink">Xuất danh sách</h2>
        <p className="mt-1 text-sm text-ink-muted">
          File CSV mở được bằng Excel, gồm số thứ tự, thông tin khách, trạng thái, bàn, sales, link thiệp. Nên xuất một bản sao lưu trước khi xóa.
        </p>
        <a href="/api/xuat" className="btn-ink mt-4">
          Tải file CSV
        </a>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg text-ink">Nạp dữ liệu mẫu</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Thay toàn bộ khách hiện có bằng 68 khách mẫu để dùng thử. Tài khoản và venue giữ nguyên.
        </p>
        {xacNhanMau ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-gold" disabled={pending} onClick={() => chay(napDuLieuMau)}>
              {pending ? "Đang nạp..." : `Xác nhận, thay ${soKhach} khách hiện có`}
            </button>
            <button className="btn-ghost" onClick={() => setXacNhanMau(false)}>
              Thôi
            </button>
          </div>
        ) : (
          <button className="btn-ghost mt-4" onClick={() => setXacNhanMau(true)}>
            Nạp dữ liệu mẫu
          </button>
        )}
      </div>

      <div className="card border-wine/30 p-6">
        <h2 className="font-display text-lg text-wine">Xóa toàn bộ danh sách khách</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Xóa vĩnh viễn mọi khách, mã thiệp và nhật ký check in. Không hoàn tác được. Tài khoản và venue giữ nguyên.
          Dùng trước khi nhập danh sách thật.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            className="input max-w-[220px]"
            placeholder="Gõ XÓA để xác nhận"
            value={chuXoa}
            onChange={(e) => setChuXoa(e.target.value)}
          />
          <button
            className="btn rounded-full bg-wine text-white hover:bg-wine/90"
            disabled={!duocXoa || pending}
            onClick={() => chay(() => xoaToanBoKhach(chuXoa))}
          >
            {pending ? "Đang xóa..." : `Xóa ${soKhach.toLocaleString("vi-VN")} khách`}
          </button>
        </div>
      </div>
    </div>
  );
}
