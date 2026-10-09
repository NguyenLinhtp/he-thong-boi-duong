"use client";

import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody } from "@/components/ui/table";

export const SO_DONG_MAC_DINH = 20;
export const SO_DONG_TOI_DA = 500;

/** Số dòng/trang người dùng nhập: số nguyên 1..500, sai thì về mặc định. */
export function chuanHoaSoDong(v: unknown, macDinh = SO_DONG_MAC_DINH) {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, SO_DONG_TOI_DA) : macDinh;
}

/**
 * (bổ sung 08/10/2026) Bảng có phân trang + ô nhập số dòng mỗi trang, cho các danh sách của khóa
 * chưa phân trang phía máy chủ. `children` là các dòng (TableRow). `giuDong`: dòng ngoài trang chỉ
 * bị ẩn (vẫn nằm trong form) - dùng cho bảng có ô nhập để giá trị ở trang khác vẫn được gửi khi lưu.
 */
export function BangPhanTrang({
  dauBang,
  rong,
  children,
  giuDong = false,
  soDongMacDinh = SO_DONG_MAC_DINH,
  className,
}: {
  dauBang: ReactNode;
  /** dòng hiển thị khi danh sách trống */
  rong?: ReactNode;
  children: ReactNode;
  giuDong?: boolean;
  soDongMacDinh?: number;
  className?: string;
}) {
  const dsDong = Children.toArray(children);
  const [soDong, setSoDong] = useState(soDongMacDinh);
  const [trangChon, setTrang] = useState(1);
  const tongTrang = Math.max(1, Math.ceil(dsDong.length / soDong));
  const trang = Math.min(trangChon, tongTrang);
  const tu = (trang - 1) * soDong;

  const hien = giuDong
    ? dsDong.map((d, i) =>
        isValidElement(d) && (i < tu || i >= tu + soDong) ? cloneElement(d as ReactElement<{ hidden?: boolean }>, { hidden: true }) : d,
      )
    : dsDong.slice(tu, tu + soDong);

  return (
    <div className="flex flex-col gap-2">
      <Table className={className}>
        {dauBang}
        <TableBody>{dsDong.length === 0 ? rong : hien}</TableBody>
      </Table>
      <ThanhPhanTrangKhach
        trang={trang}
        tongTrang={tongTrang}
        tongDong={dsDong.length}
        soDong={soDong}
        doiTrang={setTrang}
        doiSoDong={(n) => {
          setSoDong(n);
          setTrang(1);
        }}
      />
    </div>
  );
}

const NUT = "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs";

/** Thanh phân trang dạng nút (phía trình duyệt) - cùng giao diện với PhanTrang theo URL. */
export function ThanhPhanTrangKhach({
  trang,
  tongTrang,
  tongDong,
  soDong,
  doiTrang,
  doiSoDong,
}: {
  trang: number;
  tongTrang: number;
  tongDong: number;
  soDong: number;
  doiTrang: (t: number) => void;
  doiSoDong: (n: number) => void;
}) {
  if (tongDong <= Math.min(soDong, 10)) return null;
  const dau = Math.max(1, Math.min(trang - 3, tongTrang - 6));
  const cacTrang = Array.from({ length: Math.min(7, tongTrang) }, (_, i) => dau + i);
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm" aria-label="Phân trang">
      <span className="mr-2 text-xs text-muted-foreground">
        Trang {trang}/{tongTrang} · {tongDong} dòng
      </span>
      {tongTrang > 1 && (
        <>
          <button type="button" className={cn(NUT, trang > 1 ? "hover:bg-muted" : "opacity-40")} disabled={trang <= 1} onClick={() => doiTrang(trang - 1)}>
            ‹ Trước
          </button>
          {cacTrang.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={t === trang ? "page" : undefined}
              className={cn(NUT, t === trang ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => doiTrang(t)}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            className={cn(NUT, trang < tongTrang ? "hover:bg-muted" : "opacity-40")}
            disabled={trang >= tongTrang}
            onClick={() => doiTrang(trang + 1)}
          >
            Sau ›
          </button>
        </>
      )}
      <O_SoDong soDong={soDong} doiSoDong={doiSoDong} />
    </nav>
  );
}

function O_SoDong({ soDong, doiSoDong }: { soDong: number; doiSoDong: (n: number) => void }) {
  const [nhap, setNhap] = useState(String(soDong));
  const apDung = () => {
    const n = chuanHoaSoDong(nhap, soDong);
    setNhap(String(n));
    if (n !== soDong) doiSoDong(n);
  };
  return (
    <label className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
      Số dòng/trang
      <input
        type="number"
        min={1}
        max={SO_DONG_TOI_DA}
        value={nhap}
        onChange={(e) => setNhap(e.target.value)}
        onBlur={apDung}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // không gửi form bao quanh bảng (vd. form nhập điểm)
            e.preventDefault();
            apDung();
          }
        }}
        className="h-7 w-16 rounded-md border bg-background px-1.5 text-xs text-foreground"
        aria-label="Số dòng mỗi trang"
      />
    </label>
  );
}
