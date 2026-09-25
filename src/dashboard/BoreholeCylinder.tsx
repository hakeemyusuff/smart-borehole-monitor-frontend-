import { useId } from "react"

/**
 * A shared visual scale for height above the sensor; not a stored-volume gauge.
 * Critical (red) and optimal (muted) threshold marks are drawn as dashed lines
 * so the current level can be read against the borehole's configured bands.
 */
export function BoreholeCylinder({
  totalDepth,
  currentLevel,
  isPending,
  criticalLow,
  optimalHigh,
  variant = "measured",
}: {
  totalDepth: number
  currentLevel: number | null
  isPending?: boolean
  criticalLow?: number
  optimalHigh?: number
  variant?: "measured" | "forecast"
}) {
  const id = useId()
  const scale = Number.isFinite(totalDepth) && totalDepth > 0 ? totalDepth : 12
  const valid = currentLevel !== null && Number.isFinite(currentLevel)
  // 0 m (sensor) sits at y=260; the cylinder top is y=32.
  const yFor = (level: number) => 260 - (Math.max(0, Math.min(scale, level)) / scale) * 228
  const y = yFor(valid ? currentLevel : 0)
  const color = variant === "forecast" ? "#c084fc" : "var(--primary)"
  const criticalY = criticalLow !== undefined ? yFor(criticalLow) : null
  const optimalY = optimalHigh !== undefined ? yFor(optimalHigh) : null
  return (
    <svg
      viewBox="0 0 190 294"
      role="img"
      aria-label={`${variant === "forecast" ? "Forecast" : "Measured"} water column: ${
        valid ? `${currentLevel.toFixed(3)} metres above sensor` : "unavailable"
      }`}
      className="w-full h-full max-h-64"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".65" />
          <stop offset="1" stopColor={color} stopOpacity=".16" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="62" y="32" width="82" height="228" rx="16" />
        </clipPath>
      </defs>
      {[0, scale / 2, scale].map((v) => (
        <g key={v}>
          <text x="46" y={264 - (v / scale) * 228} textAnchor="end" fill="var(--muted-foreground)" fontSize="11">
            {v.toFixed(1)}
          </text>
          <line x1="51" x2="59" y1={260 - (v / scale) * 228} y2={260 - (v / scale) * 228} stroke="var(--border)" />
        </g>
      ))}
      <rect
        x="62"
        y="32"
        width="82"
        height="228"
        rx="16"
        fill="var(--background)"
        stroke={color}
        strokeOpacity=".35"
        strokeDasharray={variant === "forecast" ? "5 4" : undefined}
      />
      {valid && !isPending && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="62" y={y} width="82" height={260 - y} fill={`url(#${id}-fill)`} />
          <path d={`M62 ${y} Q82 ${y - 5} 103 ${y} T144 ${y}`} fill="none" stroke={color} strokeWidth="2" />
        </g>
      )}
      {criticalY !== null && (
        <g>
          <line x1="62" x2="144" y1={criticalY} y2={criticalY} stroke="var(--destructive)" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity=".9" />
          <text x="150" y={criticalY + 3} fill="var(--destructive)" fontSize="8.5">
            CRIT
          </text>
        </g>
      )}
      {optimalY !== null && (
        <g>
          <line x1="62" x2="144" y1={optimalY} y2={optimalY} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 3" strokeOpacity=".7" />
          <text x="150" y={optimalY + 3} fill="var(--muted-foreground)" fontSize="8.5">
            OPT
          </text>
        </g>
      )}
      {(!valid || isPending) && (
        <text x="103" y="147" textAnchor="middle" fill="var(--muted-foreground)" fontSize="24">
          {isPending ? "…" : "—"}
        </text>
      )}
      <circle cx="103" cy="260" r="3" fill="var(--muted-foreground)" />
      <text x="103" y="283" textAnchor="middle" fill="var(--muted-foreground)" fontSize="10">
        Sensor reference · 0 m
      </text>
    </svg>
  )
}
