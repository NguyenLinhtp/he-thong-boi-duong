"use server";

import { signOut } from "@/lib/auth";

export async function dangXuat() {
  await signOut({ redirectTo: "/dang-nhap" });
}
