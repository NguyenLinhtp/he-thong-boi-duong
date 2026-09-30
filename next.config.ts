import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // (bổ sung 30/09/2026) form đăng ký kèm tệp minh chứng (mỗi tệp tối đa theo tham số
      // DK_MINH_CHUNG_TOI_DA_MB, mặc định 10MB) - mặc định của Next.js chỉ 1MB
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
