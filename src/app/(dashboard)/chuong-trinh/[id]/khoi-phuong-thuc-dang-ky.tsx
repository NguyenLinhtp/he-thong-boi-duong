"use client";

import { useActionState, useState } from "react";
import { thietLapPhuongThucDangKyAction } from "./phuong-thuc-dang-ky-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MA_NGAN_PHUONG_THUC, TEN_PHUONG_THUC, type MaPhuongThuc } from "@/lib/phuong-thuc";

const THU_TU: MaPhuongThuc[] = ["TRUC_TUYEN_NOP_GIAY", "IMPORT_TU_XAC_NHAN", "QUA_DON_VI_LIEN_KET", "CHI_DU_THI"];

/**
 * (sửa 08/10/2026 - CT-07) chọn nhiều phương thức đào tạo (PT1, PT2, PT4) hoặc riêng PT3; mọi khóa
 * của chương trình dùng theo lựa chọn này, kể cả khóa đang hoạt động (bắt buộc lý do).
 */
export function KhoiPhuongThucDangKy({
  chuongTrinhId,
  phuongThucHienTai,
  coKhoaHoatDong,
  khoaLoaiDuThi,
}: {
  chuongTrinhId: string;
  phuongThucHienTai: string[];
  coKhoaHoatDong: boolean;
  /** đã có khóa: không đổi qua lại dự thi <-> đào tạo ("DU_THI" | "DAO_TAO" | null = chưa có khóa) */
  khoaLoaiDuThi: "DU_THI" | "DAO_TAO" | null;
}) {
  const [loi, action, dangLuu] = useActionState(thietLapPhuongThucDangKyAction, undefined);
  const [chon, setChon] = useState<string[]>(phuongThucHienTai);
  const duThi = chon.includes("CHI_DU_THI");
  const doi = chon.length !== phuongThucHienTai.length || chon.some((m) => !phuongThucHienTai.includes(m));

  const bat = (ma: MaPhuongThuc, co: boolean) =>
    setChon((ds) => {
      if (!co) return ds.filter((m) => m !== ma);
      // PT3 đứng riêng: chọn PT3 thì bỏ các phương thức đào tạo và ngược lại
      if (ma === "CHI_DU_THI") return ["CHI_DU_THI"];
      return [...ds.filter((m) => m !== "CHI_DU_THI"), ma];
    });

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">CT-07 · Phương thức tiếp cận đăng ký học viên</h2>
      <p className="text-sm text-muted-foreground">
        Chọn một hoặc nhiều phương thức đào tạo bồi dưỡng (PT1, PT2, PT4), hoặc riêng PT3 cho chương trình chỉ tổ chức thi. Mọi khóa của
        chương trình dùng theo lựa chọn này - sửa ở đây thì các khóa cập nhật theo. Bỏ một phương thức: hồ sơ đã đăng ký theo phương thức
        đó vẫn xử lý bình thường, chỉ ngừng nhận đăng ký mới.
      </p>
      {/* key theo giá trị đang lưu: React 19 tự reset form sau action về giá trị lúc mount */}
      <form key={phuongThucHienTai.join(",")} action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={chuongTrinhId} />
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Phương thức đăng ký</legend>
          {THU_TU.map((ma) => {
            const khoa =
              (khoaLoaiDuThi === "DU_THI" && ma !== "CHI_DU_THI") || (khoaLoaiDuThi === "DAO_TAO" && ma === "CHI_DU_THI");
            return (
              <label
                key={ma}
                className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${chon.includes(ma) ? "border-primary bg-primary/5" : ""} ${khoa ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  name="phuongThucDangKys"
                  value={ma}
                  checked={chon.includes(ma)}
                  disabled={khoa}
                  onChange={(e) => bat(ma, e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <b>{MA_NGAN_PHUONG_THUC[ma]}</b> · {TEN_PHUONG_THUC[ma]}
                  {ma === "CHI_DU_THI" && <span className="block text-xs text-muted-foreground">Đứng riêng, không chọn chung với PT1, PT2, PT4</span>}
                  {khoa && <span className="block text-xs text-muted-foreground">Chương trình đã có khóa - không đổi giữa dự thi và đào tạo</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
        {coKhoaHoatDong && doi && (
          <label className="flex flex-col gap-1 text-sm">
            <span>
              Lý do thay đổi <span className="text-destructive">*</span>
              <span className="text-muted-foreground"> - chương trình đang có khóa hoạt động, các khóa sẽ dùng phương thức mới ngay</span>
            </span>
            <Input name="lyDo" required className="max-w-xl" />
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={dangLuu || chon.length === 0 || !doi}>
            {dangLuu ? "Đang lưu..." : "Lưu phương thức"}
          </Button>
          {chon.length === 0 && <span className="text-sm text-muted-foreground">Chọn ít nhất 1 phương thức</span>}
          {duThi && chon.length === 1 && doi && <span className="text-sm text-muted-foreground">Chương trình chỉ tổ chức thi, không có giảng dạy</span>}
          {loi && <p className="text-sm text-destructive">{loi}</p>}
        </div>
      </form>
    </section>
  );
}
