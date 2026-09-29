"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardList, FileText, PlayCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Muc = { key: string; loai: "HL" | "GV" | "TN" | "SP"; tieuDe: string; nhanLoai: string; hoanThanh: boolean };
type ChuyenDe = { id: string; ten: string; soTiet: number; dsMuc: Muc[]; phanTram: number };

function IconMuc({ muc }: { muc: Muc }) {
  if (muc.hoanThanh) return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Đã hoàn thành" />;
  const Icon = muc.loai === "TN" ? ClipboardList : muc.loai === "SP" ? Upload : muc.nhanLoai.startsWith("VIDEO") ? PlayCircle : FileText;
  return <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />;
}

/** Thanh trái màn hình học: tab Tổng quan / Hoạt động học tập (đề mục theo chuyên đề). */
export function ThanhTrai({
  khoaId,
  dsChuyenDe,
  mucDangXem,
  tongQuan,
}: {
  khoaId: string;
  dsChuyenDe: ChuyenDe[];
  mucDangXem: string | null;
  tongQuan: React.ReactNode;
}) {
  const [tab, setTab] = useState<"tong-quan" | "hoat-dong">("hoat-dong");
  const chuyenDeDangXem = dsChuyenDe.find((cd) => cd.dsMuc.some((m) => m.key === mucDangXem))?.id;
  const [dong, setDong] = useState<Set<string>>(() => new Set(dsChuyenDe.filter((cd) => cd.id !== chuyenDeDangXem).map((cd) => cd.id)));

  return (
    <aside className="flex min-h-0 flex-col border-r bg-white">
      <div role="tablist" className="flex border-b px-2">
        {(
          [
            ["tong-quan", "Tổng quan"],
            ["hoat-dong", "Hoạt động học tập"],
          ] as const
        ).map(([ma, nhan]) => (
          <button
            key={ma}
            role="tab"
            aria-selected={tab === ma}
            onClick={() => setTab(ma)}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm",
              tab === ma ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {nhan}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "tong-quan" ? (
          <div className="p-4 text-sm">{tongQuan}</div>
        ) : dsChuyenDe.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chương trình chưa có học liệu.</p>
        ) : (
          <nav aria-label="Hoạt động học tập">
            {dsChuyenDe.map((cd, i) => {
              const moRong = !dong.has(cd.id);
              return (
                <section key={cd.id} className="border-b">
                  <button
                    type="button"
                    aria-expanded={moRong}
                    onClick={() =>
                      setDong((cu) => {
                        const moi = new Set(cu);
                        if (moi.has(cd.id)) moi.delete(cd.id);
                        else moi.add(cd.id);
                        return moi;
                      })
                    }
                    className="flex w-full items-start gap-2 px-3 py-3 text-left hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-ued-blue-dam uppercase">
                        {i + 1}. {cd.ten}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 rounded-full bg-muted">
                          <span className="block h-1.5 rounded-full bg-success" style={{ width: `${cd.phanTram}%` }} />
                        </span>
                        <span className="text-[11px] text-muted-foreground">{cd.phanTram}%</span>
                      </span>
                    </span>
                    <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", moRong && "rotate-180")} />
                  </button>
                  {moRong && (
                    <ul>
                      {cd.dsMuc.length === 0 && <li className="px-4 pb-3 text-xs text-muted-foreground">Chưa có mục nào.</li>}
                      {cd.dsMuc.map((m) => (
                        <li key={m.key}>
                          <Link
                            href={`/hoc/${khoaId}?muc=${m.key}`}
                            aria-current={m.key === mucDangXem ? "page" : undefined}
                            className={cn(
                              "flex gap-2 border-l-3 py-2 pr-3 pl-4 text-sm text-foreground hover:bg-muted/50",
                              m.key === mucDangXem ? "border-primary bg-secondary" : "border-transparent",
                            )}
                          >
                            <IconMuc muc={m} />
                            <span className="min-w-0">
                              <span className="block">{m.tieuDe}</span>
                              <span className="text-[11px] font-medium text-muted-foreground">{m.nhanLoai}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}
