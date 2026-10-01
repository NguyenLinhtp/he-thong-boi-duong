import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { hocPhiCuaKhoa } from "@/server/services/hp/hp-01-thiet-lap";
import { danhSachPhieuThu } from "@/server/services/hp/hp-04-phieu-thu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { FormThietLap } from "./form-thiet-lap";
import { FormDoiSoat, KhoiChotDanhSach } from "./khoi-le-phi-thi";
import { bangDoiSoatLePhi } from "@/server/services/hp/hp-02-doi-soat-excel";
import { duocChotDanhSach } from "@/server/services/hv/hv-07-chot-danh-sach-du-thi";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { dinhDangNgay } from "@/lib/dinh-dang";

const NHAN_LE_PHI: Record<string, string> = {
  CHUA_NOP: "Chưa đóng",
  CON_NO: "Nộp thiếu",
  DA_NOP_DU: "Đã đóng",
  MIEN_GIAM: "Miễn giảm",
};
const NHAN_HO_SO: Record<string, string> = {
  CHO_DUYET: "Đã đăng ký",
  HOP_LE: "Hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
};
import { HangHocPhi } from "./hang-hoc-phi";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

export default async function HocPhiKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("HP-01");
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

  const laDuThi = khoa.chuongTrinh.phuongThucDangKy === "CHI_DU_THI";
  const [dsHocPhi, dsPhieuThu, choPhepThanhToan, choPhepCongNo, choPhepXetDuyet, bangLePhi] = await Promise.all([
    hocPhiCuaKhoa(id),
    danhSachPhieuThu(id),
    coQuyen("HP-02"),
    coQuyen("HP-03"),
    coQuyen("HV-07"),
    laDuThi ? bangDoiSoatLePhi(id) : Promise.resolve([]),
  ]);
  const duocChot = laDuThi && duocChotDanhSach(khoa);
  const soChinhThuc = bangLePhi.filter((d) => ["CHINH_THUC", "HOAN_THANH"].includes(d.dangKy.trangThai)).length;
  // HP-06 (Đưa vào theo HP-01): trang này đã yêu cầu HP-01 ở trên nên luôn
  // được phép - xem ghi chú trong actions.ts.
  const choPhepBoQua = true;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="hoc-phi" />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">HP-01 · Thiết lập mức học phí</h2>
        <FormThietLap
          khoaId={khoa.id}
          mucHocPhi={khoa.mucHocPhi ? Number(khoa.mucHocPhi) : null}
          chinhSachMienGiam={khoa.chinhSachMienGiam}
          daCoDangKy={dsHocPhi.length > 0}
        />
      </section>

      {laDuThi && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">
            Lệ phí thi · đối soát chuyển khoản ({bangLePhi.length} thí sinh đăng ký
            {khoa.hanDangKy && `, hạn đăng ký ${dinhDangNgay(khoa.hanDangKy)}`})
          </h2>
          {bangLePhi.length > 0 && (
            <div className="max-h-[28rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã sinh viên</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Lớp</TableHead>
                    <TableHead>Minh chứng CK</TableHead>
                    <TableHead>Lệ phí</TableHead>
                    <TableHead>Hồ sơ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bangLePhi.map((d) => (
                    <TableRow key={d.dangKy.id}>
                      <TableCell className="font-mono">{d.hocVien.maSinhVien ?? d.hocVien.maHocVien}</TableCell>
                      <TableCell>{d.hocVien.hoTen}</TableCell>
                      <TableCell>{d.hocVien.lopSinhHoat ?? "—"}</TableCell>
                      <TableCell>
                        {d.minhChung ? (
                          <a href={`/api/hv/tep-ho-so/${d.minhChung.id}?xem=1`} target="_blank" className="underline">
                            Xem ({d.minhChung.taiLenLuc.toLocaleDateString("vi-VN")})
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Chưa nộp</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.hocPhi ? (
                          <NhanTrangThai ma={d.hocPhi.trangThai}>{NHAN_LE_PHI[d.hocPhi.trangThai] ?? d.hocPhi.trangThai}</NhanTrangThai>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <NhanTrangThai ma={d.dangKy.trangThai}>{NHAN_HO_SO[d.dangKy.trangThai] ?? d.dangKy.trangThai}</NhanTrangThai>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {choPhepThanhToan && <FormDoiSoat khoaId={khoa.id} />}
          {(choPhepThanhToan || choPhepXetDuyet) && (
            <>
              <h2 className="mt-2 text-sm font-bold text-ued-blue-dam">Danh sách chính thức dự thi</h2>
              <KhoiChotDanhSach
                khoaId={khoa.id}
                duocChot={duocChot}
                lyDoChuaChot={
                  duocChot
                    ? null
                    : khoa.trangThai === "DANG_TUYEN_SINH"
                      ? khoa.hanDangKy
                        ? `Chốt được sau hạn đăng ký ${dinhDangNgay(khoa.hanDangKy)}.`
                        : "Khóa chưa đặt hạn đăng ký (tab Tổng quan) - chốt được khi hết hạn hoặc khi khóa chuyển sang Đang diễn ra."
                      : "Khóa chưa mở tuyển sinh hoặc đã hủy."
                }
                soChinhThuc={soChinhThuc}
              />
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ued-blue-dam">HP-02/03 · Công nợ theo học viên</h2>
          <a href="/hoc-phi/bao-cao" className="text-sm underline">
            Báo cáo doanh thu/công nợ (HP-05)
          </a>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Phải nộp</TableHead>
              <TableHead>Đã nộp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn nộp</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsHocPhi.map((hp) => (
              <HangHocPhi
                key={hp.id}
                khoaId={khoa.id}
                hocPhi={{
                  id: hp.id,
                  hoTen: hp.hocVien.hoTen,
                  soTienPhaiNop: Number(hp.soTienPhaiNop),
                  soTienDaNop: Number(hp.soTienDaNop),
                  trangThai: hp.trangThai,
                  hanNop: hp.hanNop?.toISOString() ?? null,
                  boQuaKiemTra: hp.boQuaKiemTra,
                }}
                choPhepThanhToan={choPhepThanhToan}
                choPhepCongNo={choPhepCongNo}
                choPhepBoQua={choPhepBoQua}
              />
            ))}
          </TableBody>
        </Table>
        {dsHocPhi.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {laDuThi
              ? "Chưa có dòng lệ phí nào - phát sinh khi thí sinh đăng ký sau khi khóa đã có mức lệ phí (HP-01)."
              : "Chưa có dòng công nợ nào - chỉ phát sinh sau khi thiết lập mức học phí (HP-01) và có học viên Chính thức (HV-07)."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">HP-04 · Phiếu thu đã lập</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Ngày lập</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsPhieuThu.map((pt) => (
              <TableRow key={pt.id}>
                <TableCell className="font-mono">{pt.soPhieu}</TableCell>
                <TableCell>{pt.hocPhi.hocVien.hoTen}</TableCell>
                <TableCell>{Number(pt.soTien).toLocaleString("vi-VN")}đ</TableCell>
                <TableCell>{pt.ngayLap.toLocaleString("vi-VN")}</TableCell>
                <TableCell>
                  <a href={`/hoc-phi/phieu-thu/${pt.id}`} className="text-sm underline" target="_blank">
                    In phiếu
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
