export function TempIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M 8 2 v 8 M 6 11 a 2 2 0 1 0 4 0 c 0 -1 -1 -1.5 -2 -1.5 s -2 0.5 -2 1.5 z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HumidityIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M 8 2 C 5 6 3.5 8 3.5 10 a 4.5 4.5 0 0 0 9 0 c 0 -2 -1.5 -4 -4.5 -8 z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RainIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M 4 8 h 8 a 2.5 2.5 0 0 0 0 -5 h -0.3 A 3.5 3.5 0 0 0 5 4 a 2.5 2.5 0 0 0 -1 4 z"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path
        d="M 6 11 l -1 2 M 9 11 l -1 2 M 12 11 l -1 2"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </svg>
  )
}
