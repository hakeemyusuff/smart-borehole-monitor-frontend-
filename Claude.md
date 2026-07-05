# BoreSense Frontend — Build Brief for Claude Code

You are building the frontend SPA for **BoreSense**, an IoT groundwater-monitoring
project. The backend already exists (FastAPI + PostgreSQL) and is running locally.
Your job is the client-side web app that talks to it.

---

## CRITICAL WORKING RULES (honor these)

1. **Verify all versions and setup commands against current official docs before running them.**
   Do NOT rely on recalled syntax. Specifically confirm the current setup for: Vite scaffold,
   Tailwind (v3 vs v4 install differs significantly), shadcn/ui CLI (the command has changed
   across versions — confirm `shadcn` vs `shadcn-ui` against ui.shadcn.com), react-router-dom,
   and TanStack Query. If a command or API might be stale, check the docs first.
2. **Never invent library methods or API syntax.** If unsure a method exists, verify in docs.
3. **Do not assume the backend response shape.** It is documented below, and also in the openapi.json file — follow it exactly.
4. **Ask before making architectural decisions not specified here.** Don't fill gaps with guesses.
5. Build one vertical slice, confirm it works, then replicate the pattern. Don't build all
   features in parallel.

---

## STACK (decided — do not substitute)

- **React + Vite** (static SPA, no SSR)
- **Tailwind CSS** + **shadcn/ui** for components
- **TanStack Query** for all server state / data fetching (loading, error, caching, refetch)
- **react-router-dom** for routing
- **Recharts** for time-series charts (build ONE chart first for visual review before expanding)
- HTTP: plain `fetch` or `axios` (your choice, not load-bearing)
- Package manager: match whatever the repo/user uses; confirm if unsure

---

## SETUP SEQUENCE (do in this order, confirm each before proceeding)

1. Scaffold Vite React app (confirm current template + command).
2. Set up Tailwind (CONFIRM v3 vs v4 install steps — they differ; check current docs).
3. Configure the `@/` path alias in BOTH Vite config and TS config (shadcn/ui needs this).
4. Run shadcn/ui init (CONFIRM current CLI command against ui.shadcn.com).
5. Render ONE shadcn/ui component to confirm the Tailwind + shadcn + alias chain builds
   correctly BEFORE building any real UI. This is the most common first-build failure point.

---

## BACKEND CONTRACT (follow exactly — you cannot infer these)

### Response envelope
EVERY endpoint returns a generic `ApiResponse` wrapper: `{ status, message, data }`.
The real payload is always under `.data`. Write ONE unwrap helper and route all responses
through it. Do NOT assume the payload is at the top level.

### Auth
- JWT-based. Token comes from `POST /api/auth/login`.
- Store the token in **localStorage** (conscious trade-off, accepted for this phase).
- Attach as `Authorization: Bearer <token>` on every JWT-protected request.
- On logout OR any `401` response: clear the token and redirect to login.
  (The 401-handling is required — a 24h token WILL expire mid-session and must fail gracefully.)

### Endpoints (JWT-protected unless noted)
NOTE: paths shown assume an `/api` prefix is applied on the backend. If it is NOT applied,
strip `/api` from every path below.

- `POST /api/auth/register` (no auth)
- `POST /api/auth/login` (no auth)
- `POST /api/locations/` · `GET /api/locations/` · `GET /api/locations/{id}`
- `POST /api/boreholes/` · `GET /api/boreholes/` · `GET /api/boreholes/{id}`
- `POST /api/sensors/` · `GET /api/sensors/boreholes/{borehole_id}` · `GET /api/sensors/{id}`
- `GET /api/sensors/readings/water-level/{borehole_id}/{sensor_id}`
- `GET /api/sensors/readings/flow-reading/{borehole_id}/{sensor_id}`
- `POST /api/weathers/fetch/{location_id}` · `GET /api/weathers/{location_id}`

NOTE: reading-ingestion endpoints (POST water-level / flow) use device-key auth and are hit
by the ESP32 hardware directly. The FRONTEND does NOT touch these. Ignore them.

### Data hierarchy (drives navigation)
User → owns Locations → each has Boreholes → each has Sensors → each produces Readings.
Model this as a drill-down: list → detail → nested list. Ownership is enforced server-side;
the frontend just navigates the hierarchy.

### Known data caveat
Reading records have `calculated_*` fields that are currently NULLABLE (physical-value
conversion is deferred to the hardware phase). The UI must handle null calculated values
gracefully — show raw values or a placeholder, do not assume they're populated.

---

## FOLDER STRUCTURE (mirror the backend's feature-based layout)

```
src/
  lib/          → api client, token handling, ApiResponse unwrap, QueryClient setup
  auth/         → login + register pages, useAuth, protected-route wrapper
  locations/    → list, detail, create form
  boreholes/    → list, detail, create form
  sensors/      → list, detail, create form
  readings/     → water-level + flow views, charts
  weather/      → weather panel
  components/   → shared UI (layout, nav)
```

---

## BUILD ORDER

1. Scaffold + lib layer (API client, token handling, TanStack Query provider). Verify versions here.
2. Auth (register + login + protected-route wrapper). Unblocks everything else.
3. Locations CRUD — first full vertical slice (list + create + detail).
4. Boreholes + Sensors CRUD — replicate the slice down the hierarchy.
5. Readings + charts — build ONE Recharts chart, pause for visual review, then expand.
6. Weather panel — smallest surface, last.
7. Polish pass — layout, nav, loading/error/empty states.

The demo target is "polished full CRUD + charts." If time compresses, steps 1–3 plus a single
chart is already a credible demo.

---

## WHEN IN DOUBT
Ask a clarifying question rather than assuming. Flag any version/API uncertainty explicitly
and verify against live docs before writing code that depends on it.