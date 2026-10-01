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
 * tra danh sách sinh viên đã import, hiện họ tên + lớp để thí sinh kiểm tra;
 * thí sinh nhập 4 số cuối CCCD để xác minh (máy chủ lấy họ tên/CCCD/lớp từ
 * danh sách, không tin dữ liệu hiển thị ở đây). traCuu = undefined: chế độ xem trước.
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cuoiCCCD">
          4 số cuối CCCD <Sao />
        </Label>
        <Input id="cuoiCCCD" name="cuoiCCCD" required inputMode="numeric" pattern="\d{4}" maxLength={4} className="w-32 font-mono" />
        <p className="text-xs text-muted-foreground">Để xác minh đúng là bạn đăng ký.</p>
      </div>
    </>
  );
}
