"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileCheck2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ô chọn tệp dễ thấy thay cho input file mặc định của trình duyệt ("Choose File
 * No file chosen" nhỏ, khó nhận ra): vùng viền nét đứt + nút "Chọn tệp", kéo-thả
 * tệp vào được, hiện tên và dung lượng tệp đã chọn. Vẫn là input file thật trong
 * form nên FormData/required/reset hoạt động như cũ.
 */
export function ChonTep({
  name,
  accept,
  required,
  goiY,
  nhan = "Chọn tệp",
  className,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  // dòng gợi ý định dạng/dung lượng dưới nút
  goiY?: string;
  nhan?: string;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tep, setTep] = useState<{ ten: string; kichThuoc: number } | null>(null);
  const [dangKeo, setDangKeo] = useState(false);

  // form.reset() (sau khi nộp thành công) xóa tệp nhưng không phát sự kiện change -> đồng bộ lại hiển thị
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const xoa = () => setTep(null);
    form.addEventListener("reset", xoa);
    return () => form.removeEventListener("reset", xoa);
  }, []);

  const capNhat = (input: HTMLInputElement) => {
    const f = input.files?.[0];
    setTep(f ? { ten: f.name, kichThuoc: f.size } : null);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDangKeo(true);
      }}
      onDragLeave={() => setDangKeo(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDangKeo(false);
        const input = inputRef.current;
        if (!input || e.dataTransfer.files.length === 0) return;
        input.files = e.dataTransfer.files;
        capNhat(input);
      }}
      className={cn(
        "relative flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors",
        dangKeo ? "border-primary bg-primary/5" : tep ? "border-success bg-success/5" : "border-primary/40 bg-muted/40",
        className,
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={(e) => capNhat(e.currentTarget)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border-2 border-primary bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
      >
        <Upload className="size-4" aria-hidden />
        {tep ? "Chọn tệp khác" : nhan}
      </label>
      {tep ? (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <FileCheck2 className="size-5 shrink-0 text-success" aria-hidden />
          <span className="truncate font-medium">{tep.ten}</span>
          <span className="shrink-0 text-muted-foreground">({(tep.kichThuoc / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} MB)</span>
          <button
            type="button"
            aria-label="Bỏ chọn tệp"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              setTep(null);
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          hoặc kéo-thả tệp vào đây{goiY && <span className="block text-xs">{goiY}</span>}
        </span>
      )}
    </div>
  );
}
