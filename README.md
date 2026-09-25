# BoreSense

Frontend SPA for **BoreSense** — an IoT groundwater-level monitoring and pump-scheduling
project. This repo is just the client; it talks to a separate FastAPI + PostgreSQL backend.

## Stack

- **React 19** + **TypeScript 6** + **Vite 8** (Node 20.19+ required)
- **Tailwind v4** via `@tailwindcss/vite`
- **shadcn/ui** (Radix under the hood) for primitives
- **TanStack Query** for server state (30s stale, no refetch-on-focus, no retry on 4xx)
- **React Router** for routing
- **Recharts** for the water-level and flow charts
- **Fraunces** (headings) + **IBM Plex Sans** (body), aquifer palette (dark by default)

## Requirements

- Node **20.19+** (Vite 8 refuses to start on older Node)
- The BoreSense backend running locally (or wherever `VITE_API_BASE_URL` points)

## Getting started

```bash
npm install
cp .env.example .env.local     # adjust VITE_API_BASE_URL if the backend isn't on :8000
npm run dev                    # http://localhost:5173
```

### Scripts

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Start Vite dev server                           |
| `npm run build`   | `tsc -b && vite build`                          |
| `npm run preview` | Serve the production build locally              |
| `npm run lint`    | Run `oxlint`                                    |
| `npm test`        | Chart gap and forecast freshness checks (Node 22.6+) |

## Environment

Only one variable, set in `.env.local` (git-ignored):

```
VITE_API_BASE_URL=http://localhost:8000
```

## Backend contract (short version)

- Every response is wrapped in `{status, message, data}`; `src/lib/api.ts` unwraps `data`
  centrally, so callers just see the payload.
- JWT is stored in `localStorage["boresense.token"]` and attached as
  `Authorization: Bearer <token>` on authenticated requests.
- A **401** on an authenticated request clears the token and bounces to `/login`. A 401 from
  `/login` or `/register` surfaces the backend's real message instead — no "session expired"
  copy for wrong credentials.
- No `/api/users/me`: the user identity in the header menu is decoded from the JWT claims
  client-side.

## Features

- **Auth** — register, login, protected routes.
- **Locations → Boreholes → Sensors** drill-down, each with create dialogs.
- **Sensor detail** — Day / Week / Month charts with individual readings, hourly
  averages and daily averages respectively. Isolated readings remain visible; gaps
  remain gaps. Flow shows instantaneous rate (L/min) for the day view and total
  daily abstracted volume (L, from pump-run windows) for week/month. Weather
  snapshots have a separate plot so their timestamps cannot break the level line.
  Includes CSV export.
- **Dashboard** — measured and forecast cylinders share a height-above-sensor scale.
  Forecast availability comes from the backend status endpoint, refreshes automatically,
  and expires on the client if updates stop. The history chart shows forecast target
  times alongside observed levels, including the first saved forecast as a single point.
  Paired error is calculated only for the selected history window; it is not the thesis
  evaluation score. CSV exports include timestamps and model versions.
- **Data logs** — the raw transmissions table: cascading location/borehole/sensor selectors
  (URL-persisted), paginated `skip`/`limit` with "Showing X–Y of Z" + Prev/Next.

## Layout invariants

- Root is `h-svh` + `overflow-hidden`; the app never window-scrolls.
- The Dashboard scrolls within the app. Chart containers have explicit heights and
  `min-w-0` so responsive charts cannot stretch the page beyond the viewport.
- Every other page opts back into scrolling via `PageShell`, which supplies
  `overflow-y-auto` + max-width + padding. The sidebar stays put in both modes.

## Project layout

```
src/
  App.tsx, main.tsx, index.css
  lib/         api client, types, JWT token helpers, TanStack QueryClient
  auth/        AuthProvider + login / register / ProtectedRoute
  components/  AppLayout, AppSidebar, UserMenu, PageShell, Logo, RangeSelector, ui/*
  dashboard/   DashboardPage, BoreholeCylinder, PumpStatusTile
  locations/   list + detail + new-location dialog + queries
  boreholes/   detail + panel + new-borehole dialog + queries
  sensors/     detail + panel + new-sensor dialog + queries + sensor-types meta
  readings/    WaterLevelChart, FlowChart, chart queries
  data-logs/   DataLogsPage + queries
```

## Checking the forecast display

Run the backend normally and start this frontend with `npm run dev`. Log in, select
its location and well, and inspect the dashboard:

1. Compare the measured timestamp and value with the latest sensor reading.
2. A fresh saved forecast shows its value, issue time and target time in WAT.
   Stale/unavailable forecasts leave the forecast cylinder empty with an explanation.
3. Check Day, Week and Month on both sensor pages. Week/Month values are sample
   averages over populated buckets, not complete interval coverage or pumped volume.
4. Export forecast history for inspection. Missing observations stay blank until
   matched by the backend; no confidence percentage is invented.

These displays require the backend prediction status and chart endpoints. They do
not train models, generate forecasts locally, or replace the scheduler. Tests use
in-memory examples and do not contact Neon or modify sensor data.
