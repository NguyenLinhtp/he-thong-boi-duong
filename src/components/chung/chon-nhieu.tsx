"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { KetQuaLo } from "@/server/services/chung/xu-ly-lo";

/**
 * (bổ sung 07/10/2026) Chọn nhiều dòng trên danh sách và thực hiện cùng 1 thao tác:
 * - <KhungChonNhieu> bọc bảng, hiện thanh thao tác (số đã chọn, chọn tất cả mọi trang, các nút).
 * - <OChonTatCa> ở tiêu đề cột đầu: chọn/bỏ chọn các dòng của trang đang xem.
 * - <OChon id> ở đầu mỗi dòng.
 * Thao tác gọi server action theo lô (ids, giá trị nhập) -> KetQuaLo: số thành công + người bị chặn.
 */
export type TruongNhap = {
  ten: string;
  nhan: string;
  loai: "text" | "date" | "select";
  batBuoc?: boolean;
  goiY?: string;
  ds?: { gt: string; nhan: string }[];
};

export type HanhDongLo = {
  ma: string;
  nhan: string;
  nguyHiem?: boolean;
  // nhập thêm trước khi thực hiện (lý do, ngày, chọn thành phần...)
  truong?: TruongNhap[];
  // câu hỏi xác nhận
  xacNhan?: string;
  thucHien?: (ids: string[], giaTri: Record<string, string>) => Promise<KetQuaLo>;
  // mở trang (vd. in nhiều phiếu): đường dẫn + danh sách id nối bằng dấu phẩy
  lienKet?: string;
};

type NguCanh = {
  chon: Set<string>;
  doi: (id: string, co: boolean) => void;
  dsTrang: string[];
  khongChon: Set<string>;
  datNhieu: (ids: string[], co: boolean) => void;
};

const Ctx = createContext<NguCanh | null>(null);

