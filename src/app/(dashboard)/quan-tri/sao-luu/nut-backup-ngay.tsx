"use client";

import { useTransition } from "react";
import { chayBackupNgayAction } from "./actions";
import { Button } from "@/components/ui/button";

export function NutBackupNgay() {
  const [dangChay, batDau] = useTransition();

  return (
    <Button
      size="sm"
      disabled={dangChay}
      onClick={() => batDau(() => chayBackupNgayAction())}
    >
      {dangChay ? "Đang sao lưu..." : "Sao lưu ngay"}
    </Button>
  );
}
