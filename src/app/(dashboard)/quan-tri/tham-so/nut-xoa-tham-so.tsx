"use client";

import { useTransition } from "react";
import { xoaThamSoAction } from "./actions";
import { Button } from "@/components/ui/button";

export function NutXoaThamSo({ ma }: { ma: string }) {
  const [dangXoa, batDau] = useTransition();

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={dangXoa}
      onClick={() => {
        if (!confirm(`Xóa tham số "${ma}"?`)) return;
        batDau(() => xoaThamSoAction(ma));
      }}
    >
      {dangXoa ? "Đang xóa..." : "Xóa"}
    </Button>
  );
}
