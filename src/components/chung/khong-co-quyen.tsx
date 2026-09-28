import { ShieldX } from "lucide-react";

// Thông báo bị chặn quyền (requirePermission ném KhongCoQuyenError) dùng chung mọi trang
export function KhongCoQuyen({ thongBao }: { thongBao: string }) {
  return (
    <div className="p-4 md:p-6 lg:px-8">
      <div
        role="alert"
        className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center shadow-sm"
      >
        <ShieldX className="size-12 text-destructive" aria-hidden />
        <p className="font-medium text-destructive">{thongBao}</p>
        <p className="text-sm text-muted-foreground">
          Liên hệ quản trị hệ thống nếu bạn cần được cấp quyền chức năng này.
        </p>
      </div>
    </div>
  );
}
