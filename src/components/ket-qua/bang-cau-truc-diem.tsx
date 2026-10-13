"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// (bổ sung 13/10/2026 - KQ-06) cấu hình điểm thành phần + điều kiện đạt của chương trình/khóa chỉ thi

export type ThanhPhanSua = { ma?: string; ten: string; diemToiDa: string; heSo: string; diemDat: string };
export type CauHinhHienThi = { thanhPhans: { ma: string; ten: string; heSo: number; diemToiDa: number; diemDat: number | null }[]; diemDatTong: number | null };
type KetQua = { loi?: string; ok?: string } | undefined;

const soHoacTrong = (s: string) => {
  const t = s.trim().replace(",", ".");
  return t === "" ? null : Number(t);
};

function moTa(ds: ThanhPhanSua[], diemDatTong: string) {
  const hopLe = ds.filter((d) => d.ten.trim());
  if (hopLe.length === 0) return "Không nhập điểm, không xét kết quả (chỉ lấy danh sách chính thức).";
  const congThuc = hopLe.map((d) => (soHoacTrong(d.heSo) ?? 1) === 1 ? d.ten.trim() : `${d.ten.trim()} × ${soHoacTrong(d.heSo)}`).join(" + ");
  const dk = [
    ...hopLe.filter((d) => soHoacTrong(d.diemDat) !== null).map((d) => `${d.ten.trim()} ≥ ${soHoacTrong(d.diemDat)}/${soHoacTrong(d.diemToiDa) ?? 10}`),
    ...(soHoacTrong(diemDatTong) !== null ? [`điểm tổng ≥ ${soHoacTrong(diemDatTong)}`] : []),
  ];
  return `Điểm tổng = ${congThuc}. ${dk.length > 0 ? `Đạt khi ${dk.join(" và ")}.` : "Không xét Đạt/Không đạt (chỉ ghi điểm)."}`;
}

export function BangCauTrucDiem({
  giaTri,
  luu,
  nhanBo,
  moTaBo,
  duocSua,
}: {
  giaTri: CauHinhHienThi | null;
  /** lưu cấu hình (JSON) hoặc null = bỏ cấu hình riêng */
  luu: (json: string | null) => Promise<KetQua>;
  /** không truyền = không có nút bỏ cấu hình */
  nhanBo?: string;
  moTaBo?: string;
  duocSua: boolean;
}) {
  const banDau = (giaTri?.thanhPhans ?? []).map((tp) => ({
    ma: tp.ma,
    ten: tp.ten,
    diemToiDa: String(tp.diemToiDa),
    heSo: String(tp.heSo),
    diemDat: tp.diemDat === null ? "" : String(tp.diemDat),
  }));
  const [ds, setDs] = useState<ThanhPhanSua[]>(giaTri ? banDau : [{ ten: "Điểm thi", diemToiDa: "10", heSo: "1", diemDat: "" }]);
  const [diemDatTong, setDiemDatTong] = useState(giaTri?.diemDatTong == null ? "" : String(giaTri.diemDatTong));
  const [kq, setKq] = useState<KetQua>();
  const [dangLuu, batDau] = useTransition();
  const sua = (i: number, truong: keyof ThanhPhanSua, v: string) => setDs((cu) => cu.map((d, j) => (j === i ? { ...d, [truong]: v } : d)));

  const guiLuu = () =>
    batDau(async () =>
      setKq(
        await luu(
          JSON.stringify({
            thanhPhans: ds.map((d) => ({ ma: d.ma, ten: d.ten, diemToiDa: d.diemToiDa, heSo: d.heSo, diemDat: d.diemDat })),
            diemDatTong,
          }),
        ),
      ),
    );

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Điểm thành phần</th>
              <th className="py-1.5 pr-2 font-medium">Thang điểm</th>
              <th className="py-1.5 pr-2 font-medium">Hệ số</th>
              <th className="py-1.5 pr-2 font-medium">Điểm đạt (không bắt buộc)</th>
              {duocSua && <th />}
            </tr>
          </thead>
          <tbody>
            {ds.map((d, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1.5 pr-2">
                  <Input value={d.ten} disabled={!duocSua} onChange={(e) => sua(i, "ten", e.target.value)} placeholder="vd. Lý thuyết" className="min-w-40" />
                </td>
                <td className="py-1.5 pr-2">
                  <Input value={d.diemToiDa} disabled={!duocSua} inputMode="decimal" onChange={(e) => sua(i, "diemToiDa", e.target.value)} className="w-20" />
                </td>
                <td className="py-1.5 pr-2">
                  <Input value={d.heSo} disabled={!duocSua} inputMode="decimal" onChange={(e) => sua(i, "heSo", e.target.value)} className="w-20" />
                </td>
                <td className="py-1.5 pr-2">
                  <Input value={d.diemDat} disabled={!duocSua} inputMode="decimal" onChange={(e) => sua(i, "diemDat", e.target.value)} placeholder="—" className="w-24" />
                </td>
                {duocSua && (
                  <td className="py-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDs((cu) => cu.filter((_, j) => j !== i))} aria-label={`Xóa ${d.ten}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {ds.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-muted-foreground">
                  Không có điểm thành phần - khóa chỉ lấy danh sách chính thức, không nhập điểm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {duocSua && (
          <Button type="button" variant="outline" size="sm" onClick={() => setDs((cu) => [...cu, { ten: "", diemToiDa: "10", heSo: "1", diemDat: "" }])}>
            <Plus className="size-4" /> Thêm điểm thành phần
          </Button>
        )}
        <label className="flex items-center gap-2">
          Điểm đạt tổng (không bắt buộc)
          <Input value={diemDatTong} disabled={!duocSua} inputMode="decimal" onChange={(e) => setDiemDatTong(e.target.value)} placeholder="—" className="w-24" />
        </label>
      </div>
      <p className="rounded-md bg-muted/60 px-3 py-2">{moTa(ds, diemDatTong)}</p>
      {duocSua && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" disabled={dangLuu} onClick={guiLuu}>
            {dangLuu ? "Đang lưu..." : "Lưu cấu trúc điểm"}
          </Button>
          {giaTri && nhanBo && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={dangLuu}
              onClick={() => {
                if (confirm(moTaBo ?? nhanBo)) batDau(async () => setKq(await luu(null)));
              }}
            >
              {nhanBo}
            </Button>
          )}
          {kq?.loi && <span className="text-destructive">{kq.loi}</span>}
          {kq?.ok && <span className="text-success">{kq.ok}</span>}
        </div>
      )}
    </div>
  );
}
