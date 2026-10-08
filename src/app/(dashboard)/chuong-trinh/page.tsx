import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { timKiemChuongTrinh } from "@/server/services/ct/ct-05-tra-cuu";
import type { TrangThaiChuongTrinh } from "@/generated/prisma/client";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { DauTrangThemMoi } from "@/components/chung/dau-trang-them-moi";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { FormTaoChuongTrinh } from "./form-tao-chuong-trinh";
import { FormTraCuuChuongTrinh } from "./form-tra-cuu-chuong-trinh";
import { NutXoaChuongTrinh } from "./nut-xoa-chuong-trinh";
import { Pencil } from "lucide-react";

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
  const tieuDe = <h1 className="text-xl font-bold text-ued-blue-dam">Chương trình bồi dưỡng</h1>;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      {choPhepTao ? (
        <DauTrangThemMoi tieuDe={tieuDe} nhanNut="Thêm chương trình">
          <FormTaoChuongTrinh dsLoaiHinh={dsLoaiHinhRutGon} />
        </DauTrangThemMoi>
      ) : (
        tieuDe
      )}

      <FormTraCuuChuongTrinh dsLoaiHinh={dsLoaiHinhRutGon} giaTriHienTai={sp} />

      {dsChuongTrinh.length === 0 ? (
        <TrangThaiRong>Không tìm thấy chương trình phù hợp</TrangThaiRong>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {dsChuongTrinh.map((ct) => (
            <li key={ct.id} className="flex h-full flex-col rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
              <Link href={`/chuong-trinh/${ct.id}`} className="group flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{ct.maCT}</span>
                  <NhanTrangThai ma={ct.trangThai}>{NHAN_TRANG_THAI[ct.trangThai] ?? ct.trangThai}</NhanTrangThai>
                </div>
                <span className="font-bold text-ued-blue-dam group-hover:underline">{ct.ten}</span>
                <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{ct.loaiHinhBoiDuong.ten}</span>
                  <span>{ct.tongThoiLuong ? `${ct.tongThoiLuong} tiết` : "Chưa có thời lượng"}</span>
                  {ct.doiTuongApDung && <span>Đối tượng: {ct.doiTuongApDung}</span>}
                </span>
              </Link>
              {choPhepTao && (
                <div className="flex items-center justify-end gap-4 border-t px-4 py-2">
                  <span className="mr-auto text-xs text-muted-foreground">{ct._count.khoas > 0 ? `${ct._count.khoas} khóa` : "Chưa mở khóa"}</span>
                  <Link href={`/chuong-trinh/${ct.id}`} className="inline-flex items-center gap-1 text-sm text-ued-blue hover:underline" aria-label={`Sửa chương trình ${ct.ten}`}>
                    <Pencil className="size-3.5" />
                    Sửa
                  </Link>
                  {ct._count.khoas === 0 && <NutXoaChuongTrinh chuongTrinh={{ id: ct.id, maCT: ct.maCT, ten: ct.ten, soQuyetDinh: ct.soQuyetDinh }} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
