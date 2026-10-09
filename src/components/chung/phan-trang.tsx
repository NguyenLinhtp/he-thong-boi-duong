import Link from "next/link";
import Form from "next/form";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { khopTuKhoa, type NguoiTimKiem } from "@/lib/tim-kiem";

export const SO_DONG_MOI_TRANG = 20;

export type ThamSoUrl = Record<string, string | string[] | undefined>;

/** Tên tham số URL của 1 danh sách: `${ma}_q` (từ khóa), `${ma}_trang` (trang), `${ma}_so` (số dòng/trang). */
export const thamSoDanhSach = (ma: string) => ({ q: `${ma}_q`, trang: `${ma}_trang`, so: `${ma}_so` });

const motGiaTri = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** (bổ sung 08/10/2026) tên tham số số dòng/trang đi cùng tham số trang: `x_trang` -> `x_so`, `trang` -> `so`. */
export const tenThamSoSoDong = (tenTrang: string) => (tenTrang.endsWith("trang") ? `${tenTrang.slice(0, -5)}so` : `${tenTrang}_so`);

/** Số dòng/trang người dùng nhập trên URL: số nguyên 1..500, sai/thiếu thì 20. */
export function soDongTuUrl(sp: ThamSoUrl | Record<string, string | undefined>, tenTrang: string) {
  const n = Math.trunc(Number(motGiaTri(sp[tenThamSoSoDong(tenTrang)])));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : SO_DONG_MOI_TRANG;
}

/**
 * (bổ sung 06/10/2026) Lọc theo ô tìm của danh sách `ma` rồi cắt trang 20 dòng.
 * `lay` trả về thông tin người của 1 dòng (họ tên, CCCD, mã SV, mã học viên);
 * `them` thêm các chữ khác được tìm (vd. lớp, số phiếu).
 */
export function locVaPhanTrang<T>(
  ds: T[],
  sp: ThamSoUrl,
  ma: string,
  lay: (x: T) => NguoiTimKiem,
  them?: (x: T) => (string | null | undefined)[],
) {
  const ten = thamSoDanhSach(ma);
  const tuKhoa = (motGiaTri(sp[ten.q]) ?? "").trim();
  const loc = tuKhoa ? ds.filter((x) => khopTuKhoa(lay(x), tuKhoa, them?.(x))) : ds;
  // dsLoc: toàn bộ dòng khớp tìm kiếm (mọi trang) - dùng cho "chọn tất cả" khi thao tác hàng loạt
  return { ma, tuKhoa, tongGoc: ds.length, dsLoc: loc, ...catTrang(loc, motGiaTri(sp[ten.trang]), soDongTuUrl(sp, ten.trang)) };
}

/** Chuỗi tham số URL hiện tại dạng phẳng (bỏ giá trị rỗng) để ghép link/ô tìm. */
export function thamSoPhang(sp: ThamSoUrl): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, motGiaTri(v) || undefined]));
}

/**
 * Ô tìm nhanh của 1 danh sách (form GET): giữ nguyên tham số của các danh sách
 * khác trên cùng trang, về trang 1 của danh sách này khi tìm.
 */
