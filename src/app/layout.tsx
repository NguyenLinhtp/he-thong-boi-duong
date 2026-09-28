import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// Roboto - font của ued.udn.vn, có đủ dấu tiếng Việt
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Hệ thống quản lý bồi dưỡng · Trường ĐHSP - ĐHĐN",
    template: "%s · Bồi dưỡng UED",
  },
  description: "Hệ thống nghiệp vụ quản lý đào tạo bồi dưỡng - Trường Đại học Sư phạm, Đại học Đà Nẵng",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${roboto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
