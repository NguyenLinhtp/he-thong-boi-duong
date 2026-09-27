"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * BC-01: tải lại số liệu server định kỳ (mặc định 60 giây) - đảm bảo "dữ liệu
 * cập nhật không trễ quá 5 phút"; tạm dừng khi tab bị ẩn, làm mới ngay khi
 * người dùng quay lại tab.
 */
export function TuLamMoi({ giay = 60, capNhatLuc }: { giay?: number; capNhatLuc: string }) {
  const router = useRouter();
  const [dangMo, setDangMo] = useState(true);
  useEffect(() => {
    const hen = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, giay * 1000);
    const khiQuayLai = () => {
      if (document.visibilityState === "visible") router.refresh();
      setDangMo(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", khiQuayLai);
    return () => {
      clearInterval(hen);
      document.removeEventListener("visibilitychange", khiQuayLai);
    };
  }, [giay, router]);
  return (
    <span className="text-xs text-muted-foreground">
      Cập nhật lúc {new Date(capNhatLuc).toLocaleTimeString("vi-VN")} · {dangMo ? `tự làm mới mỗi ${giay} giây` : "tạm dừng"}
      <button type="button" onClick={() => router.refresh()} className="ml-2 underline">
        Làm mới
      </button>
    </span>
  );
}
