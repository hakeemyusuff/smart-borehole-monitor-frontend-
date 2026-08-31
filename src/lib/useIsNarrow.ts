import { useEffect, useState } from "react"

// Tailwind's `sm` breakpoint. Below this we treat the layout as "narrow"
// (mobile portrait) and tighten chart axes / labels so the plot area
// doesn't get eaten by the y-axis gutter.
const NARROW_MAX_PX = 640

export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(`(max-width: ${NARROW_MAX_PX - 1}px)`).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX_PX - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return narrow
}
