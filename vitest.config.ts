import "dotenv/config";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    globals: true,
    // Local Prisma Postgres dev instance (npx prisma dev) không xử lý tốt
    // nhiều connection đồng thời từ nhiều test file chạy song song (lỗi
    // "prepared statement requires 0 params" do multiplex sai) -> chạy tuần tự.
    fileParallelism: false,
  },
});
