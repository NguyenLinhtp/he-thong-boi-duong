import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { timKiemChuongTrinh } from "@/server/services/ct/ct-05-tra-cuu";
import type { TrangThaiChuongTrinh } from "@/generated/prisma/client";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormTaoChuongTrinh } from "./form-tao-chuong-trinh";
import { FormTraCuuChuongTrinh } from "./form-tra-cuu-chuong-trinh";

const NHAN_TRANG_THAI: Record<string, string> = {
  DU_THAO: "Dự thảo",
  CHO_THAM_DINH: "Chờ thẩm định",
  DA_BAN_HANH: "Đã ban hành",
  NGUNG_HIEU_LUC: "Ngừng hiệu lực",
};

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

export default async function ChuongTrinhPage({
  searchParams,
}: {
  searchParams: Promise<{ ten?: string; maCT?: string; loaiHinhBoiDuongId?: string; trangThai?: string }>;
}) {
  try {
    await requirePermission("CT-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const sp = await searchParams;
  const [dsChuongTrinh, dsLoaiHinh, choPhepTao] = await Promise.all([
    timKiemChuongTrinh({
      ten: sp.ten || undefined,
      maCT: sp.maCT || undefined,
      loaiHinhBoiDuongId: sp.loaiHinhBoiDuongId || undefined,
      trangThai: (sp.trangThai as TrangThaiChuongTrinh | undefined) || undefined,
    }),
    danhSachLoaiHinhBoiDuong(),
    coQuyen("CT-01"),
  ]);

  const dsLoaiHinhRutGon = dsLoaiHinh.map((lh) => ({ id: lh.id, ten: lh.ten }));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">Chương trình bồi dưỡng</h1>

      {choPhepTao && <FormTaoChuongTrinh dsLoaiHinh={dsLoaiHinhRutGon} />}

      <FormTraCuuChuongTrinh dsLoaiHinh={dsLoaiHinhRutGon} giaTriHienTai={sp} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã CT</TableHead>
            <TableHead>Tên chương trình</TableHead>
            <TableHead>Loại hình</TableHead>
            <TableHead>Tổng thời lượng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dsChuongTrinh.map((ct) => (
            <TableRow key={ct.id}>
              <TableCell>{ct.maCT}</TableCell>
              <TableCell>{ct.ten}</TableCell>
              <TableCell>{ct.loaiHinhBoiDuong.ten}</TableCell>
              <TableCell>{ct.tongThoiLuong ?? "—"}</TableCell>
              <TableCell>{NHAN_TRANG_THAI[ct.trangThai] ?? ct.trangThai}</TableCell>
              <TableCell>
                <Link href={`/chuong-trinh/${ct.id}`} className="text-sm text-primary underline">
                  Xem/sửa
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {dsChuongTrinh.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Không tìm thấy chương trình phù hợp
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
