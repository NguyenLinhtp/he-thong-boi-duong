"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type KetQuaTraCuuSinhVien =
  | { maSinhVien: string; hoTen: string; lopSinhHoat: string | null; soCCCD?: string; dienForm?: Record<string, string> }
  | { loi: string };

const Sao = () => (
  <span className="text-destructive" aria-hidden>
    *
  </span>
);

/**
 * (bổ sung 01/10/2026 - HV-05) Định danh bằng mã sinh viên: gõ mã -> hệ thống
 * tra danh sách sinh viên đã import, hiện họ tên + lớp để thí sinh kiểm tra
 * (sửa 05/10/2026) xác thực bằng trường "Số điện thoại" bắt buộc của form dự thi,
 * thay 4 số cuối CCCD. traCuu = undefined: chế độ xem trước.
 * (sửa 07/10/2026) họ tên, lớp, số CCCD/hộ chiếu (đầy đủ) và các cột bổ sung của danh sách (ngày sinh,
 * nơi sinh... - điền vào ô cùng tên của form) tự điền nhưng thí sinh sửa lại được - phần sửa họ tên/lớp/
 * CCCD được lưu kèm hồ sơ để cán bộ đối chiếu (HV-06).
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
  const goc = useRef<HTMLDivElement>(null);
  // điền các ô khác của form (ngày sinh, nơi sinh...) theo danh sách; ô cố định thì giữ nguyên
  useEffect(() => {
    const form = goc.current?.closest("form");
    if (!form || !sv?.dienForm) return;
    for (const [ten, giaTri] of Object.entries(sv.dienForm)) {
      const o = form.elements.namedItem(ten);
      if ((o instanceof HTMLInputElement && !o.readOnly) || (o instanceof HTMLSelectElement && !o.getAttribute("aria-readonly"))) o.value = giaTri;
    }
  }, [sv]);
  // key theo mã đã tra: tra mã khác thì điền lại giá trị mới của danh sách
  const khoaO = sv?.maSinhVien ?? "trong";

  return (
    <>
      <div ref={goc} className="flex flex-col gap-1.5 sm:col-span-2">
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
        <Input key={`ht-${khoaO}`} id="hoTenSv" name="hoTen" defaultValue={sv?.hoTen ?? ""} readOnly={!sv} maxLength={200} placeholder="Tự điền theo mã sinh viên" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lopSv">Lớp sinh hoạt</Label>
        <Input key={`lop-${khoaO}`} id="lopSv" name="lopSinhHoat" defaultValue={sv?.lopSinhHoat ?? ""} readOnly={!sv} maxLength={50} placeholder="Tự điền theo mã sinh viên" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="cccdSv">Số CCCD/hộ chiếu</Label>
        <Input
          key={`cccd-${khoaO}`}
          id="cccdSv"
          name="soCCCD"
          defaultValue={sv?.soCCCD ?? ""}
          readOnly={!sv}
          maxLength={30}
          autoComplete="off"
          className="max-w-xs"
          placeholder="Tự điền theo mã sinh viên"
        />
        {sv && (
          <p className="text-xs text-muted-foreground">
            Thông tin tự điền theo danh sách của nhà trường. Nếu sai, sửa lại trực tiếp trên form - thông tin sửa được nhà trường kiểm tra khi
            thẩm định hồ sơ.
          </p>
        )}
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
