"use client";

import { useActionState, useState } from "react";
import { luuMauBieuAction, ngungMauBieuAction, taoMauMacDinhAction, type KetQuaMauBieu } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ThongDiep({ ketQua }: { ketQua: KetQuaMauBieu }) {
  return (
    <>
      {ketQua?.thongBao && <p className="text-sm text-muted-foreground">{ketQua.thongBao}</p>}
      {ketQua?.loi && <p className="text-sm text-destructive">{ketQua.loi}</p>}
    </>
  );
}

export type ChiTieuLuaChon = { ma: string; nhan: string };
export type MauHienTai = {
  ma: string;
  ten: string;
  coQuanNhan: string | null;
  canCu: string | null;
  nhomTheo: string;
  cot: { chiTieu: string; tieuDe: string }[];
};

/**
 * BC-04: tạo mẫu biểu mới hoặc cập nhật (= phiên bản mới) - tích chỉ tiêu làm
 * cột, đặt tiêu đề cột theo đúng biểu mẫu của cấp trên và thứ tự cột.
 */
export function FormMauBieu({
  dsChiTieu,
  dsNhom,
  mau,
}: {
  dsChiTieu: ChiTieuLuaChon[];
  dsNhom: { ma: string; nhan: string }[];
  mau?: MauHienTai;
}) {
  const [ketQua, formAction, dangXuLy] = useActionState(luuMauBieuAction, undefined);
  const [mo, setMo] = useState(false);
  const cotTheoMa = new Map((mau?.cot ?? []).map((c, i) => [c.chiTieu, { ...c, thuTu: i + 1 }]));
  if (!mo) {
    return (
      <Button size="sm" variant={mau ? "secondary" : "default"} onClick={() => setMo(true)}>
        {mau ? "Cập nhật mẫu (phiên bản mới)" : "Thêm mẫu biểu"}
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
      {mau && <input type="hidden" name="maCu" value={mau.ma} />}
      <div className="flex flex-wrap items-end gap-2">
        <Input name="ma" defaultValue={mau?.ma ?? ""} disabled={Boolean(mau)} required={!mau} placeholder="Số hiệu biểu (VD: BIEU-01)" className="w-44" />
        <Input name="ten" defaultValue={mau?.ten ?? ""} required placeholder="Tên biểu" className="w-80" />
        <Input name="coQuanNhan" defaultValue={mau?.coQuanNhan ?? ""} placeholder="Cơ quan nhận (Kính gửi)" className="w-60" />
        <Input name="canCu" defaultValue={mau?.canCu ?? ""} placeholder="Văn bản căn cứ" className="w-72" />
        <select name="nhomTheo" defaultValue={mau?.nhomTheo ?? "LOAI_HINH"} className="h-8 rounded-lg border px-2 text-sm" aria-label="Nhóm dòng">
          {dsNhom.map((n) => (
            <option key={n.ma} value={n.ma}>
              {n.nhan}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">Tích chỉ tiêu làm cột; tiêu đề cột trống = tên chỉ tiêu; thứ tự cột theo số.</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {dsChiTieu.map((ct) => {
          const hienCo = cotTheoMa.get(ct.ma);
          return (
            <label key={ct.ma} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="chiTieu" value={ct.ma} defaultChecked={Boolean(hienCo)} />
              <span className="w-56">{ct.nhan}</span>
              <Input name={`tieuDe_${ct.ma}`} defaultValue={hienCo?.tieuDe ?? ""} placeholder="Tiêu đề cột" className="h-7 w-48" />
              <Input name={`thuTu_${ct.ma}`} type="number" defaultValue={hienCo?.thuTu ?? ""} placeholder="#" className="h-7 w-14" />
            </label>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : mau ? "Lưu phiên bản mới" : "Tạo mẫu"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMo(false)}>
          Đóng
        </Button>
      </div>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

export function NutNgungMauBieu({ ma }: { ma: string }) {
  const [ketQua, formAction, dangXuLy] = useActionState(ngungMauBieuAction, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Ngừng áp dụng biểu ${ma}? Các phiên bản cũ vẫn được lưu.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="ma" value={ma} />
      <Button type="submit" size="sm" variant="destructive" disabled={dangXuLy}>
        Ngừng áp dụng
      </Button>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

export function NutTaoMauMacDinh() {
  const [ketQua, formAction, dangXuLy] = useActionState(taoMauMacDinhAction, undefined);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button type="submit" size="sm" variant="secondary" disabled={dangXuLy}>
        Tạo mẫu gợi ý (BIEU-01, BIEU-02)
      </Button>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}
