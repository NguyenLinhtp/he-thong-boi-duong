import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import {
  danhSachLop,
  hocVienTheoLop,
  lichSuChuyenLopCuaKhoa,
  tuyChonBoLocLop,
} from "@/server/services/kh/kh-07-lop-hoc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { FormTaoLop, NutChiaTuDong, HangLop, BangChonHocVien } from "./cac-form";

type BoLocUrl = { q?: string; dvct?: string; dvlk?: string; lop?: string };

export default async function LopHocPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<BoLocUrl>;
}) {
  try {
    await requirePermission("KH-07");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  if (khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI") {
    return (
      <p className="p-6 text-muted-foreground">
        Khóa {khoa.maKhoa} thuộc Phương thức 3 (chỉ dự thi) - không có giảng dạy nên không chia lớp.
      </p>
    );
  }

  const boLoc = await searchParams;
  const [dsLop, dsTatCa, dsDaLoc, tuyChon, dsLichSu] = await Promise.all([
    danhSachLop(id),
    hocVienTheoLop(id),
    hocVienTheoLop(id, {
      tuKhoa: boLoc.q,
      donViCongTac: boLoc.dvct,
      donViLienKetId: boLoc.dvlk,
      lopId: boLoc.lop,
    }),
    tuyChonBoLocLop(id),
    lichSuChuyenLopCuaKhoa(id),
  ]);
  const soChuaXep = dsTatCa.filter((dk) => dk.lopId === null && dk.trangThai === "CHINH_THUC").length;
  const dangLoc = Boolean(boLoc.q || boLoc.dvct || boLoc.dvlk || boLoc.lop);
  const tongSiSoLop = dsLop.reduce((t, l) => t + (l.siSoToiDa ?? 0), 0);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ued-blue-dam">KH-07 · Lớp trong khóa {khoa.maKhoa}</h1>
        <a href={`/khoa-hoc/${khoa.id}`} className="text-sm underline">
          Về trang khóa
        </a>
      </div>
      <p className="rounded-lg border bg-card p-4 shadow-sm text-sm text-muted-foreground">
        Chuyển lớp chỉ trong cùng khóa và không làm mất điểm, điểm danh, học phí đã có - các dữ liệu
        này gắn theo khóa. Mỗi lớp có thời khóa biểu và giảng viên riêng (chọn lớp khi phân công/xếp
        buổi ở trang khóa); phân công &ldquo;Cả khóa&rdquo; áp dụng cho lớp chưa có phân công riêng. Tổng sĩ số
        các lớp: {tongSiSoLop}/{khoa.siSoToiDa}.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">Danh sách lớp</h2>
        <FormTaoLop khoaId={khoa.id} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã lớp</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Sĩ số</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsLop.map((lop) => (
              <HangLop key={lop.id} khoaId={khoa.id} lop={lop} />
            ))}
            {dsLop.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Khóa chưa chia lớp
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">Học viên chính thức theo lớp</h2>
        {dsLop.length > 0 && <NutChiaTuDong khoaId={khoa.id} soChuaXep={soChuaXep} />}

        <h3 className="text-sm font-medium">Chia / chuyển lớp thủ công</h3>
        {/* form GET: bộ lọc nằm trên URL nên tải lại trang hay chia sẻ link vẫn giữ nguyên */}
        <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 shadow-sm">
          <Input
            name="q"
            defaultValue={boLoc.q ?? ""}
            placeholder="Tìm tên / mã học viên / CCCD (không cần dấu)"
            className="w-72"
          />
          <select name="dvct" defaultValue={boLoc.dvct ?? ""} className="h-8 max-w-64 rounded-lg border px-2 text-sm">
            <option value="">— Mọi đơn vị công tác —</option>
            {tuyChon.donViCongTac.map((dv) => (
              <option key={dv.ten} value={dv.ten}>
                {dv.ten} ({dv.soHocVien})
              </option>
            ))}
          </select>
          <select name="dvlk" defaultValue={boLoc.dvlk ?? ""} className="h-8 max-w-64 rounded-lg border px-2 text-sm">
            <option value="">— Mọi đơn vị liên kết —</option>
            {tuyChon.donViLienKet.map((dv) => (
              <option key={dv.id} value={dv.id}>
                {dv.ten}
              </option>
            ))}
          </select>
          <select name="lop" defaultValue={boLoc.lop ?? ""} className="h-8 rounded-lg border px-2 text-sm">
            <option value="">— Mọi lớp —</option>
            <option value="chua-xep">Chưa xếp lớp</option>
            {dsLop.map((l) => (
              <option key={l.id} value={l.id}>
                {l.maLop}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="secondary">
            Lọc
          </Button>
          {dangLoc && (
            <a href={`/khoa-hoc/${khoa.id}/lop-hoc`} className="text-sm underline">
              Bỏ lọc
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            {dsDaLoc.length}/{dsTatCa.length} học viên
          </span>
        </form>

        {dsTatCa.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có học viên chính thức (HV-07)</p>
        ) : (
          <BangChonHocVien
            key={JSON.stringify(boLoc)}
            khoaId={khoa.id}
            dsLop={dsLop}
            dsHocVien={dsDaLoc.map((dk) => ({
              dangKyId: dk.id,
              hoTen: dk.hocVien.hoTen,
              maHocVien: dk.hocVien.maHocVien,
              donViCongTac: dk.hocVien.donViCongTac,
              donViLienKet: dk.hopDongLienKet?.donViLienKet.ten ?? null,
              lopId: dk.lopId,
              maLop: dk.lop?.maLop ?? null,
            }))}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">Lịch sử xếp/chuyển lớp</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Từ lớp</TableHead>
              <TableHead>Sang lớp</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Người thực hiện</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsLichSu.map((ls) => (
              <TableRow key={ls.id}>
                <TableCell>{ls.createdAt.toLocaleString("vi-VN")}</TableCell>
                <TableCell>{ls.dangKy.hocVien.hoTen}</TableCell>
                <TableCell>{ls.tuLop?.maLop ?? "—"}</TableCell>
                <TableCell>{ls.denLop.maLop}</TableCell>
                <TableCell>{ls.ngayHieuLuc.toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>{ls.lyDo ?? ""}</TableCell>
                <TableCell>{ls.nguoiThucHienTen}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
