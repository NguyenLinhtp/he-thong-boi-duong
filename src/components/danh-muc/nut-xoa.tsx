"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NutXoa({
  ten,
  onXoa,
}: {
  ten: string;
  // trả về chuỗi = thông báo lỗi nghiệp vụ (vd. đang được tham chiếu)
  onXoa: () => Promise<string | undefined | void>;
}) {
  const [dangXoa, setDangXoa] = useState(false);

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={dangXoa}
      onClick={async () => {
        if (!confirm(`Xóa "${ten}"?`)) return;
        setDangXoa(true);
        try {
          const loi = await onXoa();
          if (loi) alert(loi);
        } catch (error) {
          alert(error instanceof Error ? error.message : "Có lỗi xảy ra");
        } finally {
          setDangXoa(false);
        }
      }}
    >
      Xóa
    </Button>
  );
}
