import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachChungChiCuaKhoa } from "@/server/services/cc/cc-01-de-nghi";
import { duLieuInChungChi } from "@/server/services/cc/cc-02-so-hieu";
import { NutIn } from "./nut-in";

// CC-02: "xuất bản in/PDF theo mẫu" - như phiếu thu HP-04, dùng trang HTML in
// được (Ctrl+P / Lưu thành PDF) vì dự án chưa có thư viện sinh PDF. Tên cơ
// quan cấp (QT-05 CC_TEN_CO_QUAN_CAP) + tiêu đề theo loại văn bằng của chương
// trình (chứng chỉ / giấy chứng nhận - xem cc/van-bang.ts). Mỗi bản 1 trang in.
export default async function InChungChiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  try {
    await requirePermission("CC-02");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const { ids } = await searchParams;
  // chỉ in chứng chỉ thuộc đúng khóa này (không cho truyền id khóa khác qua URL)
  const idsCuaKhoa = new Set((await danhSachChungChiCuaKhoa(id)).map((cc) => cc.id));
  const idsIn = ids ? ids.split(",").filter((x) => idsCuaKhoa.has(x)) : [...idsCuaKhoa];
  const { dsChungChi, tenCoQuan } = await duLieuInChungChi(idsIn);

  return (
    <main className="flex flex-col items-center gap-6 p-6 print:p-0">
      <div className="print:hidden">
        <NutIn />
      </div>
      {dsChungChi.length === 0 && <p className="text-sm text-muted-foreground">Không có chứng chỉ nào đã có số hiệu để in.</p>}
      {dsChungChi.map((cc) => (
        <article
          key={cc.id}
          className="flex w-full max-w-3xl flex-col gap-3 border-4 border-double p-10 text-center break-after-page print:border-2"
        >
          <p className="text-sm font-semibold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p className="text-sm">Độc lập - Tự do - Hạnh phúc</p>
          <p className="mt-4 text-sm font-semibold uppercase">{tenCoQuan}</p>
          <h1 className="mt-2 text-2xl font-bold uppercase">{cc.tieuDe}</h1>
          <div className="mt-4 flex flex-col gap-1.5 text-left">
            <p>
              Chứng nhận ông/bà: <b>{cc.hocVien.hoTen}</b>
            </p>
            <p>Ngày sinh: {cc.hocVien.ngaySinh ? cc.hocVien.ngaySinh.toLocaleDateString("vi-VN") : "…………"}</p>
            {cc.hocVien.donViCongTac && <p>Đơn vị công tác: {cc.hocVien.donViCongTac}</p>}
            <p>
              Đã hoàn thành chương trình bồi dưỡng: <b>{cc.khoa.chuongTrinh.ten}</b>
            </p>
            <p>
              Khóa {cc.khoa.maKhoa}
              {cc.khoa.thoiGianKhaiGiang && cc.khoa.thoiGianBeGiang
                ? `, từ ${cc.khoa.thoiGianKhaiGiang.toLocaleDateString("vi-VN")} đến ${cc.khoa.thoiGianBeGiang.toLocaleDateString("vi-VN")}`
                : ""}
            </p>
          </div>
          <div className="mt-6 flex justify-between text-sm">
            <div className="text-left">
              <p>Số hiệu: {cc.soHieu}</p>
              <p>Số vào sổ cấp: {cc.soVaoSo ?? "…………"}</p>
              {cc.soQuyetDinh && <p>Quyết định số: {cc.soQuyetDinh}</p>}
            </div>
            <div className="text-center">
              <p>…………, ngày {cc.ngayCap ? cc.ngayCap.toLocaleDateString("vi-VN") : "…… tháng …… năm ……"}</p>
              <p className="font-semibold">NGƯỜI KÝ</p>
              <p className="mt-12">{cc.nguoiKy ?? ""}</p>
            </div>
          </div>
        </article>
      ))}
    </main>
  );
}
