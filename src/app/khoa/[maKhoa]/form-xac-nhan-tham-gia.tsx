"use client";

import { useActionState } from "react";
import { xacNhanThamGiaAction } from "./actions";
import { Button } from "@/components/ui/button";
import { guiGiuDuLieu } from "@/components/dang-ky/gui-giu-du-lieu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CacTruongDangKy } from "@/components/dang-ky/cac-truong-dang-ky";
import type { DuLieuDungForm } from "./kieu-form";

// hocVienDangNhap: học viên liên kết với tài khoản đang đăng nhập (nếu có) -
// cho xác nhận bằng tài khoản thay vì nhập CCCD/mã số
export function FormXacNhanThamGia({
  khoaId,
  hocVienDangNhap,
  form,
}: {
  khoaId: string;
  hocVienDangNhap?: { hoTen: string; maHocVien: string } | null;
  // (bổ sung 30/09/2026) thông tin bổ sung theo form cấu hình của khóa
  form: DuLieuDungForm;
}) {
  const [ketQua, formAction, dangXuLy] = useActionState(xacNhanThamGiaAction, undefined);

  if (ketQua === "THANH_CONG") {
    return (
      <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        Xác nhận tham gia thành công! Bạn đã có tên trong danh sách chính thức chờ xét duyệt của
        khóa.
      </p>
    );
  }

  return (
    <form onSubmit={guiGiuDuLieu(formAction)} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      {hocVienDangNhap && <input type="hidden" name="cachXacNhan" value="TAI_KHOAN" />}
      <p className="text-sm text-muted-foreground">
        Nếu đơn vị bạn đã cử bạn tham gia khóa này (danh sách đã được import sẵn), hãy{" "}
        {hocVienDangNhap ? "xác nhận bằng tài khoản đang đăng nhập" : "nhập CCCD/mã số"} để xác nhận tham gia.
      </p>
      {hocVienDangNhap ? (
        <p className="text-sm">
          Tài khoản: <b>{hocVienDangNhap.hoTen}</b> ({hocVienDangNhap.maHocVien})
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="soCCCD">Số CCCD/mã số</Label>
          <Input id="soCCCD" name="soCCCD" required />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CacTruongDangKy truong={form.truong} dsChucDanh={form.dsChucDanh} giaTri={form.giaTri ?? undefined} chiThieu />
      </div>
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang xác nhận..." : "Xác nhận tham gia"}
      </Button>
      {ketQua && ketQua !== "THANH_CONG" && <p className="text-sm text-destructive">{ketQua}</p>}
    </form>
  );
}
