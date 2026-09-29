/** Vòng tròn tiến độ (%) - như mốc trên dòng thời gian "Quá trình học tập" của taphuan. */
export function VongTienDo({ phanTram, kichThuoc = 64 }: { phanTram: number; kichThuoc?: number }) {
  const r = kichThuoc / 2 - 5;
  const chuVi = 2 * Math.PI * r;
  return (
    <svg width={kichThuoc} height={kichThuoc} viewBox={`0 0 ${kichThuoc} ${kichThuoc}`} role="img" aria-label={`Hoàn thành ${phanTram}%`}>
      <circle cx={kichThuoc / 2} cy={kichThuoc / 2} r={r} fill="white" stroke="var(--border)" strokeWidth={5} />
      <circle
        cx={kichThuoc / 2}
        cy={kichThuoc / 2}
        r={r}
        fill="none"
        stroke="var(--success)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${(chuVi * phanTram) / 100} ${chuVi}`}
        transform={`rotate(-90 ${kichThuoc / 2} ${kichThuoc / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={kichThuoc / 4.5} fontWeight={700} fill="var(--ued-blue-dam)">
        {phanTram}%
      </text>
    </svg>
  );
}
