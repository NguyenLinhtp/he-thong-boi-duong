"use client";

import { useActionState } from "react";
import { thietLapPhuongThucDangKyAction } from "./phuong-thuc-dang-ky-actions";
import { Button } from "@/components/ui/button";

const NHAN_PHUONG_THUC: Record<string, string> = {
  TRUC_TUYEN_NOP_GIAY: "PT1 · Đăng ký trực tuyến, in đơn nộp bản giấy",
  IMPORT_TU_XAC_NHAN: "PT2 · Import danh sách sẵn, học viên tự xác nhận",
  CHI_DU_THI: "PT3 · Chỉ đăng ký dự thi, không qua học",
  QUA_DON_VI_LIEN_KET: "PT4 · Qua đơn vị liên kết",
};

export function KhoiPhuongThucDangKy({
  chuongTrinhId,
  phuongThucHienTai,
}: {
  chuongTrinhId: string;
  phuongThucHienTai: string | null;
}) {
  const [loi, action, dangLuu] = useActionState(thietLapPhuongThucDangKyAction, undefined);

  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-base font-semibold">CT-07 · Phương thức tiếp cận đăng ký học viên</h2>
      <p className="text-sm text-muted-foreground">
        Mọi khóa mở từ chương trình này sẽ kế thừa phương thức đã chọn. Riêng Phương thức 4 (qua
        đơn vị liên kết): việc bắt buộc có hợp đồng liên kết còn hiệu lực được kiểm tra ở bước học
        viên đăng ký qua đơn vị liên kết sau này.
      </p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={chuongTrinhId} />
        <select
          name="phuongThucDangKy"
          defaultValue={phuongThucHienTai ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Chưa thiết lập
          </option>
          {Object.entries(NHAN_PHUONG_THUC).map(([ma, ten]) => (
            <option key={ma} value={ma}>
              {ten}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Lưu phương thức"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </form>
    </section>
  );
}
