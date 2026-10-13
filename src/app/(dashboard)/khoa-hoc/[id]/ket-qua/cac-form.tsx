"use client";

import { useActionState, useState } from "react";
import {
  tongHopAction,
  xetHoanThanhAction,
  pheDuyetAction,
  nhapKetQuaThiAction,
  nhapDiemThiTuTepAction,
  datDieuKienDatKhoaAction,
  luuCauTrucDiemKhoaAction,
  nhapDiemThanhPhanAction,
  phucKhaoThanhPhanAction,
  type KetQuaNhapDiemTep,
  phucKhaoHocPhanAction,
  phucKhaoThiAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableHeader, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { BangPhanTrang } from "@/components/chung/bang-phan-trang";
import { ChonTep } from "@/components/chung/chon-tep";
import { BangCauTrucDiem, type CauHinhHienThi } from "@/components/ket-qua/bang-cau-truc-diem";

type TrangThaiAction = (prev: string | undefined, formData: FormData) => Promise<string | undefined>;

function NutHanhDong({ khoaId, action, nhan }: { khoaId: string; action: TrangThaiAction; nhan: string }) {
  const [loi, formAction, dangXuLy] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="khoaId" value={khoaId} />
      <Button type="submit" size="sm" disabled={dangXuLy} className="self-start">
        {dangXuLy ? "Đang xử lý..." : nhan}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

export function NutTongHop({ khoaId }: { khoaId: string }) {
  return <NutHanhDong khoaId={khoaId} action={tongHopAction} nhan="Tổng hợp kết quả toàn khóa" />;
}

export function NutXetHoanThanh({ khoaId }: { khoaId: string }) {
  return <NutHanhDong khoaId={khoaId} action={xetHoanThanhAction} nhan="Xét điều kiện hoàn thành" />;
}

export function FormPheDuyet({ khoaId }: { khoaId: string }) {
  const [loi, formAction, dangXuLy] = useActionState(pheDuyetAction, undefined);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        if (!confirm("Phê duyệt kết quả? Sau khi duyệt chỉ sửa điểm được theo quyết định phúc khảo.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="khoaId" value={khoaId} />
      <Input name="soQuyetDinh" placeholder="Số quyết định công nhận" required className="w-64" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        {dangXuLy ? "Đang lưu..." : "Phê duyệt kết quả"}
      </Button>
      {loi && <p className="w-full text-sm text-destructive">{loi}</p>}
    </form>
  );
}

export type ThiSinhDong = {
  hocVienId: string;
  maHocVien: string;
  hoTen: string;
  diemThi: number | null;
  // (bổ sung 13/10/2026) nhập theo danh sách phòng thi
  phong?: string | null;
  soBaoDanh?: number | null;
  maSinhVien?: string | null;
};

export function FormKetQuaThi({ khoaId, dsThiSinh, theoPhong = false }: { khoaId: string; dsThiSinh: ThiSinhDong[]; theoPhong?: boolean }) {
  const [loi, formAction, dangXuLy] = useActionState(nhapKetQuaThiAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      <BangPhanTrang
        dauBang={
          <TableHeader>
            <TableRow>
              {theoPhong && <TableHead>Phòng</TableHead>}
              {theoPhong && <TableHead>SBD</TableHead>}
              <TableHead>Mã hồ sơ</TableHead>
              {theoPhong && <TableHead>Mã sinh viên</TableHead>}
              <TableHead>Họ tên</TableHead>
              <TableHead>Điểm thi (0–10)</TableHead>
            </TableRow>
          </TableHeader>
        }
        giuDong
      >
        {dsThiSinh.map((ts) => (
          <TableRow key={ts.hocVienId}>
            {theoPhong && <TableCell>{ts.phong ?? <span className="text-muted-foreground">Chưa xếp phòng</span>}</TableCell>}
            {theoPhong && <TableCell className="font-mono">{ts.soBaoDanh != null ? String(ts.soBaoDanh).padStart(3, "0") : "—"}</TableCell>}
            <TableCell>{ts.maHocVien}</TableCell>
            {theoPhong && <TableCell>{ts.maSinhVien ?? "—"}</TableCell>}
            <TableCell>{ts.hoTen}</TableCell>
            <TableCell>
              <input type="hidden" name="hocVienId" value={ts.hocVienId} />
              <Input
                name={`diemThi_${ts.hocVienId}`}
                // (sửa 13/10/2026) ô chữ + inputMode số: nhận cả dấu phẩy, tự kiểm tra 0-10 và làm tròn 2 chữ số
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={ts.diemThi ?? ""}
                className="w-24 aria-invalid:border-destructive aria-invalid:ring-destructive/30"
                data-cot="thi"
                data-max={10}
                onKeyDown={sangODiemTiepTheo}
                onBlur={(e) => kiemTraODiem(e.currentTarget)}
                onInput={(e) => {
                  e.currentTarget.setCustomValidity("");
                  e.currentTarget.removeAttribute("aria-invalid");
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </BangPhanTrang>
      <Button type="submit" size="sm" disabled={dangXuLy || dsThiSinh.length === 0} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu kết quả thi"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

/**
 * (bổ sung 13/10/2026) nhập điểm từng thí sinh: Enter chuyển xuống ô điểm của thí sinh tiếp theo
 * (đang hiển thị) thay vì lưu form; ô cuối thì chuyển tới nút Lưu. Shift+Enter quay lên ô trước.
 */
/**
 * (bổ sung 13/10/2026) Kiểm tra 1 ô điểm thi: trống = chưa có điểm; nhận dấu phẩy thập phân; phải là số
 * từ 0 đến 10, làm tròn 2 chữ số rồi ghi lại vào ô. Sai thì báo ngay tại ô (chặn cả nút Lưu).
 */
function kiemTraODiem(o: HTMLInputElement) {
  const chu = o.value.trim().replace(",", ".");
  const toiDa = Number(o.dataset.max ?? 10);
  let loi = "";
  if (chu !== "") {
    const diem = Number(chu);
    if (!/^\d+(\.\d+)?$/.test(chu) || diem > toiDa) loi = `Điểm phải là số từ 0 đến ${toiDa}`;
    else o.value = String(Math.round(diem * 100) / 100);
  } else o.value = "";
  o.setCustomValidity(loi);
  if (loi) o.setAttribute("aria-invalid", "true");
  else o.removeAttribute("aria-invalid");
  return !loi;
}

function sangODiemTiepTheo(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  if (!kiemTraODiem(e.currentTarget)) {
    e.currentTarget.reportValidity();
    e.currentTarget.select();
    return;
  }
  const form = e.currentTarget.form;
  if (!form) return;
  // cùng cột điểm (bảng nhiều điểm thành phần: Enter đi xuống thí sinh tiếp theo trong cùng cột)
  const cot = e.currentTarget.dataset.cot;
  const dsO = Array.from(form.querySelectorAll<HTMLInputElement>(`input[data-cot="${cot}"]`)).filter((o) => o.offsetParent !== null);
  const viTri = dsO.indexOf(e.currentTarget) + (e.shiftKey ? -1 : 1);
  const tiep = dsO[viTri];
  if (tiep) {
    tiep.focus();
    tiep.select();
  } else if (!e.shiftKey) form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
}

export type ThanhPhanNhap = { ma: string; ten: string; diemToiDa: number };
export type ThiSinhDiemThanhPhan = Omit<ThiSinhDong, "diemThi"> & { diem: Record<string, number | null> };

function ODiem({ name, cot, toiDa, giaTri }: { name: string; cot: string; toiDa: number; giaTri: number | null | undefined }) {
  return (
    <Input
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      defaultValue={giaTri ?? ""}
      className="w-20 aria-invalid:border-destructive aria-invalid:ring-destructive/30"
      data-cot={cot}
      data-max={toiDa}
      onKeyDown={sangODiemTiepTheo}
      onBlur={(e) => kiemTraODiem(e.currentTarget)}
      onInput={(e) => {
        e.currentTarget.setCustomValidity("");
        e.currentTarget.removeAttribute("aria-invalid");
      }}
    />
  );
}

/** (bổ sung 13/10/2026) KQ-06 theo cấu trúc điểm: mỗi điểm thành phần 1 cột; điểm tổng + Đạt tự tính khi lưu. */
export function FormDiemThanhPhan({
  khoaId,
  thanhPhans,
  dsThiSinh,
  theoPhong = false,
}: {
  khoaId: string;
  thanhPhans: ThanhPhanNhap[];
  dsThiSinh: ThiSinhDiemThanhPhan[];
  theoPhong?: boolean;
}) {
  const [loi, formAction, dangXuLy] = useActionState(nhapDiemThanhPhanAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="khoaId" value={khoaId} />
      {thanhPhans.map((tp) => (
        <input key={tp.ma} type="hidden" name="maThanhPhan" value={tp.ma} />
      ))}
      <BangPhanTrang
        dauBang={
          <TableHeader>
            <TableRow>
              {theoPhong && <TableHead>Phòng</TableHead>}
              {theoPhong && <TableHead>SBD</TableHead>}
              <TableHead>Mã hồ sơ</TableHead>
              {theoPhong && <TableHead>Mã sinh viên</TableHead>}
              <TableHead>Họ tên</TableHead>
              {thanhPhans.map((tp) => (
                <TableHead key={tp.ma}>
                  {tp.ten} <span className="text-xs font-normal text-muted-foreground">(0–{tp.diemToiDa})</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        }
        giuDong
      >
        {dsThiSinh.map((ts) => (
          <TableRow key={ts.hocVienId}>
            {theoPhong && <TableCell>{ts.phong ?? <span className="text-muted-foreground">Chưa xếp phòng</span>}</TableCell>}
            {theoPhong && <TableCell className="font-mono">{ts.soBaoDanh != null ? String(ts.soBaoDanh).padStart(3, "0") : "—"}</TableCell>}
            <TableCell>{ts.maHocVien}</TableCell>
            {theoPhong && <TableCell>{ts.maSinhVien ?? "—"}</TableCell>}
            <TableCell>
              <input type="hidden" name="hocVienId" value={ts.hocVienId} />
              {ts.hoTen}
            </TableCell>
            {thanhPhans.map((tp) => (
              <TableCell key={tp.ma}>
                <ODiem name={`diem_${ts.hocVienId}_${tp.ma}`} cot={tp.ma} toiDa={tp.diemToiDa} giaTri={ts.diem[tp.ma]} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </BangPhanTrang>
      <Button type="submit" size="sm" disabled={dangXuLy || dsThiSinh.length === 0} className="self-start">
        {dangXuLy ? "Đang lưu..." : "Lưu kết quả thi"}
      </Button>
      {loi && <p className="text-sm text-destructive">{loi}</p>}
    </form>
  );
}

/** (bổ sung 13/10/2026) cấu trúc điểm của khóa: xem, sửa riêng (hoặc quay về theo chương trình). */
export function KhoiCauTrucDiemKhoa({
  khoaId,
  giaTri,
  laRieng,
  duocSua,
}: {
  khoaId: string;
  giaTri: CauHinhHienThi | null;
  laRieng: boolean;
  duocSua: boolean;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-primary">{duocSua ? "Xem / sửa điểm thành phần và điều kiện đạt của khóa" : "Xem điểm thành phần và điều kiện đạt"}</summary>
      <div className="mt-2">
        <BangCauTrucDiem
          key={JSON.stringify(giaTri)}
          giaTri={giaTri}
          luu={luuCauTrucDiemKhoaAction.bind(null, khoaId)}
          nhanBo={laRieng ? "Dùng lại cấu hình của chương trình" : undefined}
          moTaBo="Bỏ cấu hình riêng, khóa dùng lại điểm thành phần và điều kiện của chương trình?"
          duocSua={duocSua}
        />
      </div>
    </details>
  );
}

/** (bổ sung 13/10/2026) KQ-04 phúc khảo khóa có cấu trúc điểm: sửa từng điểm thành phần. */
export function FormPhucKhaoThanhPhan({
  khoaId,
  ketQuaId,
  thanhPhans,
  diem,
}: {
  khoaId: string;
  ketQuaId: string;
  thanhPhans: ThanhPhanNhap[];
  diem: Record<string, number | null>;
}) {
  const [mo, setMo] = useState(false);
  const [loi, formAction, dangXuLy] = useActionState(phucKhaoThanhPhanAction, undefined);
  if (!mo) {
    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMo(true)}>
        Phúc khảo
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="ketQuaId" value={ketQuaId} />
      {thanhPhans.map((tp) => (
        <label key={tp.ma} className="flex flex-col text-xs">
          {tp.ten}
          <input type="hidden" name="maThanhPhan" value={tp.ma} />
          <Input name={`diem_${tp.ma}`} inputMode="decimal" defaultValue={diem[tp.ma] ?? ""} className="w-20" />
        </label>
      ))}
      <Input name="soQuyetDinhPhucKhao" placeholder="Số QĐ phúc khảo" required className="w-36" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        Lưu
      </Button>
      {loi && <p className="w-full text-xs text-destructive">{loi}</p>}
    </form>
  );
}

/** (bổ sung 13/10/2026) điều kiện đạt của khóa: hiển thị nguồn, sửa riêng (để trống = theo chương trình). */
export function FormDieuKienDat({
  khoaId,
  diemDatRieng,
  diemDatApDung,
  nguon,
  duocSua,
  chuyenCan,
}: {
  khoaId: string;
  diemDatRieng: number | null;
  diemDatApDung: number;
  nguon: string;
  duocSua: boolean;
  /** (bổ sung 13/10/2026) khóa có đào tạo: chuyên cần tối thiểu đang áp dụng + giá trị riêng của khóa */
  chuyenCan?: { apDung: number; rieng: number | null; nguon: string };
}) {
  const [kq, action, dangLuu] = useActionState<KetQuaNhapDiemTep, FormData>(datDieuKienDatKhoaAction.bind(null, khoaId), undefined);
  return (
    <div className="flex flex-col gap-2">
      <p>
        Điều kiện đạt: điểm {chuyenCan ? "cuối khóa " : ""}
        <strong>≥ {diemDatApDung}</strong> <span className="text-muted-foreground">({nguon})</span>
        {chuyenCan && (
          <>
            {" "}
            · chuyên cần <strong>≥ {chuyenCan.apDung}%</strong> <span className="text-muted-foreground">({chuyenCan.nguon})</span>
          </>
        )}
      </p>
      {duocSua && (
        <details>
          <summary className="cursor-pointer text-primary">Sửa điều kiện đạt riêng cho khóa này</summary>
          <form key={`${diemDatRieng}-${chuyenCan?.rieng}`} action={action} className="mt-2 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              Điểm đạt của khóa (0-10)
              <Input name="diemDat" inputMode="decimal" defaultValue={diemDatRieng ?? ""} placeholder="Theo chương trình" className="w-36" />
            </label>
            {chuyenCan && (
              <label className="flex flex-col gap-1.5">
                Chuyên cần tối thiểu (%)
                <Input name="chuyenCan" inputMode="decimal" defaultValue={chuyenCan.rieng ?? ""} placeholder="Theo chương trình" className="w-36" />
              </label>
            )}
            <Button type="submit" size="sm" disabled={dangLuu}>
              {dangLuu ? "Đang lưu..." : "Lưu"}
            </Button>
            <span className="text-xs text-muted-foreground">Để trống = theo chương trình. Lưu xong tự tính lại Đạt/Không đạt cho điểm đã nhập.</span>
            {kq?.loi && <p className="w-full text-destructive">{kq.loi}</p>}
            {kq?.ok && <p className="w-full text-success">{kq.ok}</p>}
          </form>
        </details>
      )}
    </div>
  );
}

/** (bổ sung 13/10/2026 - KQ-06) tải lên tệp danh sách phòng thi đã ghi điểm vào cột Điểm thi. */
export function FormNhapDiemTuTep({ khoaId, linkTaiTep }: { khoaId: string; linkTaiTep: { href: string; nhan: string }[] }) {
  const [kq, formAction, dangXuLy] = useActionState<KetQuaNhapDiemTep, FormData>(nhapDiemThiTuTepAction.bind(null, khoaId), undefined);
  return (
    <details className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-medium">Nhập điểm từ tệp danh sách phòng thi (Excel)</summary>
      <div className="mt-3 flex flex-col gap-3">
        <ol className="list-decimal pl-5 text-muted-foreground">
          <li>
            Tải tệp danh sách phòng thi (mỗi phòng 1 sheet, có cột điểm - Điểm thi hoặc từng điểm thành phần):{" "}
            {linkTaiTep.length === 0
              ? "chưa có đợt thi nào được xếp phòng (tab Lịch thi & phòng thi)."
              : linkTaiTep.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && " · "}
                    <a href={l.href} className="font-medium text-primary underline">
                      {l.nhan}
                    </a>
                  </span>
                ))}
          </li>
          <li>Ghi điểm vào các cột điểm (trong thang điểm của từng cột), giữ nguyên cột Mã hồ sơ; để trống = giữ nguyên điểm đang có.</li>
          <li>Tải tệp lên - có dòng lỗi thì không nhập điểm nào.</li>
        </ol>
        <form action={formAction} className="flex flex-col gap-3">
          <ChonTep name="file" accept=".xlsx,.csv" required nhan="Chọn tệp đã ghi điểm" className="max-w-xl" />
          <Button type="submit" size="sm" disabled={dangXuLy} className="self-start">
            {dangXuLy ? "Đang nhập..." : "Tải lên và nhập điểm"}
          </Button>
        </form>
        {kq?.ok && <p className="text-success">{kq.ok}</p>}
        {kq?.loi && <p className="text-destructive">{kq.loi}</p>}
        {kq?.cacDongLoi && (
          <ul className="max-h-60 list-disc overflow-auto pl-5 text-destructive">
            {kq.cacDongLoi.map((d, i) => (
              <li key={i}>
                {d.dong}: {d.loi}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

/** KQ-04: sửa điểm đã phê duyệt theo quyết định phúc khảo (học phần hoặc điểm thi PT3). */
export function FormPhucKhao({
  khoaId,
  ketQuaId,
  loai,
}: {
  khoaId: string;
  ketQuaId: string;
  loai: "hocPhan" | "thi";
}) {
  const [mo, setMo] = useState(false);
  const [loi, formAction, dangXuLy] = useActionState(
    loai === "hocPhan" ? phucKhaoHocPhanAction : phucKhaoThiAction,
    undefined,
  );

  if (!mo) {
    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMo(true)}>
        Phúc khảo
      </Button>
    );
  }

  const oDiem = (name: string, placeholder: string) => (
    <Input name={name} type="number" min={0} max={10} step={0.1} placeholder={placeholder} required className="w-20" />
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-1.5">
      <input type="hidden" name="khoaId" value={khoaId} />
      <input type="hidden" name="ketQuaId" value={ketQuaId} />
      {loai === "hocPhan" ? (
        <>
          {oDiem("diemThanhPhan", "TP")}
          {oDiem("diemKetThuc", "KT")}
        </>
      ) : (
        oDiem("diemThi", "Điểm thi")
      )}
      <Input name="soQuyetDinhPhucKhao" placeholder="Số QĐ phúc khảo" required className="w-36" />
      <Button type="submit" size="sm" disabled={dangXuLy}>
        {dangXuLy ? "..." : "Lưu"}
      </Button>
      {loi && <p className="w-full text-xs text-destructive">{loi}</p>}
    </form>
  );
}
