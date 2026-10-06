"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { nhapThamDinhAction, nhapXetDuyetAction } from "./actions";

/**
 * (bổ sung 05/10/2026) HV-06 thẩm định / HV-07 xét duyệt theo danh sách từ tệp:
 * tải danh sách Excel -> ghi kết quả -> tải lên cập nhật hàng loạt.
 */
export function FormTepDanhSach({ khoaId, loai }: { khoaId: string; loai: "tham-dinh" | "xet-duyet" }) {
  return loai === "tham-dinh" ? <FormThamDinhTuTep khoaId={khoaId} /> : <FormXetDuyetTuTep khoaId={khoaId} />;
}

function Khung({
  khoaId,
  duong,
  huongDan,
  dangXuLy,
  formAction,
  children,
}: {
  khoaId: string;
  duong: string;
  huongDan: string;
  dangXuLy: boolean;
  formAction: (fd: FormData) => void;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-medium">Cập nhật theo danh sách từ tệp Excel</summary>
      <div className="mt-3 flex flex-col gap-3">
        <ol className="list-decimal pl-5 text-muted-foreground">
          <li>
            <a href={`/api/hv/khoa/${khoaId}/${duong}`} className="inline-flex items-center gap-1 font-medium text-primary underline">
              <Download className="size-3.5" /> Tải danh sách
            </a>
          </li>
          <li>{huongDan}</li>
          <li>Tải tệp lên - có dòng lỗi thì không cập nhật dòng nào.</li>
        </ol>
        <form action={formAction} className="flex flex-col gap-3">
          <ChonTep name="file" accept=".xlsx,.csv" required nhan="Chọn tệp đã ghi kết quả" className="max-w-xl" />
          <div>
            <Button type="submit" disabled={dangXuLy}>
              {dangXuLy ? "Đang cập nhật..." : "Tải lên và cập nhật"}
            </Button>
          </div>
        </form>
        {children}
      </div>
    </details>
  );
}

function DongLoi({ loi, cacDongLoi }: { loi?: string; cacDongLoi?: { dong: number; loi: string }[] }) {
  return (
    <>
      {loi && <p className="text-destructive">{loi}</p>}
      {cacDongLoi && cacDongLoi.length > 0 && (
        <ul className="max-h-60 list-disc overflow-auto pl-5 text-destructive">
          {cacDongLoi.map((l, i) => (
            <li key={i}>
              Dòng {l.dong}: {l.loi}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FormThamDinhTuTep({ khoaId }: { khoaId: string }) {
  const [kq, formAction, dangXuLy] = useActionState(nhapThamDinhAction.bind(null, khoaId), undefined);
  return (
    <Khung
      khoaId={khoaId}
      duong="tham-dinh"
      huongDan='Ghi "Hợp lệ" hoặc "Không hợp lệ" ở cột Kết quả thẩm định (Không hợp lệ phải ghi Lý do; để trống = giữ nguyên).'
      dangXuLy={dangXuLy}
      formAction={formAction}
    >
      {kq?.ketQua && (
        <p className="text-success">
          Đã cập nhật: {kq.ketQua.hopLe} hồ sơ Hợp lệ, {kq.ketQua.khongHopLe} hồ sơ Không hợp lệ
          {kq.ketQua.khongDoi > 0 && `; ${kq.ketQua.khongDoi} dòng không đổi`}
          {kq.ketQua.boTrong > 0 && `; ${kq.ketQua.boTrong} dòng để trống (giữ nguyên)`}.
        </p>
      )}
      <DongLoi loi={kq?.loi} cacDongLoi={kq?.cacDongLoi} />
    </Khung>
  );
}

function FormXetDuyetTuTep({ khoaId }: { khoaId: string }) {
  const [kq, formAction, dangXuLy] = useActionState(nhapXetDuyetAction.bind(null, khoaId), undefined);
  return (
    <Khung
      khoaId={khoaId}
      duong="xet-duyet"
      huongDan='Ghi "Chính thức" ở cột Xét duyệt cho hồ sơ được duyệt (không vượt sĩ số còn lại ghi ở đầu tệp).'
      dangXuLy={dangXuLy}
      formAction={formAction}
    >
      {kq?.ketQua && (
        <div className="text-success">
          <p>
            Đã duyệt chính thức {kq.ketQua.daDuyet.length} hồ sơ
            {kq.ketQua.daDuyet.length > 0 && `: ${kq.ketQua.daDuyet.map((d) => d.hoTen).join(", ")}`}
            {kq.ketQua.daCoTruoc > 0 && `; ${kq.ketQua.daCoTruoc} hồ sơ đã chính thức từ trước`}.
          </p>
          {kq.ketQua.canhBao.length > 0 && (
            <ul className="list-disc pl-5 text-warning">
              {kq.ketQua.canhBao.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <DongLoi loi={kq?.loi} cacDongLoi={kq?.cacDongLoi} />
    </Khung>
  );
}
