import { notFound, redirect } from "next/navigation";
import { coQuyen, requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cauHinhChuongTrinh } from "@/server/services/hv/form-dang-ky";
import { danhSachChucDanhHocVi } from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangChuongTrinh } from "@/components/chuong-trinh/dau-trang-chuong-trinh";
import { BienTapFormDangKy } from "@/components/dang-ky/bien-tap-form-dang-ky";
import { luuFormDangKyChuongTrinhAction } from "./actions";

// (bổ sung 30/09/2026) form đăng ký của chương trình - mọi khóa kế thừa, khóa được sửa riêng ở tab Tuyển sinh
export default async function FormDangKyChuongTrinhPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("CT-05");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id } = await params;
  const chuongTrinh = await prisma.chuongTrinh.findUnique({ where: { id } });
  if (!chuongTrinh) notFound();

  const [cauHinh, dsChucDanh, soKhoaRieng] = await Promise.all([
    cauHinhChuongTrinh(id),
    danhSachChucDanhHocVi(),
    prisma.khoa.count({ where: { chuongTrinhId: id, NOT: { cauHinhFormDangKy: { equals: Prisma.DbNull } } } }),
  ]);
  const duocSua = chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-07"));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangChuongTrinh chuongTrinh={chuongTrinh} dangChon="form-dang-ky" />
      <div className="text-sm text-muted-foreground">
        <p>
          Form học viên điền khi đăng ký/xác nhận tham gia các khóa của chương trình (trang đăng ký công khai, đơn vị liên kết
          đăng ký hộ, đơn in). Mục nào đánh dấu <b>bắt buộc</b> thì phải nhập mới đăng ký được; <b>tệp minh chứng bắt buộc</b>{" "}
          còn thiếu thì hồ sơ không được thẩm định Hợp lệ (HV-06).
        </p>
        {soKhoaRieng > 0 && (
          <p className="mt-1 text-warning">
            {soKhoaRieng} khóa đang dùng form riêng - thay đổi ở đây không áp cho các khóa đó.
          </p>
        )}
        {!duocSua && <p className="mt-1">Chế độ chỉ xem.</p>}
      </div>
      <BienTapFormDangKy
        cauHinh={cauHinh}
        dsChucDanh={dsChucDanh.map((c) => ({ id: c.id, ten: c.ten }))}
        onLuu={duocSua ? luuFormDangKyChuongTrinhAction.bind(null, id) : undefined}
        chiXem={!duocSua}
        choPhepMaSinhVien={chuongTrinh.phuongThucDangKy === "CHI_DU_THI"}
      />
    </main>
  );
}
