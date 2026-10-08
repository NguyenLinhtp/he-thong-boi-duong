import { docSoTien, type MauBienLai } from "@/lib/mau-in";

export type NoiDungBienLai = MauBienLai & { nguoiNop: string; diaChi: string };

function Dong({ nhan, giaTri, duoi }: { nhan: string; giaTri?: string; duoi?: string }) {
  return (
    <p className="flex items-end gap-1">
      <span className="shrink-0">{nhan}</span>
      <span className="min-h-[1.4em] flex-1 border-b border-dotted border-black">{giaTri}</span>
      {duoi && <span className="shrink-0">{duoi}</span>}
    </p>
  );
}

/**
 * (bổ sung 07/10/2026 - HP-04) Biên lai thu tiền theo mẫu C45-BB (Thông tư 107/2017/TT-BTC):
 * nội dung (đơn vị, mã QHNS, quyển số, nội dung thu...) đã chốt khi lập phiếu. Thành phần thuần.
 */
export function BanInBienLai({
  nd,
  soPhieu,
  ngayLap,
  soTien,
  nguoiThuTen,
  daHuy,
  thayChoSoPhieu,
}: {
  nd: NoiDungBienLai;
  soPhieu: string;
  ngayLap: Date;
  soTien: number;
  nguoiThuTen?: string | null;
  daHuy?: { luc: Date | null; lyDo: string | null; nguoi: string | null } | null;
  thayChoSoPhieu?: string | null;
}) {
  return (
    <article className="relative bg-white px-8 py-6 text-[12.5pt] leading-relaxed text-black print:p-0" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      {daHuy && (
        <div className="mb-3 rounded border-2 border-red-600 p-2 text-center font-bold text-red-600">
          BIÊN LAI ĐÃ HỦY{daHuy.luc && ` ngày ${daHuy.luc.toLocaleDateString("vi-VN")}`}
          {daHuy.nguoi && ` - ${daHuy.nguoi}`}
          {daHuy.lyDo && <span className="block font-normal">Lý do: {daHuy.lyDo}</span>}
        </div>
      )}
      <div className="flex justify-between gap-6">
        <div className="flex flex-col">
          <p>Đơn vị: {nd.donVi || "……………………………"}</p>
          <p>Mã QHNS: {nd.maQHNS || "………………………"}</p>
        </div>
        <div className="max-w-[55%] text-center">
          {nd.mauSo && <p className="font-bold">Mẫu số: {nd.mauSo}</p>}
          {nd.canCuMau && <p className="text-[11pt] italic">({nd.canCuMau})</p>}
        </div>
      </div>

      <h1 className="mt-5 text-center text-[14pt] font-bold uppercase">{nd.tieuDe}</h1>
      <p className="text-center italic">
        Ngày {ngayLap.getDate()} tháng {ngayLap.getMonth() + 1} năm {ngayLap.getFullYear()}
      </p>
      <div className="ml-auto mt-1 w-56">
        <p>Quyển số: {nd.quyenSo || "………"}</p>
        <p>
          Số: <b>{soPhieu}</b>
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Dong nhan="Họ và tên người nộp:" giaTri={nd.nguoiNop} />
        <Dong nhan="Địa chỉ:" giaTri={nd.diaChi} />
        <Dong nhan="Nội dung thu:" giaTri={nd.noiDungThu} />
        <Dong nhan="Số tiền thu:" giaTri={soTien.toLocaleString("vi-VN")} duoi={`(${nd.loaiTien || "loại tiền"})`} />
        <Dong nhan="(Viết bằng chữ):" giaTri={docSoTien(soTien)} />
      </div>
      {thayChoSoPhieu && <p className="mt-1 text-[11pt] italic">Lập thay cho biên lai số {thayChoSoPhieu} đã hủy.</p>}

      <div className="mt-5 grid grid-cols-2 text-center">
        <div>
          <p className="font-bold uppercase">{nd.nhanNguoiNop}</p>
          <p className="italic">(Ký, họ tên)</p>
          <p className="mt-14">{nd.nguoiNop}</p>
        </div>
        <div>
          <p className="font-bold uppercase">{nd.nhanNguoiThu}</p>
          <p className="italic">(Ký, họ tên)</p>
          <p className="mt-14">{nguoiThuTen ?? ""}</p>
        </div>
      </div>
    </article>
  );
}
