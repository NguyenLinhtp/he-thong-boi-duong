"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NutXoa({
  ten,
  onXoa,
}: {
  ten: string;
  onXoa: () => Promise<void>;
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
          await onXoa();
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
