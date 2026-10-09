import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { danhSachGiaoDich } from "@/server/services/hp/hp-02-giao-dich-ngan-hang";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { urlGocHeThong } from "@/server/services/qt/url-goc";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { TrangThaiRong } from "@/components/chung/trang-thai-rong";
import { PhanTrang, catTrang, soDongTuUrl, thamSoPhang, type ThamSoUrl } from "@/components/chung/phan-trang";
import { dinhDangTien } from "@/lib/dinh-dang";
import { FormGiaoDichThuNghiem, ThaoTacGiaoDich } from "./thao-tac-giao-dich";

const DUONG = "/hoc-phi/giao-dich";

const NHAN: Record<string, string> = {
  DA_GHI_NHAN: "Đã tự ghi nhận",
  THUA_TIEN: "Chuyển thừa",
  CAN_XU_LY: "Cần xử lý",
  DA_XU_LY: "Đã xử lý thủ công",
};
const NHAN_NGUON: Record<string, string> = { SEPAY: "SePay", CASSO: "Casso", THU_NGHIEM: "Thử nghiệm" };

// (bổ sung 08/10/2026 - HP-02) giao dịch chuyển khoản nhận từ ngân hàng: tự ghi nhận + giao dịch chờ xử lý
export default async function GiaoDichNganHangPage({ searchParams }: { searchParams: Promise<ThamSoUrl> }) {
  try {
    await requirePermission("HP-02");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }

  const thamSo = thamSoPhang(await searchParams);
  const trangThai = thamSo.tt ?? "CHO_XU_LY";
  const [ds, tatCa, goc, thuNghiem, tatTuDong] = await Promise.all([
    danhSachGiaoDich({ trangThai: trangThai === "TAT_CA" ? undefined : trangThai, tuKhoa: thamSo.q }),
    danhSachGiaoDich(),
    urlGocHeThong(),
    layThamSo("TT_CHO_PHEP_THU_NGHIEM"),
    layThamSo("TT_TU_DONG_GHI_NHAN"),
  ]);
  const dem = (tt: string[]) => tatCa.filter((g) => tt.includes(g.trangThai)).length;
  const trang = catTrang(ds, thamSo.trang, soDongTuUrl(thamSo, "trang"));
  const coKhoa = !!process.env.NGAN_HANG_WEBHOOK_KEY;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-ued-blue-dam">Giao dịch chuyển khoản</h1>
        <p className="text-sm text-muted-foreground">
          Thí sinh chuyển khoản đúng nội dung trên đơn (mã khóa + mã sinh viên/mã học viên) thì hệ thống tự ghi nhận Đã đóng và lập biên
          lai. Giao dịch sai nội dung, chuyển thừa hoặc vào khoản đã đóng được giữ ở mục Cần xử lý.
        </p>
      </div>

      <section className="rounded-lg border bg-muted/40 p-4 text-sm">
        <h2 className="mb-2 font-semibold">Kết nối ngân hàng</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Webhook SePay: <code className="break-all">{goc}/api/hp/giao-dich-ngan-hang/sepay</code> (kiểu chứng thực API Key)
          </li>
          <li>
            Webhook Casso: <code className="break-all">{goc}/api/hp/giao-dich-ngan-hang/casso</code> (secure-token)
          </li>
          <li>
            Khóa bí mật (biến môi trường <code>NGAN_HANG_WEBHOOK_KEY</code>):{" "}
            {coKhoa ? <b className="text-success">đã cấu hình</b> : <b className="text-destructive">chưa cấu hình - webhook đang từ chối mọi giao dịch</b>}
          </li>
          <li>
            Tự động ghi nhận:{" "}
            {tatTuDong?.trim() === "0" ? (
              <b className="text-destructive">đang tắt (TT_TU_DONG_GHI_NHAN = 0) - mọi giao dịch vào mục Cần xử lý</b>
            ) : (
              <b className="text-success">đang bật</b>
            )}
          </li>
        </ul>
      </section>

      {thuNghiem?.trim() === "1" && (
        <section className="rounded-lg border border-dashed p-4">
          <h2 className="mb-2 text-sm font-semibold">Giao dịch thử nghiệm (chạy thử - sẽ lập biên lai thật nếu khớp)</h2>
          <FormGiaoDichThuNghiem />
        </section>
      )}

      <Form action={DUONG} scroll={false} prefetch={false} className="flex flex-wrap items-center gap-2">
        <select name="tt" defaultValue={trangThai} className="h-8 rounded-lg border bg-background px-2 text-sm" aria-label="Trạng thái">
          <option value="CHO_XU_LY">Chờ xử lý ({dem(["CAN_XU_LY", "THUA_TIEN"])})</option>
          <option value="DA_GHI_NHAN">Đã tự ghi nhận ({dem(["DA_GHI_NHAN"])})</option>
          <option value="DA_XU_LY">Đã xử lý thủ công ({dem(["DA_XU_LY"])})</option>
          <option value="TAT_CA">Tất cả ({tatCa.length})</option>
        </select>
        <Input name="q" defaultValue={thamSo.q ?? ""} placeholder="Nội dung, mã SV, họ tên, số biên lai" className="h-8 w-72" />
        <Button type="submit" size="sm" variant="secondary">
          Lọc
        </Button>
      </Form>

      {ds.length === 0 ? (
        <TrangThaiRong>Không có giao dịch</TrangThaiRong>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Nội dung chuyển khoản</TableHead>
                  <TableHead>Thí sinh / khóa</TableHead>
                  <TableHead>Kết quả</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trang.dsTrang.map((g) => {
                  const hv = g.hocPhi?.hocVien;
                  const choXuLy = g.trangThai === "CAN_XU_LY" || g.trangThai === "THUA_TIEN";
                  return (
                    <TableRow key={g.id} className="align-top">
                      <TableCell className="whitespace-nowrap text-xs">
                        {g.thoiGianGiaoDich.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                        <span className="block text-muted-foreground">
                          {NHAN_NGUON[g.nguon] ?? g.nguon} #{g.maGiaoDichNguon.slice(0, 12)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {dinhDangTien(Number(g.soTien))}
                        {Number(g.soTienGhiNhan) > 0 && Number(g.soTienGhiNhan) !== Number(g.soTien) && (
                          <span className="block text-xs text-muted-foreground">ghi nhận {dinhDangTien(Number(g.soTienGhiNhan))}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-72 font-mono text-xs break-words">{g.noiDung}</TableCell>
                      <TableCell className="text-sm">
                        {hv && g.hocPhi ? (
                          <>
                            <Link href={`/khoa-hoc/${g.hocPhi.khoaId}/hoc-phi`} className="text-primary underline">
                              {hv.hoTen}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {hv.maSinhVien ?? hv.maHocVien} · {g.hocPhi.khoa.maKhoa}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <NhanTrangThai ma={g.trangThai}>{NHAN[g.trangThai] ?? g.trangThai}</NhanTrangThai>
                        {g.soPhieuThu && <span className="block text-xs">Biên lai {g.soPhieuThu}</span>}
                        {g.ghiChu && <span className="block max-w-64 text-xs text-muted-foreground">{g.ghiChu}</span>}
                        {g.xuLyBoiTen && <span className="block text-xs text-muted-foreground">bởi {g.xuLyBoiTen}</span>}
                      </TableCell>
                      <TableCell>
                        {choXuLy && (
                          <ThaoTacGiaoDich
                            id={g.id}
                            choGan={g.trangThai === "CAN_XU_LY"}
                            maKhoaGoiY={g.noiDung.toUpperCase().match(/KH\s?\d{7}/)?.[0]?.replace(/\s/g, "") ?? ""}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PhanTrang duong={DUONG} thamSo={thamSo} ten="trang" trang={trang.trang} tongTrang={trang.tongTrang} tongDong={trang.tongDong} soDong={trang.soDong} />
        </>
      )}
    </main>
  );
}
