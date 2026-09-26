import fsPromises from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { prisma } from "@/lib/db/prisma";
import {
  KhongTimThayBanSaoLuuError,
  BanSaoLuuChuaSanSangError,
  TepSaoLuuKhongHopLeError,
} from "./loi-sao-luu";

// QT-04: "Sao lưu tối thiểu hằng ngày, lưu tối thiểu 30 bản gần nhất" - sau
// mỗi lần sao lưu thành công, dọn các bản cũ hơn 30 bản gần nhất.
const SO_BAN_TOI_THIEU_LUU = 30;

const THU_MUC_SAO_LUU = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");

// Thứ tự bảng cha -> con theo khóa ngoại, dùng để chèn dữ liệu khi phục hồi
// (và đảo ngược để xóa sạch trước khi chèn lại). Bảng SaoLuu (chính nó, lưu
// nhật ký sao lưu) cố tình không nằm trong danh sách - không tự sao lưu/xóa
// nhật ký của chính nó.
const THU_TU_BANG = [
  "nguoiDung",
  "vaiTroModel",
  "chucNangHeThong",
  "donVi",
  "chucDanhHocVi",
  "loaiHinhBoiDuong",
  "phongHoc",
  "dotTuyenSinh",
  "nguoiDungVaiTro",
  "vaiTroChucNang",
  "cauHinhSmtp",
  "nhatKyThaoTac",
  "thamSoHeThong",
  "giangVien",
  "hocVien",
  "thongBao",
  "chuongTrinh",
  "donViLienKet",
  "chuongTrinhPhienBan",
  "hocPhan",
  "khoa",
  "lopHoc",
  "giangVienHocPhan",
  "buoiHoc",
  "taiLieuHocTap",
  "hopDongLienKet",
  "loNopHoSo",
  "dangKyHoc",
  "lichSuChuyenLop",
  "diemDanh",
  "ketQuaHocTap",
  "ketQuaKhoa",
  "hocPhi",
  "phieuThu",
  "banGiaoChungChi",
  "quyetDinhCapVanBang",
  "chungChi",
  "mauBieuBaoCao",
] as const;

type TenBang = (typeof THU_TU_BANG)[number];
type DongDuLieu = Record<string, unknown>;

type DelegateBangDuLieu = {
  findMany: (args?: unknown) => Promise<DongDuLieu[]>;
  createMany: (args: { data: DongDuLieu[] }) => Promise<unknown>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  update: (args: { where: { id: string }; data: DongDuLieu }) => Promise<unknown>;
};

function layDelegate(client: unknown, ten: TenBang): DelegateBangDuLieu {
  return (client as unknown as Record<string, DelegateBangDuLieu>)[ten];
}

type NoiDungSaoLuu = {
  phienBan: 1;
  thoiGianXuat: string;
  duLieu: Record<TenBang, DongDuLieu[]>;
};

