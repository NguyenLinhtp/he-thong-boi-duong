import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { coKhoaDangHoatDong, lichSuPhienBan } from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormSuaChuongTrinh } from "./form-sua-chuong-trinh";
import { DanhSachHocPhan } from "./danh-sach-hoc-phan";
import { KhoiPheDuyet } from "./khoi-phe-duyet";
import { FormCapNhatBanHanh } from "./form-cap-nhat-ban-hanh";
import { LichSuPhienBan } from "./lich-su-phien-ban";
import { KhoiPhuongThucDangKy } from "./khoi-phuong-thuc-dang-ky";
import { KhoiLoaiVanBang } from "./khoi-loai-van-bang";
import { KhoiNgungHieuLuc } from "./khoi-ngung-hieu-luc";

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
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const chuongTrinh = await layChuongTrinh(id);
  if (!chuongTrinh) notFound();

  const dangDuThao = chuongTrinh.trangThai === "DU_THAO";
  const daBanHanh = chuongTrinh.trangThai === "DA_BAN_HANH";
  const choPhepSuaHocPhan = dangDuThao && (await coQuyen("CT-02"));
  const choPhepPheDuyet = await coQuyen("CT-03");
  const choPhepSuaBanHanh = daBanHanh && (await coQuyen("CT-04"));
  const choPhepPhuongThucDangKy =
    chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-07"));
  const choPhepLoaiVanBang = chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-01"));
  const choPhepNgungHieuLuc =
    (daBanHanh || chuongTrinh.trangThai === "NGUNG_HIEU_LUC") && (await coQuyen("CT-06"));
  const tongTiet = chuongTrinh.hocPhans.reduce((tong, hp) => tong + hp.soTiet, 0);
  const tongTietKhop = chuongTrinh.tongThoiLuong != null && tongTiet === chuongTrinh.tongThoiLuong;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">
        {chuongTrinh.maCT} · {chuongTrinh.ten}
      </h1>
      <p className="text-sm text-muted-foreground">
        Trạng thái: {NHAN_TRANG_THAI[chuongTrinh.trangThai] ?? chuongTrinh.trangThai}
      </p>

      {dangDuThao ? (
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
      ) : choPhepSuaBanHanh ? (
        <FormCapNhatBanHanh
          chuongTrinh={{
            id: chuongTrinh.id,
            ten: chuongTrinh.ten,
            mucTieu: chuongTrinh.mucTieu,
            doiTuongApDung: chuongTrinh.doiTuongApDung,
            tongThoiLuong: chuongTrinh.tongThoiLuong,
            loaiHinhBoiDuongId: chuongTrinh.loaiHinhBoiDuongId,
            phienBanHienTai: chuongTrinh.phienBanHienTai,
          }}
          dsLoaiHinh={(await danhSachLoaiHinhBoiDuong()).map((lh) => ({
            id: lh.id,
            ten: lh.ten,
          }))}
          coKhoaDangHoatDong={await coKhoaDangHoatDong(chuongTrinh.id)}
        />
      ) : (
        <div className="rounded-lg border bg-card p-4 shadow-sm text-sm">
          <p>Mục tiêu: {chuongTrinh.mucTieu ?? "—"}</p>
          <p>Đối tượng áp dụng: {chuongTrinh.doiTuongApDung ?? "—"}</p>
          <p>Tổng thời lượng: {chuongTrinh.tongThoiLuong ?? "—"}</p>
        </div>
      )}

      <DanhSachHocPhan
        chuongTrinhId={chuongTrinh.id}
        dsHocPhan={chuongTrinh.hocPhans}
        tongTiet={tongTiet}
        tongThoiLuong={chuongTrinh.tongThoiLuong}
        choPhepSua={choPhepSuaHocPhan}
      />

      {choPhepPheDuyet && chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (
        <KhoiPheDuyet
          chuongTrinh={{
            id: chuongTrinh.id,
            trangThai: chuongTrinh.trangThai,
            yKienThamDinh: chuongTrinh.yKienThamDinh,
            soQuyetDinh: chuongTrinh.soQuyetDinh,
            ngayBanHanh: chuongTrinh.ngayBanHanh,
          }}
          tongTietKhop={tongTietKhop}
        />
      )}

      {choPhepSuaBanHanh && <LichSuPhienBan danhSach={await lichSuPhienBan(chuongTrinh.id)} />}

      {choPhepPhuongThucDangKy && (
        <KhoiPhuongThucDangKy
          chuongTrinhId={chuongTrinh.id}
          phuongThucHienTai={chuongTrinh.phuongThucDangKy}
        />
      )}

      {choPhepLoaiVanBang && (
        <KhoiLoaiVanBang chuongTrinhId={chuongTrinh.id} loaiHienTai={chuongTrinh.loaiVanBang} />
      )}

      {choPhepNgungHieuLuc && (
        <KhoiNgungHieuLuc
          chuongTrinh={{
            id: chuongTrinh.id,
            trangThai: chuongTrinh.trangThai,
            lyDoNgungHieuLuc: chuongTrinh.lyDoNgungHieuLuc,
            ngayNgungHieuLuc: chuongTrinh.ngayNgungHieuLuc,
          }}
        />
      )}
    </main>
  );
}
