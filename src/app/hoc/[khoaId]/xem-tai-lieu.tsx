"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

type TrangThai = { loai: "dang-tai" } | { loai: "xong" } | { loai: "loi"; thongBao: string; mauTep?: boolean };

/** Đọc lỗi JSON của API tệp (maLoi TEP_KHONG_CON = tệp đã mất trên máy chủ); không có thì dùng câu chung. */
async function loiTuPhanHoi(res: Response): Promise<TrangThai> {
  const json = (await res.json().catch(() => null)) as { message?: string; maLoi?: string } | null;
  return {
    loai: "loi",
    thongBao: json?.message ?? `Không mở được tài liệu (mã lỗi ${res.status}).`,
    mauTep: json?.maLoi === "TEP_KHONG_CON",
  };
}

function KhungLoi({ thongBao, children }: { thongBao: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-white p-6">
      <p className="inline-flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="size-5" /> {thongBao}
      </p>
      {children}
    </div>
  );
}

function DangTai({ nhan }: { nhan: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-lg border bg-white p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {nhan}
    </p>
  );
}

/**
 * (bổ sung 24/10/2026 - GD-04) PDF: kiểm tra tệp còn trên máy chủ (đọc 1 byte qua Range) trước khi
 * nhúng trình xem của trình duyệt - tệp mất thì báo rõ thay cho hộp lỗi "Failed to load PDF document".
 */
export function XemPdf({ api, tenFile, children }: { api: string; tenFile: string; children?: React.ReactNode }) {
  const [tt, setTt] = useState<TrangThai>({ loai: "dang-tai" });
  useEffect(() => {
    let huy = false;
    fetch(`${api}?xem=1`, { headers: { Range: "bytes=0-0" }, cache: "no-store" })
      .then(async (res) => {
        if (huy) return;
        setTt(res.ok ? { loai: "xong" } : await loiTuPhanHoi(res));
      })
      .catch(() => !huy && setTt({ loai: "loi", thongBao: "Không kết nối được máy chủ để mở tài liệu." }));
    return () => {
      huy = true;
    };
  }, [api]);

  if (tt.loai === "dang-tai") return <DangTai nhan="Đang mở tài liệu..." />;
  if (tt.loai === "loi") return <KhungLoi thongBao={tt.thongBao} />;
  return (
    <>
      {children}
      <iframe src={`${api}?xem=1#view=FitH`} title={tenFile} className="h-full min-h-[70vh] w-full rounded-lg border bg-white" />
    </>
  );
}

/**
 * (bổ sung 24/10/2026 - GD-04) DOCX: tải tệp qua API có kiểm tra quyền rồi dựng trang ngay trên màn
 * hình học (docx-preview, giữ định dạng/bảng biểu) - không đưa tệp ra dịch vụ xem ngoài. Lỗi dựng trang
 * (tệp hỏng/không phải DOCX) thì vẫn cho tải về.
 */
export function XemDocx({ api, children, taiVe }: { api: string; children?: React.ReactNode; taiVe: React.ReactNode }) {
  const khung = useRef<HTMLDivElement>(null);
  const [tt, setTt] = useState<TrangThai>({ loai: "dang-tai" });
  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const res = await fetch(api, { cache: "no-store" });
        if (!res.ok) {
          if (!huy) setTt(await loiTuPhanHoi(res));
          return;
        }
        const [duLieu, { renderAsync }] = await Promise.all([res.arrayBuffer(), import("docx-preview")]);
        if (huy || !khung.current) return;
        khung.current.innerHTML = "";
        await renderAsync(duLieu, khung.current, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          useBase64URL: true,
        });
        if (!huy) setTt({ loai: "xong" });
      } catch {
        if (!huy) setTt({ loai: "loi", thongBao: "Không hiển thị được tài liệu Word này trên trình duyệt - hãy tải về để mở." });
      }
    })();
    return () => {
      huy = true;
    };
  }, [api]);

  return (
    <div className="flex h-full flex-col gap-3">
      {tt.loai === "dang-tai" && <DangTai nhan="Đang mở tài liệu Word..." />}
      {tt.loai === "loi" && <KhungLoi thongBao={tt.thongBao}>{!tt.mauTep && taiVe}</KhungLoi>}
      {tt.loai === "xong" && (
        <>
          {children}
          <div className="flex justify-end">{taiVe}</div>
        </>
      )}
      <div ref={khung} className={tt.loai === "xong" ? "min-h-[70vh] overflow-auto rounded-lg border bg-muted" : "hidden"} />
    </div>
  );
}
