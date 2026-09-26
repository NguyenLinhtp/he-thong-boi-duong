"use client";

import { useActionState, useState } from "react";
import {
  tongHopAction,
  xetHoanThanhAction,
  pheDuyetAction,
  nhapKetQuaThiAction,
  phucKhaoHocPhanAction,
  phucKhaoThiAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

type TrangThaiAction = (prev: string | undefined, formData: FormData) => Promise<string | undefined>;

function NutHanhDong({ khoaId, action, nhan }: { khoaId: string; action: TrangThaiAction; nhan: string }) {
  const [loi, formAction, dangXuLy] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang xử lý..." : nhan}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

export function NutTongHop({ khoaId }: { khoaId: string }) {
  return <NutHanhDong khoaId={khoaId} action={tongHopAction} nhan="Tổng hợp kết quả toàn khóa" />;
}

export function NutXetHoanThanh({ khoaId }: { khoaId: string }) {
  return <NutHanhDong khoaId={khoaId} action={xetHoanThanhAction} nhan="Xét điều kiện hoàn thành" />;
}

export function FormPheDuyet({ khoaId }: { khoaId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(pheDuyetAction, undefined);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        if (!confirm("Phê duyệt kết quả? Sau khi duyệt chỉ sửa điểm được theo quyết định phúc khảo.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="khoaId" value={khoaId} />
      <Input name="soQuyetDinh" placeholder="Số quyết định công nhận" required className="w-64" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        {dangXuLy ? "Đang lưu..." : "Phê duyệt kết quả"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

export type ThiSinhDong = { hocVienId: string; maHocVien: string; hoTen: string; diemThi: number | null };

export function FormKetQuaThi({ khoaId, dsThiSinh }: { khoaId: string; dsThiSinh: ThiSinhDong[] }) {
  const [loi, formAction, dangXuLy] = useActionState(nhapKetQuaThiAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Điểm thi (0–10)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsThiSinh.map((ts) => (
            <TableRow key={ts.hocVienId}>
              <TableCell>{ts.maHocVien}</TableCell>
              <TableCell>{ts.hoTen}</TableCell>
              <TableCell>
                <input type="hidden" name="hocVienId" value={ts.hocVienId} />
                <Input
                  name={`diemThi_${ts.hocVienId}`}
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={ts.diemThi ?? ""}
                  className="w-24"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="submit" size="sm" disabled={dangXuLy || dsThiSinh.length === 0} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu kết quả thi"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

/** KQ-04: sửa điểm đã phê duyệt theo quyết định phúc khảo (học phần hoặc điểm thi PT3). */
export function FormPhucKhao({
  khoaId,
  ketQuaId,
  loai,
}: {
  khoaId: string;
  ketQuaId: string;
  loai: "hocPhan" | "thi";
}) {
  const [mo, setMo] = useState(false);
  const [loi, formAction, dangXuLy] = useActionState(
    loai === "hocPhan" ? phucKhaoHocPhanAction : phucKhaoThiAction,
    undefined,
  );

  if (!mo) {
    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMo(true)}>
        Phúc khảo
      </Button>
    );
  }

  const oDiem = (name: string, placeholder: string) => (
    <Input name={name} type="number" min={0} max={10} step={0.1} placeholder={placeholder} required className="w-20" />
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-1.5">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="ketQuaId" value={ketQuaId} />
      {loai === "hocPhan" ? (
        <>
          {oDiem("diemThanhPhan", "TP")}
          {oDiem("diemKetThuc", "KT")}
        </>
      ) : (
        oDiem("diemThi", "Điểm thi")
      )}
      <Input name="soQuyetDinhPhucKhao" placeholder="Số QĐ phúc khảo" required className="w-36" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        {dangXuLy ? "..." : "Lưu"}
      </Button>
      {loi && <p className="w-full text-xs text-destructive">{loi}</p>}
    </form>
  );
}