export async function chayBackupNgay(
  nguoiKichHoat?: string,
  loaiKichHoat: "THU_CONG" | "TU_DONG" = "THU_CONG",
) {
  const banGhi = await prisma.saoLuu.create({
    data: { trangThai: "DANG_CHAY", loaiKichHoat, nguoiKichHoat },
  });

  try {
    const duLieu = await prisma.$transaction(async (tx) => {
      const ketQua = {} as Record<TenBang, DongDuLieu[]>;
      for (const ten of THU_TU_BANG) {
        ketQua[ten] = await layDelegate(tx, ten).findMany();
      }
      return ketQua;
    });

    const noiDung: NoiDungSaoLuu = {
      phienBan: 1,
      thoiGianXuat: new Date().toISOString(),
      duLieu,
    };

    await fsPromises.mkdir(THU_MUC_SAO_LUU, { recursive: true });
    const duongDan = path.join(THU_MUC_SAO_LUU, `backup_${banGhi.id}.json.gz`);
    const noiDungNen = zlib.gzipSync(Buffer.from(JSON.stringify(noiDung)));
    await fsPromises.writeFile(duongDan, noiDungNen);

    const ketQuaCapNhat = await prisma.saoLuu.update({
      where: { id: banGhi.id },
      data: {
        trangThai: "THANH_CONG",
        thoiGianKetThuc: new Date(),
        duongDanFile: duongDan,
        kichThuocByte: noiDungNen.byteLength,
      },
    });

    await donDepBanSaoLuuCu();
    return ketQuaCapNhat;
  } catch (error) {
    await prisma.saoLuu.update({
      where: { id: banGhi.id },
      data: {
        trangThai: "THAT_BAI",
        thoiGianKetThuc: new Date(),
        loiChiTiet: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

async function donDepBanSaoLuuCu() {
  const banThanhCong = await prisma.saoLuu.findMany({
    where: { trangThai: "THANH_CONG" },
    orderBy: { thoiGianBatDau: "desc" },
    select: { id: true, duongDanFile: true },
  });
  const canXoa = banThanhCong.slice(SO_BAN_TOI_THIEU_LUU);
  if (canXoa.length === 0) return;

  for (const ban of canXoa) {
    if (ban.duongDanFile) {
      await fsPromises.rm(ban.duongDanFile, { force: true });
    }
  }
  await prisma.saoLuu.deleteMany({ where: { id: { in: canXoa.map((b) => b.id) } } });
}

export async function danhSachSaoLuu() {
  return prisma.saoLuu.findMany({ orderBy: { thoiGianBatDau: "desc" } });
}

export async function phucHoiTuBanSaoLuu(saoLuuId: string) {
  const ban = await prisma.saoLuu.findUnique({ where: { id: saoLuuId } });
  if (!ban) throw new KhongTimThayBanSaoLuuError();
  if (ban.trangThai !== "THANH_CONG" || !ban.duongDanFile) {
    throw new BanSaoLuuChuaSanSangError();
  }

  let noiDung: NoiDungSaoLuu;
  try {
    const nen = await fsPromises.readFile(ban.duongDanFile);
    const giaiNen = zlib.gunzipSync(nen);
    const parsed = JSON.parse(giaiNen.toString("utf-8")) as Partial<NoiDungSaoLuu>;
    if (!parsed || typeof parsed !== "object" || !parsed.duLieu) {
      throw new Error("thiếu trường duLieu");
    }
    noiDung = parsed as NoiDungSaoLuu;
  } catch {
    throw new TepSaoLuuKhongHopLeError();
  }

  await prisma.$transaction(
    async (tx) => {
      for (const ten of [...THU_TU_BANG].reverse()) {
        await layDelegate(tx, ten).deleteMany();
      }

      for (const ten of THU_TU_BANG) {
        const cacDong = noiDung.duLieu[ten] ?? [];
        if (cacDong.length === 0) continue;

        if (ten === "donVi") {
          // DonVi tự tham chiếu (donViChaId) - chèn trước không kèm liên kết
          // cha, gán lại liên kết ở bước sau khi mọi dòng đã tồn tại, tránh
          // vi phạm khóa ngoại do thứ tự chèn không theo đúng cấp bậc.
          await layDelegate(tx, ten).createMany({
            data: cacDong.map((dong) => ({ ...dong, donViChaId: null })),
          });
          for (const dong of cacDong) {
            if (dong.donViChaId) {
              await layDelegate(tx, ten).update({
                where: { id: dong.id as string },
                data: { donViChaId: dong.donViChaId as string },
              });
            }
          }
          continue;
        }

        await layDelegate(tx, ten).createMany({ data: cacDong });
      }
    },
    { timeout: 120_000, maxWait: 15_000 },
  );

  return {
    soBang: THU_TU_BANG.length,
    tongSoDong: THU_TU_BANG.reduce((tong, ten) => tong + (noiDung.duLieu[ten]?.length ?? 0), 0),
  };
}
