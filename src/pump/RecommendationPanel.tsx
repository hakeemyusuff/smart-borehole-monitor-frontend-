import { useEffect, useState, type ReactNode } from "react"
import { CalendarClock, Download, RefreshCw, ShieldAlert } from "lucide-react"
import { usePump } from "@/pump/queries"
import { usePumpRecommendation } from "@/predictions/queries"
import { Button } from "@/components/ui/button"
import { downloadCsv, formatWat, isRecommendationCurrent } from "@/readings/chart-data"

const TITLES = {
  unavailable: "Inactive (Awaiting Live Telemetry)",
  defer: "Defer Pumping",
  reassess: "Awaiting Reassessment",
  consider: "Levels Meet Start Threshold",
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm text-foreground break-words">{children}</dd></div>
}

export function RecommendationPanel({ boreholeId }: { boreholeId: number | undefined }) {
  const query = usePumpRecommendation(boreholeId)
  const pumpQuery = usePump(boreholeId)
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
  const canConsider = decision?.status === "consider" && !!decision.suggested_start_at
  const subtitle = query.isError ? "Connection unavailable. Refresh to reassess."
    : query.isPending ? "Checking levels and thresholds."
    : !decision ? "Assessment expired. Refresh to reassess."
    : canConsider ? `Measured and forecast levels meet the ${decision.policy!.consideration_level_m.toFixed(2)} m start threshold.`
    : decision.status === "defer" ? "Low-water threshold reached. Hold pumping and check on site."
    : decision.status === "reassess" ? "Below the start buffer. Wait for the next assessment."
    : decision.reason_code === "configuration_required" ? "Operating thresholds are not configured."
    : decision.reason_code === "forecast_unavailable" ? "Awaiting a fresh forecast."
    : "Awaiting a recent valid measurement."
  const action = canConsider ? "Start may be considered"
    : decision?.status === "defer" || decision?.status === "reassess" ? "Hold Pumping" : "No start recommended"
  const badgeClass = canConsider ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
    : "border-amber-400/25 bg-amber-400/10 text-amber-300"
  // Expired inputs may still be inspected, but never presented as current advice.
  const inspected = decision ?? data
  const policy = inspected?.policy
  const pumpState = pumpQuery.isPending ? "Checking"
    : pumpQuery.isError ? "Unavailable" : pumpQuery.data ? pumpQuery.data.status.toUpperCase() : "Not registered"

  return <section aria-label="Pumping recommendation" className="rounded-2xl border border-border bg-card p-4 md:p-5 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs text-muted-foreground mb-1">Operator decision support</p><h2 className="font-heading text-xl flex items-center gap-2"><CalendarClock className="size-5 text-primary"/>Pumping recommendation</h2></div>
      <Button size="sm" variant="outline" onClick={() => { void query.refetch(); void pumpQuery.refetch() }} disabled={query.isFetching || pumpQuery.isFetching}><RefreshCw className="size-3.5 mr-2"/>Refresh advice</Button>
    </div>
    <div className="mt-4" aria-live="polite">
      <p className={`font-semibold text-base ${canConsider ? "text-emerald-400" : "text-amber-300"}`}><span aria-hidden>● </span>{statusLabel}</p>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}>{action}</span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden/>
          {policy ? `Low-water floor: ${policy.minimum_level_m.toFixed(2)} m · Advisory` : "Low-water floor not configured"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 mt-4 rounded-lg bg-slate-900/40 border border-slate-800/60">
      <Detail label="Assessed">{formatWat(inspected?.assessed_at)}{data && !current && <span className="block text-xs text-amber-400">Previous assessment · inactive</span>}</Detail>
      <Detail label="Next review">{decision ? Date.parse(decision.next_review_at) <= now ? "Review now" : formatWat(decision.next_review_at) : "Awaiting live telemetry"}</Detail>
      <Detail label="Last reported pump state">{pumpState}
        {pumpQuery.data && !pumpQuery.isError && <span className="block text-xs text-slate-500 mt-1">Last change: {formatWat(pumpQuery.data.last_status_change)}</span>}
      </Detail>
    </dl>
    <details className="group mt-4">
      <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">▸ View decision parameters</span>
        <span className="hidden group-open:inline">▾ Hide decision parameters</span>
      </summary>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 mt-3 border-y border-slate-800/80">
        <Detail label="Current Level">
          {inspected?.current_level_m != null ? `${inspected.current_level_m.toFixed(2)} m` : "Unavailable"}
          <span className="text-xs text-slate-500 block mt-1">{!current ? "Previous assessment" : canConsider ? "Above start threshold" : "Latest assessment"} · {formatWat(inspected?.current_level_captured_at)}</span>
        </Detail>
        <Detail label="Start Threshold">
          {policy ? `${policy.consideration_level_m.toFixed(2)} m` : "Not configured"}
          <span className="text-xs text-slate-500 block mt-1">Advisory minimum buffer</span>
        </Detail>
        <Detail label="Low-Water Floor">
          {policy ? `${policy.minimum_level_m.toFixed(2)} m` : "Not configured"}
          <span className="text-xs text-slate-500 block mt-1">Operator action required</span>
        </Detail>
        <Detail label="Control Regime">
          Operator initiated
          <span className="text-xs text-slate-500 block mt-1">No automatic cutoff</span>
        </Detail>
      </dl>
      <div className="flex justify-end pt-3"><Button size="sm" variant="outline" onClick={exportAssessment} disabled={!decision}><Download className="size-3.5 mr-2"/>Export assessment</Button></div>
    </details>
    <p className="mt-4 text-xs text-slate-500">Advisory only: Operator controls start and stop; automatic low-water cutoff is not enabled.</p>
  </section>
}
