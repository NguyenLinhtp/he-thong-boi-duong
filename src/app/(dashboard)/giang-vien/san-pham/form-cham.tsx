"use client";

import { useActionState } from "react";
import { chamSanPhamAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormCham({
  baiNopId,
  diem,
  nhanXet,
  khoa,
  thangDiem = 10,
}: {
  baiNopId: string;
  diem: number | null;
  nhanXet: string | null;
  // (bổ sung 25/10/2026) thang điểm cấu hình của yêu cầu sản phẩm ở chương trình
  thangDiem?: number;
  // kết quả khóa đã phê duyệt (KQ-04) - không chấm/sửa
  khoa: boolean;
}) {
  const [kq, action, dangLuu] = useActionState(chamSanPhamAction, undefined);
  if (khoa) return <span className="text-xs text-muted-foreground">Kết quả khóa đã phê duyệt</span>;
  // key theo giá trị đang lưu: React 19 tự reset form sau action về giá trị lúc mount
  return (
    <form key={`${diem}|${nhanXet}`} action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="baiNopId" value={baiNopId} />
      <Input
        name="diem"
        type="number"
        min={0}
        max={thangDiem}
        step={0.01}
        defaultValue={diem ?? ""}
        placeholder={`0-${thangDiem}`}
        aria-label={`Điểm (thang ${thangDiem})`}
        title={`Nhập điểm thang ${thangDiem} (0-${thangDiem})`}
        className="w-24"
        required
      />
      <span className="self-center text-xs text-muted-foreground">/ {thangDiem}</span>
      <Input name="nhanXet" defaultValue={nhanXet ?? ""} placeholder="Nhận xét (không bắt buộc)" aria-label="Nhận xét" className="w-56" />
      <Button type="submit" size="sm" disabled={dangLuu}>
        {dangLuu ? "Đang lưu..." : diem == null ? "Chấm" : "Sửa điểm"}
      </Button>
      {kq?.loi && <p className="w-full text-xs text-destructive">{kq.loi}</p>}
      {kq?.ok && <p className="w-full text-xs text-success">Đã lưu điểm.</p>}
    </form>
  );
}
