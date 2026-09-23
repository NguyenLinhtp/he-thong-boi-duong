import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { FormSuaChuongTrinh } from "./form-sua-chuong-trinh";

const NHAN_TRANG_THAI: Record<string, string> = {
  DU_THAO: "Dự thảo",
  CHO_THAM_DINH: "Chờ thẩm định",
  DA_BAN_HANH: "Đã ban hành",
  NGUNG_HIEU_LUC: "Ngừng hiệu lực",
};

export default async function ChiTietChuongTrinhPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requirePermission("CT-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const chuongTrinh = await layChuongTrinh(id);
  if (!chuongTrinh) notFound();

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">
        {chuongTrinh.maCT} · {chuongTrinh.ten}
      </h1>
      <p className="text-sm text-muted-foreground">
        Trạng thái: {NHAN_TRANG_THAI[chuongTrinh.trangThai] ?? chuongTrinh.trangThai}
      </p>

      {chuongTrinh.trangThai === "DU_THAO" ? (
        <FormSuaChuongTrinh
          chuongTrinh={{
            id: chuongTrinh.id,
            ten: chuongTrinh.ten,
            mucTieu: chuongTrinh.mucTieu,
            doiTuongApDung: chuongTrinh.doiTuongApDung,
            tongThoiLuong: chuongTrinh.tongThoiLuong,
            loaiHinhBoiDuongId: chuongTrinh.loaiHinhBoiDuongId,
          }}
          dsLoaiHinh={(await danhSachLoaiHinhBoiDuong()).map((lh) => ({
            id: lh.id,
            ten: lh.ten,
          }))}
        />
      ) : (
        <div className="rounded-lg border p-4 text-sm">
          <p>Mục tiêu: {chuongTrinh.mucTieu ?? "—"}</p>
          <p>Đối tượng áp dụng: {chuongTrinh.doiTuongApDung ?? "—"}</p>
          <p>Tổng thời lượng: {chuongTrinh.tongThoiLuong ?? "—"}</p>
        </div>
      )}
    </main>
  );
}
