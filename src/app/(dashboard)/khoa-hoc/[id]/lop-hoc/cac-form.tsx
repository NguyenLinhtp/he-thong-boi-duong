"use client";

import { useActionState, useState } from "react";
import {
  taoLopAction,
  capNhatLopAction,
  xoaLopAction,
  chiaLopTuDongAction,
  xepLopNhieuAction,
  type KetQuaThaoTacLop,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export type LopRutGon = { id: string; maLop: string; ten: string; siSoToiDa: number | null; siSoHienTai: number };

export function FormTaoLop({ khoaId }: { khoaId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(taoLopAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Input name="ten" placeholder="Tên lớp (vd Lớp sáng)" className="w-56" />
      <Input name="siSoToiDa" type="number" min={1} placeholder="Sĩ số tối đa" className="w-32" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        {dangXuLy ? "Đang tạo..." : "Tạo lớp"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

function ThongDiep({ ketQua }: { ketQua: KetQuaThaoTacLop }) {
  return (
    <>
      {ketQua?.thongBao && <p className="text-sm text-muted-foreground">{ketQua.thongBao}</p>}
      {ketQua?.loi && <p className="text-sm text-destructive">{ketQua.loi}</p>}
    </>
  );
}

export function NutChiaTuDong({ khoaId, soChuaXep }: { khoaId: string; soChuaXep: number }) {
  const [ketQua, formAction, dangXuLy] = useActionState(chiaLopTuDongAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" variant="secondary" disabled={dangXuLy || soChuaXep === 0} className="self-start">
        {dangXuLy ? "Đang chia..." : `Chia tự động ${soChuaXep} học viên chưa có lớp (ưu tiên đơn vị công tác)`}
      </Button>
      <p className="text-xs text-muted-foreground">
        Học viên cùng đơn vị công tác được xếp chung lớp khi còn chỗ; sĩ số các lớp vẫn được cân bằng.
      </p>
      <ThongDiep ketQua={ketQua} />
    </form>
  );
}

export function HangLop({ khoaId, lop }: { khoaId: string; lop: LopRutGon }) {
  const [dangSua, setDangSua] = useState(false);
  const [loiSua, suaAction, dangLuu] = useActionState(capNhatLopAction, undefined);
  const [loiXoa, xoaAction] = useActionState(xoaLopAction, undefined);

  return (
    <>
      <TableRow>
        <TableCell className="font-mono">{lop.maLop}</TableCell>
        <TableCell>{lop.ten}</TableCell>
        <TableCell>
          {lop.siSoHienTai}/{lop.siSoToiDa ?? "∞"}
        </TableCell>
        <TableCell className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDangSua((v) => !v)}>
            Sửa
          </Button>
          <form
            action={xoaAction}
            onSubmit={(e) => {
              if (!confirm(`Xóa lớp ${lop.maLop}?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="khoaId" value={khoaId} />
            <input type="hidden" name="lopId" value={lop.id} />
            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
              Xóa
            </Button>
          </form>
        </TableCell>
      </TableRow>
      {(loiSua || loiXoa) && (
        <TableRow>
          <TableCell colSpan={4} className="text-xs text-destructive">
            {loiSua || loiXoa}
          </TableCell>
        </TableRow>
      )}
      {dangSua && (
        <TableRow>
          <TableCell colSpan={4}>
            <form action={suaAction} className="flex flex-wrap items-end gap-2 py-2">
              <input type="hidden" name="khoaId" value={khoaId} />
              <input type="hidden" name="lopId" value={lop.id} />
              <Input name="ten" defaultValue={lop.ten} className="w-56" />
              <Input name="siSoToiDa" type="number" min={1} defaultValue={lop.siSoToiDa ?? ""} className="w-32" />
              <Button type="submit" size="sm" disabled={dangLuu}>
                {dangLuu ? "Đang lưu..." : "Lưu"}
              </Button>
            </form>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export type HocVienLop = {
  dangKyId: string;
  hoTen: string;
  maHocVien: string;
  donViCongTac: string | null;
  donViLienKet: string | null;
  lopId: string | null;
  maLop: string | null;
};

/**
 * KH-07 chia thủ công: tick học viên (danh sách đã lọc theo ĐVCT/ĐVLK/tên ở
 * trên) rồi xếp/chuyển cả nhóm vào 1 lớp. Có học viên đang ở lớp khác trong
 * nhóm chọn = chuyển lớp -> bắt buộc lý do (ghi vào lịch sử chuyển lớp).
 */
export function BangChonHocVien({
  khoaId,
  dsHocVien,
  dsLop,
}: {
  khoaId: string;
  dsHocVien: HocVienLop[];
  dsLop: LopRutGon[];
}) {
  const [daChon, setDaChon] = useState<Set<string>>(new Set());
  const [ketQua, formAction, dangXuLy] = useActionState(
    async (truoc: KetQuaThaoTacLop, formData: FormData) => {
      const sau = await xepLopNhieuAction(truoc, formData);
      if (!sau?.loi) setDaChon(new Set());
      return sau;
    },
    undefined,
  );

  // chỉ giữ lựa chọn còn nằm trong danh sách đang lọc
  const dangChon = dsHocVien.filter((hv) => daChon.has(hv.dangKyId));
  const coChuyenLop = dangChon.some((hv) => hv.lopId !== null);
  const chonTatCa = dsHocVien.length > 0 && dangChon.length === dsHocVien.length;
  const doiChon = (dangKyId: string) =>
    setDaChon((cu) => {
      const moi = new Set(cu);
      if (moi.has(dangKyId)) moi.delete(dangKyId);
      else moi.add(dangKyId);
      return moi;
    });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      {dangChon.map((hv) => (
        <input key={hv.dangKyId} type="hidden" name="dangKyId" value={hv.dangKyId} />
      ))}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <span className="text-sm">
          Đã chọn <b>{dangChon.length}</b> học viên
          {coChuyenLop && " (có người đang ở lớp khác - sẽ chuyển lớp)"}
        </span>
        <select name="lopId" required className="h-8 rounded-lg border px-2 text-sm">
          {dsLop.map((l) => (
            <option key={l.id} value={l.id}>
              {l.maLop} · {l.ten} ({l.siSoHienTai}/{l.siSoToiDa ?? "∞"})
            </option>
          ))}
        </select>
        {coChuyenLop && (
          <>
            <Input name="ngayHieuLuc" type="date" title="Ngày hiệu lực (mặc định hôm nay)" className="w-36" />
            <Input name="lyDo" placeholder="Lý do chuyển lớp" required className="w-48" />
          </>
        )}
        <Button type="submit" size="sm" disabled={dangXuLy || dangChon.length === 0 || dsLop.length === 0}>
          {dangXuLy ? "Đang xếp..." : "Xếp / chuyển vào lớp đã chọn"}
        </Button>
      </div>
      <ThongDiep ketQua={ketQua} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                aria-label="Chọn tất cả học viên đang hiển thị"
                checked={chonTatCa}
                onChange={() => setDaChon(chonTatCa ? new Set() : new Set(dsHocVien.map((hv) => hv.dangKyId)))}
              />
            </TableHead>
            <TableHead>Mã học viên</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Đơn vị công tác</TableHead>
            <TableHead>Đơn vị liên kết</TableHead>
            <TableHead>Lớp hiện tại</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsHocVien.map((hv) => (
            <TableRow key={hv.dangKyId} onClick={() => doiChon(hv.dangKyId)} className="cursor-pointer">
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Chọn ${hv.hoTen}`}
                  checked={daChon.has(hv.dangKyId)}
                  onChange={() => doiChon(hv.dangKyId)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell>{hv.maHocVien}</TableCell>
              <TableCell>{hv.hoTen}</TableCell>
              <TableCell>{hv.donViCongTac ?? "—"}</TableCell>
              <TableCell>{hv.donViLienKet ?? "—"}</TableCell>
              <TableCell>{hv.maLop ?? <span className="text-muted-foreground">Chưa xếp</span>}</TableCell>
            </TableRow>
          ))}
          {dsHocVien.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Không có học viên chính thức nào khớp bộ lọc
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </form>
  );
}
