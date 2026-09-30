"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BienTapFormDangKy } from "@/components/dang-ky/bien-tap-form-dang-ky";
import type { CauHinhForm } from "@/lib/form-dang-ky";
import { luuFormDangKyKhoaAction } from "./actions";

const NHAN_NGUON = {
  KHOA: "form riêng của khóa",
  CHUONG_TRINH: "form của chương trình",
  MAC_DINH: "form mặc định (chương trình chưa cấu hình)",
} as const;

/** Form đăng ký của khóa (bổ sung 30/09/2026): kế thừa chương trình hoặc sửa riêng. */
export function KhoiFormDangKy({
  khoaId,
  chuongTrinhId,
  nguon,
  cauHinh,
  dsChucDanh,
  duocSua,
}: {
  khoaId: string;
  chuongTrinhId: string;
  nguon: keyof typeof NHAN_NGUON;
  cauHinh: CauHinhForm;
  dsChucDanh: { id: string; ten: string }[];
  duocSua: boolean;
}) {
  const [loi, setLoi] = useState<string>();
  const [dangXuLy, batDau] = useTransition();
  const hien = cauHinh.truong.filter((t) => t.hien);
  const doi = (json: string | null) =>
    batDau(async () => {
      setLoi(await luuFormDangKyKhoaAction(khoaId, json));
    });

  return (
    <details open={nguon === "KHOA"} className="group rounded-lg border bg-card p-4 shadow-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-base font-bold text-ued-blue-dam">Form đăng ký của khóa</h2>
        <span className="text-sm text-muted-foreground">
          Đang dùng <b className="text-foreground">{NHAN_NGUON[nguon]}</b> · {hien.length + 2} trường,{" "}
          {hien.filter((t) => t.batBuoc).length + 2} bắt buộc
          {hien.some((t) => t.kieu === "TEP") && `, ${hien.filter((t) => t.kieu === "TEP").length} tệp minh chứng`}
        </span>
        <span className="ml-auto text-xs text-primary group-open:hidden">Xem / sửa ▾</span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {nguon === "KHOA" ? (
            <>
              <span>Khóa có form riêng (vd. khóa đặt hàng có danh sách đơn vị riêng).</span>
              {duocSua && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={dangXuLy}
                  onClick={() => confirm("Bỏ form riêng, dùng lại form của chương trình?") && doi(null)}
                >
                  Dùng lại form của chương trình
                </Button>
              )}
            </>
          ) : (
            <>
              <span>
                Sửa chung cho mọi khóa ở{" "}
                <Link href={`/chuong-trinh/${chuongTrinhId}/form-dang-ky`} className="underline">
                  chương trình
                </Link>
                .
              </span>
              {duocSua && (
                <Button type="button" variant="outline" size="sm" disabled={dangXuLy} onClick={() => doi(JSON.stringify(cauHinh))}>
                  Sửa riêng cho khóa này
                </Button>
              )}
            </>
          )}
          {loi && <span className="text-destructive">{loi}</span>}
        </div>
        <BienTapFormDangKy
          // key theo nguồn: chuyển kế thừa <-> riêng thì dựng lại trình biên tập
          key={nguon}
          cauHinh={cauHinh}
          dsChucDanh={dsChucDanh}
          onLuu={nguon === "KHOA" && duocSua ? (json) => luuFormDangKyKhoaAction(khoaId, json) : undefined}
          chiXem={nguon !== "KHOA" || !duocSua}
        />
      </div>
    </details>
  );
}
