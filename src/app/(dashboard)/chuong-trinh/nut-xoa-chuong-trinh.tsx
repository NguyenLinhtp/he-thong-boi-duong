"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { xoaChuongTrinhAction } from "./actions";

/** (bổ sung 07/10/2026 - CT-01) xóa chương trình tạo sai - máy chủ chặn nếu đã mở khóa từ chương trình. */
export function NutXoaChuongTrinh({
  chuongTrinh,
  veDanhSach = false,
}: {
  chuongTrinh: { id: string; maCT: string; ten: string; soQuyetDinh: string | null };
  veDanhSach?: boolean;
}) {
  const [dangXoa, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={dangXoa}
      title="Xóa chương trình (chỉ khi chưa mở khóa nào)"
      aria-label={`Xóa chương trình ${chuongTrinh.ten}`}
      className="inline-flex items-center gap-1 text-sm text-destructive hover:underline disabled:opacity-50"
      onClick={() => {
        const qd = chuongTrinh.soQuyetDinh ? `
Chương trình đã ban hành theo quyết định ${chuongTrinh.soQuyetDinh}.` : "";
        const hoi = `Xóa chương trình ${chuongTrinh.maCT} "${chuongTrinh.ten}"?${qd}

Học phần, học liệu khung, bài trắc nghiệm, yêu cầu sản phẩm và lịch sử phiên bản cũng bị xóa. Không hoàn tác được.`;
        if (!confirm(hoi)) return;
        startTransition(async () => {
          const loi = await xoaChuongTrinhAction(chuongTrinh.id, veDanhSach);
          if (loi) alert(loi);
        });
      }}
    >
      <Trash2 className="size-3.5" />
      {dangXoa ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
