"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { capNhatQuyenAction } from "./actions";
import type { VaiTro } from "@/generated/prisma/client";

export function OQuyen({
  vaiTro,
  maCN,
  coQuyen,
}: {
  vaiTro: VaiTro;
  maCN: string;
  coQuyen: boolean;
}) {
  return (
    <Checkbox
      defaultChecked={coQuyen}
      onCheckedChange={(checked) => capNhatQuyenAction(vaiTro, maCN, checked === true)}
    />
  );
}
