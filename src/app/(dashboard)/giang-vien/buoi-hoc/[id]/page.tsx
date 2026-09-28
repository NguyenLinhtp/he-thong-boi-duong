import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { prisma } from "@/lib/db/prisma";
import { giangVienCuaTaiKhoan } from "@/server/services/gd/dung-chung";
import { dsHocVienDeDiemDanh } from "@/server/services/gd/gd-01-diem-danh";
import { KhongDuocPhanCongBuoiHocError } from "@/server/services/gd/loi-giang-day";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormDiemDanh } from "./form-diem-danh";
import { FormNhatKy } from "./form-nhat-ky";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

export default async function ChiTietBuoiHocGiangVienPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let phien;
  try {
    phien = await requirePermission("GD-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const buoiHoc = await prisma.buoiHoc.findUnique({
    where: { id },
    include: { khoa: { include: { chuongTrinh: true } }, hocPhan: true },
  });
  if (!buoiHoc) notFound();

  const giangVien = await giangVienCuaTaiKhoan(phien.userId);
  if (!giangVien) {
    return (
      <p className="p-6 text-destructive">
        Tài khoản đăng nhập chưa gắn với hồ sơ giảng viên nào.
      </p>
    );
  }

  let dsHocVien;
  try {
    dsHocVien = await dsHocVienDeDiemDanh(giangVien.id, id);
  } catch (error) {
    if (error instanceof KhongDuocPhanCongBuoiHocError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">
        {buoiHoc.khoa.maKhoa} · {buoiHoc.hocPhan?.ten ?? "Buổi học"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Ngày {new Date(buoiHoc.ngayHoc).toLocaleDateString("vi-VN")}
        {buoiHoc.gioBatDau && buoiHoc.gioKetThuc ? ` · ${buoiHoc.gioBatDau}–${buoiHoc.gioKetThuc}` : ""}
        {buoiHoc.daHuy && " · Buổi học đã bị hủy"}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">GD-01 · Điểm danh</h2>
        <FormDiemDanh buoiHocId={id} dsHocVien={dsHocVien} />
      </section>

      {(await coQuyen("GD-02")) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-ued-blue-dam">GD-02 · Nhật ký buổi học</h2>
          <FormNhatKy
            buoiHocId={id}
            noiDungDaGiang={buoiHoc.noiDungDaGiang}
            nhanXet={buoiHoc.nhanXet}
          />
        </section>
      )}
    </main>
  );
}
