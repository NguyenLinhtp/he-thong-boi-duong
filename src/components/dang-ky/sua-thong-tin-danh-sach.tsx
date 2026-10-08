const NHAN: Record<string, string> = { hoTen: "Họ tên", soCCCD: "Số CCCD/hộ chiếu", lopSinhHoat: "Lớp" };

/**
 * (bổ sung 07/10/2026 - HV-05/HV-06) Thí sinh đã sửa thông tin tự điền từ danh sách sinh viên -
 * hiện giá trị cũ/mới để cán bộ đối chiếu khi thẩm định.
 */
export function SuaThongTinDanhSach({ sua, className }: { sua: unknown; className?: string }) {
  if (!sua || typeof sua !== "object") return null;
  const ds = Object.entries(sua as Record<string, { cu: string | null; moi: string | null }>);
  if (ds.length === 0) return null;
  return (
    <div className={`rounded border border-warning/40 bg-warning/10 px-2 py-1 text-xs ${className ?? ""}`}>
      <p className="font-semibold text-warning">Thí sinh sửa so với danh sách sinh viên:</p>
      {ds.map(([k, v]) => (
        <p key={k}>
          {NHAN[k] ?? k}: <span className="line-through opacity-70">{v.cu || "(trống)"}</span> → <b>{v.moi || "(trống)"}</b>
        </p>
      ))}
    </div>
  );
}
