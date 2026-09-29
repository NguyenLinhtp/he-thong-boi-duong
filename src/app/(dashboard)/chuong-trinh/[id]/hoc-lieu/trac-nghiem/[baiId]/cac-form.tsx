"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { Input } from "@/components/ui/input";
import type { KetQuaThaoTac } from "../../actions";
import { ThongBao, TruongTinhDiem } from "../../cac-form";

type HanhDong = (t: KetQuaThaoTac, f: FormData) => Promise<KetQuaThaoTac>;
const CHU = ["A", "B", "C", "D", "E", "F"];

export function FormCauHinhBai({
  hanhDong,
  bai,
}: {
  hanhDong: HanhDong;
  bai: { tieuDe: string; moTa: string | null; thoiGianPhut: number | null; soLanToiDa: number | null; tinhDiem: boolean; heSo: number };
}) {
  const [kq, formAction, dangLuu] = useActionState(hanhDong, undefined);
  // key theo giá trị đang lưu: React 19 tự reset form sau action về giá trị lúc mount
  return (
    <form key={JSON.stringify(bai)} action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Tên bài
          <Input name="tieuDe" required defaultValue={bai.tieuDe} className="w-80" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Thời gian (phút)
          <Input name="thoiGianPhut" type="number" min={1} defaultValue={bai.thoiGianPhut ?? ""} placeholder="Không giới hạn" className="w-36" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Số lần làm tối đa
          <Input name="soLanToiDa" type="number" min={1} defaultValue={bai.soLanToiDa ?? ""} placeholder="Không giới hạn" className="w-36" />
        </label>
      </div>
      <textarea
        name="moTa"
        rows={2}
        defaultValue={bai.moTa ?? ""}
        placeholder="Hướng dẫn làm bài (không bắt buộc)"
        className="max-w-2xl rounded-lg border p-2 text-sm"
      />
      <TruongTinhDiem tinhDiem={bai.tinhDiem} heSo={bai.heSo} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={dangLuu}>
          Lưu cấu hình
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}

export function FormThemCauHoi({ hanhDong }: { hanhDong: HanhDong }) {
  const [kq, formAction, dangLuu] = useActionState(hanhDong, undefined);
  const [soPhuongAn, setSoPhuongAn] = useState(4);
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-bold text-ued-blue-dam">Thêm câu hỏi</h3>
      <textarea name="noiDung" required rows={2} placeholder="Nội dung câu hỏi" className="rounded-lg border p-2 text-sm" />
      <p className="text-xs text-muted-foreground">Tích ô bên trái các phương án đúng (chọn nhiều ô = câu nhiều đáp án).</p>
      {CHU.slice(0, soPhuongAn).map((chu, i) => (
        <label key={chu} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="dapAnDung" value={i} aria-label={`Phương án ${chu} đúng`} />
          <span className="w-4 font-bold">{chu}</span>
          <Input name={`phuongAn${i}`} required={i < 2} placeholder={`Phương án ${chu}`} className="max-w-xl" />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {soPhuongAn < CHU.length && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setSoPhuongAn((n) => n + 1)}>
            + Phương án
          </Button>
        )}
        <Button type="submit" size="sm" disabled={dangLuu}>
          Thêm câu hỏi
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}

export function FormNhapExcel({ hanhDong }: { hanhDong: HanhDong }) {
  const [kq, formAction, dangLuu] = useActionState(hanhDong, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-bold text-ued-blue-dam">Nhập câu hỏi từ Excel</h3>
      <p className="text-xs text-muted-foreground">
        Cột: Câu hỏi · Phương án A-F · Đáp án đúng (“A” hoặc “A,C”). Dòng lỗi được báo chi tiết, có lỗi thì không nhập dòng nào.{" "}
        <a href="/api/ct/trac-nghiem/mau-excel">Tải tệp mẫu</a>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ChonTep name="tep" required accept=".xlsx" nhan="Chọn tệp Excel" goiY="Tệp .xlsx theo mẫu" />
        <Button type="submit" size="sm" disabled={dangLuu}>
          {dangLuu ? "Đang nhập..." : "Nhập"}
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}
