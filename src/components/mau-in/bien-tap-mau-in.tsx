"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BIEN_MAU_BIEN_LAI,
  BIEN_MAU_DON,
  MAU_BIEN_LAI_MAC_DINH,
  NHAN_TRUONG_MAU_BIEN_LAI,
  NHAN_TRUONG_MAU_DON,
  mauDonMacDinh,
  thayBien,
  type MauBienLai,
  type MauDonDangKy,
} from "@/lib/mau-in";
import { BanInDonDangKy, duLieuDonMau } from "./ban-in-don-dang-ky";
import { BanInBienLai } from "./ban-in-bien-lai";

const NHIEU_DONG = new Set(["canCu", "camKet", "ghiChu", "canCuMau", "noiDungThu"]);

function KhungBienTap<T extends Record<string, string | boolean>>({
  mau,
  setMau,
  nhan,
  dsBien,
  chiXem,
  xemTruoc,
  hanhDong,
}: {
  mau: T;
  setMau: (m: T) => void;
  nhan: Record<keyof T, string>;
  dsBien: Record<string, string>;
  chiXem: boolean;
  xemTruoc: ReactNode;
  hanhDong: ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-3">
        {(Object.keys(nhan) as (keyof T & string)[]).map((k) => {
          const v = mau[k];
          if (typeof v === "boolean") {
            return (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={v} disabled={chiXem} onChange={(e) => setMau({ ...mau, [k]: e.target.checked })} />
                {nhan[k]}
              </label>
            );
          }
          return (
            <div key={k} className="flex flex-col gap-1">
              <Label htmlFor={`mau-${k}`}>{nhan[k]}</Label>
              {NHIEU_DONG.has(k) ? (
                <textarea
                  id={`mau-${k}`}
                  value={v}
                  readOnly={chiXem}
                  rows={k === "canCu" || k === "ghiChu" ? 3 : 2}
                  onChange={(e) => setMau({ ...mau, [k]: e.target.value })}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
              ) : (
                <Input id={`mau-${k}`} value={v} readOnly={chiXem} onChange={(e) => setMau({ ...mau, [k]: e.target.value })} />
              )}
            </div>
          );
        })}
        <details className="rounded-md border bg-muted/30 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Biến chèn được vào các ô chữ</summary>
          <ul className="mt-2 grid gap-1">
            {Object.entries(dsBien).map(([ten, moTa]) => (
              <li key={ten}>
                <code className="rounded bg-muted px-1">{`{{${ten}}}`}</code> - {moTa}
              </li>
            ))}
          </ul>
        </details>
        {!chiXem && <div className="flex flex-wrap items-center gap-3">{hanhDong}</div>}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Xem trước (dữ liệu mẫu)</p>
        <div className="overflow-x-auto rounded-lg border shadow-sm">{xemTruoc}</div>
      </div>
    </div>
  );
}

function useLuu(onLuu?: (json: string | null) => Promise<string | undefined>) {
  const [thongBao, setThongBao] = useState<{ loi: boolean; text: string }>();
  const [dangLuu, batDau] = useTransition();
  const luu = (json: string | null, xong: string) =>
    batDau(async () => {
      const loi = await onLuu?.(json);
      setThongBao(loi ? { loi: true, text: loi } : { loi: false, text: xong });
    });
  const nhanThongBao = thongBao && <span className={thongBao.loi ? "text-sm text-destructive" : "text-sm text-success"}>{thongBao.text}</span>;
  return { luu, dangLuu, nhanThongBao };
}

/** (bổ sung 07/10/2026) Biên tập mẫu đơn đăng ký - chương trình hoặc khóa (sửa riêng). */
export function BienTapMauDon({
  mauBanDau,
  laDuThi,
  bien,
  onLuu,
  chiXem = false,
  nhanVeGoc = "Về mẫu mặc định",
}: {
  mauBanDau: MauDonDangKy;
  laDuThi: boolean;
  bien: Record<string, string>;
  onLuu?: (json: string | null) => Promise<string | undefined>;
  chiXem?: boolean;
  nhanVeGoc?: string;
}) {
  const [mau, setMau] = useState(mauBanDau);
  const { luu, dangLuu, nhanThongBao } = useLuu(onLuu);
  return (
    <KhungBienTap
      mau={mau}
      setMau={setMau}
      nhan={NHAN_TRUONG_MAU_DON}
      dsBien={BIEN_MAU_DON}
      chiXem={chiXem || !onLuu}
      xemTruoc={<BanInDonDangKy mau={mau} bien={bien} duLieu={duLieuDonMau(laDuThi)} />}
      hanhDong={
        <>
          <Button type="button" disabled={dangLuu} onClick={() => luu(JSON.stringify(mau), "Đã lưu mẫu đơn")}>
            {dangLuu ? "Đang lưu..." : "Lưu mẫu đơn"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={dangLuu}
            onClick={() => {
              if (!confirm(`${nhanVeGoc}? Nội dung đang sửa sẽ bị bỏ.`)) return;
              setMau(mauDonMacDinh(laDuThi));
              luu(null, "Đã chuyển về mẫu gốc");
            }}
          >
            {nhanVeGoc}
          </Button>
          {nhanThongBao}
        </>
      }
    />
  );
}

/** (bổ sung 07/10/2026) Biên tập mẫu biên lai thu tiền C45-BB của chương trình. */
export function BienTapMauBienLai({
  mauBanDau,
  bien,
  onLuu,
  chiXem = false,
}: {
  mauBanDau: MauBienLai;
  bien: Record<string, string>;
  onLuu?: (json: string | null) => Promise<string | undefined>;
  chiXem?: boolean;
}) {
  const [mau, setMau] = useState(mauBanDau);
  const { luu, dangLuu, nhanThongBao } = useLuu(onLuu);
  const bienMau = { ...bien, noiDung: "Đăng ký thi 450.000đ, Đăng ký ôn thi 300.000đ" };
  const thay = (s: string) => (s.trim() ? thayBien(s, bienMau) : "");
  const nd = {
    ...(Object.fromEntries(Object.entries(mau).map(([k, v]) => [k, thay(v)])) as MauBienLai),
    nguoiNop: "Nguyễn Văn An",
    diaChi: "Lớp 22CNTT1",
  };
  return (
    <KhungBienTap
      mau={mau}
      setMau={setMau}
      nhan={NHAN_TRUONG_MAU_BIEN_LAI}
      dsBien={BIEN_MAU_BIEN_LAI}
      chiXem={chiXem || !onLuu}
      xemTruoc={<BanInBienLai nd={nd} soPhieu={`PT${new Date().getFullYear()}00001`} ngayLap={new Date()} soTien={750000} nguoiThuTen="Cán bộ tài chính" />}
      hanhDong={
        <>
          <Button type="button" disabled={dangLuu} onClick={() => luu(JSON.stringify(mau), "Đã lưu mẫu biên lai - áp dụng cho biên lai lập từ nay")}>
            {dangLuu ? "Đang lưu..." : "Lưu mẫu biên lai"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={dangLuu}
            onClick={() => {
              if (!confirm("Về mẫu biên lai mặc định? Nội dung đang sửa sẽ bị bỏ.")) return;
              setMau(MAU_BIEN_LAI_MAC_DINH);
              luu(null, "Đã chuyển về mẫu mặc định");
            }}
          >
            Về mẫu mặc định
          </Button>
          {nhanThongBao}
        </>
      }
    />
  );
}
