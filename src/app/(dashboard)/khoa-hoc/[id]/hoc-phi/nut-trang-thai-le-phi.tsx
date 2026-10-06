"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { chuyenTrangThaiLePhiAction } from "./actions";

/**
 * (bổ sung 06/10/2026 - HP-02) nút 2 nấc Chưa đóng / Đã đóng trên từng dòng bảng
 * đối soát lệ phí; mỗi lần chuyển hiện hộp xác nhận (chuyển về Chưa đóng phải
 * nhập lý do - phiếu thu đã lập sẽ bị hủy).
 */
export function NutTrangThaiLePhi({
  khoaId,
  hocPhiId,
  hoTen,
  trangThai,
  soTienPhaiNop,
  soTienDaNop,
  thanhPhan,
}: {
  khoaId: string;
  hocPhiId: string;
  hoTen: string;
  trangThai: string;
  soTienPhaiNop: number;
  soTienDaNop: number;
  // (bổ sung 06/10/2026) nút của 1 thành phần lệ phí (vd. ôn thi, thi)
  thanhPhan?: { hocPhiThanhPhanId: string; ten: string; batBuoc: boolean };
}) {
  const hopThoai = useRef<HTMLDialogElement>(null);
  const [dich, setDich] = useState<"DA_DONG" | "CHUA_DONG" | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dangLuu, batDau] = useTransition();

  const daDong = trangThai === "DA_NOP_DU";
  const chuaDong = trangThai === "CHUA_NOP";
  const nopThieu = trangThai === "CON_NO";
  const tien = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

  const mo = (d: "DA_DONG" | "CHUA_DONG") => {
    setDich(d);
    setLyDo("");
    setLoi(null);
    setThongBao(null);
    hopThoai.current?.showModal();
  };
  const xacNhan = () => {
    if (!dich) return;
    if (dich === "CHUA_DONG" && !lyDo.trim()) {
      setLoi("Cần nhập lý do hủy ghi nhận đã đóng");
      return;
    }
    batDau(async () => {
      const kq = await chuyenTrangThaiLePhiAction(khoaId, hocPhiId, dich, lyDo, thanhPhan?.hocPhiThanhPhanId);
      if (kq.loi) setLoi(kq.loi);
      else {
        setThongBao(kq.ok ?? null);
        hopThoai.current?.close();
      }
    });
  };

  const nac = (nhan: string, dangChon: boolean, d: "DA_DONG" | "CHUA_DONG", mau: string) => (
    <button
      type="button"
      disabled={dangChon || dangLuu}
      onClick={() => mo(d)}
      className={cn(
        "px-2 py-0.5 text-xs font-medium transition-colors",
        dangChon ? mau : "bg-background text-muted-foreground hover:bg-muted",
        !dangChon && "cursor-pointer",
      )}
      title={dangChon ? undefined : `Chuyển sang ${nhan}`}
    >
      {nhan}
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex w-fit overflow-hidden rounded-full border">
        {nac("Chưa đóng", chuaDong, "CHUA_DONG", "bg-amber-50 text-amber-700")}
        <span className="w-px bg-border" />
        {nac("Đã đóng", daDong, "DA_DONG", "bg-green-50 text-green-700")}
      </div>
      {nopThieu && (
        <span className="text-xs text-amber-700">
          Nộp thiếu {tien(soTienDaNop)}/{tien(soTienPhaiNop)}
        </span>
      )}
      {thongBao && <span className="text-xs text-success">{thongBao}</span>}

      <dialog
        ref={hopThoai}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border bg-card p-0 text-sm text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-3 p-4">
          <h3 className="font-semibold text-ued-blue-dam">Xác nhận cập nhật trạng thái lệ phí</h3>
          {dich === "DA_DONG" ? (
            <p>
              Ghi nhận <b>{hoTen}</b> đã đóng {thanhPhan && <b>{thanhPhan.ten}: </b>}
              <b>{tien(soTienPhaiNop - soTienDaNop)}</b>
              {nopThieu && " (phần còn thiếu)"}. Hệ thống lập phiếu thu và ghi nhật ký.
            </p>
          ) : (
            <>
              <p>
                Chuyển <b>{hoTen}</b>
                {thanhPhan && (
                  <>
                    {" "}
                    - <b>{thanhPhan.ten}</b>
                  </>
                )}{" "}
                về <b>Chưa đóng</b>: hủy ghi nhận {tien(soTienDaNop)} đã đóng, các phiếu thu đã lập chuyển <b>Đã hủy</b> (giữ
                số, không tính doanh thu).
                {(!thanhPhan || thanhPhan.batBuoc) && (
                  <>
                    {" "}
                    Nếu thí sinh đang ở danh sách chính thức, hồ sơ trả về <b>Hợp lệ</b>.
                  </>
                )}
              </p>
              <Input
                autoFocus
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                placeholder="Lý do (bắt buộc), vd. ghi nhận nhầm thí sinh"
              />
            </>
          )}
          {loi && <p className="text-destructive">{loi}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => hopThoai.current?.close()} disabled={dangLuu}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              variant={dich === "CHUA_DONG" ? "destructive" : "default"}
              onClick={xacNhan}
              disabled={dangLuu}
            >
              {dangLuu ? "Đang cập nhật..." : dich === "CHUA_DONG" ? "Xác nhận chuyển Chưa đóng" : "Xác nhận Đã đóng"}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
