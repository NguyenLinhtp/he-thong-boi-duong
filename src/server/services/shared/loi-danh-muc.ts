export class MaTrungError extends Error {
  constructor(ma: string) {
    super(`Mã "${ma}" đã tồn tại`);
  }
}

export class DangDuocThamChieuError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ChongLapThoiGianError extends Error {
  constructor(message: string) {
    super(message);
  }
}
