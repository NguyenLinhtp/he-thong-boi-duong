import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { baiNopCuaGiangVien } from "@/server/services/kq/kq-01-danh-gia-truc-tuyen";
import { KhongPhaiTaiKhoanGiangVienError } from "@/server/services/gd/loi-giang-day";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { cn } from "@/lib/utils";
import { FormCham } from "./form-cham";

const LOC = [
  { ma: "chua-cham", nhan: "Chưa chấm" },
  { ma: "da-cham", nhan: "Đã chấm" },
  { ma: "tat-ca", nhan: "Tất cả" },
] as const;

// KQ-01 (bổ sung 28/09/2026): giảng viên chấm sản phẩm cuối khóa của học phần/lớp mình phụ trách
export default async function ChamSanPhamPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  let phien;
  try {
    phien = await requirePermission("KQ-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  let dsBaiNop;
  try {
    dsBaiNop = await baiNopCuaGiangVien(phien.userId);
  } catch (error) {
    if (error instanceof KhongPhaiTaiKhoanGiangVienError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  const { loc: locThamSo } = await searchParams;
  const loc = LOC.some((l) => l.ma === locThamSo) ? locThamSo! : "chua-cham";
  const soChuaCham = dsBaiNop.filter((b) => b.diem == null).length;
  const hienThi = dsBaiNop.filter((b) => (loc === "tat-ca" ? true : loc === "chua-cham" ? b.diem == null : b.diem != null));

  // nhóm theo khóa · học phần · yêu cầu
  const nhom = new Map<string, typeof hienThi>();
  for (const b of hienThi) {
    const k = `${b.khoa.maKhoa} · ${b.yeuCau.hocPhan.ten} · ${b.yeuCau.tieuDe}`;
    nhom.set(k, [...(nhom.get(k) ?? []), b]);
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-ued-blue-dam">KQ-01 · Chấm sản phẩm cuối khóa</h1>
        <p className="text-sm text-muted-foreground">
          Bài nộp của học viên thuộc học phần/lớp anh/chị phụ trách. Điểm 0–10; sản phẩm được chọn tính điểm sẽ vào điểm
          đánh giá trực tuyến ở màn hình Nhập điểm.
        </p>
      </div>

      <nav aria-label="Lọc bài nộp" className="flex gap-2">
        {LOC.map((l) => (
          <Link
            key={l.ma}
            href={`/giang-vien/san-pham?loc=${l.ma}`}
            aria-current={l.ma === loc ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              l.ma === loc ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
            )}
          >
            {l.nhan}
            {l.ma === "chua-cham" && soChuaCham > 0 && <span className="ml-1 font-bold">({soChuaCham})</span>}
          </Link>
        ))}
      </nav>

      {nhom.size === 0 ? (
        <TrangThaiRong>{loc === "chua-cham" ? "Không còn bài nộp nào chờ chấm" : "Chưa có bài nộp"}</TrangThaiRong>
      ) : (
        [...nhom.entries()].map(([tieuDe, ds]) => (
          <section key={tieuDe} className="flex flex-col gap-2">
            <h2 className="text-base font-bold text-ued-blue-dam">{tieuDe}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Tệp nộp</TableHead>
                  <TableHead>Nộp lúc</TableHead>
                  <TableHead>Chấm điểm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ds.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {b.hocVien.hoTen}
                      <div className="text-xs text-muted-foreground">{b.hocVien.maHocVien}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <a href={`/api/gd/san-pham/${b.id}`} target="_blank" rel="noreferrer" className="break-all underline">
                        {b.tenFile}
                      </a>
                      {b.ghiChu && <div className="text-xs text-muted-foreground">{b.ghiChu}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{b.nopLuc.toLocaleString("vi-VN")}</TableCell>
                    <TableCell>
                      <FormCham
                        baiNopId={b.id}
                        diem={b.diem == null ? null : Number(b.diem)}
                        nhanXet={b.nhanXet}
                        khoa={b.daPheDuyet}
                      />
                      {b.chamLuc && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {b.nguoiCham} chấm lúc {b.chamLuc.toLocaleString("vi-VN")}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))
      )}
    </main>
  );
}
