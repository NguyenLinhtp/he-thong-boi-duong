import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import {
  traCuuHoSo,
  lichSuTraCuu,
  LOAI_HO_SO,
  NHAN_LOAI_HO_SO,
  GIOI_HAN_MOI_LOAI,
  type LoaiHoSo,
} from "@/server/services/bc/bc-05-tra-cuu-ho-so";
import { khoangNgay } from "@/server/services/bc/khoang-ngay";
import { LoiBaoCao } from "@/server/services/bc/loi-bao-cao";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type ThamSo = { q?: string; loai?: string; tuNgay?: string; denNgay?: string };

// BC-05: tra cứu hồ sơ lưu trữ điện tử phục vụ kiểm định, thanh tra - mọi lượt tra cứu được ghi nhật ký
export default async function TraCuuHoSoLuuTruPage({ searchParams }: { searchParams: Promise<ThamSo> }) {
  let phien;
  try {
    phien = await requirePermission("BC-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const thamSo = await searchParams;
  const loai = (LOAI_HO_SO as readonly string[]).includes(thamSo.loai ?? "") ? (thamSo.loai as LoaiHoSo) : null;
  const daGui = Boolean(thamSo.q?.trim() || thamSo.tuNgay || thamSo.denNgay);
  let ketQua: Awaited<ReturnType<typeof traCuuHoSo>> | null = null;
  let loi: string | null = null;
  if (daGui) {
    try {
      ketQua = await traCuuHoSo(
        { tuKhoa: thamSo.q, loai, ...khoangNgay(thamSo.tuNgay, thamSo.denNgay) },
        { nguoiThucHienId: phien.userId, nguoiThucHienTen: phien.hoTen },
      );
    } catch (error) {
      if (!(error instanceof LoiBaoCao)) throw error;
      loi = error.message;
    }
  }
  const dsLichSu = await lichSuTraCuu(10);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">BC-05 · Tra cứu hồ sơ lưu trữ điện tử</h1>
      <p className="text-sm text-muted-foreground">
        Tìm hồ sơ chương trình, khóa, học viên, chứng chỉ phục vụ kiểm định, thanh tra. Mọi lượt tra cứu được ghi vào
        nhật ký thao tác.
      </p>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <Input name="q" defaultValue={thamSo.q ?? ""} placeholder="Từ khóa: mã, tên, họ tên, CCCD, số hiệu, số QĐ..." className="w-80" />
        <select name="loai" defaultValue={loai ?? ""} className="h-8 rounded-lg border px-2 text-sm" aria-label="Loại hồ sơ">
          <option value="">Mọi loại hồ sơ</option>
          {LOAI_HO_SO.map((l) => (
            <option key={l} value={l}>
              {NHAN_LOAI_HO_SO[l]}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-1 text-sm">
          Từ ngày
          <Input name="tuNgay" type="date" defaultValue={thamSo.tuNgay ?? ""} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Đến ngày
          <Input name="denNgay" type="date" defaultValue={thamSo.denNgay ?? ""} className="w-40" />
        </label>
        <button type="submit" className="h-8 rounded-lg border px-3 text-sm hover:bg-muted">
          Tra cứu
        </button>
      </form>

      {loi && <p className="text-sm text-destructive">{loi}</p>}
      {ketQua && (
        <section className="flex flex-col gap-2">
          <p className="text-sm">
            <b>{ketQua.soKetQua}</b> hồ sơ ·{" "}
            {Object.entries(ketQua.tong)
              .map(([l, so]) => `${NHAN_LOAI_HO_SO[l as LoaiHoSo]}: ${so}${(so ?? 0) > GIOI_HAN_MOI_LOAI ? ` (hiển thị ${GIOI_HAN_MOI_LOAI})` : ""}`)
              .join(" · ")}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Mã / số hiệu</TableHead>
                <TableHead>Hồ sơ</TableHead>
                <TableHead>Mốc thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ketQua.ketQua.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Không tìm thấy hồ sơ phù hợp.
                  </TableCell>
                </TableRow>
              )}
              {ketQua.ketQua.map((k) => (
                <TableRow key={`${k.loai}-${k.id}`}>
                  <TableCell>{NHAN_LOAI_HO_SO[k.loai]}</TableCell>
                  <TableCell>
                    <Link href={k.lienKet} className="font-medium underline">
                      {k.ma}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {k.tieuDe}
                    <div className="text-xs text-muted-foreground">{k.moTa}</div>
                  </TableCell>
                  <TableCell>{k.ngay?.toLocaleDateString("vi-VN") ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Nhật ký tra cứu gần đây</h2>
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {dsLichSu.map((n) => (
            <li key={n.id}>
              {n.thoiGian.toLocaleString("vi-VN")} · {n.nguoiThucHienTen} · {n.chiTiet}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