export function OTimKiem({
  duong,
  thamSo,
  ma,
  tuKhoa,
  goiY = "Họ tên / mã sinh viên / số CCCD",
  ketQua,
  className,
}: {
  duong: string;
  thamSo: Record<string, string | undefined>;
  ma: string;
  tuKhoa: string;
  goiY?: string;
  ketQua?: number;
  className?: string;
}) {
  const ten = thamSoDanhSach(ma);
  const giu = Object.entries(thamSo).filter(([k, v]) => v && k !== ten.q && k !== ten.trang);
  const boLoc = new URLSearchParams(giu as [string, string][]).toString();
  return (
    <Form action={duong} scroll={false} prefetch={false} role="search" className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto", className)}>
      {giu.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name={ten.q} defaultValue={tuKhoa} placeholder={goiY} aria-label={goiY} className="pl-8" />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Tìm
      </Button>
      {tuKhoa && (
        <>
          <Link href={`${duong}${boLoc ? `?${boLoc}` : ""}`} scroll={false} className="text-xs whitespace-nowrap underline">
            Bỏ lọc
          </Link>
          {ketQua !== undefined && <span className="text-xs whitespace-nowrap text-muted-foreground">{ketQua} kết quả</span>}
        </>
      )}
    </Form>
  );
}

/** Cắt 1 trang của danh sách; số trang ngoài khoảng được kéo về trang hợp lệ gần nhất. */
export function catTrang<T>(ds: T[], trangYeuCau: string | number | undefined, soDong = SO_DONG_MOI_TRANG) {
  const vt = viTriTrang(ds.length, trangYeuCau, soDong);
  return { ...vt, dsTrang: ds.slice(vt.tuDong, vt.tuDong + soDong) };
}

/** Vị trí trang khi phân trang trong CSDL (skip = tuDong, take = soDong) theo tổng số dòng. */
export function viTriTrang(tongDong: number, trangYeuCau: string | number | undefined, soDong = SO_DONG_MOI_TRANG) {
  const tongTrang = Math.max(1, Math.ceil(tongDong / soDong));
  const n = Math.trunc(Number(trangYeuCau));
  const trang = Number.isFinite(n) ? Math.min(Math.max(n, 1), tongTrang) : 1;
  return { trang, tongTrang, tongDong, soDong, tuDong: (trang - 1) * soDong };
}

/**
 * Thanh phân trang dạng liên kết (giữ nguyên các tham số khác trên URL); mỗi
 * danh sách trên cùng trang dùng 1 tham số riêng (vd. trang, trangCT).
 */
export function PhanTrang({
  duong,
  thamSo,
  ten,
  trang,
  tongTrang,
  tongDong,
  soDong = SO_DONG_MOI_TRANG,
  neo,
}: {
  duong: string;
  thamSo: Record<string, string | undefined>;
  ten: string;
  trang: number;
  tongTrang: number;
  tongDong: number;
  /** (bổ sung 08/10/2026) số dòng/trang đang dùng - hiện ô nhập để đổi */
  soDong?: number;
  neo?: string;
}) {
  // danh sách ngắn (không quá 1 trang mặc định) thì không cần thanh phân trang
  if (tongDong <= Math.min(soDong, 10)) return null;
  const tenSo = tenThamSoSoDong(ten);
  const href = (t: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(thamSo)) if (v && k !== ten) p.set(k, v);
    if (t > 1) p.set(ten, String(t));
    const qs = p.toString();
    return `${duong}${qs ? `?${qs}` : ""}${neo ? `#${neo}` : ""}`;
  };
  // tối đa 7 số trang quanh trang hiện tại
  const dau = Math.max(1, Math.min(trang - 3, tongTrang - 6));
  const cacTrang = Array.from({ length: Math.min(7, tongTrang) }, (_, i) => dau + i);
  const nut = "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs";
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm" aria-label="Phân trang">
      <span className="mr-2 text-xs text-muted-foreground">
        Trang {trang}/{tongTrang} · {tongDong} dòng
      </span>
      {tongTrang > 1 && (trang > 1 ? (
        <Link href={href(trang - 1)} scroll={false} className={cn(nut, "hover:bg-muted")}>
          ‹ Trước
        </Link>
      ) : (
        <span className={cn(nut, "opacity-40")}>‹ Trước</span>
      ))}
      {tongTrang > 1 && cacTrang.map((t) =>
        t === trang ? (
          <span key={t} aria-current="page" className={cn(nut, "border-primary bg-primary text-primary-foreground")}>
            {t}
          </span>
        ) : (
          <Link key={t} href={href(t)} scroll={false} className={cn(nut, "hover:bg-muted")}>
            {t}
          </Link>
        ),
      )}
      {tongTrang > 1 && (trang < tongTrang ? (
        <Link href={href(trang + 1)} scroll={false} className={cn(nut, "hover:bg-muted")}>
          Sau ›
        </Link>
      ) : (
        <span className={cn(nut, "opacity-40")}>Sau ›</span>
      ))}
      {/* (bổ sung 08/10/2026) nhập số dòng mỗi trang - về trang 1, giữ các tham số khác */}
      <Form action={duong} scroll={false} prefetch={false} className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
        {Object.entries(thamSo)
          .filter(([k, v]) => v && k !== ten && k !== tenSo)
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <label htmlFor={`so-dong-${tenSo}`}>Số dòng/trang</label>
        <input
          id={`so-dong-${tenSo}`}
          name={tenSo}
          type="number"
          min={1}
          max={500}
          defaultValue={soDong}
          className="h-7 w-16 rounded-md border bg-background px-1.5 text-xs text-foreground"
        />
        <button type="submit" className={cn(nut, "hover:bg-muted")}>
          Áp dụng
        </button>
      </Form>
    </nav>
  );
}

/** Thông báo khi ô tìm không khớp dòng nào. */
export function KhongKhop({ tuKhoa }: { tuKhoa: string }) {
  return <p className="text-sm text-muted-foreground">Không có dòng nào khớp &quot;{tuKhoa}&quot;.</p>;
}
