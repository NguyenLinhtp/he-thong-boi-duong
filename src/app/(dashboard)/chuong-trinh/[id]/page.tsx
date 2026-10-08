import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layChuongTrinh } from "@/server/services/ct/ct-01-tao-chuong-trinh";
import { danhSachLoaiHinhBoiDuong } from "@/server/services/dm/dm-03-loai-hinh-boi-duong";
import { coKhoaDangHoatDong, lichSuPhienBan } from "@/server/services/ct/ct-04-cap-nhat-da-ban-hanh";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangChuongTrinh } from "@/components/chuong-trinh/dau-trang-chuong-trinh";
import { FormSuaChuongTrinh } from "./form-sua-chuong-trinh";
import { DanhSachHocPhan } from "./danh-sach-hoc-phan";
import { KhoiPheDuyet } from "./khoi-phe-duyet";
import { FormCapNhatBanHanh } from "./form-cap-nhat-ban-hanh";
import { LichSuPhienBan } from "./lich-su-phien-ban";
import { KhoiPhuongThucDangKy } from "./khoi-phuong-thuc-dang-ky";
import { KhoiLoaiVanBang } from "./khoi-loai-van-bang";
import { KhoiNgungHieuLuc } from "./khoi-ngung-hieu-luc";
import { FormImportSinhVien } from "@/components/dang-ky/form-import-sinh-vien";
import { danhSachSinhVien, layCotBoSungSinhVien } from "@/server/services/hv/hv-03-danh-sach-sinh-vien";
import { CauHinhCotSinhVien } from "@/components/dang-ky/cau-hinh-cot-sinh-vien";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { NutXoaChuongTrinh } from "../nut-xoa-chuong-trinh";

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
  // xem chi tiết thuộc tra cứu CT-05 (mọi người dùng nội bộ, giống tab Học liệu);
  // các khối sửa/duyệt bên dưới vẫn theo quyền riêng từng mã CN
  try {
    await requirePermission("CT-05");
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
  const choPhepSuaDuThao = dangDuThao && (await coQuyen("CT-01"));
  const daBanHanh = chuongTrinh.trangThai === "DA_BAN_HANH";
  // (sửa 07/10/2026) học phần sửa được cả khi đã ban hành (bắt buộc lý do, ghi nhật ký)
  const choPhepSuaHocPhan = (dangDuThao || daBanHanh) && (await coQuyen("CT-02"));
  const choPhepPheDuyet = await coQuyen("CT-03");
  const choPhepSuaBanHanh = daBanHanh && (await coQuyen("CT-04"));
  const choPhepPhuongThucDangKy =
    chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-07"));
  const choPhepLoaiVanBang = chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("CT-01"));
  const choPhepNgungHieuLuc =
    (daBanHanh || chuongTrinh.trangThai === "NGUNG_HIEU_LUC") && (await coQuyen("CT-06"));
  // (bổ sung 05/10/2026 - HV-03) chương trình dự thi: nạp danh sách sinh viên ngay khi khởi tạo chương trình
  const choPhepNapSinhVien =
    chuongTrinh.phuongThucDangKy === "CHI_DU_THI" && chuongTrinh.trangThai !== "NGUNG_HIEU_LUC" && (await coQuyen("HV-03"));
  const dsCotSinhVien = choPhepNapSinhVien ? await layCotBoSungSinhVien() : [];
  // (bổ sung 07/10/2026 - CT-01) xóa chương trình tạo sai khi chưa mở khóa nào
  const choPhepXoa = (await coQuyen("CT-01")) && (await prisma.khoa.count({ where: { chuongTrinhId: chuongTrinh.id } })) === 0;
  const tongTiet = chuongTrinh.hocPhans.reduce((tong, hp) => tong + hp.soTiet, 0);
  const tongTietKhop = chuongTrinh.tongThoiLuong != null && tongTiet === chuongTrinh.tongThoiLuong;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangChuongTrinh chuongTrinh={chuongTrinh} dangChon="thong-tin" />

      {choPhepSuaDuThao ? (
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
        canLyDo={daBanHanh}
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

      {choPhepNapSinhVien && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-ued-blue-dam">Danh sách sinh viên của trường</h2>
          <p className="text-sm text-muted-foreground">
            Hiện có {(await danhSachSinhVien(undefined, 0)).tong.toLocaleString("vi-VN")} sinh viên (dùng chung toàn trường). Thí sinh là sinh viên
            nhập mã sinh viên khi đăng ký dự thi để hệ thống tự điền họ tên, lớp.{" "}
            <Link href="/hoc-vien/sinh-vien" className="underline">
              Xem danh sách
            </Link>
          </p>
          <CauHinhCotSinhVien dsCot={dsCotSinhVien} />
          <FormImportSinhVien dsCot={dsCotSinhVien} />
        </section>
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

      {choPhepXoa && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card p-4 shadow-sm">
          <div className="text-sm">
            <p className="font-bold text-destructive">Xóa chương trình</p>
            <p className="text-muted-foreground">Chương trình chưa mở khóa nào nên xóa được (dùng khi tạo sai). Học phần, học liệu khung và lịch sử phiên bản bị xóa theo.</p>
          </div>
          <NutXoaChuongTrinh chuongTrinh={{ id: chuongTrinh.id, maCT: chuongTrinh.maCT, ten: chuongTrinh.ten, soQuyetDinh: chuongTrinh.soQuyetDinh }} veDanhSach />
        </section>
      )}
    </main>
  );
}
