"use client";

import { useActionState } from "react";
import { ganTaiKhoanAction, taoHopDongLienKetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DonVi = {
  id: string;
  ma: string;
  ten: string;
  taiKhoan: { id: string; tenDangNhap: string; hoTen: string } | null;
  hopDongs: { id: string; maHopDong: string; trangThai: string; khoa: { maKhoa: string } }[];
};

export function KhoiDonVi({
  donVi,
  dsTaiKhoanChuaGan,
  dsKhoa,
}: {
  donVi: DonVi;
  dsTaiKhoanChuaGan: { id: string; tenDangNhap: string; hoTen: string }[];
  dsKhoa: { id: string; maKhoa: string; ten: string }[];
}) {
  const [loiGan, ganAction, dangGan] = useActionState(ganTaiKhoanAction, undefined);
  const [loiHopDong, hopDongAction, dangTaoHopDong] = useActionState(
    taoHopDongLienKetAction,
    undefined,
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-semibold">
        {donVi.ma} · {donVi.ten}
      </h3>

      <p className="text-sm text-muted-foreground">
        Tài khoản đăng nhập:{" "}
        {donVi.taiKhoan ? (
          `${donVi.taiKhoan.tenDangNhap} (${donVi.taiKhoan.hoTen})`
        ) : (
          <span className="text-destructive">Chưa gán</span>
        )}
      </p>

      {!donVi.taiKhoan && (
        <form action={ganAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="donViLienKetId" value={donVi.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`nguoiDungId-${donVi.id}`}>
              Gán tài khoản (đã tạo qua QT-01, vai trò Cán bộ đơn vị liên kết)
            </Label>
            <select
              id={`nguoiDungId-${donVi.id}`}
              name="nguoiDungId"
              required
              className="h-8 rounded-lg border px-2 text-sm"
            >
              {dsTaiKhoanChuaGan.map((tk) => (
                <option key={tk.id} value={tk.id}>
                  {tk.tenDangNhap} ({tk.hoTen})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" disabled={dangGan || dsTaiKhoanChuaGan.length === 0}>
            Gán
          </Button>
          {loiGan && <p className="w-full text-xs text-destructive">{loiGan}</p>}
        </form>
      )}

      <div>
        <p className="text-sm font-medium">Hợp đồng liên kết</p>
        <ul className="text-sm text-muted-foreground">
          {donVi.hopDongs.map((hd) => (
            <li key={hd.id}>
              {hd.maHopDong} · khóa {hd.khoa.maKhoa} · {hd.trangThai}
            </li>
          ))}
          {donVi.hopDongs.length === 0 && <li>Chưa có hợp đồng nào</li>}
        </ul>
      </div>

      <form action={hopDongAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="donViLienKetId" value={donVi.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`maHopDong-${donVi.id}`}>Mã hợp đồng</Label>
          <Input id={`maHopDong-${donVi.id}`} name="maHopDong" required className="w-32" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`khoaId-${donVi.id}`}>Khóa</Label>
          <select
            id={`khoaId-${donVi.id}`}
            name="khoaId"
            required
            className="h-8 rounded-lg border px-2 text-sm"
          >
            {dsKhoa.map((k) => (
              <option key={k.id} value={k.id}>
                {k.maKhoa} · {k.ten}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`soLuongDuKien-${donVi.id}`}>SL dự kiến</Label>
          <Input
            id={`soLuongDuKien-${donVi.id}`}
            name="soLuongDuKien"
            type="number"
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`donGiaThoaThuan-${donVi.id}`}>Đơn giá thỏa thuận</Label>
          <Input
            id={`donGiaThoaThuan-${donVi.id}`}
            name="donGiaThoaThuan"
            type="number"
            className="w-32"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={dangTaoHopDong}>
          Tạo hợp đồng
        </Button>
        {loiHopDong && <p className="w-full text-xs text-destructive">{loiHopDong}</p>}
      </form>
    </div>
  );
}
