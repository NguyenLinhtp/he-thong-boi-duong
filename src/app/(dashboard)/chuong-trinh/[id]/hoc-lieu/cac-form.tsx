"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { Input } from "@/components/ui/input";
import type { KetQuaThaoTac } from "./actions";

const NHAN_LOAI = { TAI_LIEU: "Tài liệu (docx, pdf…)", SLIDE: "Slide bài giảng", THONG_TIN: "Thông tin (info)", VIDEO: "Video" } as const;
type Loai = keyof typeof NHAN_LOAI;
const ACCEPT: Record<Loai, string> = {
  TAI_LIEU: ".doc,.docx,.pdf,.xls,.xlsx,.txt,.zip,.rar,.7z",
  SLIDE: ".ppt,.pptx,.pdf",
  THONG_TIN: ".jpg,.jpeg,.png,.pdf,.doc,.docx",
  VIDEO: ".mp4,.webm",
};

export function ThongBao({ kq }: { kq: KetQuaThaoTac }) {
  if (!kq?.loi && !kq?.ok) return null;
  return <p className={kq.loi ? "text-sm text-destructive" : "text-sm text-success"}>{kq.loi ?? kq.ok}</p>;
}

/** Thêm 1 mục học liệu (tệp / link / nội dung) - gửi multipart tới API vì video có thể lớn. */
export function FormThemHocLieu({ hocPhanId }: { hocPhanId: string }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [loai, setLoai] = useState<Loai>("TAI_LIEU");
  const [kieu, setKieu] = useState<"tep" | "link" | "noiDung">("tep");
  const [dangGui, setDangGui] = useState(false);
  const [kq, setKq] = useState<KetQuaThaoTac>();

  async function gui(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const duLieu = new FormData(form);
    duLieu.set("hocPhanId", hocPhanId);
    if (kieu !== "tep") duLieu.delete("tep");
    if (kieu !== "link") duLieu.delete("duongLink");
    setDangGui(true);
    setKq(undefined);
    try {
      const res = await fetch("/api/ct/hoc-lieu", { method: "POST", body: duLieu });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setKq({ loi: json.message ?? "Không thêm được học liệu" });
      form.reset();
      setKq({ ok: `Đã thêm “${json.tieuDe}”.` });
      router.refresh();
    } finally {
      setDangGui(false);
    }
  }

  if (!mo) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setMo(true)} className="self-start">
        + Thêm học liệu
      </Button>
    );
  }
  return (
    <form onSubmit={gui} className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3">
      <div className="flex flex-wrap gap-2">
        <select
          name="loai"
          value={loai}
          onChange={(e) => {
            const l = e.target.value as Loai;
            setLoai(l);
            if (l !== "THONG_TIN" && kieu === "noiDung") setKieu("tep");
          }}
          className="h-8 rounded-lg border px-2 text-sm"
          aria-label="Loại học liệu"
        >
          {Object.entries(NHAN_LOAI).map(([ma, nhan]) => (
            <option key={ma} value={ma}>
              {nhan}
            </option>
          ))}
        </select>
        <Input name="tieuDe" required placeholder="Tiêu đề" className="w-72" />
        <Input name="moTa" placeholder="Mô tả ngắn (không bắt buộc)" className="w-72" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={kieu === "tep"} onChange={() => setKieu("tep")} /> Tải tệp lên
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={kieu === "link"} onChange={() => setKieu("link")} />
          {loai === "VIDEO" ? "Link YouTube/Google Drive" : "Đường link"}
        </label>
        {loai === "THONG_TIN" && (
          <label className="flex items-center gap-1">
            <input type="radio" checked={kieu === "noiDung"} onChange={() => setKieu("noiDung")} /> Soạn nội dung
          </label>
        )}
      </div>
      {kieu === "tep" && <ChonTep name="tep" required accept={ACCEPT[loai]} goiY={ACCEPT[loai]} className="max-w-xl" />}
      {kieu === "link" && <Input name="duongLink" type="url" required placeholder="https://..." className="max-w-xl" />}
      {kieu === "noiDung" && <textarea name="noiDung" required rows={4} className="rounded-lg border p-2 text-sm" placeholder="Nội dung thông tin" />}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={dangGui}>
          {dangGui ? "Đang tải lên..." : "Thêm"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMo(false)}>
          Đóng
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}

