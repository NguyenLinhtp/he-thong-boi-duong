"use client";

import { Button } from "@/components/ui/button";

export function NutIn() {
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      In / Lưu PDF
    </Button>
  );
}
