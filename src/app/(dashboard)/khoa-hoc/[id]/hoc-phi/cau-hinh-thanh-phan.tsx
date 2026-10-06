"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { luuThanhPhanLePhiAction } from "./actions";

export type ThanhPhanSua = { id: string | null; ten: string; batBuoc: boolean; mucSinhVien: string; mucTuDo: string };

/**
 * (bổ sung 06/10/2026 - HP-01) Cấu hình thành phần lệ phí của khóa dự thi, vd.
 * "Đăng ký thi" (bắt buộc) + "Đăng ký ôn thi" (tùy chọn). Thí sinh luôn có phần bắt
 * buộc, tick thêm phần tùy chọn trên form đăng ký - tổng tiền cộng theo mục đã chọn.
 */
export function CauHinhThanhPhanLePhi({
  khoaId,
  dsBanDau,
  theoDoiTuong,
  daCoDangKy,
}: {
  khoaId: string;
  dsBanDau: ThanhPhanSua[];
  theoDoiTuong: boolean;
  daCoDangKy: boolean;
}) {
  const [ds, setDs] = useState<ThanhPhanSua[]>(dsBanDau);
  const [lyDo, setLyDo] = useState("");
  const [kq, setKq] = useState<{ ok?: string; loi?: string }>({});
  const [dangLuu, batDau] = useTransition();
  const daSua = JSON.stringify(ds) !== JSON.stringify(dsBanDau);

  const sua = (i: number, gt: Partial<ThanhPhanSua>) => {
    setDs((cu) => cu.map((t, j) => (j === i ? { ...t, ...gt } : t)));
    setKq({});
  };
  const doiCho = (i: number, j: number) =>
    setDs((cu) => {
      if (j < 0 || j >= cu.length) return cu;
      const moi = [...cu];
      [moi[i], moi[j]] = [moi[j], moi[i]];
      return moi;
    });
  const tong = (truong: "mucSinhVien" | "mucTuDo") =>
    ds.filter((t) => t.batBuoc).reduce((s, t) => s + (Number(t[truong] || (truong === "mucTuDo" ? t.mucSinhVien : 0)) || 0), 0);
  const tien = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

  const luu = () =>
    batDau(async () => {
      const kqLuu = await luuThanhPhanLePhiAction(
        khoaId,
        ds.map((t) => ({
          id: t.id,
          ten: t.ten,
          batBuoc: t.batBuoc,
          mucSinhVien: t.mucSinhVien === "" ? NaN : Number(t.mucSinhVien),
          mucTuDo: theoDoiTuong && t.mucTuDo !== "" ? Number(t.mucTuDo) : null,
        })),
        lyDo,
      );
      setKq(kqLuu);
      if (kqLuu.ok) setLyDo("");
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">
        Thí sinh luôn đăng ký các thành phần <b className="text-foreground">bắt buộc</b>, tick thêm thành phần{" "}
        <b className="text-foreground">tùy chọn</b> trên form - lệ phí = tổng các mục đã chọn
        {theoDoiTuong && " theo đối tượng (sinh viên ĐHSP-ĐHĐN / thí sinh tự do; mức tự do để trống = như sinh viên)"}. Cán bộ tài chính xác
        nhận lệ phí theo từng thành phần; danh sách chính thức dự thi theo các thành phần bắt buộc.
        {daCoDangKy && " Khóa đã có đăng ký: chỉ thêm được thành phần tùy chọn, không đổi bắt buộc/tùy chọn, không xóa thành phần đã có thí sinh chọn."}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Tên thành phần</th>
              <th className="px-2 py-2 font-medium">Loại</th>
              <th className="px-2 py-2 font-medium">{theoDoiTuong ? "Mức sinh viên (đ)" : "Mức (đ)"}</th>
              {theoDoiTuong && <th className="px-2 py-2 font-medium">Mức thí sinh tự do (đ)</th>}
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {ds.map((t, i) => (
              <tr key={t.id ?? `moi-${i}`} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  <Input value={t.ten} onChange={(e) => sua(i, { ten: e.target.value })} placeholder="vd. Đăng ký ôn thi" aria-label="Tên thành phần" className="h-8" />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={t.batBuoc ? "1" : "0"}
                    onChange={(e) => sua(i, { batBuoc: e.target.value === "1" })}
                    disabled={daCoDangKy && t.id !== null}
                    aria-label="Bắt buộc hay tùy chọn"
                    className="h-8 rounded-lg border bg-background px-2 text-sm disabled:opacity-60"
                  >
                    <option value="1">Bắt buộc</option>
                    <option value="0">Tùy chọn</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  <Input type="number" min={0} step={1000} value={t.mucSinhVien} onChange={(e) => sua(i, { mucSinhVien: e.target.value })} aria-label="Mức sinh viên" className="h-8 w-36" />
                </td>
                {theoDoiTuong && (
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={t.mucTuDo}
                      placeholder="Như sinh viên"
                      onChange={(e) => sua(i, { mucTuDo: e.target.value })}
                      aria-label="Mức thí sinh tự do"
                      className="h-8 w-36"
                    />
                  </td>
                )}
                <td className="py-2 pl-2">
                  <div className="flex justify-end gap-0.5">
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Lên" onClick={() => doiCho(i, i - 1)} disabled={i === 0}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Xuống" onClick={() => doiCho(i, i + 1)} disabled={i === ds.length - 1}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa thành phần" className="text-destructive" onClick={() => setDs((cu) => cu.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {ds.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-muted-foreground">
                  Chưa chia thành phần - khóa thu 1 mức lệ phí chung.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDs((cu) => [...cu, { id: null, ten: "", batBuoc: cu.length === 0, mucSinhVien: "", mucTuDo: "" }])}
        >
          <Plus /> Thêm thành phần
        </Button>
        {ds.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Lệ phí tối thiểu (phần bắt buộc): <b className="text-foreground">{tien(tong("mucSinhVien"))}</b>
            {theoDoiTuong && (
              <>
                {" "}
                · tự do <b className="text-foreground">{tien(tong("mucTuDo"))}</b>
              </>
            )}
          </span>
        )}
      </div>

      {daCoDangKy && daSua && (
        <Input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do điều chỉnh (bắt buộc khi đổi tên/mức - khóa đã có đăng ký)" className="max-w-xl" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={luu} disabled={dangLuu || !daSua}>
          {dangLuu ? "Đang lưu..." : "Lưu thành phần lệ phí"}
        </Button>
        {daSua && !kq.loi && <span className="text-sm text-warning">Có thay đổi chưa lưu</span>}
        {kq.ok && <span className="text-sm text-success">{kq.ok}</span>}
        {kq.loi && <span className="text-sm text-destructive">{kq.loi}</span>}
      </div>
    </div>
  );
}
