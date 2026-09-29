"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { batDauLamBaiAction, danhDauHoanThanhAction, nopBaiAction } from "./actions";

/** Đánh dấu hoàn thành (1 lần) rồi làm mới thanh trái để cập nhật tiến độ. */
function useDanhDau(khoaId: string, mucKey: string) {
  const router = useRouter();
  const daGui = useRef(false);
  return useCallback(() => {
    if (daGui.current) return;
    daGui.current = true;
    danhDauHoanThanhAction(khoaId, mucKey).then((kq) => kq.duLieu && router.refresh());
  }, [khoaId, mucKey, router]);
}

/** Tài liệu/slide/thông tin: hoàn thành sau khi mở xem đủ số giây. */
export function TuDongHoanThanh({ khoaId, mucKey, giay = 30 }: { khoaId: string; mucKey: string; giay?: number }) {
  const danhDau = useDanhDau(khoaId, mucKey);
  useEffect(() => {
    const hen = setTimeout(danhDau, giay * 1000);
    return () => clearTimeout(hen);
  }, [danhDau, giay]);
  return null;
}

/** Video tải lên: hoàn thành khi đã xem tới ≥ 90% thời lượng. */
export function VideoTheoDoi({ src, khoaId, mucKey, capNhat }: { src: string; khoaId: string; mucKey: string; capNhat: boolean }) {
  const danhDau = useDanhDau(khoaId, mucKey);
  return (
    <video
      src={src}
      controls
      preload="metadata"
      className="max-h-full w-full rounded-lg bg-black"
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (capNhat && v.duration && v.currentTime / v.duration >= 0.9) danhDau();
      }}
    />
  );
}

/** Link ngoài / video YouTube: học viên tự đánh dấu đã xem. Tải về cũng tính là đã xem. */
export function NutDanhDau({ khoaId, mucKey, daXong, nhan = "Đánh dấu đã xem" }: { khoaId: string; mucKey: string; daXong: boolean; nhan?: string }) {
  const danhDau = useDanhDau(khoaId, mucKey);
  if (daXong) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-success">
        <CheckCircle2 className="size-4" /> Đã hoàn thành
      </span>
    );
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={danhDau}>
      {nhan}
    </Button>
  );
}

export function LienKetTaiVe({ href, khoaId, mucKey, capNhat, children }: { href: string; khoaId: string; mucKey: string; capNhat: boolean; children: React.ReactNode }) {
  const danhDau = useDanhDau(khoaId, mucKey);
  return (
    <a href={href} onClick={() => capNhat && danhDau()} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
      {children}
    </a>
  );
}

type CauHoi = { id: string; noiDung: string; phuongAn: string[]; nhieuDapAn: boolean };
type LanLam = { lanLamId: string; hetHanLuc: string | null; cauHois: CauHoi[] };
const CHU = ["A", "B", "C", "D", "E", "F"];

