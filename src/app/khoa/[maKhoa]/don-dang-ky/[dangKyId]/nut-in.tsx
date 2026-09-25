"use client";

import { Button } from "@/components/ui/button";

export function NutIn() {
  return (
    <Button type="button" onClick={() => window.print()} className="mt-3">
      In đơn đăng ký (PDF)
    </Button>
  );
}
