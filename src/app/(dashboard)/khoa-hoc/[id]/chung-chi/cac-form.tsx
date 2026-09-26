"use client";

import { useActionState, useState } from "react";
import {
  lapDeNghiAction,
  sinhSoHieuAction,
  huyChungChiAction,
  kyDuyetAction,
  type KetQuaThaoTacCC,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ThongDiep({ ketQua }: { ketQua: KetQuaThaoTacCC }) {
  return (
    <>
      {ketQua?.thongBao && <p className="text-sm text-muted-foreground">{ketQua.thongBao}</p>}
      {ketQua?.loi && <p className="text-sm text-destructive">{ketQua.loi}</p>}
    </>
  );
}

export function NutLapDeNghi({ khoaId, soDuDieuKien }: { khoaId: string; soDuDieuKien: number }) {
  const [ketQua, formAction, dangXuLy] = useActionState(lapDeNghiAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" disabled={dangXuLy || soDuDieuKien === 0} className="self-start">
        {dangXuLy ? "Đang lập..." : `Lập đề nghị cấp chứng chỉ cho ${soDuDieuKien} học viên`}
      </Button>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

export function NutSinhSoHieu({ khoaId, soDeNghi }: { khoaId: string; soDeNghi: number }) {
  const [ketQua, formAction, dangXuLy] = useActionState(sinhSoHieuAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" disabled={dangXuLy || soDeNghi === 0} className="self-start">
        {dangXuLy ? "Đang cấp số..." : `Sinh số hiệu cho ${soDeNghi} chứng chỉ đề nghị`}
      </Button>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

/** Hủy chứng chỉ chưa cấp - bắt buộc lý do; số hiệu (nếu có) không được cấp lại. */
export function NutHuyChungChi({ khoaId, chungChiId, soHieu }: { khoaId: string; chungChiId: string; soHieu: string | null }) {
  const [mo, setMo] = useState(false);
  const [ketQua, formAction, dangXuLy] = useActionState(huyChungChiAction, undefined);
  if (!mo) {
    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMo(true)}>
        Hủy
      </Button>
    );
  }
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-1.5"
      onSubmit={(e) => {
        if (!confirm(`Hủy chứng chỉ ${soHieu ?? ""}? Số hiệu đã hủy sẽ không được cấp lại.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="chungChiId" value={chungChiId} />
      <Input name="lyDo" placeholder="Lý do hủy" required className="w-44" />
      <Button type="submit" size="sm" variant="destructive" disabled={dangXuLy}>
        {dangXuLy ? "..." : "Xác nhận hủy"}
      </Button>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

/** CC-03: ký duyệt mọi chứng chỉ đang chờ ký của khóa theo 1 quyết định. */
export function FormKyDuyet({ khoaId, soChoKy }: { khoaId: string; soChoKy: number }) {
  const [ketQua, formAction, dangXuLy] = useActionState(kyDuyetAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="khoaId" value={khoaId} />
        <Input name="soQuyetDinh" placeholder="Số quyết định cấp" required className="w-48" />
        <Input
          name="ngayKy"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-40"
        />
        <Input name="nguoiKy" placeholder="Người ký (họ tên, chức vụ)" required className="w-64" />
        <Button type="submit" size="sm" disabled={dangXuLy || soChoKy === 0}>
          {dangXuLy ? "Đang lưu..." : `Ghi nhận ký duyệt ${soChoKy} chứng chỉ`}
        </Button>
      </div>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}
