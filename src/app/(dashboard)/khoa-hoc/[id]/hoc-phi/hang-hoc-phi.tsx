"use client";

import { useActionState, useState, useTransition } from "react";
import {
  xacNhanThanhToanAction,
  xacNhanMienGiamAction,
  datHanNopAction,
  guiNhacNoAction,
  boQuaDieuKienAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

const NHAN_TRANG_THAI: Record<string, string> = {
  CHUA_NOP: "Chưa nộp",
  CON_NO: "Còn nợ",
  DA_NOP_DU: "Đã nộp đủ",
  MIEN_GIAM: "Miễn giảm",
  CHO_THANH_LY_HOP_DONG: "Qua ĐVLK - chờ thanh lý hợp đồng",
  DA_HOAN_TAT: "Qua ĐVLK - đã hoàn tất",
};

export type HocPhiDong = {
  id: string;
  hoTen: string;
  soTienPhaiNop: number;
  soTienDaNop: number;
  trangThai: string;
  hanNop: string | null;
  boQuaKiemTra: boolean;
};

export function HangHocPhi({
  khoaId,
  hocPhi,
  choPhepThanhToan,
  choPhepCongNo,
  choPhepBoQua,
}: {
  khoaId: string;
  hocPhi: HocPhiDong;
  choPhepThanhToan: boolean;
  choPhepCongNo: boolean;
  choPhepBoQua: boolean;
}) {
  const [moThanhToan, setMoThanhToan] = useState(false);
  const [moHanNop, setMoHanNop] = useState(false);
  const [moBoQua, setMoBoQua] = useState(false);
  const [, dangGui] = useTransition();
  const [loiThanhToan, thanhToanAction, dangThanhToan] = useActionState(
    xacNhanThanhToanAction,
    undefined,
  );
  const [loiHanNop, hanNopAction, dangHanNop] = useActionState(datHanNopAction, undefined);
  const [loiBoQua, boQuaAction, dangBoQua] = useActionState(boQuaDieuKienAction, undefined);

  const quaDvlk = hocPhi.trangThai === "CHO_THANH_LY_HOP_DONG" || hocPhi.trangThai === "DA_HOAN_TAT";
  const conNo = hocPhi.trangThai === "CHUA_NOP" || hocPhi.trangThai === "CON_NO";

  return (
    <>
      <TableRow>
        <TableCell>{hocPhi.hoTen}</TableCell>
        <TableCell>{hocPhi.soTienPhaiNop.toLocaleString("vi-VN")}đ</TableCell>
        <TableCell>{hocPhi.soTienDaNop.toLocaleString("vi-VN")}đ</TableCell>
        <TableCell>
          {NHAN_TRANG_THAI[hocPhi.trangThai] ?? hocPhi.trangThai}
          {hocPhi.boQuaKiemTra && <span className="ml-1 text-xs text-muted-foreground">(đã bỏ qua điều kiện)</span>}
        </TableCell>
        <TableCell>{hocPhi.hanNop ? new Date(hocPhi.hanNop).toLocaleDateString("vi-VN") : "—"}</TableCell>
        <TableCell className="flex flex-wrap gap-1.5">
          {choPhepThanhToan && !quaDvlk && conNo && (
            <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setMoThanhToan((v) => !v)}>
              Ghi thanh toán
            </Button>
          )}
          {choPhepThanhToan && !quaDvlk && conNo && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => dangGui(() => xacNhanMienGiamAction(hocPhi.id, khoaId))}
            >
              Miễn giảm
            </Button>
          )}
          {choPhepCongNo && conNo && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMoHanNop((v) => !v)}>
              Đặt hạn nộp
            </Button>
          )}
          {choPhepCongNo && conNo && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => dangGui(() => guiNhacNoAction(hocPhi.id, khoaId))}
            >
              Gửi nhắc nợ
            </Button>
          )}
          {choPhepBoQua && !hocPhi.boQuaKiemTra && conNo && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMoBoQua((v) => !v)}>
              Bỏ qua điều kiện
            </Button>
          )}
        </TableCell>
      </TableRow>
      {(loiThanhToan || loiHanNop || loiBoQua) && (
        <TableRow>
          <TableCell colSpan={6} className="text-xs text-destructive">
            {loiThanhToan || loiHanNop || loiBoQua}
          </TableCell>
        </TableRow>
      )}
      {moThanhToan && (
        <TableRow>
          <TableCell colSpan={6}>
            <form action={thanhToanAction} className="flex flex-wrap items-end gap-2 py-2">
              <input type="hidden" name="hocPhiId" value={hocPhi.id} />
              <input type="hidden" name="khoaId" value={khoaId} />
              <Input name="soTien" type="number" min={1} placeholder="Số tiền" required className="w-32" />
              <select name="hinhThucNop" className="h-8 rounded-lg border px-2 text-sm" defaultValue="Tiền mặt">
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
                <option value="Cổng thanh toán">Cổng thanh toán</option>
              </select>
              <Button type="submit" size="sm" disabled={dangThanhToan}>
                {dangThanhToan ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </form>
          </TableCell>
        </TableRow>
      )}
      {moHanNop && (
        <TableRow>
          <TableCell colSpan={6}>
            <form action={hanNopAction} className="flex flex-wrap items-end gap-2 py-2">
              <input type="hidden" name="hocPhiId" value={hocPhi.id} />
              <input type="hidden" name="khoaId" value={khoaId} />
              <Input name="hanNop" type="date" required className="w-40" />
              <Button type="submit" size="sm" disabled={dangHanNop}>
                {dangHanNop ? "Đang lưu..." : "Lưu hạn nộp"}
              </Button>
            </form>
          </TableCell>
        </TableRow>
      )}
      {moBoQua && (
        <TableRow>
          <TableCell colSpan={6}>
            <form
              action={boQuaAction}
              className="flex flex-wrap items-end gap-2 py-2"
              onSubmit={(e) => {
                if (!confirm("Bỏ qua điều kiện học phí cho học viên này?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="hocPhiId" value={hocPhi.id} />
              <input type="hidden" name="khoaId" value={khoaId} />
              <Input name="lyDo" placeholder="Lý do (lãnh đạo phê duyệt)" required className="w-64" />
              <Button type="submit" size="sm" variant="destructive" disabled={dangBoQua}>
                {dangBoQua ? "Đang lưu..." : "Xác nhận bỏ qua"}
              </Button>
            </form>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
