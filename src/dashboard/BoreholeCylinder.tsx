import { useId } from "react"

/**
 * The dashboard's signature visual: a vertical borehole with water filled to
 * the current level. The cylinder is scaled so `total_depth` fills the frame;
 * the water rises from the bottom. Optimal / critical horizontal marks are
 * drawn as dashed lines with side labels.
 *
 * The reading is clamped to [0, total_depth] for drawing purposes but the
 * actual value passes through untouched to the caller's readout.
 */
export function BoreholeCylinder({
  totalDepth,
  criticalLow,
  optimalHigh,
  currentLevel,
  isPending,
}: {
  totalDepth: number
  criticalLow: number
  optimalHigh: number
  currentLevel: number | null
  isPending?: boolean
}) {
  const gradientId = useId()
  const waveClipId = useId()
  const waveId = useId()

  // Drawing coords (viewBox 240 x 480). The cylinder's inner area holds the
  // water. Room on the right for threshold labels.
  const VB_W = 240
  const VB_H = 480
  const CYL_X = 44
  const CYL_W = 96
  const CYL_TOP = 24
  const CYL_BOTTOM = 456
  const CYL_H = CYL_BOTTOM - CYL_TOP

  const clamp = (v: number) => Math.max(0, Math.min(totalDepth, v))

  // A higher water_level means MORE water, so the water surface sits closer
  // to the top of the cylinder. yFor(level) maps a level to its screen y.
  const yFor = (level: number) => {
    const frac = clamp(level) / totalDepth
    return CYL_BOTTOM - frac * CYL_H
  }

  const currentDrawn = currentLevel ?? 0
  const waterTopY = yFor(currentDrawn)
  const criticalY = yFor(criticalLow)
  const optimalY = yFor(optimalHigh)

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full max-h-full block"
      role="img"
      aria-label={`Borehole cylinder: current level ${
        currentLevel !== null ? currentLevel.toFixed(2) : "unknown"
      } meters of ${totalDepth} meter depth`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.85} />
        </linearGradient>

        {/* A sine wave path used both as the water surface and to clip the
            water fill so the top edge undulates instead of being flat. */}
        <path
          id={waveId}
          d={`M 0 6 C 12 0, 24 12, 36 6 S 60 0, 72 6 S 96 12, 108 6 L 120 6 L 120 20 L 0 20 Z`}
        />

        <clipPath id={waveClipId}>
          <rect
            x={CYL_X}
            y={CYL_TOP}
            width={CYL_W}
            height={CYL_H}
            rx={CYL_W / 2}
          />
        </clipPath>
      </defs>

      {/* Depth ticks on the left. Just three: 0, mid, floor. */}
      <DepthTick y={CYL_TOP} label="0m" />
      <DepthTick y={CYL_TOP + CYL_H / 2} label={`${(totalDepth / 2).toFixed(0)}m`} />
      <DepthTick y={CYL_BOTTOM} label={`${totalDepth.toFixed(0)}m`} />

      {/* Cylinder outline (rounded pill shape). */}
      <rect
        x={CYL_X}
        y={CYL_TOP}
        width={CYL_W}
        height={CYL_H}
        rx={CYL_W / 2}
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth={1.5}
      />

      {/* Water fill, clipped to the cylinder so it rounds at the bottom. */}
      <g clipPath={`url(#${waveClipId})`}>
        <rect
          x={CYL_X}
          y={waterTopY}
          width={CYL_W}
          height={CYL_BOTTOM - waterTopY}
          fill={`url(#${gradientId})`}
        />
        {/* Undulating surface — a thin wave sitting on the water level.
            The <animateTransform> gently slides it horizontally forever. */}
        {currentLevel !== null && (
          <g transform={`translate(${CYL_X}, ${waterTopY - 6})`}>
            <use
              href={`#${waveId}`}
              fill="var(--primary)"
              opacity={0.9}
              transform="translate(-24 0)"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-24 0"
                to="0 0"
                dur="4s"
                repeatCount="indefinite"
              />
            </use>
          </g>
        )}
      </g>

      {/* Threshold lines OVER the fill so they're always visible. */}
      <ThresholdLine
        y={optimalY}
        cylX={CYL_X}
        cylW={CYL_W}
        color="var(--primary)"
        label={`Optimal ${optimalHigh}m`}
        anchor="above"
      />
      <ThresholdLine
        y={criticalY}
        cylX={CYL_X}
        cylW={CYL_W}
        color="var(--destructive)"
        label={`Critical ${criticalLow}m`}
        anchor="below"
      />

      {/* Loading shimmer — draw a translucent overlay on the water area. */}
      {isPending && (
        <rect
          x={CYL_X}
          y={CYL_TOP}
          width={CYL_W}
          height={CYL_H}
          rx={CYL_W / 2}
          fill="var(--muted-foreground)"
          opacity={0.05}
        >
          <animate
            attributeName="opacity"
            values="0.05;0.15;0.05"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </rect>
      )}
    </svg>
  )
}

function DepthTick({ y, label }: { y: number; label: string }) {
  return (
    <g>
      <line
        x1={28}
        y1={y}
        x2={40}
        y2={y}
        stroke="var(--muted-foreground)"
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />
      <text
        x={24}
        y={y + 5}
        fontSize={16}
        fontWeight={500}
        fill="var(--muted-foreground)"
        textAnchor="end"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {label}
      </text>
    </g>
  )
}

function ThresholdLine({
  y,
  cylX,
  cylW,
  color,
  label,
  anchor,
}: {
  y: number
  cylX: number
  cylW: number
  color: string
  label: string
  anchor: "above" | "below"
}) {
  return (
    <g>
      <line
        x1={cylX - 4}
        y1={y}
        x2={cylX + cylW + 4}
        y2={y}
        stroke={color}
        strokeDasharray="4 4"
        strokeWidth={1.8}
        strokeOpacity={0.9}
      />
      <text
        x={cylX + cylW + 8}
        y={anchor === "above" ? y - 5 : y + 18}
        fontSize={18}
        fontWeight={500}
        fill={color}
      >
        {label}
      </text>
    </g>
  )
}
