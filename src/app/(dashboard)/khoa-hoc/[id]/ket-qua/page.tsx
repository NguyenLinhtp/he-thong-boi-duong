import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { chuyenCanCuaKhoa, dieuKienDatCuaKhoa, hocVienTinhKetQua, laKhoaChiDuThi } from "@/server/services/kq/dung-chung";
import { diemTheoMuc, mucDanhGiaCuaChuongTrinh } from "@/server/services/kq/kq-02-theo-hoc-lieu";
import { bangDiemChiTietKhoa, bangTongHopKetQua } from "@/server/services/kq/kq-02-tong-hop";
import { TableHeader, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { NutTongHop, NutXetHoanThanh, FormPheDuyet, FormKetQuaThi, FormNhapDiemTuTep, FormPhucKhao, FormDieuKienDat, FormDiemThanhPhan, FormPhucKhaoThanhPhan, KhoiCauTrucDiemKhoa, type ThiSinhDong } from "./cac-form";
import { cauHinhDiemThiCuaKhoa, coDieuKien, docDiem, moTaCauHinh } from "@/server/services/kq/cau-truc-diem-thi";
import { BangPhanTrang } from "@/components/chung/bang-phan-trang";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

function nhanHoanThanh(hoanThanh: boolean | null) {
  if (hoanThanh === null) return "Chưa xét";
  return hoanThanh ? "Đủ điều kiện" : "Không đủ điều kiện";
}

export default async function KetQuaKhoaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let quyen;
  try {
    // trang dùng chung KQ-02/03/04/06 - vào được khi có ít nhất 1 quyền (vd Cán
    // bộ tài chính chỉ có KQ-03), từng khối thao tác hiện theo đúng quyền riêng.
    const [kq02, kq03, kq04, kq06] = await Promise.all(
      ["KQ-02", "KQ-03", "KQ-04", "KQ-06"].map(coQuyen),
    );
    if (!kq02 && !kq03 && !kq04 && !kq06) await requirePermission("KQ-03");
    quyen = { kq02, kq03, kq04, kq06 };
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

  const chiDuThi = laKhoaChiDuThi(khoa);
  const [dsDangKy, dsDiem, dsTongHop] = await Promise.all([
    hocVienTinhKetQua(id),
    bangDiemChiTietKhoa(id),
    bangTongHopKetQua(id),
  ]);
  const daPheDuyet = dsTongHop.some((kq) => kq.daPheDuyet);
  const dieuKienDat = await dieuKienDatCuaKhoa(id);
  // (bổ sung 13/10/2026) khóa chỉ thi có cấu trúc điểm thành phần (cấu hình ở chương trình, khóa sửa riêng)
  const { cauHinh, nguon: nguonCauHinh } = chiDuThi ? await cauHinhDiemThiCuaKhoa(id) : { cauHinh: null, nguon: null };
  const dsThanhPhan = cauHinh?.thanhPhans ?? [];
  const khongNhapDiem = cauHinh !== null && dsThanhPhan.length === 0;
  const khongXet = cauHinh !== null && !coDieuKien(cauHinh);
  // (bổ sung 13/10/2026) khóa có đào tạo: xét theo bài đánh giá cấu hình trong học liệu + chuyên cần
  const chuyenCan = chiDuThi ? null : await chuyenCanCuaKhoa(id);
  const dsMuc = chiDuThi ? [] : await mucDanhGiaCuaChuongTrinh(khoa.chuongTrinhId);
  const diemMuc = dsMuc.length > 0 ? await diemTheoMuc(id, dsMuc, dsDangKy.map((dk) => dk.hocVienId)) : new Map();
  const NHAN_NGUON: Record<string, string> = { KHOA: "riêng của khóa", CHUONG_TRINH: "theo chương trình", HE_THONG: "theo tham số chung của hệ thống" };
  const quyetDinh = dsTongHop.find((kq) => kq.daPheDuyet);
  const tongHopTheoHocVien = new Map(dsTongHop.map((kq) => [kq.hocVienId, kq]));
  // (bổ sung 13/10/2026 - KQ-06) khóa dự thi: bảng nhập điểm theo đợt thi -> phòng -> số báo danh, lọc theo phòng
  const sp = await searchParams;
  const thamSo = (ten: string) => (typeof sp[ten] === "string" ? (sp[ten] as string) : "");
  const dsDotThi = chiDuThi
    ? await prisma.dotThi.findMany({
        where: { khoaId: id, loai: "THI" },
        orderBy: { createdAt: "asc" },
        include: { phongThis: { orderBy: { thuTu: "asc" }, include: { xepPhongThis: { orderBy: { thuTu: "asc" } } } } },
      })
    : [];
  const dotChon = dsDotThi.find((d) => d.id === thamSo("dot")) ?? dsDotThi.find((d) => d.phongThis.some((p) => p.xepPhongThis.length > 0)) ?? dsDotThi[0];
  const xepTheoDangKy = new Map(
    (dotChon?.phongThis ?? []).flatMap((p) => p.xepPhongThis.map((x) => [x.dangKyId, { phong: p, sbd: x.soBaoDanh }] as const)),
  );
  const dsNhapDiem: (ThiSinhDong & { phongId: string | null; thuTuPhong: number })[] = dsDangKy
    .map((dk) => {
      const kq = tongHopTheoHocVien.get(dk.hocVienId);
      const xep = xepTheoDangKy.get(dk.id);
      return {
        hocVienId: dk.hocVienId,
        maHocVien: dk.hocVien.maHocVien,
        maSinhVien: dk.hocVien.maSinhVien,
        hoTen: dk.hocVien.hoTen,
        diemThi: kq?.diemTongKet != null ? Number(kq.diemTongKet) : null,
        phong: xep?.phong.ten ?? null,
        phongId: xep?.phong.id ?? null,
        thuTuPhong: xep?.phong.thuTu ?? Number.MAX_SAFE_INTEGER,
        soBaoDanh: xep?.sbd ?? null,
      };
    })
    .sort((a, b) => a.thuTuPhong - b.thuTuPhong || (a.soBaoDanh ?? 0) - (b.soBaoDanh ?? 0) || a.hoTen.localeCompare(b.hoTen, "vi"));
  // (sửa 13/10/2026) có đợt thi: chỉ hiện thí sinh đã xếp phòng và các phòng có thí sinh
  const phongLoc = thamSo("phong");
  const dsDaXep = dotChon ? dsNhapDiem.filter((d) => d.phongId !== null) : dsNhapDiem;
  const soChuaXep = dotChon ? dsNhapDiem.length - dsDaXep.length : 0;
  const dsNhapDiemLoc = phongLoc ? dsDaXep.filter((d) => d.phongId === phongLoc) : dsDaXep;
  const boLocPhong = dotChon
    ? [
        { ma: "", nhan: "Tất cả", so: dsDaXep.length },
        ...dotChon.phongThis
          .map((p) => ({ ma: p.id, nhan: p.ten, so: dsDaXep.filter((d) => d.phongId === p.id).length }))
          .filter((b) => b.so > 0),
      ]
    : [];
  const lienKet = (dot: string | undefined, phong: string) => {
    const q = new URLSearchParams();
    if (dot) q.set("dot", dot);
    if (phong) q.set("phong", phong);
    return `/khoa-hoc/${id}/ket-qua${q.size > 0 ? `?${q}` : ""}`;
  };
  const nutLoc = (dangChon: boolean) =>
    "rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap " +
    (dangChon ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted");

  // KH-07: lớp chỉ là thông tin hiển thị - kết quả và phê duyệt vẫn theo khóa
  const maLopTheoHocVien = new Map(dsDangKy.map((dk) => [dk.hocVienId, dk.lop?.maLop ?? null]));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="ket-qua" />
      <div className="rounded-lg border bg-card p-4 shadow-sm text-sm">
        <p>
          {chiDuThi
            ? "Phương thức 3 (chỉ dự thi): kết quả = điểm thi nhập trực tiếp (KQ-06), không tính chuyên cần."
            : "Khóa có giảng dạy: điểm tổng kết = trung bình điểm học phần theo trọng số số tiết, kèm điều kiện chuyên cần."}
        </p>
        {cauHinh ? (
          <p>
            {moTaCauHinh(cauHinh)} <span className="text-muted-foreground">({nguonCauHinh === "KHOA" ? "riêng của khóa" : "theo chương trình"})</span>
          </p>
        ) : (
          <FormDieuKienDat
            khoaId={khoa.id}
            diemDatRieng={khoa.diemDat == null ? null : Number(khoa.diemDat)}
            diemDatApDung={dieuKienDat.diemDat}
            nguon={NHAN_NGUON[dieuKienDat.nguon]}
            duocSua={!daPheDuyet && (chiDuThi ? quyen.kq06 : quyen.kq02)}
            chuyenCan={
              chuyenCan
                ? {
                    apDung: chuyenCan.chuyenCanToiThieu,
                    rieng: khoa.chuyenCanToiThieu == null ? null : Number(khoa.chuyenCanToiThieu),
                    nguon: NHAN_NGUON[chuyenCan.nguon],
                  }
                : undefined
            }
          />
        )}
        {chiDuThi && (
          <KhoiCauTrucDiemKhoa
            khoaId={khoa.id}
            giaTri={cauHinh}
            laRieng={nguonCauHinh === "KHOA"}
            duocSua={!daPheDuyet && quyen.kq06}
          />
        )}
        <p>
          Trạng thái:{" "}
          {daPheDuyet
            ? `Đã phê duyệt - QĐ ${quyetDinh?.soQuyetDinh} (${quyetDinh?.ngayPheDuyet?.toLocaleDateString("vi-VN")}, ${quyetDinh?.nguoiPheDuyet})`
            : "Chưa phê duyệt"}
        </p>
      </div>

      {chiDuThi ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-06 · Nhập kết quả thi</h2>
          {dsDotThi.length > 1 && (
            <nav aria-label="Đợt thi" className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Đợt thi:</span>
              {dsDotThi.map((d) => (
                <Link key={d.id} href={lienKet(d.id, "")} scroll={false} className={nutLoc(d.id === dotChon?.id)} aria-current={d.id === dotChon?.id ? "page" : undefined}>
                  {d.ten}
                </Link>
              ))}
            </nav>
          )}
          {boLocPhong.length > 1 && (
            <nav aria-label="Lọc theo phòng thi" className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Phòng:</span>
              {boLocPhong.map((b) => (
                <Link key={b.ma || "tat-ca"} href={lienKet(dotChon?.id, b.ma)} scroll={false} className={nutLoc(phongLoc === b.ma)} aria-current={phongLoc === b.ma ? "page" : undefined}>
                  {b.nhan} <span className="ml-1 text-xs opacity-80">{b.so}</span>
                </Link>
              ))}
            </nav>
          )}
          {soChuaXep > 0 && (
            <p className="text-sm text-warning">
              {soChuaXep} thí sinh chính thức chưa được xếp phòng trong đợt này - không hiện ở bảng nhập điểm (xếp/bổ sung ở tab Lịch thi &amp; phòng thi).
            </p>
          )}
          {dsDotThi.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có đợt thi nào (tab Lịch thi &amp; phòng thi) - bảng nhập điểm xếp theo tên.</p>
          )}
          {khongNhapDiem ? (
            <p className="text-sm text-muted-foreground">Khóa được cấu hình không nhập điểm (chỉ lấy danh sách chính thức).</p>
          ) : quyen.kq06 && !daPheDuyet ? (
            <>
              <FormNhapDiemTuTep
                khoaId={khoa.id}
                linkTaiTep={dsDotThi
                  .filter((d) => d.phongThis.some((p) => p.xepPhongThis.length > 0))
                  .map((d) => ({ href: `/api/kh/dot-thi/${d.id}/excel`, nhan: `Tải danh sách phòng thi - ${d.ten}` }))}
              />
              {cauHinh ? (
                <FormDiemThanhPhan
                  key={`${dotChon?.id ?? ""}-${phongLoc}-${dsThanhPhan.map((tp) => tp.ma).join(",")}`}
                  khoaId={khoa.id}
                  theoPhong={Boolean(dotChon)}
                  thanhPhans={dsThanhPhan}
                  dsThiSinh={dsNhapDiemLoc.map((d) => ({ ...d, diem: docDiem(tongHopTheoHocVien.get(d.hocVienId)?.diemThanhPhan ?? null) }))}
                />
              ) : (
                <FormKetQuaThi key={`${dotChon?.id ?? ""}-${phongLoc}`} khoaId={khoa.id} theoPhong={Boolean(dotChon)} dsThiSinh={dsNhapDiemLoc} />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {daPheDuyet ? "Kết quả đã phê duyệt - sửa qua phúc khảo ở bảng dưới." : "Không có quyền KQ-06."}
            </p>
          )}
        </section>
      ) : dsMuc.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-02 · Bảng điểm theo bài đánh giá (cấu hình trong học liệu chương trình)</h2>
          <p className="text-sm text-muted-foreground">
            Điểm cuối khóa = trung bình có hệ số các bài tính điểm; trắc nghiệm lấy lần làm cao nhất (chưa làm = 0), sản phẩm lấy điểm giảng viên chấm. Bấm Tổng hợp
            để cập nhật kết quả toàn khóa.
          </p>
          <BangPhanTrang
            dauBang={
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  {dsMuc.map((m) => (
                    <TableHead key={m.khoa}>
                      {m.ten}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {m.tinhDiem ? `hệ số ${m.heSo}` : "bắt buộc đạt"}
                        {m.diemDat !== null && ` · đạt ≥ ${m.diemDat}`}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            }
          >
            {dsDangKy.map((dk) => (
              <TableRow key={dk.id}>
                <TableCell>{dk.hocVien.hoTen}</TableCell>
                {dsMuc.map((m) => {
                  const d = diemMuc.get(dk.hocVienId)?.[m.khoa];
                  return (
                    <TableCell key={m.khoa} className={m.diemDat !== null && (d?.diem == null || d.diem < m.diemDat) ? "text-destructive" : undefined}>
                      {d?.trangThai === "CO_DIEM" ? d.diem : d?.trangThai === "CHUA_CHAM" ? "Chưa chấm" : m.loai === "TN" ? "Chưa làm" : "Chưa nộp"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </BangPhanTrang>
          {quyen.kq02 && !daPheDuyet && <NutTongHop khoaId={khoa.id} />}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-01 · Bảng điểm học phần (giảng viên nhập)</h2>
          <BangPhanTrang
            dauBang={
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Học phần</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>KT</TableHead>
                  <TableHead>Điểm HP</TableHead>
                  <TableHead>Phúc khảo</TableHead>
                </TableRow>
              </TableHeader>
            }
            rong={
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Giảng viên chưa nhập điểm học phần nào
                </TableCell>
              </TableRow>
            }
          >
            {dsDiem.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.hocVien.hoTen}</TableCell>
                <TableCell>{d.hocPhan.ten}</TableCell>
                <TableCell>{d.diemThanhPhan?.toString() ?? "—"}</TableCell>
                <TableCell>{d.diemKetThuc?.toString() ?? "—"}</TableCell>
                <TableCell>{d.diemHocPhan?.toString() ?? "—"}</TableCell>
                <TableCell>
                  {d.soQuyetDinhPhucKhao && (
                    <span className="mr-1 text-xs text-muted-foreground">QĐ {d.soQuyetDinhPhucKhao}</span>
                  )}
                  {quyen.kq04 && d.daPheDuyet && (
                    <FormPhucKhao khoaId={khoa.id} ketQuaId={d.id} loai="hocPhan" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </BangPhanTrang>
          {quyen.kq02 && !daPheDuyet && <NutTongHop khoaId={khoa.id} />}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">
          {chiDuThi ? "KQ-06 · Kết quả thi (Đạt/Không đạt tự xác định khi lưu điểm)" : "KQ-02/03 · Kết quả toàn khóa và điều kiện hoàn thành"}
        </h2>
        <BangPhanTrang
          dauBang={
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                {dsThanhPhan.map((tp) => (
                  <TableHead key={tp.ma}>{tp.ten}</TableHead>
                ))}
                <TableHead>{cauHinh ? "Điểm tổng" : chiDuThi ? "Điểm thi" : "Điểm tổng kết"}</TableHead>
                {!chiDuThi && <TableHead>Chuyên cần</TableHead>}
                <TableHead>{chiDuThi ? "Kết quả" : "Học tập"}</TableHead>
                {/* (sửa 13/10/2026) khóa dự thi: lệ phí đã xác nhận khi vào danh sách chính thức - chỉ xét điểm */}
                {!chiDuThi && <TableHead>Học phí (HP-06)</TableHead>}
                {!chiDuThi && <TableHead>Hoàn thành</TableHead>}
                <TableHead>Ghi chú</TableHead>
                {chiDuThi && <TableHead>Phúc khảo</TableHead>}
              </TableRow>
            </TableHeader>
          }
          rong={
            <TableRow>
              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                Chưa có kết quả toàn khóa - {chiDuThi ? "nhập kết quả thi (KQ-06)" : "bấm tổng hợp (KQ-02)"} trước
              </TableCell>
            </TableRow>
          }
        >
          {dsTongHop.map((kq) => (
            <TableRow key={kq.id}>
              <TableCell>
                {kq.hocVien.hoTen}
                {maLopTheoHocVien.get(kq.hocVienId) && (
                  <span className="ml-1 text-xs text-muted-foreground">({maLopTheoHocVien.get(kq.hocVienId)})</span>
                )}
              </TableCell>
              {dsThanhPhan.map((tp) => (
                <TableCell key={tp.ma}>{docDiem(kq.diemThanhPhan)[tp.ma] ?? "—"}</TableCell>
              ))}
              <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
              {!chiDuThi && (
                <TableCell>{kq.tyLeChuyenCan != null ? `${kq.tyLeChuyenCan.toString()}%` : "—"}</TableCell>
              )}
              <TableCell>{kq.datHocTap === null ? (khongXet ? "Không xét" : "—") : kq.datHocTap ? "Đạt" : "Không đạt"}</TableCell>
              {!chiDuThi && (
                <TableCell>
                  {kq.duDieuKienHocPhi === null ? "Chưa xét" : kq.duDieuKienHocPhi ? "Hoàn tất" : "Chưa hoàn tất"}
                </TableCell>
              )}
              {!chiDuThi && <TableCell>{nhanHoanThanh(kq.hoanThanh)}</TableCell>}
              <TableCell className="text-xs">{kq.ghiChu ?? ""}</TableCell>
              {chiDuThi && (
                <TableCell>
                  {quyen.kq04 && kq.daPheDuyet &&
                    (dsThanhPhan.length > 0 ? (
                      <FormPhucKhaoThanhPhan khoaId={khoa.id} ketQuaId={kq.id} thanhPhans={dsThanhPhan} diem={docDiem(kq.diemThanhPhan)} />
                    ) : (
                      <FormPhucKhao khoaId={khoa.id} ketQuaId={kq.id} loai="thi" />
                    ))}
                </TableCell>
              )}
            </TableRow>
          ))}
        </BangPhanTrang>
        {quyen.kq03 && !daPheDuyet && !chiDuThi && <NutXetHoanThanh khoaId={khoa.id} />}
      </section>

      {/* (bổ sung 13/10/2026) khóa không đặt điều kiện đạt (chỉ ghi điểm/lấy danh sách) thì không phê duyệt kết quả */}
      {quyen.kq04 && !daPheDuyet && !khongXet && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-04 · Phê duyệt kết quả cuối cùng</h2>
          <FormPheDuyet khoaId={khoa.id} />
        </section>
      )}
    </main>
  );
}
