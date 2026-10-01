"use client";

import { useActionState } from "react";
import { nopMinhChungLePhiAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";

// (bổ sung 01/10/2026 - HV-05) thí sinh tải lên minh chứng giao dịch chuyển khoản lệ phí thi
export function FormMinhChungLePhi({ dangKyId, maKhoa, daNop }: { dangKyId: string; maKhoa: string; daNop: boolean }) {
  const [kq, formAction, dangXuLy] = useActionState(nopMinhChungLePhiAction.bind(null, dangKyId), undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="maKhoa" value={maKhoa} />
      <ChonTep
        name="minhChung"
        accept=".pdf,.jpg,.jpeg,.png"
        required
        nhan={daNop ? "Chọn tệp khác để nộp lại" : "Chọn ảnh/tệp minh chứng"}
        goiY="Ảnh chụp màn hình hoặc biên lai giao dịch (JPG, PNG, PDF)"
      />
      <Button type="submit" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang tải lên..." : daNop ? "Nộp lại minh chứng" : "Nộp minh chứng chuyển khoản"}
      </Button>
      {kq === "OK" && <p className="text-sm text-success">Đã nhận minh chứng. Nhà trường sẽ đối soát và xác nhận lệ phí.</p>}
      {kq && kq !== "OK" && <p className="text-sm text-destructive">{kq}</p>}
    </form>
  );
}
