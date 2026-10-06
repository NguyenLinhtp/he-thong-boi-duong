"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type KetQuaTraCuuSinhVien = { maSinhVien: string; hoTen: string; lopSinhHoat: string | null } | { loi: string };

const Sao = () => (
  <span className="text-destructive" aria-hidden>
    *
  </span>
);

/**
 * (bổ sung 01/10/2026 - HV-05) Định danh bằng mã sinh viên: gõ mã -> hệ thống
 * tra danh sách sinh viên đã import, hiện họ tên + lớp để thí sinh kiểm tra
 * (máy chủ lấy họ tên/CCCD/lớp từ danh sách, không tin dữ liệu hiển thị ở đây);
 * (sửa 05/10/2026) xác thực bằng trường "Số điện thoại" bắt buộc của form dự thi,
 * thay 4 số cuối CCCD. traCuu = undefined: chế độ xem trước.
 */
export function TruongMaSinhVien({ traCuu }: { traCuu?: (ma: string) => Promise<KetQuaTraCuuSinhVien> }) {
  const [kq, setKq] = useState<KetQuaTraCuuSinhVien | null>(null);
  const [daTra, setDaTra] = useState("");
  const [dangTra, batDau] = useTransition();

  const tra = (ma: string) => {
    const m = ma.trim();
    if (!traCuu || !m || m === daTra) return;
    setDaTra(m);
    batDau(async () => setKq(await traCuu(m)));
  };
  const sv = kq && !("loi" in kq) ? kq : null;

  return (
    <>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="maSinhVien">
          Mã sinh viên <Sao />
        </Label>
        <div className="flex gap-2">
          <Input
            id="maSinhVien"
            name="maSinhVien"
            required
            autoComplete="off"
            className="max-w-xs font-mono uppercase"
            onBlur={(e) => tra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tra(e.currentTarget.value);
              }
            }}
            onChange={() => {
              setKq(null);
              setDaTra("");
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={dangTra}
            onClick={(e) => tra((e.currentTarget.form?.elements.namedItem("maSinhVien") as HTMLInputElement | null)?.value ?? "")}
          >
            <Search /> {dangTra ? "Đang tra..." : "Tra cứu"}
          </Button>
        </div>
        {kq && "loi" in kq && <p className="text-sm text-destructive">{kq.loi}</p>}
        <p className="text-xs text-muted-foreground">Nhập mã sinh viên, hệ thống tự hiển thị họ tên và lớp theo danh sách của nhà trường.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hoTenSv">Họ tên</Label>
        <Input id="hoTenSv" readOnly tabIndex={-1} value={sv?.hoTen ?? ""} placeholder="Tự điền theo mã sinh viên" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lopSv">Lớp sinh hoạt</Label>
        <Input id="lopSv" readOnly tabIndex={-1} value={sv ? (sv.lopSinhHoat ?? "—") : ""} placeholder="Tự điền theo mã sinh viên" />
      </div>
    </>
  );
}

export type DoiTuongDuThi = "SINH_VIEN" | "TU_DO";

/**
 * (bổ sung 01/10/2026) 2 nút chọn đầu form dự thi định danh bằng mã sinh viên:
 * sinh viên của trường (mã SV bắt buộc) hoặc thí sinh tự do (họ tên + CCCD, không cần mã SV).
 */
export function ChonDoiTuongDuThi({
  giaTri,
  onChon,
  className,
  lePhi,
}: {
  giaTri: DoiTuongDuThi;
  onChon?: (d: DoiTuongDuThi) => void;
  className?: string;
  // (bổ sung 01/10/2026) lệ phí theo đối tượng (đã định dạng), hiện trên nút
  lePhi?: { sinhVien: string; tuDo: string } | null;
}) {
  const nut = (d: DoiTuongDuThi, nhan: string, moTa: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={giaTri === d}
      onClick={() => onChon?.(d)}
      className={
        "flex flex-1 flex-col items-start rounded-lg border-2 px-4 py-3 text-left transition " +
        (giaTri === d ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40")
      }
    >
      <span className="flex items-center gap-2 font-semibold">
        <span className={"size-3.5 rounded-full border-2 " + (giaTri === d ? "border-primary bg-primary" : "border-muted-foreground")} />
        {nhan}
      </span>
      <span className="mt-0.5 pl-5.5 text-xs text-muted-foreground">{moTa}</span>
      {lePhi && (
        <span className="mt-1 pl-5.5 text-sm font-semibold text-ued-blue-dam">Lệ phí: {d === "SINH_VIEN" ? lePhi.sinhVien : lePhi.tuDo}</span>
      )}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Đối tượng dự thi" className={"flex flex-col gap-2 sm:flex-row " + (className ?? "")}>
      {nut("SINH_VIEN", "Sinh viên Trường ĐHSP - ĐHĐN", "Nhập mã sinh viên, hệ thống tự điền họ tên, lớp")}
      {nut("TU_DO", "Thí sinh tự do", "Không phải sinh viên của trường - nhập đầy đủ thông tin, số CCCD")}
    </div>
  );
}
