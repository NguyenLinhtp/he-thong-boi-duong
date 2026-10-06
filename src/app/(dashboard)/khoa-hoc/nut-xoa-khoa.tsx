"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { xoaKhoaAction } from "./actions";

/** (bổ sung 06/10/2026 - KH-01) xóa khóa tạo sai - máy chủ chặn nếu khóa đã có hồ sơ đăng ký/dữ liệu nghiệp vụ. */
export function NutXoaKhoa({ khoaId, ten }: { khoaId: string; ten: string }) {
  const [dangXoa, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={dangXoa}
      title="Xóa khóa (chỉ khi chưa có học viên đăng ký)"
      aria-label={`Xóa khóa ${ten}`}
      className="inline-flex items-center gap-1 text-sm text-destructive hover:underline disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Xóa khóa "${ten}"?\n\nKhóa chưa có học viên đăng ký. Buổi học, phân công giảng viên, lớp và cấu hình lệ phí của khóa cũng bị xóa. Không hoàn tác được.`)) return;
        startTransition(async () => {
          const loi = await xoaKhoaAction(khoaId);
          if (loi) alert(loi);
        });
      }}
    >
      <Trash2 className="size-3.5" />
      {dangXoa ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
