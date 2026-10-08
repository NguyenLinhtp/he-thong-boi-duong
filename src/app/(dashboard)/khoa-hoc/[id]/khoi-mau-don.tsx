"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BienTapMauDon } from "@/components/mau-in/bien-tap-mau-in";
import type { MauDonDangKy } from "@/lib/mau-in";
import { luuMauDonKhoaAction } from "./actions";

const NHAN_NGUON = {
  KHOA: "mẫu riêng của khóa",
  CHUONG_TRINH: "mẫu của chương trình",
  MAC_DINH: "mẫu mặc định (chương trình chưa đặt mẫu)",
} as const;

/** (bổ sung 07/10/2026) Mẫu đơn đăng ký của khóa: kế thừa chương trình hoặc sửa riêng (vd. địa điểm, căn cứ của đợt). */
export function KhoiMauDon({
  khoaId,
  chuongTrinhId,
  nguon,
  mau,
  laDuThi,
  bien,
  duocSua,
}: {
  khoaId: string;
  chuongTrinhId: string;
  nguon: keyof typeof NHAN_NGUON;
  mau: MauDonDangKy;
  laDuThi: boolean;
  bien: Record<string, string>;
  duocSua: boolean;
}) {
  const [dangXuLy, batDau] = useTransition();
  return (
    <details open={nguon === "KHOA"} className="group rounded-lg border bg-card p-4 shadow-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-base font-bold text-ued-blue-dam">Mẫu đơn đăng ký của khóa</h2>
        <span className="text-sm text-muted-foreground">
          Đang dùng <b className="text-foreground">{NHAN_NGUON[nguon]}</b> · {mau.tieuDe}
        </span>
        <span className="ml-auto text-xs text-primary group-open:hidden">Xem / sửa ▾</span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        {nguon !== "KHOA" && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Sửa chung cho mọi khóa ở{" "}
              <Link href={`/chuong-trinh/${chuongTrinhId}/mau-in`} className="underline">
                chương trình
              </Link>
              .
            </span>
            {duocSua && (
              <Button type="button" variant="outline" size="sm" disabled={dangXuLy} onClick={() => batDau(async () => void (await luuMauDonKhoaAction(khoaId, JSON.stringify(mau))))}>
                Sửa riêng cho khóa này
              </Button>
            )}
          </div>
        )}
        <BienTapMauDon
          key={nguon}
          mauBanDau={mau}
          laDuThi={laDuThi}
          bien={bien}
          onLuu={nguon === "KHOA" && duocSua ? (json) => luuMauDonKhoaAction(khoaId, json) : undefined}
          nhanVeGoc="Dùng lại mẫu của chương trình"
        />
      </div>
    </details>
  );
}
