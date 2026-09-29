"use client";

import { useActionState, useState } from "react";
import { phatHanhThongBaoAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FormThongBao({ khoaId, linkHienTai }: { khoaId: string; linkHienTai: string | null }) {
  const [trangThai, formAction, dangXuLy] = useActionState(phatHanhThongBaoAction, undefined);
  const [daChep, setDaChep] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        Link đăng ký công khai:
        {linkHienTai ? (
          <>
            <a href={linkHienTai} className="text-primary underline" target="_blank" rel="noreferrer">
              {linkHienTai}
            </a>
            {/* KH-06: cán bộ dán link vào bài đăng quảng bá trên website */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(linkHienTai);
                setDaChep(true);
                setTimeout(() => setDaChep(false), 2000);
              }}
            >
              {daChep ? "Đã sao chép ✓" : "Sao chép link"}
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground">
            Chưa có hiệu lực (khóa cần ở trạng thái Đang tuyển sinh và chưa đủ sĩ số)
          </span>
        )}
      </p>

      <form action={formAction} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <input type="hidden" name="khoaId" value={khoaId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="noiDung">Nội dung thông báo</Label>
          <textarea
            id="noiDung"
            name="noiDung"
            rows={3}
            className="rounded-lg border px-2 py-1.5 text-sm"
            placeholder="Nội dung thông báo mở khóa gửi qua website/email..."
          />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="kenhGui" value="WEBSITE" defaultChecked />
            Website
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="kenhGui" value="EMAIL" />
            Email
          </label>
        </div>
        <Button type="submit" disabled={dangXuLy} className="self-start">
          {dangXuLy ? "Đang phát hành..." : "Phát hành thông báo"}
        </Button>
        {trangThai?.loi && <p className="text-sm text-destructive">{trangThai.loi}</p>}
        {trangThai?.ketQua && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium">Đã soạn xong, gửi thủ công qua kênh đã chọn:</p>
            <p className="whitespace-pre-wrap">{trangThai.ketQua.noiDung}</p>
            <p className="mt-1">
              Link:{" "}
              <a href={trangThai.ketQua.link} className="text-primary underline" target="_blank" rel="noreferrer">
                {trangThai.ketQua.link}
              </a>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
