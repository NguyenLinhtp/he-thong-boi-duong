"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { datDieuKienDatChuongTrinhAction, type KetQuaDieuKienDat } from "./dieu-kien-dat-actions";

// (bổ sung 13/10/2026) điều kiện đạt của chương trình (điểm tổng kết/điểm thi tối thiểu)
export function KhoiDieuKienDat({
  chuongTrinhId,
  diemDat,
  diemDatChung,
  laDuThi,
  chuyenCan,
  chuyenCanChung,
}: {
  chuongTrinhId: string;
  diemDat: number | null;
  diemDatChung: number;
  laDuThi: boolean;
  chuyenCan: number | null;
  chuyenCanChung: number;
}) {
  const [kq, action, dangLuu] = useActionState<KetQuaDieuKienDat, FormData>(datDieuKienDatChuongTrinhAction.bind(null, chuongTrinhId), undefined);
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">Điều kiện đạt</h2>
      <p className="text-sm text-muted-foreground">
        {laDuThi
          ? "Thí sinh đạt khi điểm thi không thấp hơn điểm đạt."
          : "Học viên hoàn thành khi điểm cuối khóa (trung bình có hệ số các bài tính điểm trong học liệu, hoặc điểm tổng kết học phần nếu chưa cấu hình bài tính điểm) không thấp hơn điểm đạt, đạt mọi bài bắt buộc đạt và đủ chuyên cần."}{" "}
        Mọi khóa của chương trình dùng điều kiện này, từng khóa sửa riêng được ở tab Kết quả. Để trống = theo tham số chung của hệ thống (điểm đạt{" "}
        {diemDatChung}
        {!laDuThi && `, chuyên cần ${chuyenCanChung}%`}).
      </p>
      <form key={`${diemDat}-${chuyenCan}`} action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          Điểm đạt (0-10)
          <Input name="diemDat" inputMode="decimal" defaultValue={diemDat ?? ""} placeholder={String(diemDatChung)} className="w-28" />
        </label>
        {!laDuThi && (
          <label className="flex flex-col gap-1.5 text-sm">
            Chuyên cần tối thiểu (%)
            <Input name="chuyenCan" inputMode="decimal" defaultValue={chuyenCan ?? ""} placeholder={String(chuyenCanChung)} className="w-28" />
          </label>
        )}
        <Button type="submit" disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Lưu điều kiện đạt"}
        </Button>
        {kq?.loi && <p className="text-sm text-destructive">{kq.loi}</p>}
        {kq?.ok && <p className="text-sm text-success">{kq.ok}</p>}
      </form>
    </section>
  );
}