/** Nút gọi 1 server action đơn giản (xóa, đổi thứ tự), có hỏi xác nhận nếu cần. */
export function NutThaoTac({
  hanhDong,
  nhan,
  xacNhan,
  bienThe = "ghost",
  tieuDe,
}: {
  hanhDong: () => Promise<KetQuaThaoTac>;
  nhan: React.ReactNode;
  xacNhan?: string;
  bienThe?: "ghost" | "destructive" | "outline";
  tieuDe?: string;
}) {
  const [dangChay, startTransition] = useTransition();
  const [loi, setLoi] = useState<string>();
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        type="button"
        size="xs"
        variant={bienThe}
        disabled={dangChay}
        title={tieuDe}
        aria-label={tieuDe}
        onClick={() => {
          if (xacNhan && !confirm(xacNhan)) return;
          startTransition(async () => setLoi((await hanhDong())?.loi));
        }}
      >
        {nhan}
      </Button>
      {loi && <span className="text-xs text-destructive">{loi}</span>}
    </span>
  );
}

/** Tính điểm + hệ số dùng chung cho bài trắc nghiệm và yêu cầu sản phẩm. */
export function TruongTinhDiem({ tinhDiem = false, heSo = 1 }: { tinhDiem?: boolean; heSo?: number }) {
  const [tinh, setTinh] = useState(tinhDiem);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-1.5">
        <input type="checkbox" name="tinhDiem" checked={tinh} onChange={(e) => setTinh(e.target.checked)} />
        Tính vào điểm đánh giá
      </label>
      {tinh && (
        <label className="flex items-center gap-1.5">
          Hệ số
          <Input name="heSo" type="number" min={0.1} max={99} step={0.1} defaultValue={heSo} className="h-8 w-20" />
        </label>
      )}
      {!tinh && <span className="text-xs text-muted-foreground">Chỉ để học viên tự kiểm tra</span>}
    </div>
  );
}

export function FormTaoBai({ hanhDong }: { hanhDong: (t: KetQuaThaoTac, f: FormData) => Promise<KetQuaThaoTac> }) {
  const [kq, formAction, dangLuu] = useActionState(hanhDong, undefined);
  const [mo, setMo] = useState(false);
  if (!mo) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setMo(true)} className="self-start">
        + Thêm bài trắc nghiệm
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3">
      <div className="flex flex-wrap gap-2">
        <Input name="tieuDe" required placeholder="Tên bài (VD: Kiểm tra chuyên đề 1)" className="w-72" />
        <Input name="thoiGianPhut" type="number" min={1} placeholder="Thời gian (phút)" className="w-36" />
        <Input name="soLanToiDa" type="number" min={1} placeholder="Số lần làm tối đa" className="w-40" />
      </div>
      <TruongTinhDiem />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={dangLuu}>
          Tạo bài
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMo(false)}>
          Đóng
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}

export function FormYeuCauSanPham({ hanhDong }: { hanhDong: (t: KetQuaThaoTac, f: FormData) => Promise<KetQuaThaoTac> }) {
  const [kq, formAction, dangLuu] = useActionState(hanhDong, undefined);
  const [mo, setMo] = useState(false);
  if (!mo) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setMo(true)} className="self-start">
        + Thêm yêu cầu sản phẩm
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 p-3">
      <Input name="tieuDe" required placeholder="Tên sản phẩm (VD: Kế hoạch bài dạy minh họa)" className="max-w-xl" />
      <textarea name="moTa" rows={3} className="max-w-xl rounded-lg border p-2 text-sm" placeholder="Yêu cầu, tiêu chí đánh giá (không bắt buộc)" />
      <TruongTinhDiem />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={dangLuu}>
          Thêm yêu cầu
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMo(false)}>
          Đóng
        </Button>
        <ThongBao kq={kq} />
      </div>
    </form>
  );
}
