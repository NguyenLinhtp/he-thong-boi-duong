import { notFound, redirect } from "next/navigation";
import { coQuyen, requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { danhSachDotThi, NHAN_LOAI_DOT, ngayIso, ngayVn } from "@/server/services/kh/kh-03-phong-thi";
import { dsThanhPhanLePhi } from "@/server/services/hp/hp-01-thanh-phan-le-phi";
import { danhSachPhongHoc } from "@/server/services/dm/dm-04-phong-hoc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { FormSuaPhong, FormTaoDot, FormThemPhong, ThaoTacDot } from "./cac-form";

// (bổ sung 12/10/2026 - KH-03) Tab Lịch thi & phòng thi của khóa chỉ đăng ký dự thi/ôn thi (Phương thức 3):
// tạo đợt thi/ôn thi, tạo phòng (ngày, ca, giờ, phòng vật lý, số thí sinh), xếp phòng A->Z, chốt, bổ sung, xuất Excel
export default async function PhongThiPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("KH-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();
  if (!khoa.chuongTrinh.phuongThucDangKys.includes("CHI_DU_THI")) {
    return (
      <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
        <DauTrangKhoa khoa={khoa} dangChon="phong-thi" />
        <p className="text-muted-foreground">Lịch thi, phòng thi chỉ áp dụng cho khóa chỉ đăng ký dự thi/ôn thi (Phương thức 3).</p>
      </main>
    );
  }

  const [dsDot, dsTp, dsPhongHoc, duocSua] = await Promise.all([danhSachDotThi(id), dsThanhPhanLePhi(id), danhSachPhongHoc(), coQuyen("KH-03")]);
  const dsNguon = [
    ...dsTp.map((t) => ({ id: t.id, ten: `Danh sách chính thức - ${t.ten.toLowerCase()}` })),
    { id: "", ten: "Toàn bộ danh sách chính thức" },
  ];
  const phongHoc = dsPhongHoc.map((p) => ({ id: p.id, ten: `${p.ten}${p.coSo ? ` - ${p.coSo}` : ""}`, sucChua: p.sucChua }));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="phong-thi" />
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">Lịch thi, ôn thi và phòng thi</h2>
        <p className="text-sm text-muted-foreground">
          Tạo đợt thi (hoặc ôn thi) từ danh sách chính thức, tạo các phòng (ngày, ca, giờ, phòng vật lý, số thí sinh mỗi phòng) rồi bấm Xếp phòng: thí sinh
          được sắp theo tên A→Z và xếp lần lượt vào các phòng đến hết. Sau khi chốt, thí sinh mới vào danh sách chính thức được bổ sung vào phòng cuối, không
          xếp lại toàn bộ.
        </p>
        {duocSua && <FormTaoDot khoaId={khoa.id} dsNguon={dsNguon} />}
      </section>

      {dsDot.length === 0 && <p className="text-sm text-muted-foreground">Chưa có đợt thi nào.</p>}

      {dsDot.map((dot) => {
        const daXep = dot.phongThis.reduce((t, p) => t + p.xepPhongThis.length, 0);
        const tongCho = dot.phongThis.reduce((t, p) => t + p.sucChua, 0);
        const cuoi = dot.phongThis[dot.phongThis.length - 1];
        return (
          <section key={dot.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold">{dot.ten}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{NHAN_LOAI_DOT[dot.loai]}</span>
              <NhanTrangThai ma={dot.daChot ? "CHINH_THUC" : daXep > 0 ? "CHO_DUYET" : "CHUA_XEP"}>
                {dot.daChot ? "Đã chốt" : daXep > 0 ? "Đã xếp - chưa chốt" : "Chưa xếp"}
              </NhanTrangThai>
              <a href={`/api/kh/dot-thi/${dot.id}/excel`} className="text-sm text-primary underline">
                Xuất danh sách theo phòng (Excel)
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Nguồn: {dot.thanhPhan ? `danh sách chính thức - ${dot.thanhPhan.ten.toLowerCase()}` : "toàn bộ danh sách chính thức"} ·{" "}
              <strong className="text-foreground">{dot.soNguon}</strong> thí sinh · đã xếp <strong className="text-foreground">{daXep}</strong> · tổng sức chứa{" "}
              {tongCho} ({dot.phongThis.length} phòng)
              {dot.chuaXep > 0 && <span className="text-warning"> · {dot.chuaXep} thí sinh chưa xếp phòng</span>}
              {dot.khongConTrongDs.size > 0 && <span className="text-destructive"> · {dot.khongConTrongDs.size} thí sinh đã xếp nhưng không còn trong danh sách chính thức</span>}
              {dot.moTa && <> · {dot.moTa}</>}
            </p>
            {!dot.daChot && daXep > 0 && dot.phongThis.some((p) => p.xepPhongThis.length > p.sucChua) && (
              <p className="text-sm text-warning">Có phòng nhiều thí sinh hơn số lượng vừa sửa - bấm Xếp lại phòng để chia lại.</p>
            )}
            {duocSua && <ThaoTacDot khoaId={khoa.id} dotThiId={dot.id} daChot={dot.daChot} daXep={daXep > 0} chuaXep={dot.chuaXep} />}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dot.loai === "THI" ? "Phòng thi" : "Lớp ôn"}</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Ca · giờ</TableHead>
                  <TableHead>Phòng vật lý / địa điểm</TableHead>
                  <TableHead>Thí sinh / sức chứa</TableHead>
                  {duocSua && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dot.phongThis.map((p) => (
                  <TableRow key={p.id} className="align-top">
                    <TableCell>
                      <details>
                        <summary className="cursor-pointer font-medium">{p.ten}</summary>
                        {p.xepPhongThis.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">Chưa có thí sinh</p>
                        ) : (
                          <ol className="mt-1 flex flex-col gap-0.5 text-xs">
                            {p.xepPhongThis.map((x) => (
                              <li key={x.id} className={dot.khongConTrongDs.has(x.dangKyId) ? "text-destructive line-through" : undefined}>
                                <span className="font-mono">{String(x.soBaoDanh).padStart(3, "0")}</span> · {x.dangKy.hocVien.hoTen}
                                {x.dangKy.hocVien.maSinhVien && <span className="text-muted-foreground"> · {x.dangKy.hocVien.maSinhVien}</span>}
                                {x.boSung && <span className="text-warning"> · bổ sung</span>}
                              </li>
                            ))}
                          </ol>
                        )}
                      </details>
                    </TableCell>
                    <TableCell>{ngayVn(p.ngay) || "—"}</TableCell>
                    <TableCell>{[p.ca, [p.gioBatDau, p.gioKetThuc].filter(Boolean).join("-")].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell>{[p.phongHoc?.ten, p.diaDiem].filter(Boolean).join(" - ") || "—"}</TableCell>
                    <TableCell className={p.xepPhongThis.length > p.sucChua ? "text-destructive" : undefined}>
                      {p.xepPhongThis.length}/{p.sucChua}
                    </TableCell>
                    {duocSua && (
                      <TableCell>
                        <FormSuaPhong
                          khoaId={khoa.id}
                          phongThiId={p.id}
                          dsPhongHoc={phongHoc}
                          duocXoa={p.xepPhongThis.length === 0}
                          gt={{
                            ngay: ngayIso(p.ngay),
                            ca: p.ca ?? "",
                            gioBatDau: p.gioBatDau ?? "",
                            gioKetThuc: p.gioKetThuc ?? "",
                            phongHocId: p.phongHocId ?? "",
                            diaDiem: p.diaDiem ?? "",
                            sucChua: p.sucChua,
                          }}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {dot.phongThis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Chưa có phòng - thêm phòng bên dưới
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {duocSua && (
              <FormThemPhong
                khoaId={khoa.id}
                dotThiId={dot.id}
                dsPhongHoc={phongHoc}
                macDinh={
                  cuoi
                    ? { ngay: ngayIso(cuoi.ngay), ca: cuoi.ca ?? "", gioBatDau: cuoi.gioBatDau ?? "", gioKetThuc: cuoi.gioKetThuc ?? "", sucChua: cuoi.sucChua }
                    : { sucChua: 30 }
                }
              />
            )}
          </section>
        );
      })}
    </main>
  );
}
