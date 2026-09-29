import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { danhSachGiangVien } from "@/server/services/kh/dung-chung";
import { danhSachPhanCong } from "@/server/services/kh/kh-02-phan-cong-giang-vien";
import { danhSachBuoiHoc, lichDayGiangVien } from "@/server/services/kh/kh-03-thoi-khoa-bieu";
import { danhSachPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { buoiHocDaKetThuc } from "@/server/services/gd/gd-05-link-truc-tuyen";
import { danhSachLop } from "@/server/services/kh/kh-07-lop-hoc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { FormPhanCong } from "../form-phan-cong";
import { FormBuoiHoc } from "../form-buoi-hoc";
import { HangBuoiHoc } from "../hang-buoi-hoc";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

// Tab Giảng dạy của khóa: phân công giảng viên (KH-02), thời khóa biểu (KH-03)
export default async function GiangDayKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const choPhepGD03 = await coQuyen("GD-03");
  const choPhepGD05 = await coQuyen("GD-05");

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const [dsPhanCong, dsGiangVien, dsBuoiHoc, dsPhongHoc] = await Promise.all([
    danhSachPhanCong(id),
    danhSachGiangVien(),
    danhSachBuoiHoc(id),
    danhSachPhongHoc(),
  ]);
  const hocPhanDaPhanCong = new Set(dsPhanCong.map((pc) => pc.hocPhanId));
  const hocPhanChuaPhanCong = khoa.chuongTrinh.hocPhans.filter((hp) => !hocPhanDaPhanCong.has(hp.id));

  const giangVienDaPhanCong = [
    ...new Map(dsPhanCong.map((pc) => [pc.giangVienId, pc.giangVien])).entries(),
  ];
  const lichDayTheoGiangVien = await Promise.all(
    giangVienDaPhanCong.map(async ([giangVienId, giangVien]) => ({
      giangVienId,
      giangVien,
      lich: (await lichDayGiangVien(giangVienId)).filter((bh) => bh.khoaId !== khoa.id),
    })),
  );

  const dsLop = (await danhSachLop(khoa.id)).map((l) => ({ id: l.id, maLop: l.maLop, ten: l.ten }));
  // khóa có lớp: mỗi học phần có thể phân công thêm theo từng lớp nên luôn hiện đủ học phần
  const hocPhanDePhanCong = dsLop.length > 0 ? khoa.chuongTrinh.hocPhans : hocPhanChuaPhanCong;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="giang-day" />
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">KH-02 · Phân công giảng viên phụ trách học phần</h2>

        {hocPhanDePhanCong.length > 0 && dsGiangVien.length > 0 ? (
          <FormPhanCong
            khoaId={khoa.id}
            dsHocPhan={hocPhanDePhanCong.map((hp) => ({ id: hp.id, ten: hp.ten }))}
            dsGiangVien={dsGiangVien.map((gv) => ({ id: gv.id, hoTen: gv.hoTen }))}
            dsLop={dsLop}
          />
        ) : (
          <p className="rounded-lg border bg-card p-4 shadow-sm text-sm text-muted-foreground">
            {dsGiangVien.length === 0
              ? "Chưa có giảng viên nào trong hệ thống."
              : "Mọi học phần của chương trình đã được phân công giảng viên."}
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học phần</TableHead>
              <TableHead>Phạm vi</TableHead>
              <TableHead>Giảng viên</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsPhanCong.map((pc) => (
              <TableRow key={pc.id}>
                <TableCell>{pc.hocPhan.ten}</TableCell>
                <TableCell>{pc.lop ? `Lớp ${pc.lop.maLop}` : "Cả khóa"}</TableCell>
                <TableCell>{pc.giangVien.hoTen}</TableCell>
              </TableRow>
            ))}
            {dsPhanCong.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  Chưa phân công giảng viên nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">KH-03 · Thời khóa biểu</h2>

        {lichDayTheoGiangVien.some((l) => l.lich.length > 0) && (
          <div className="rounded-lg border bg-card p-4 shadow-sm text-sm">
            <p className="font-medium">
              Lịch dạy hiện có của giảng viên đã phân công (ở khóa khác đang vận hành) - tham khảo
              trước khi xếp thêm buổi học để tránh trùng lịch:
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {lichDayTheoGiangVien
                .filter((l) => l.lich.length > 0)
                .map(({ giangVienId, giangVien, lich }) => (
                  <div key={giangVienId}>
                    <p className="font-medium">{giangVien.hoTen}</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {lich.map((bh) => (
                        <li key={bh.id}>
                          {new Date(bh.ngayHoc).toLocaleDateString("vi-VN")}
                          {bh.gioBatDau && bh.gioKetThuc ? ` ${bh.gioBatDau}–${bh.gioKetThuc}` : ""} ·{" "}
                          {bh.khoa.maKhoa} - {bh.khoa.chuongTrinh.ten}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}

        <FormBuoiHoc
          khoaId={khoa.id}
          dsHocPhan={khoa.chuongTrinh.hocPhans.map((hp) => ({ id: hp.id, ten: hp.ten }))}
          dsPhongHoc={dsPhongHoc.map((ph) => ({ id: ph.id, ten: `${ph.ma} · ${ph.ten}` }))}
          dsLop={dsLop}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Giờ</TableHead>
              <TableHead>Học phần</TableHead>
              <TableHead>Phòng / hình thức</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsBuoiHoc.map((bh) => (
              <HangBuoiHoc
                key={bh.id}
                khoaId={khoa.id}
                buoiHoc={{
                  id: bh.id,
                  ngayHoc: bh.ngayHoc.toISOString(),
                  gioBatDau: bh.gioBatDau,
                  gioKetThuc: bh.gioKetThuc,
                  hocPhanId: bh.hocPhanId,
                  hocPhanTen: bh.hocPhan?.ten ?? null,
                  maLop: bh.lop?.maLop ?? null,
                  phongHocId: bh.phongHocId,
                  phongHocTen: bh.phongHoc?.ten ?? null,
                  linkTrucTuyen: bh.linkTrucTuyen,
                  linkConHieuLuc: bh.linkTrucTuyen ? !bh.daHuy && !buoiHocDaKetThuc(bh) : false,
                  daHuy: bh.daHuy,
                  lyDoThayDoi: bh.lyDoThayDoi,
                  noiDungDaGiang: bh.noiDungDaGiang,
                  nhanXet: bh.nhanXet,
                }}
                dsHocPhan={khoa.chuongTrinh.hocPhans.map((hp) => ({ id: hp.id, ten: hp.ten }))}
                dsPhongHoc={dsPhongHoc.map((ph) => ({ id: ph.id, ten: `${ph.ma} · ${ph.ten}` }))}
                choPhepGD03={choPhepGD03}
                choPhepGD05={choPhepGD05}
              />
            ))}
            {dsBuoiHoc.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Chưa có buổi học nào trong thời khóa biểu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
