"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { luuCauHinhSmtp, ThieuMatKhauSmtpError } from "@/server/services/hv/cau-hinh-smtp";
import { ThieuKhoaMaHoaError } from "@/lib/crypto/ma-hoa";

const DUONG_DAN = "/quan-tri/cau-hinh-smtp";

export async function luuCauHinhSmtpAction(_prevState: string | undefined, formData: FormData) {
  await requirePermission("HV-10");

  try {
    await luuCauHinhSmtp({
      host: String(formData.get("host")),
      port: Number(formData.get("port")),
      taiKhoan: String(formData.get("taiKhoan")),
      matKhau: String(formData.get("matKhau")),
      tuDiaChi: String(formData.get("tuDiaChi")),
    });
  } catch (error) {
    if (error instanceof ThieuKhoaMaHoaError || error instanceof ThieuMatKhauSmtpError) {
      return error.message;
    }
    throw error;
  }

  revalidatePath(DUONG_DAN);
  return undefined;
}
