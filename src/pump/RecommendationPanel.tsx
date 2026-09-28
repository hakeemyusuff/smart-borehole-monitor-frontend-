import { useEffect, useState, type ReactNode } from "react"
import { CalendarClock, Download, RefreshCw } from "lucide-react"
import { usePumpRecommendation } from "@/predictions/queries"
import { Button } from "@/components/ui/button"
import { downloadCsv, formatWat, isRecommendationCurrent } from "@/readings/chart-data"

const TITLES = {
  unavailable: "Inactive (Awaiting Live Telemetry)",
  defer: "Defer Pumping",
  reassess: "Awaiting Reassessment",
  consider: "Conditions Met",
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm text-foreground break-words">{children}</dd></div>
}

export function RecommendationPanel({ boreholeId }: { boreholeId: number | undefined }) {
  const query = usePumpRecommendation(boreholeId)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const data = query.data
  const current = isRecommendationCurrent(data, now, query.isError)
  const decision = current ? data : undefined
  const exportAssessment = () => {
    if (!decision) return
    downloadCsv(`pumping-assessment-${boreholeId}.csv`,
      ["assessed_at_utc", "decision", "reason", "next_review_at_utc", "suggested_start_at_utc", "measured_level_m", "forecast_level_m", "minimum_level_m", "consideration_level_m", "threshold_basis", "model_version", "rules_version", "valid_until_utc"],
      [[decision.assessed_at, decision.status, decision.reason, decision.next_review_at, decision.suggested_start_at,
        decision.current_level_m, decision.forecast_level_m, decision.policy?.minimum_level_m ?? null,
        decision.policy?.consideration_level_m ?? null, decision.policy?.basis ?? null,
        decision.model_version, decision.rules_version, decision.valid_until]])
  }
  const statusLabel = query.isPending ? "Checking Telemetry"
    : query.isError ? "Inactive (Connection Unavailable)"
    : decision?.reason_code === "configuration_required" ? "Inactive (Configuration Required)"
    : decision ? TITLES[decision.status] : TITLES.unavailable
  const subtitle = query.isError ? "Cannot verify the latest assessment. Check the backend connection."
    : query.isPending ? "Reading forecast and operating thresholds."
    : decision?.reason ?? "Assessment expired. Refresh before making a decision."
  const canConsider = decision?.status === "consider" && !!decision.suggested_start_at
  const action = canConsider ? "Consider with monitoring"
    : decision?.status === "defer" || decision?.status === "reassess" ? "Hold Pumping" : "No start recommended"
  const badgeClass = canConsider ? "border-primary/30 bg-primary/10 text-primary"
    : "border-amber-400/25 bg-amber-400/10 text-amber-300"
  // Expired inputs may still be inspected, but never presented as current advice.
  const inspected = decision ?? data
  const policy = inspected?.policy
  const expiry = inspected?.valid_until ? new Date(inspected.valid_until) : null
  const expiryValid = expiry !== null && Number.isFinite(expiry.getTime())
  const expiryTime = expiryValid ? expiry.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false,
  }) + " WAT" : "—"
  const expiryState = !expiryValid ? "Unavailable" : expiry.getTime() <= now ? "Expired"
    : current ? "Current assessment" : "Inactive — refresh required"

  return <section aria-label="Pumping recommendation" className="rounded-2xl border border-border bg-card p-4 md:p-5 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs text-muted-foreground mb-1">Operator decision support</p><h2 className="font-heading text-xl flex items-center gap-2"><CalendarClock className="size-5 text-primary"/>Pumping recommendation</h2></div>
      <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className="size-3.5 mr-2"/>Refresh advice</Button>
    </div>
    <div className="mt-4" aria-live="polite">
      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}>Status: {statusLabel}</span>
      <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 mt-4 rounded-lg bg-slate-900/40 border border-slate-800/60">
      <Detail label="Assessed">{formatWat(inspected?.assessed_at)}{data && !current && <span className="block text-xs text-amber-400">Previous assessment · inactive</span>}</Detail>
      <Detail label="Next review">{decision ? Date.parse(decision.next_review_at) <= now ? "Review now" : formatWat(decision.next_review_at) : "Awaiting live telemetry"}</Detail>
      <Detail label="Suggested start"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}>{action}</span></Detail>
    </dl>
    <details className="group mt-4">
      <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">▸ View decision parameters</span>
        <span className="hidden group-open:inline">▾ Hide decision parameters</span>
      </summary>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 mt-3 border-y border-slate-800/80">
        <Detail label="Last Recorded">
          {inspected?.current_level_m != null ? `${inspected.current_level_m.toFixed(3)} m` : "Unavailable"}
          <span className="text-xs text-slate-500 block mt-1">{formatWat(inspected?.current_level_captured_at)}</span>
        </Detail>
        <Detail label="Operational Floor">
          {policy ? `${policy.minimum_level_m.toFixed(2)} m` : "Not configured"}
          <span className="text-xs text-slate-500 block mt-1">Configured minimum</span>
        </Detail>
        <Detail label="Buffer Limit">
          {policy ? `${policy.consideration_level_m.toFixed(2)} m` : "Not configured"}
          <span className="text-xs text-slate-500 block mt-1">Pumping threshold</span>
        </Detail>
        <Detail label="Validity Expiry">
          <span title={formatWat(inspected?.valid_until)}>{expiryTime}</span>
          <span className="text-xs text-slate-500 block mt-1">{expiryState}</span>
        </Detail>
      </dl>
      <div className="flex justify-end pt-3"><Button size="sm" variant="outline" onClick={exportAssessment} disabled={!decision}><Download className="size-3.5 mr-2"/>Export assessment</Button></div>
    </details>
    <p className="mt-4 text-xs text-slate-500">Advisory only: Does not account for active drawdown rates or safe abstraction limits.</p>
  </section>
}
