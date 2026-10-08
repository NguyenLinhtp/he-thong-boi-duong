"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CHU_KY_MS = 10_000;
const TOI_DA_MS = 30 * 60_000;

/**
 * (bổ sung 08/10/2026 - HP-02) Đơn đang chờ lệ phí: tải lại dữ liệu trang định kỳ để thí sinh thấy
 * "đã xác nhận" ngay khi giao dịch chuyển khoản được đối soát tự động (dừng sau 30 phút hoặc khi
 * tab bị ẩn).
 */
export function TuCapNhatLePhi() {
  const router = useRouter();
  const [hetHan, setHetHan] = useState(false);
  useEffect(() => {
    const batDau = Date.now();
    const t = setInterval(() => {
      if (Date.now() - batDau > TOI_DA_MS) {
        clearInterval(t);
        setHetHan(true);
        return;
      }
      if (document.visibilityState === "visible") router.refresh();
    }, CHU_KY_MS);
    return () => clearInterval(t);
  }, [router]);
  return (
    <p className="text-xs text-muted-foreground print:hidden" aria-live="polite">
      {hetHan ? "Tải lại trang để xem trạng thái lệ phí mới nhất." : "Trang tự cập nhật khi nhà trường nhận được chuyển khoản."}
    </p>
  );
}
