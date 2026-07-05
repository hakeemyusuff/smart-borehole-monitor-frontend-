type LogoSize = "sm" | "md" | "lg"

const SIZES: Record<LogoSize, { mark: number; text: string; gap: string }> = {
  sm: { mark: 20, text: "text-lg", gap: "gap-2" },
  md: { mark: 26, text: "text-xl", gap: "gap-2.5" },
  lg: { mark: 34, text: "text-2xl", gap: "gap-3" },
}

export function Logo({ size = "md" }: { size?: LogoSize }) {
  const { mark, text, gap } = SIZES[size]
  return (
    <div className={`inline-flex items-center ${gap}`}>
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* borehole outline */}
        <rect
          x="6"
          y="2"
          width="12"
          height="20"
          rx="3"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.25"
          opacity="0.7"
        />
        {/* water fill — bottom half with rounded bottom corners */}
        <path
          d="M 6 12 L 6 19 A 3 3 0 0 0 9 22 L 15 22 A 3 3 0 0 0 18 19 L 18 12 Z"
          fill="var(--primary)"
          fillOpacity="0.92"
        />
      </svg>
      <span
        className={`font-heading font-medium tracking-tight text-foreground ${text}`}
        style={{ fontVariationSettings: '"SOFT" 40, "opsz" 32, "wght" 500' }}
      >
        BoreSense
      </span>
    </div>
  )
}
