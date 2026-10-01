"use client";

import { useActionState, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { chotDanhSachDuThiAction, nhapDoiSoatAction, type TrangThaiChot } from "./actions";

/** (bổ sung 01/10/2026 - HP-02) tải Excel đối soát -> đánh dấu "Đã đóng" -> tải lên. */
export function FormDoiSoat({ khoaId }: { khoaId: string }) {
  const [kq, formAction, dangXuLy] = useActionState(nhapDoiSoatAction.bind(null, khoaId), undefined);
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <ol className="list-decimal pl-5 text-sm text-muted-foreground">
        <li>Tải danh sách thí sinh đã đăng ký (kèm nội dung chuyển khoản, tình trạng minh chứng).</li>
        <li>
          Đối chiếu sao kê ngân hàng, ghi <b className="text-foreground">Đã đóng</b> ở cột <i>Trạng thái phí</i> cho thí sinh đã chuyển
          khoản.
        </li>
        <li>Tải tệp lên - hệ thống ghi nhận thanh toán và lập phiếu thu cho các dòng Đã đóng.</li>
      </ol>
      <a href={`/api/hp/khoa/${khoaId}/doi-soat`} className="inline-flex items-center gap-1.5 self-start text-sm font-medium underline">
        <Download className="size-4" /> Tải danh sách đối soát (Excel)
      </a>
      <form action={formAction} className="flex flex-col gap-2">
        <ChonTep name="file" accept=".xlsx" required nhan="Chọn tệp đối soát đã đánh dấu" goiY="Tệp Excel .xlsx tải từ hệ thống" className="max-w-xl" />
        <Button type="submit" disabled={dangXuLy} className="self-start">
          {dangXuLy ? "Đang ghi nhận..." : "Tải lên và ghi nhận đã đóng phí"}
        </Button>
      </form>
      {kq?.ketQua && (
        <div className="rounded-lg bg-success/10 p-3 text-sm">
          <p className="font-medium text-success">
            Đã ghi nhận {kq.ketQua.daGhiNhan.length} thí sinh đóng phí
            {kq.ketQua.daCoTruoc > 0 && `, ${kq.ketQua.daCoTruoc} đã ghi nhận từ trước`}, {kq.ketQua.chuaDong} chưa đóng.
          </p>
          {kq.ketQua.daGhiNhan.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {kq.ketQua.daGhiNhan.map((d) => (
                <li key={d.maHoSo}>
                  {d.maHoSo} - {d.hoTen}: {d.soTien.toLocaleString("vi-VN")}đ, phiếu thu {d.soPhieu}
                </li>
              ))}
            </ul>
          )}
          {kq.ketQua.canhBao.map((c) => (
            <p key={c} className="mt-1 text-warning">
              {c}
            </p>
          ))}
        </div>
      )}
      {kq?.loi && <p className="text-sm text-destructive">{kq.loi}</p>}
      {kq?.cacDongLoi && kq.cacDongLoi.length > 0 && (
        <ul className="max-h-60 list-disc overflow-auto pl-5 text-sm text-destructive">
          {kq.cacDongLoi.map((l, i) => (
            <li key={i}>
              Dòng {l.dong}: {l.loi}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** (bổ sung 01/10/2026 - HV-07) chốt + tải danh sách chính thức sau hạn đăng ký. */
export function KhoiChotDanhSach({
  khoaId,
  duocChot,
  lyDoChuaChot,
  soChinhThuc,
}: {
  khoaId: string;
  duocChot: boolean;
  lyDoChuaChot: string | null;
  soChinhThuc: number;
}) {
  const [kq, setKq] = useState<TrangThaiChot>();
  const [dangXuLy, batDau] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm text-sm">
      <p className="text-muted-foreground">
        Danh sách chính thức = thí sinh đã được xác nhận lệ phí. Thí sinh chưa nộp đồng nào chuyển <i>Không hợp lệ</i>; nộp thiếu
        giữ nguyên để xử lý thủ công. Chốt lại được nếu có xác nhận muộn.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!duocChot || dangXuLy}
          onClick={() => {
            if (!confirm("Chốt danh sách chính thức theo lệ phí đã xác nhận? Thí sinh chưa nộp lệ phí sẽ chuyển Không hợp lệ.")) return;
            batDau(async () => setKq(await chotDanhSachDuThiAction(khoaId)));
          }}
        >
          {dangXuLy ? "Đang chốt..." : "Chốt danh sách chính thức"}
        </Button>
        {soChinhThuc > 0 && (
          <a href={`/api/hp/khoa/${khoaId}/danh-sach-chinh-thuc`} className="inline-flex items-center gap-1.5 font-medium underline">
            <Download className="size-4" /> Xuất danh sách chính thức ({soChinhThuc} thí sinh)
          </a>
        )}
      </div>
      {!duocChot && lyDoChuaChot && <p className="text-warning">{lyDoChuaChot}</p>}
      {kq?.ok && <p className="text-success">{kq.ok}</p>}
      {kq?.nopThieu && kq.nopThieu.length > 0 && <p className="text-warning">Nộp thiếu, chưa chốt: {kq.nopThieu.join("; ")}</p>}
      {kq?.loi && <p className="text-destructive">{kq.loi}</p>}
    </div>
  );
}
