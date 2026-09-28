import { donDuLieuE2E } from "./du-lieu-e2e";

export default async function globalTeardown() {
  await donDuLieuE2E();
}
