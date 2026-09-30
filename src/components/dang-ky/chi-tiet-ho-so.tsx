import { FileText } from "lucide-react";
import type { HoSoBoSungRutGon } from "@/server/services/hv/form-dang-ky";

/** Thông tin bổ sung + tệp minh chứng của 1 hồ sơ đăng ký (bảng cán bộ - bổ sung 30/09/2026). */
export function ChiTietHoSo({ hoSo, thieu }: { hoSo?: HoSoBoSungRutGon; thieu?: string[] }) {
  const coGi = (hoSo?.thongTin.length ?? 0) + (hoSo?.tep.length ?? 0) > 0;
  if (!coGi && !thieu?.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col gap-1 text-xs">
      {hoSo?.thongTin.map((m) => (
        <span key={m.ma}>
          <span className="text-muted-foreground">{m.nhan}:</span>{" "}
          {m.kieu === "NGAY" ? new Date(m.giaTri).toLocaleDateString("vi-VN") : m.giaTri}
        </span>
      ))}
      {hoSo?.tep.map((t) => (
        <a key={t.id} href={`/api/hv/tep-ho-so/${t.id}?xem=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
          <FileText className="size-3.5 shrink-0" aria-hidden />
          {t.nhan}
        </a>
      ))}
      {thieu && thieu.length > 0 && (
        <span className="w-fit rounded bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">Thiếu: {thieu.join(", ")}</span>
      )}
    </div>
  );
}
