"use client";

import { useActionState, useState } from "react";
import {
  xoaBuoiHocAction,
  huyBuoiHocAction,
  doiLichBuoiHocAction,
  thuHoiLinkAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";

export type BuoiHocDong = {
  id: string;
  ngayHoc: string;
  gioBatDau: string | null;
  gioKetThuc: string | null;
  hocPhanId: string | null;
  hocPhanTen: string | null;
  maLop?: string | null;
  phongHocId: string | null;
  phongHocTen: string | null;
  linkTrucTuyen: string | null;
  linkConHieuLuc: boolean;
  daHuy: boolean;
  lyDoThayDoi: string | null;
  noiDungDaGiang: string | null;
  nhanXet: string | null;
};

export function HangBuoiHoc({
  khoaId,
  buoiHoc,
  dsHocPhan,
  dsPhongHoc,
  choPhepGD03,
  choPhepGD05,
}: {
  khoaId: string;
  buoiHoc: BuoiHocDong;
  dsHocPhan: { id: string; ten: string }[];
  dsPhongHoc: { id: string; ten: string }[];
  choPhepGD03: boolean;
  choPhepGD05: boolean;
}) {
  const [moDoiLich, setMoDoiLich] = useState(false);
  const [loiHuy, huyAction, dangHuy] = useActionState(huyBuoiHocAction, undefined);
  const [loiDoiLich, doiLichAction, dangDoiLich] = useActionState(doiLichBuoiHocAction, undefined);

  return (
    <>
      <TableRow>
        <TableCell>
          {new Date(buoiHoc.ngayHoc).toLocaleDateString("vi-VN")}
          {buoiHoc.daHuy && <span className="ml-1 text-xs text-destructive">(đã hủy)</span>}
        </TableCell>
        <TableCell>
          {buoiHoc.gioBatDau && buoiHoc.gioKetThuc ? `${buoiHoc.gioBatDau} – ${buoiHoc.gioKetThuc}` : "—"}
        </TableCell>
        <TableCell>
          {buoiHoc.hocPhanTen ?? "—"}
          {buoiHoc.maLop && <span className="ml-1 text-xs text-muted-foreground">({buoiHoc.maLop})</span>}
        </TableCell>
        <TableCell>
          {buoiHoc.phongHocTen ??
            (buoiHoc.linkTrucTuyen
              ? buoiHoc.linkConHieuLuc
                ? "Trực tuyến (link còn hiệu lực)"
                : "Trực tuyến (link đã hết hiệu lực)"
              : "—")}
        </TableCell>
        <TableCell className="flex flex-wrap gap-1.5">
          {choPhepGD03 && !buoiHoc.daHuy && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => setMoDoiLich((v) => !v)}
            >
              Đổi lịch
            </Button>
          )}
          {choPhepGD03 && !buoiHoc.daHuy && (
            <form
              action={huyAction}
              onSubmit={(e) => {
                const form = e.currentTarget;
                const lyDo = (form.elements.namedItem("lyDo") as HTMLInputElement)?.value;
                if (!lyDo?.trim() || !confirm(`Hủy buổi học này? Lý do: "${lyDo}"`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="khoaId" value={khoaId} />
              <input type="hidden" name="buoiHocId" value={buoiHoc.id} />
              <input
                name="lyDo"
                placeholder="Lý do nghỉ..."
                className="h-7 w-28 rounded-lg border px-1.5 text-xs"
              />
              <Button type="submit" size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={dangHuy}>
                Hủy buổi
              </Button>
            </form>
          )}
          {choPhepGD05 && buoiHoc.linkTrucTuyen && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                if (confirm("Thu hồi link trực tuyến của buổi học này?")) {
                  thuHoiLinkAction(khoaId, buoiHoc.id);
                }
              }}
            >
              Thu hồi link
            </Button>
          )}
          <form action={xoaBuoiHocAction.bind(null, khoaId, buoiHoc.id)}>
            <Button type="submit" variant="ghost" className="h-7 px-2 text-xs text-destructive">
              Xóa
            </Button>
          </form>
        </TableCell>
      </TableRow>
      {loiHuy && (
        <TableRow>
          <TableCell colSpan={5} className="text-xs text-destructive">
            {loiHuy}
          </TableCell>
        </TableRow>
      )}
      {(buoiHoc.noiDungDaGiang || buoiHoc.nhanXet) && (
        <TableRow>
          <TableCell colSpan={5} className="text-xs text-muted-foreground">
            GD-02 nhật ký: {buoiHoc.noiDungDaGiang ?? "—"}
            {buoiHoc.nhanXet && ` · Nhận xét: ${buoiHoc.nhanXet}`}
          </TableCell>
        </TableRow>
      )}
      {moDoiLich && (
        <TableRow>
          <TableCell colSpan={5}>
            <form action={doiLichAction} className="flex flex-wrap items-end gap-2 py-2">
              <input type="hidden" name="khoaId" value={khoaId} />
              <input type="hidden" name="buoiHocId" value={buoiHoc.id} />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`hocPhanId-${buoiHoc.id}`}>Học phần</Label>
                <select
                  id={`hocPhanId-${buoiHoc.id}`}
                  name="hocPhanId"
                  defaultValue={buoiHoc.hocPhanId ?? ""}
                  className="h-8 rounded-lg border px-2 text-sm"
                >
                  <option value="">— Không gắn học phần —</option>
                  {dsHocPhan.map((hp) => (
                    <option key={hp.id} value={hp.id}>
                      {hp.ten}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`ngayHoc-${buoiHoc.id}`}>Ngày mới</Label>
                <Input
                  id={`ngayHoc-${buoiHoc.id}`}
                  name="ngayHoc"
                  type="date"
                  required
                  defaultValue={buoiHoc.ngayHoc.slice(0, 10)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`gioBatDau-${buoiHoc.id}`}>Giờ bắt đầu</Label>
                <Input
                  id={`gioBatDau-${buoiHoc.id}`}
                  name="gioBatDau"
                  type="time"
                  defaultValue={buoiHoc.gioBatDau ?? ""}
                  className="w-28"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`gioKetThuc-${buoiHoc.id}`}>Giờ kết thúc</Label>
                <Input
                  id={`gioKetThuc-${buoiHoc.id}`}
                  name="gioKetThuc"
                  type="time"
                  defaultValue={buoiHoc.gioKetThuc ?? ""}
                  className="w-28"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`phongHocId-${buoiHoc.id}`}>Phòng học</Label>
                <select
                  id={`phongHocId-${buoiHoc.id}`}
                  name="phongHocId"
                  defaultValue={buoiHoc.phongHocId ?? ""}
                  className="h-8 rounded-lg border px-2 text-sm"
                >
                  <option value="">— Trực tuyến / chưa xếp —</option>
                  {dsPhongHoc.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.ten}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`lyDo-${buoiHoc.id}`}>Lý do đổi lịch</Label>
                <Input id={`lyDo-${buoiHoc.id}`} name="lyDo" required className="w-48" />
              </div>
              <Button type="submit" size="sm" disabled={dangDoiLich}>
                {dangDoiLich ? "Đang lưu..." : "Lưu lịch mới"}
              </Button>
              {loiDoiLich && <p className="w-full text-xs text-destructive">{loiDoiLich}</p>}
            </form>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
