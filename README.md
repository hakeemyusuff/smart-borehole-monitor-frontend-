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
- **Sensor detail** — water-level or flow chart with Day / Week / Month range controls, a
  true time-scale x-axis (so uneven point spacing renders honestly), threshold reference
  lines, and client-side gap injection so flow charts don't bridge across between-pumping
  idles.
- **Dashboard** — location picker + prev/next borehole nav, a live borehole cylinder driven
  by the true latest reading (paginated list, `limit=1` — not the day-chart's aggregated
  point), overview water-level and flow charts (24h), and a labelled placeholder for pump
  status until the backend endpoints land.
- **Data logs** — the raw transmissions table: cascading location/borehole/sensor selectors
  (URL-persisted), paginated `skip`/`limit` with "Showing X–Y of Z" + Prev/Next.

## Layout invariants

- Root is `h-svh` + `overflow-hidden`; the app never window-scrolls.
- The Dashboard locks entirely at `lg+` (widget grid uses `min-h-0` + `min-w-0` on every
  level — this is the trick that stops Recharts' ResponsiveContainer from ratcheting the
  grid wider on each resize).
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

## Status

Frontend for objectives 1 and 2 of the project brief is complete: dashboard, sensor drill-down
with charts, and data-logs table. Objective 3 (pump scheduling) is stubbed as an honest
placeholder pending the backend endpoints.
