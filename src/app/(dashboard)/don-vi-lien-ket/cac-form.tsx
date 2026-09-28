"use client";

import { useActionState } from "react";
import {
  taoDonViLienKetAction,
  capNhatDonViLienKetAction,
  doiTrangThaiHopTacAction,
  xoaDonViLienKetAction,
} from "./actions";
import type { KetQuaThaoTacDvlk } from "./thuc-hien";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ThongDiepDvlk({ ketQua }: { ketQua: KetQuaThaoTacDvlk }) {
  return (
    <>
      {ketQua?.thongBao && <p className="text-sm text-muted-foreground">{ketQua.thongBao}</p>}
      {ketQua?.loi && <p className="text-sm text-destructive">{ketQua.loi}</p>}
    </>
  );
}

type ThongTinDonVi = {
  id?: string;
  ma?: string;
  ten?: string;
  diaChi?: string | null;
  nguoiDaiDien?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
};

function CacTruong({ dv }: { dv: ThongTinDonVi }) {
  const truong = (ten: keyof ThongTinDonVi, nhan: string, batBuoc = false, rong = "w-56") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${dv.id ?? "moi"}-${ten}`}>
        {nhan}
        {batBuoc && " *"}
      </Label>
      <Input
        id={`${dv.id ?? "moi"}-${ten}`}
        name={ten}
        required={batBuoc}
        defaultValue={dv[ten] ?? ""}
        className={rong}
      />
    </div>
  );
  return (
    <>
      {truong("ma", "Mã đơn vị", true, "w-32")}
      {truong("ten", "Tên đơn vị", true, "w-72")}
      {truong("diaChi", "Địa chỉ", false, "w-72")}
      {truong("nguoiDaiDien", "Người đại diện")}
      {truong("soDienThoai", "Số điện thoại", false, "w-40")}
      {truong("email", "Email")}
    </>
  );
}

/** DVLK-01: thêm đơn vị liên kết. */
export function FormTaoDonViLienKet() {
  const [ketQua, formAction, dangXuLy] = useActionState(taoDonViLienKetAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <CacTruong dv={{}} />
        <Button type="submit" disabled={dangXuLy}>
          {dangXuLy ? "Đang thêm..." : "Thêm đơn vị liên kết"}
        </Button>
      </div>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

/** DVLK-01: sửa thông tin đơn vị liên kết. */
export function FormSuaDonViLienKet({ dv }: { dv: ThongTinDonVi & { id: string } }) {
  const [ketQua, formAction, dangXuLy] = useActionState(capNhatDonViLienKetAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={dv.id} />
      <div className="flex flex-wrap items-end gap-3">
        <CacTruong dv={dv} />
        <Button type="submit" size="sm" disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

export function NutTrangThaiHopTac({ id, dangHopTac }: { id: string; dangHopTac: boolean }) {
  const [ketQua, formAction, dangXuLy] = useActionState(doiTrangThaiHopTacAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="trangThai" value={dangHopTac ? "TAM_NGUNG" : "DANG_HOP_TAC"} />
      <Button type="submit" size="sm" variant="secondary" disabled={dangXuLy}>
        {dangHopTac ? "Tạm ngừng hợp tác" : "Hợp tác trở lại"}
      </Button>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}

export function NutXoaDonViLienKet({ id, ten }: { id: string; ten: string }) {
  const [ketQua, formAction, dangXuLy] = useActionState(xoaDonViLienKetAction, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Xóa đơn vị liên kết "${ten}"?`)) e.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="destructive" disabled={dangXuLy}>
        Xóa
      </Button>
      <ThongDiepDvlk ketQua={ketQua} />
    </form>
  );
}
