"use client";

import { useActionState } from "react";
import { thietLapLoaiVanBangAction } from "./loai-van-bang-actions";
import { Button } from "@/components/ui/button";

export function KhoiLoaiVanBang({ chuongTrinhId, loaiHienTai }: { chuongTrinhId: string; loaiHienTai: string }) {
  const [loi, action, dangLuu] = useActionState(thietLapLoaiVanBangAction, undefined);

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ued-blue-dam">Văn bằng cấp cho học viên hoàn thành</h2>
      <p className="text-sm text-muted-foreground">
        Chương trình cấp chứng chỉ hay giấy chứng nhận - quyết định tiêu đề khi in, dãy số hiệu và
        sổ cấp riêng cho từng loại. Không đổi được nữa khi đã có văn bằng được lập cho khóa của
        chương trình.
      </p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={chuongTrinhId} />
        <select name="loaiVanBang" defaultValue={loaiHienTai} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="CHUNG_CHI">Chứng chỉ</option>
          <option value="CHUNG_NHAN">Giấy chứng nhận</option>
        </select>
        <Button type="submit" disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Lưu loại văn bằng"}
        </Button>
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </form>
    </section>
  );
}
