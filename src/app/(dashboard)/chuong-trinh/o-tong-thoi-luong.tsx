import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DON_VI_THOI_LUONG, DS_DON_VI_THOI_LUONG } from "@/lib/don-vi-thoi-luong";
import type { DonViThoiLuong } from "@/generated/prisma/client";

// (bổ sung 19/10/2026 - CT-01) tổng thời lượng kèm đơn vị tính: tiết / tín chỉ / buổi
export function OTongThoiLuong({
  tongThoiLuong,
  donViThoiLuong = "TIET",
}: {
  tongThoiLuong?: number | null;
  donViThoiLuong?: DonViThoiLuong;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="tongThoiLuong">Tổng thời lượng</Label>
      <div className="flex gap-1">
        <Input
          id="tongThoiLuong"
          name="tongThoiLuong"
          type="number"
          min={0}
          defaultValue={tongThoiLuong ?? undefined}
          className="w-24"
        />
        <select
          name="donViThoiLuong"
          aria-label="Đơn vị thời lượng"
          defaultValue={donViThoiLuong}
          className="h-8 rounded-lg border px-2 text-sm"
        >
          {DS_DON_VI_THOI_LUONG.map((dv) => (
            <option key={dv} value={dv}>
              {DON_VI_THOI_LUONG[dv]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
