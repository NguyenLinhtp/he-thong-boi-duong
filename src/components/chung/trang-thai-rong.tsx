import { Inbox } from "lucide-react";

// Trạng thái rỗng thống nhất (đặc tả 3.5): icon outline căn giữa + chữ xám nhạt
export function TrangThaiRong({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
      <Inbox className="size-10 stroke-1" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
