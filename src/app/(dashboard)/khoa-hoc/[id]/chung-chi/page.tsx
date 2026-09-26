import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { xetDeNghiCapChungChi, danhSachChungChiCuaKhoa } from "@/server/services/cc/cc-01-de-nghi";
import { ChuaPheDuyetKetQuaError } from "@/server/services/cc/loi-chung-chi";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { NutLapDeNghi, NutSinhSoHieu, NutHuyChungChi } from "./cac-form";
import { NHAN_TRANG_THAI_CHUNG_CHI } from "./nhan";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

const TRANG_THAI_HUY_DUOC = ["DE_NGHI", "CHO_KY_DUYET", "DA_KY_DUYET"];

export default async function ChungChiKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("CC-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  let xet;
  try {
    xet = await xetDeNghiCapChungChi(id);
  } catch (error) {
    if (!(error instanceof ChuaPheDuyetKetQuaError)) throw error;
    xet = null;
  }
  const [dsChungChi, choPhepCC02] = await Promise.all([danhSachChungChiCuaKhoa(id), coQuyen("CC-02")]);
  const soDeNghi = dsChungChi.filter((cc) => cc.trangThai === "DE_NGHI").length;
  const coChungChiDeIn = dsChungChi.some((cc) => cc.soHieu && cc.trangThai !== "DA_HUY");

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">CC · Chứng chỉ khóa {khoa.maKhoa}</h1>
        <a href={`/khoa-hoc/${khoa.id}`} className="text-sm underline">
          Về trang khóa
        </a>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">CC-01 · Lập danh sách đề nghị cấp chứng chỉ</h2>
        <p className="text-sm text-muted-foreground">
          Đủ điều kiện = kết quả đã phê duyệt (KQ-04) đạt học tập/thi <b>và</b> hoàn tất tài chính:
          học phí cá nhân đã nộp đủ, hoặc - với học viên do đơn vị liên kết tuyển sinh - hợp đồng
          liên kết đã thanh lý. Điều kiện tài chính được kiểm tra lại mỗi lần mở trang, nên học
          viên qua đơn vị liên kết sẽ tự xuất hiện ở đây ngay khi hợp đồng được thanh lý.
        </p>
        {!xet ? (
          <p className="rounded-lg border p-4 text-sm text-destructive">
            Kết quả khóa chưa được phê duyệt (KQ-04) - chưa lập được danh sách đề nghị.
          </p>
        ) : (
          <>
            <NutLapDeNghi khoaId={khoa.id} soDuDieuKien={xet.duDieuKien.length} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Điểm tổng kết</TableHead>
                  <TableHead>Xét đề nghị</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {xet.duDieuKien.map((kq) => (
                  <TableRow key={kq.id}>
                    <TableCell>{kq.hocVien.hoTen}</TableCell>
                    <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
                    <TableCell>Đủ điều kiện</TableCell>
                  </TableRow>
                ))}
                {xet.khongDuDieuKien.map((kq) => (
                  <TableRow key={kq.id}>
                    <TableCell>{kq.hocVien.hoTen}</TableCell>
                    <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
                    <TableCell className="text-destructive">{kq.lyDo}</TableCell>
                  </TableRow>
                ))}
                {xet.daCoChungChi.map((kq) => (
                  <TableRow key={kq.id}>
                    <TableCell>{kq.hocVien.hoTen}</TableCell>
                    <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      Đã có: {NHAN_TRANG_THAI_CHUNG_CHI[kq.trangThaiChungChi]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </section>

      {choPhepCC02 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">CC-02 · Sinh số hiệu và in chứng chỉ</h2>
          <p className="text-sm text-muted-foreground">
            Số hiệu tăng dần theo năm, không trùng; số của chứng chỉ đã hủy không bao giờ được cấp
            lại. Điều kiện cấp được kiểm tra lại ngay trước khi cấp số.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <NutSinhSoHieu khoaId={khoa.id} soDeNghi={soDeNghi} />
            {coChungChiDeIn && (
              <a href={`/khoa-hoc/${khoa.id}/chung-chi/in`} target="_blank" className="text-sm underline">
                In tất cả chứng chỉ đã có số hiệu
              </a>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Chứng chỉ của khóa</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số hiệu</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsChungChi.map((cc) => (
              <TableRow key={cc.id}>
                <TableCell className="font-mono">{cc.soHieu ?? "—"}</TableCell>
                <TableCell>{cc.hocVien.hoTen}</TableCell>
                <TableCell>
                  {NHAN_TRANG_THAI_CHUNG_CHI[cc.trangThai]}
                  {cc.trangThai === "DA_HUY" && (
                    <span className="ml-1 text-xs text-muted-foreground">({cc.lyDoHuy})</span>
                  )}
                </TableCell>
                <TableCell className="flex flex-wrap gap-1.5">
                  {cc.soHieu && cc.trangThai !== "DA_HUY" && (
                    <a href={`/khoa-hoc/${khoa.id}/chung-chi/in?ids=${cc.id}`} target="_blank" className="text-sm underline">
                      In
                    </a>
                  )}
                  {choPhepCC02 && TRANG_THAI_HUY_DUOC.includes(cc.trangThai) && (
                    <NutHuyChungChi khoaId={khoa.id} chungChiId={cc.id} soHieu={cc.soHieu} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {dsChungChi.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Chưa có chứng chỉ nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
