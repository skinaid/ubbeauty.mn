type Props = {
  score: number;
  status: string;
  size?: number;
};

export function BrandScoreRing({ score, size = 100 }: Props) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 80 ? "#059669" :
    score >= 50 ? "#D97706" :
    score > 0   ? "#0043FF" : "#E5E7EB";

  return (
    <div className="bm-score-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.2} fontWeight="700" fill={color}>
          {score}%
        </text>
      </svg>
      <p className="bm-score-ring__label">Мэдлэгийн түвшин</p>
    </div>
  );
}
