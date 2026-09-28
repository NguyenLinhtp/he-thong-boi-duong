"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tiêu đề trang + nút hành động chính "Thêm mới" ở góc phải (đặc tả 3.5); biểu
 * mẫu tạo mới chỉ mở ra khi bấm để danh sách là nội dung chính của trang.
 */
export function DauTrangThemMoi({
  tieuDe,
  nhanNut,
  moSan = false,
  children,
}: {
  tieuDe: React.ReactNode;
  nhanNut: string;
  moSan?: boolean;
  children: React.ReactNode;
}) {
  const [mo, setMo] = useState(moSan);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tieuDe}
        <Button
          type="button"
          size="lg"
          variant={mo ? "outline" : "default"}
          aria-expanded={mo}
          onClick={() => setMo((v) => !v)}
        >
          {mo ? <X /> : <Plus />}
          {mo ? "Đóng" : nhanNut}
        </Button>
      </div>
      {mo && children}
    </div>
  );
}
