/**
 * Standard scrollable wrapper for pages that flow vertically (lists,
 * detail pages, tables). AppLayout's `<main>` is a fixed-height flex box
 * with overflow-hidden so the Dashboard can lock; scrolling pages opt back
 * in by wrapping their content in this shell.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {children}
      </div>
    </div>
  )
}