export function KhungChonNhieu({
  dsIdTrang,
  dsIdTatCa,
  khongChon = [],
  hanhDong,
  donVi = "thí sinh",
  children,
}: {
  dsIdTrang: string[];
  dsIdTatCa: string[];
  khongChon?: string[];
  hanhDong: HanhDongLo[];
  donVi?: string;
  children: React.ReactNode;
}) {
  const [chonTho, setChon] = useState<Set<string>>(() => new Set());
  const [dangMo, setDangMo] = useState<string | null>(null);
  const [giaTri, setGiaTri] = useState<Record<string, string>>({});
  const [ketQua, setKetQua] = useState<{ nhan: string; kq: KetQuaLo } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, startTransition] = useTransition();

  const tapKhong = useMemo(() => new Set(khongChon), [khongChon]);
  const coTheChon = useMemo(() => dsIdTatCa.filter((id) => !tapKhong.has(id)), [dsIdTatCa, tapKhong]);
  // bỏ các dòng không còn trong danh sách (đã chuyển trạng thái sau thao tác, đổi bộ lọc)
  const chon = useMemo(() => {
    const conLai = new Set(coTheChon);
    return new Set([...chonTho].filter((id) => conLai.has(id)));
  }, [chonTho, coTheChon]);

  const nguCanh = useMemo<NguCanh>(
    () => ({
      chon,
      dsTrang: dsIdTrang,
      khongChon: tapKhong,
      doi: (id, co) =>
        setChon((cu) => {
          const moi = new Set(cu);
          if (co) moi.add(id);
          else moi.delete(id);
          return moi;
        }),
      datNhieu: (ids, co) =>
        setChon((cu) => {
          const moi = new Set(cu);
          for (const id of ids) {
            if (co) moi.add(id);
            else moi.delete(id);
          }
          return moi;
        }),
    }),
    [chon, dsIdTrang, tapKhong],
  );

  if (hanhDong.length === 0) return <>{children}</>;

  const hd = hanhDong.find((h) => h.ma === dangMo);
  const ids = [...chon];

  function chay(h: HanhDongLo, gt: Record<string, string>) {
    if (h.lienKet) {
      window.open(`${h.lienKet}${encodeURIComponent(ids.join(","))}`, "_blank");
      return;
    }
    if (!h.thucHien) return;
    const thieu = (h.truong ?? []).find((t) => t.batBuoc && !(gt[t.ten] ?? "").trim());
    if (thieu) {
      setLoi(`Cần nhập ${thieu.nhan.toLowerCase()}`);
      return;
    }
    if (h.xacNhan && !confirm(`${h.xacNhan}\n\nÁp dụng cho ${ids.length} ${donVi} đã chọn.`)) return;
    setLoi(null);
    const thucHien = h.thucHien;
    startTransition(async () => {
      try {
        const kq = await thucHien(ids, gt);
        setKetQua({ nhan: h.nhan, kq });
        setDangMo(null);
        setGiaTri({});
        setChon(new Set());
      } catch (error) {
        setLoi(error instanceof Error ? error.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Ctx.Provider value={nguCanh}>
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm print:hidden",
            chon.size > 0 ? "border-primary/40 bg-primary/5" : "bg-card",
          )}
        >
          <CheckSquare className="size-4 text-muted-foreground" />
          {chon.size === 0 ? (
            <span className="text-muted-foreground">Tick ô đầu dòng để chọn nhiều {donVi}</span>
          ) : (
            <>
              <span className="font-medium">
                Đã chọn {chon.size} {donVi}
              </span>
              {chon.size < coTheChon.length && (
                <button type="button" className="text-primary underline" onClick={() => setChon(new Set(coTheChon))}>
                  Chọn tất cả {coTheChon.length} (mọi trang)
                </button>
              )}
              <button type="button" className="text-muted-foreground underline" onClick={() => setChon(new Set())}>
                Bỏ chọn
              </button>
            </>
          )}
          <span className="ml-auto flex flex-wrap gap-1.5">
            {hanhDong.map((h) => (
              <Button
                key={h.ma}
                type="button"
                size="sm"
                variant={h.nguyHiem ? "destructive" : dangMo === h.ma ? "default" : "secondary"}
                className="h-7 px-2.5 text-xs"
                disabled={chon.size === 0 || dangChay}
                onClick={() => {
                  setKetQua(null);
                  setLoi(null);
                  if (h.truong?.length) {
                    setDangMo(dangMo === h.ma ? null : h.ma);
                    setGiaTri(Object.fromEntries(h.truong.filter((t) => t.loai === "select" && t.ds?.length).map((t) => [t.ten, t.ds![0].gt])));
                  } else chay(h, {});
                }}
              >
                {h.nhan}
              </Button>
            ))}
          </span>
        </div>

        {hd && chon.size > 0 && (
          <form
            className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 text-sm print:hidden"
            onSubmit={(e) => {
              e.preventDefault();
              chay(hd, giaTri);
            }}
          >
            {hd.truong!.map((t) => (
              <label key={t.ten} className="flex flex-col gap-1">
                <span className="text-xs font-medium">
                  {t.nhan}
                  {t.batBuoc && <span className="text-destructive"> *</span>}
                </span>
                {t.loai === "select" ? (
                  <select
                    value={giaTri[t.ten] ?? ""}
                    onChange={(e) => setGiaTri((g) => ({ ...g, [t.ten]: e.target.value }))}
                    className="h-8 rounded-lg border px-2 text-sm"
                  >
                    {t.ds?.map((o) => (
                      <option key={o.gt} value={o.gt}>
                        {o.nhan}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={t.loai}
                    value={giaTri[t.ten] ?? ""}
                    placeholder={t.goiY}
                    onChange={(e) => setGiaTri((g) => ({ ...g, [t.ten]: e.target.value }))}
                    className={cn("h-8", t.loai === "text" ? "w-72" : "w-40")}
                  />
                )}
              </label>
            ))}
            <Button type="submit" size="sm" variant={hd.nguyHiem ? "destructive" : "default"} disabled={dangChay}>
              {dangChay ? "Đang xử lý..." : `${hd.nhan} (${chon.size} ${donVi})`}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDangMo(null)}>
              Hủy
            </Button>
          </form>
        )}
        {dangChay && !hd && <p className="text-sm text-muted-foreground">Đang xử lý {chon.size} {donVi}...</p>}
        {loi && <p className="text-sm text-destructive">{loi}</p>}
        {ketQua && <KhoiKetQua nhan={ketQua.nhan} kq={ketQua.kq} donVi={donVi} dong={() => setKetQua(null)} />}

        {children}
      </div>
    </Ctx.Provider>
  );
}

function KhoiKetQua({ nhan, kq, donVi, dong }: { nhan: string; kq: KetQuaLo; donVi: string; dong: () => void }) {
  return (
    <div className={cn("relative rounded-lg border p-3 pr-9 text-sm", kq.loi.length > 0 ? "border-amber-500/40 bg-amber-50" : "border-success/40 bg-success/5")}>
      <button type="button" aria-label="Đóng" onClick={dong} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
      <p className="font-medium">
        {nhan}: thành công {kq.thanhCong} {donVi}
        {kq.loi.length > 0 && <span className="text-amber-800">, {kq.loi.length} không thực hiện được</span>}
      </p>
      {kq.loi.length > 0 && (
        <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5 text-amber-900">
          {kq.loi.map((l, i) => (
            <li key={i}>
              {l.ten}: {l.loi}
            </li>
          ))}
        </ul>
      )}
      {kq.ghiChu.length > 0 && (
        <details className="mt-1 text-muted-foreground">
          <summary className="cursor-pointer">Chi tiết ({kq.ghiChu.length})</summary>
          <ul className="max-h-48 list-disc overflow-y-auto pl-5">
            {kq.ghiChu.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Ô chọn tất cả các dòng của trang đang xem (đặt trong ô tiêu đề cột đầu). */
export function OChonTatCa() {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLInputElement>(null);
  const dsChonDuoc = ctx ? ctx.dsTrang.filter((id) => !ctx.khongChon.has(id)) : [];
  const soDaChon = ctx ? dsChonDuoc.filter((id) => ctx.chon.has(id)).length : 0;
  const tatCa = dsChonDuoc.length > 0 && soDaChon === dsChonDuoc.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = soDaChon > 0 && !tatCa;
  }, [soDaChon, tatCa]);
  if (!ctx) return null;
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Chọn tất cả trên trang"
      title="Chọn tất cả trên trang"
      className="size-4 align-middle"
      checked={tatCa}
      disabled={dsChonDuoc.length === 0}
      onChange={(e) => ctx.datNhieu(dsChonDuoc, e.target.checked)}
    />
  );
}

/** Ô chọn 1 dòng. */
export function OChon({ id, nhan }: { id: string; nhan?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  const khoa = ctx.khongChon.has(id);
  return (
    <input
      type="checkbox"
      aria-label={nhan ? `Chọn ${nhan}` : "Chọn dòng"}
      className="size-4 align-middle"
      checked={ctx.chon.has(id)}
      disabled={khoa}
      onChange={(e) => ctx.doi(id, e.target.checked)}
    />
  );
}
