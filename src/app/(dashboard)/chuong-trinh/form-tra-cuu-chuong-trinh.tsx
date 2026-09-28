import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NHAN_TRANG_THAI: Record<string, string> = {
  DU_THAO: "Dự thảo",
  CHO_THAM_DINH: "Chờ thẩm định",
  DA_BAN_HANH: "Đã ban hành",
  NGUNG_HIEU_LUC: "Ngừng hiệu lực",
};

export function FormTraCuuChuongTrinh({
  dsLoaiHinh,
  giaTriHienTai,
}: {
  dsLoaiHinh: { id: string; ten: string }[];
  giaTriHienTai: { ten?: string; maCT?: string; loaiHinhBoiDuongId?: string; trangThai?: string };
}) {
  const coBoLoc =
    giaTriHienTai.ten || giaTriHienTai.maCT || giaTriHienTai.loaiHinhBoiDuongId || giaTriHienTai.trangThai;

  return (
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Tên chương trình</label>
        <Input name="ten" defaultValue={giaTriHienTai.ten ?? ""} placeholder="Từ khóa tên..." />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Mã CT</label>
        <Input name="maCT" defaultValue={giaTriHienTai.maCT ?? ""} placeholder="VD: CT2026001" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Loại hình</label>
        <select
          name="loaiHinhBoiDuongId"
          defaultValue={giaTriHienTai.loaiHinhBoiDuongId ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Tất cả</option>
          {dsLoaiHinh.map((lh) => (
            <option key={lh.id} value={lh.id}>
              {lh.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Trạng thái</label>
        <select
          name="trangThai"
          defaultValue={giaTriHienTai.trangThai ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Tất cả</option>
          {Object.entries(NHAN_TRANG_THAI).map(([ma, ten]) => (
            <option key={ma} value={ma}>
              {ten}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Tìm kiếm</Button>
      {coBoLoc && (
        <Link href="/chuong-trinh" className="text-sm text-muted-foreground underline">
          Xóa lọc
        </Link>
      )}
    </form>
  );
}
