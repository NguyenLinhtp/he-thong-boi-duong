"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  boSungThiSinhAction,
  chotDotThiAction,
  moChotDotThiAction,
  moThemPhongVaXepAction,
  suaPhongThiAction,
  taoDotThiAction,
  themPhongThiAction,
  xepPhongThiAction,
  xoaDotThiAction,
  xoaPhongThiAction,
  xoaXepPhongThiAction,
  type KetQuaPhongThi,
} from "./actions";

// (bổ sung 12/10/2026 - KH-03) form lịch thi, phòng thi của khóa dự thi/ôn thi

const CHON = "h-8 rounded-lg border bg-background px-2 text-sm";

function ThongBao({ kq }: { kq: KetQuaPhongThi }) {
  if (!kq) return null;
  return (
    <>
      {kq.loi && <p className="text-sm text-destructive">{kq.loi}</p>}
      {kq.ok && <p className="text-sm text-success">{kq.ok}</p>}
    </>
  );
}

export function FormTaoDot({ khoaId, dsNguon }: { khoaId: string; dsNguon: { id: string; ten: string }[] }) {
  const [kq, action, dangLuu] = useActionState(taoDotThiAction.bind(null, khoaId), undefined);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dot-ten">
            Tên đợt <span className="text-destructive">*</span>
          </Label>
          <Input id="dot-ten" name="ten" required placeholder="vd. Đợt thi ngày 15/11/2026" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dot-loai">Loại</Label>
          <select id="dot-loai" name="loai" className={CHON} defaultValue="THI">
            <option value="THI">Thi</option>
            <option value="ON_THI">Ôn thi</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dot-nguon">Danh sách thí sinh</Label>
          <select id="dot-nguon" name="thanhPhanId" className={CHON} defaultValue={dsNguon[0]?.id ?? ""}>
            {dsNguon.map((n) => (
              <option key={n.id} value={n.id}>
                {n.ten}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dot-mota">Thời gian chung / ghi chú</Label>
          <Input id="dot-mota" name="moTa" placeholder="vd. Ôn tối thứ 3, 5 từ 15/10 đến 15/11" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Tạo đợt"}
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}

export type GiaTriPhong = {
  ngay: string;
  ca: string;
  gioBatDau: string;
  gioKetThuc: string;
  phongHocId: string;
  diaDiem: string;
  sucChua: number;
};

function TruongPhong({ id, gt, dsPhongHoc }: { id: string; gt: Partial<GiaTriPhong>; dsPhongHoc: { id: string; ten: string; sucChua: number | null }[] }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-ngay`}>Ngày</Label>
        <Input id={`${id}-ngay`} name="ngay" type="date" defaultValue={gt.ngay} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-ca`}>Ca</Label>
        <Input id={`${id}-ca`} name="ca" defaultValue={gt.ca} placeholder="vd. Ca 1" className="w-24" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-bd`}>Giờ bắt đầu</Label>
        <Input id={`${id}-bd`} name="gioBatDau" type="time" defaultValue={gt.gioBatDau} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-kt`}>Giờ kết thúc</Label>
        <Input id={`${id}-kt`} name="gioKetThuc" type="time" defaultValue={gt.gioKetThuc} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-ph`}>Phòng vật lý</Label>
        <select id={`${id}-ph`} name="phongHocId" className={CHON} defaultValue={gt.phongHocId ?? ""}>
          <option value="">—</option>
          {dsPhongHoc.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ten}
              {p.sucChua ? ` (${p.sucChua} chỗ)` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-dd`}>Địa điểm / ghi chú phòng</Label>
        <Input id={`${id}-dd`} name="diaDiem" defaultValue={gt.diaDiem} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-sc`}>
          Số thí sinh/phòng <span className="text-destructive">*</span>
        </Label>
        <Input id={`${id}-sc`} name="sucChua" type="number" min={1} required defaultValue={gt.sucChua} className="w-28" />
      </div>
    </>
  );
}

export function FormThemPhong({
  khoaId,
  dotThiId,
  macDinh,
  dsPhongHoc,
}: {
  khoaId: string;
  dotThiId: string;
  macDinh: Partial<GiaTriPhong>;
  dsPhongHoc: { id: string; ten: string; sucChua: number | null }[];
}) {
  const [kq, action, dangLuu] = useActionState(themPhongThiAction.bind(null, khoaId, dotThiId), undefined);
  return (
    <details className="rounded-lg border bg-card p-3 text-sm shadow-sm">
      <summary className="cursor-pointer font-medium">Thêm phòng</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <TruongPhong id={`them-${dotThiId}`} gt={{ ...macDinh, phongHocId: "", diaDiem: "" }} dsPhongHoc={dsPhongHoc} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`them-${dotThiId}-sl`}>Số phòng thêm</Label>
            <Input id={`them-${dotThiId}-sl`} name="soLuong" type="number" min={1} max={100} defaultValue={1} className="w-24" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Thêm nhiều phòng cùng lúc thì để trống phòng vật lý, chọn sau ở từng phòng.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={dangLuu} size="sm">
            {dangLuu ? "Đang lưu..." : "Thêm phòng"}
          </Button>
          <ThongBao kq={kq} />
        </div>
      </form>
    </details>
  );
}

export function FormSuaPhong({
  khoaId,
  phongThiId,
  gt,
  dsPhongHoc,
  duocXoa,
}: {
  khoaId: string;
  phongThiId: string;
  gt: GiaTriPhong;
  dsPhongHoc: { id: string; ten: string; sucChua: number | null }[];
  duocXoa: boolean;
}) {
  const [kq, action, dangLuu] = useActionState(suaPhongThiAction.bind(null, khoaId, phongThiId), undefined);
  const [kqXoa, setKqXoa] = useState<KetQuaPhongThi>();
  const [dangXoa, batDau] = useTransition();
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-primary">Sửa</summary>
      <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
        <TruongPhong id={`sua-${phongThiId}`} gt={gt} dsPhongHoc={dsPhongHoc} />
        <Button type="submit" disabled={dangLuu} size="sm">
          Lưu
        </Button>
        {duocXoa && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={dangXoa}
            onClick={() => {
              if (confirm("Xóa phòng này?")) batDau(async () => setKqXoa(await xoaPhongThiAction(khoaId, phongThiId)));
            }}
          >
            Xóa phòng
          </Button>
        )}
        <ThongBao kq={kq ?? kqXoa} />
      </form>
    </details>
  );
}

export function ThaoTacDot({
  khoaId,
  dotThiId,
  daChot,
  daXep,
  chuaXep,
}: {
  khoaId: string;
  dotThiId: string;
  daChot: boolean;
  daXep: boolean;
  chuaXep: number;
}) {
  const [kq, setKq] = useState<KetQuaPhongThi>();
  const [dangXuLy, batDau] = useTransition();
  const chay = (fn: () => Promise<KetQuaPhongThi>, xacNhan?: string) => {
    if (xacNhan && !confirm(xacNhan)) return;
    batDau(async () => setKq(await fn()));
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!daChot && (
          <Button
            size="sm"
            disabled={dangXuLy}
            onClick={() =>
              chay(
                () => xepPhongThiAction(khoaId, dotThiId),
                daXep ? "Xếp lại toàn bộ thí sinh theo tên A->Z? Số báo danh và phòng hiện tại sẽ thay đổi." : undefined,
              )
            }
          >
            {daXep ? "Xếp lại phòng (A→Z)" : "Xếp phòng (A→Z)"}
          </Button>
        )}
        {!daChot && daXep && (
          <Button
            size="sm"
            variant="outline"
            disabled={dangXuLy}
            onClick={() =>
              chay(() => xoaXepPhongThiAction(khoaId, dotThiId), "Xóa xếp phòng? Toàn bộ thí sinh được bỏ khỏi các phòng (giữ nguyên các phòng) để sửa phòng rồi xếp lại.")
            }
          >
            Xóa xếp phòng
          </Button>
        )}
        {!daChot && daXep && (
          <Button
            size="sm"
            variant="secondary"
            disabled={dangXuLy}
            onClick={() => chay(() => chotDotThiAction(khoaId, dotThiId), "Chốt danh sách phòng? Sau khi chốt, thí sinh bổ sung sẽ vào phòng cuối, không xếp lại.")}
          >
            Chốt danh sách phòng
          </Button>
        )}
        {daChot && (
          <Button
            size="sm"
            disabled={dangXuLy || chuaXep === 0}
            onClick={() => chay(() => boSungThiSinhAction(khoaId, dotThiId), `Bổ sung ${chuaXep} thí sinh mới vào phòng cuối cùng?`)}
          >
            Bổ sung thí sinh mới vào phòng cuối{chuaXep > 0 ? ` (${chuaXep})` : ""}
          </Button>
        )}
        {daChot && (
          <Button
            size="sm"
            variant="outline"
            disabled={dangXuLy}
            onClick={() => {
              const lyDo = prompt("Lý do mở chốt (sau khi mở chốt có thể xếp lại toàn bộ):");
              if (lyDo?.trim()) chay(() => moChotDotThiAction(khoaId, dotThiId, lyDo));
            }}
          >
            Mở chốt
          </Button>
        )}
        {!daChot && (
          <Button
            size="sm"
            variant="destructive"
            disabled={dangXuLy}
            onClick={() => chay(() => xoaDotThiAction(khoaId, dotThiId), "Xóa đợt này cùng các phòng và danh sách đã xếp?")}
          >
            Xóa đợt
          </Button>
        )}
      </div>
      <ThongBao kq={kq} />
      {kq?.thieuCho !== undefined && kq.soPhongCanThem !== undefined && (
        <Button size="sm" variant="secondary" className="self-start" disabled={dangXuLy} onClick={() => chay(() => moThemPhongVaXepAction(khoaId, dotThiId))}>
          Mở thêm {kq.soPhongCanThem} phòng (theo phòng cuối) và xếp lại
        </Button>
      )}
    </div>
  );
}