function DongHo({ hetHanLuc, khiHet }: { hetHanLuc: string; khiHet: () => void }) {
  const [conLai, setConLai] = useState(() => new Date(hetHanLuc).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const c = new Date(hetHanLuc).getTime() - Date.now();
      setConLai(c);
      if (c <= 0) {
        clearInterval(t);
        khiHet();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [hetHanLuc, khiHet]);
  const giay = Math.max(0, Math.floor(conLai / 1000));
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-sm ${giay < 60 ? "text-destructive" : ""}`}>
      <Clock className="size-4" /> {String(Math.floor(giay / 60)).padStart(2, "0")}:{String(giay % 60).padStart(2, "0")}
    </span>
  );
}

/** Làm bài trắc nghiệm ngay trong màn hình học: bắt đầu -> trả lời -> nộp (tự nộp khi hết giờ). */
export function LamTracNghiem({ khoaId, baiId, duocLam, conLuot }: { khoaId: string; baiId: string; duocLam: boolean; conLuot: boolean }) {
  const router = useRouter();
  const [lan, setLan] = useState<LanLam | null>(null);
  const [traLoi, setTraLoi] = useState<Record<string, number[]>>({});
  const [ketQua, setKetQua] = useState<{ soCauDung: number; tongSoCau: number; diem: number } | null>(null);
  const [loi, setLoi] = useState<string>();
  const [dangChay, startTransition] = useTransition();
  // bản trả lời mới nhất cho lần tự nộp khi hết giờ (hàm hẹn giờ giữ closure cũ)
  const traLoiRef = useRef(traLoi);
  useEffect(() => {
    traLoiRef.current = traLoi;
  }, [traLoi]);

  const nop = () =>
    startTransition(async () => {
      if (!lan) return;
      const kq = await nopBaiAction(khoaId, lan.lanLamId, traLoiRef.current);
      if (kq.loi) return setLoi(kq.loi);
      setKetQua(kq.duLieu!);
      setLan(null);
      router.refresh();
    });

  if (ketQua) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-green-50 p-4">
        <p className="text-lg font-bold text-success">
          Kết quả: {ketQua.soCauDung}/{ketQua.tongSoCau} câu đúng · {ketQua.diem.toLocaleString("vi-VN")} điểm
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setKetQua(null)}>
          Đóng
        </Button>
      </div>
    );
  }

  if (!lan) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          disabled={!duocLam || !conLuot || dangChay}
          onClick={() =>
            startTransition(async () => {
              const kq = await batDauLamBaiAction(khoaId, baiId);
              if (kq.loi) return setLoi(kq.loi);
              setTraLoi({});
              setLan(kq.duLieu!);
            })
          }
        >
          {dangChay ? "Đang mở bài..." : "Bắt đầu làm bài"}
        </Button>
        {!duocLam && <p className="text-sm text-muted-foreground">Hiện không làm bài được (khóa chưa vào học, đã phê duyệt kết quả hoặc bạn đang xem với vai trò giảng viên).</p>}
        {duocLam && !conLuot && <p className="text-sm text-muted-foreground">Bạn đã dùng hết số lần làm bài.</p>}
        {loi && <p className="text-sm text-destructive">{loi}</p>}
      </div>
    );
  }

  const soDaTraLoi = lan.cauHois.filter((c) => (traLoi[c.id] ?? []).length > 0).length;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (soDaTraLoi < lan.cauHois.length && !confirm(`Còn ${lan.cauHois.length - soDaTraLoi} câu chưa trả lời. Nộp bài?`)) return;
        nop();
      }}
      className="flex flex-col gap-4"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-white px-3 py-2 shadow-sm">
        <span className="text-sm">
          Đã trả lời {soDaTraLoi}/{lan.cauHois.length} câu
        </span>
        {lan.hetHanLuc && <DongHo hetHanLuc={lan.hetHanLuc} khiHet={nop} />}
      </div>
      {lan.cauHois.map((c, i) => (
        <fieldset key={c.id} className="rounded-lg border bg-white p-4">
          <legend className="px-1 text-sm font-bold">Câu {i + 1}</legend>
          <p className="mb-2 whitespace-pre-line">
            {c.noiDung} {c.nhieuDapAn && <span className="text-xs text-muted-foreground">(chọn tất cả đáp án đúng)</span>}
          </p>
          <div className="flex flex-col gap-1.5">
            {c.phuongAn.map((pa, j) => (
              <label key={j} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 hover:bg-muted/60">
                <input
                  type={c.nhieuDapAn ? "checkbox" : "radio"}
                  name={c.id}
                  checked={(traLoi[c.id] ?? []).includes(j)}
                  onChange={(e) =>
                    setTraLoi((cu) => {
                      const hienTai = cu[c.id] ?? [];
                      const moi = c.nhieuDapAn ? (e.target.checked ? [...hienTai, j] : hienTai.filter((x) => x !== j)) : [j];
                      return { ...cu, [c.id]: moi };
                    })
                  }
                  className="mt-1"
                />
                <span>
                  <b>{CHU[j]}.</b> {pa}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {loi && <p className="text-sm text-destructive">{loi}</p>}
      <Button type="submit" disabled={dangChay} className="self-start">
        {dangChay ? "Đang nộp..." : "Nộp bài"}
      </Button>
    </form>
  );
}

/** Nộp sản phẩm cuối khóa (tệp), nộp lại được khi chưa chấm. */
export function NopSanPham({ khoaId, yeuCauId, duocNop }: { khoaId: string; yeuCauId: string; duocNop: boolean }) {
  const router = useRouter();
  const [dangGui, setDangGui] = useState(false);
  const [kq, setKq] = useState<{ loi?: string; ok?: string }>({});
  if (!duocNop) return null;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const duLieu = new FormData(form);
        duLieu.set("khoaId", khoaId);
        duLieu.set("yeuCauId", yeuCauId);
        setDangGui(true);
        setKq({});
        try {
          const res = await fetch("/api/gd/san-pham", { method: "POST", body: duLieu });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) return setKq({ loi: json.message ?? "Không nộp được sản phẩm" });
          form.reset();
          setKq({ ok: `Đã nộp “${json.tenFile}”.` });
          router.refresh();
        } finally {
          setDangGui(false);
        }
      }}
      className="flex flex-col gap-2 rounded-lg border bg-white p-4"
    >
      <input type="file" name="tep" required className="text-sm" aria-label="Tệp sản phẩm" />
      <Input name="ghiChu" placeholder="Ghi chú cho giảng viên (không bắt buộc)" />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={dangGui}>
          {dangGui ? "Đang tải lên..." : "Nộp sản phẩm"}
        </Button>
        {kq.loi && <span className="text-sm text-destructive">{kq.loi}</span>}
        {kq.ok && <span className="text-sm text-success">{kq.ok}</span>}
      </div>
    </form>
  );
}
