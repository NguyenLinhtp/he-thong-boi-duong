"use client";

import { useActionState } from "react";
import { doiThanhPhanAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { ChonThanhPhanLePhi, type ThanhPhanHien } from "@/components/dang-ky/chon-thanh-phan-le-phi";

/**
 * (bổ sung 06/10/2026 - HV-05) thí sinh mở lại đơn đổi thành phần đã đăng ký (vd. thêm ôn thi)
 * đến hạn đăng ký; phần đã được xác nhận lệ phí không bỏ được.
 */
export function FormDoiThanhPhan({
  dangKyId,
  maKhoa,
  ds,
  daChon,
  khoaChon,
}: {
  dangKyId: string;
  maKhoa: string;
  ds: ThanhPhanHien[];
  daChon: string[];
  khoaChon: string[];
}) {
  const [kq, formAction, dangXuLy] = useActionState(doiThanhPhanAction.bind(null, dangKyId), undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="maKhoa" value={maKhoa} />
      <ChonThanhPhanLePhi ds={ds} laTuDo={false} daChon={daChon} khoaChon={khoaChon} />
      <Button type="submit" variant="secondary" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang cập nhật..." : "Cập nhật lựa chọn đăng ký"}
      </Button>
      {kq === "OK" && <p className="text-sm text-success">Đã cập nhật lựa chọn - số tiền chuyển khoản và mã QR đã tính lại.</p>}
      {kq && kq !== "OK" && <p className="text-sm text-destructive">{kq}</p>}
    </form>
  );
}
