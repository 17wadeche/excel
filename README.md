# Workbook Dashboard Excel Add-in

Workbook Dashboard is an Excel task pane add-in for building dashboards, reports, Gantt charts, KPI cards, tables, and exports from workbook data.

## What it does

- Create and edit dashboards inside Excel.
- Add chart, metric, table, text, title, image, line, and Gantt widgets.
- Import workbook chart images and table data into dashboard widgets.
- Save dashboard versions and restore previous snapshots.
- Export dashboards to PDF and prepare dashboard email handoff.
- Persist dashboards and templates through the `/api` backend endpoints.

## Getting started

```bash
npm install
npm run validate
npm run build:dev
npm start
```

The development manifest points at `https://localhost:3000`. Production builds replace local URLs with the deployment URL configured in `webpack.config.js`.

## Useful commands

- `npm run build` — production webpack build.
- `npm run build:dev` — development webpack build.
- `npm run dev-server` — HTTPS development server.
- `npm run lint` — Office add-in lint and formatting checks.
- `npm run lint:fix` — automatically fix lint/formatting issues where possible.
- `npm run typecheck` — TypeScript validation without emitting files.
- `npm run unit` — pure data import and dashboard validation checks.
- `npm run test` — TypeScript validation plus unit checks.
- `npm run validate` — Office manifest validation.
- `npm run validate:manifest:prod` — fail production manifests that still contain localhost or example URLs.

## Backend API contract

The add-in expects these JSON endpoints under `/api` by default. Localhost development uses an in-browser localStorage API fallback unless you set `DASHBOARD_USE_LOCAL_API_FALLBACK=false`. Override the backend base URL with `DASHBOARD_API_BASE_URL` at build time or by assigning `window.__API_BASE_URL__` before the task pane starts:

- `GET /dashboards?workbookId=<id>&userEmail=<email>`
- `GET /dashboards/:id`
- `POST /dashboards`
- `PUT /dashboards/:id`
- `DELETE /dashboards/:id`
- `POST /templates`
- `PUT /templates/:id`

Dashboard payloads should match the `DashboardItem` interface in `src/taskpane/components/types.ts`.

## Deployment checklist

1. Replace `https://example.com/workbook-dashboard/` in `webpack.config.js` with your production task pane host.
2. Replace `https://example.com` support and app-domain values in `manifest.xml`.
3. Publish production icons under the configured `/assets` paths.
4. Configure Microsoft 365 SSO/Entra ID so the backend validates bearer tokens rather than trusting `userEmail` query parameters.
5. Set `ADDIN_BASE_URL`, `ADDIN_SUPPORT_URL`, `ADDIN_APP_DOMAIN`, and `DASHBOARD_API_BASE_URL` for production builds.
6. Run `npm run lint`, `npm run test`, `npm run build`, `npm run validate`, and `NODE_ENV=production npm run validate:manifest:prod` before distributing the manifest.

## Architecture notes

- `src/taskpane/index.tsx` initializes Office and mounts the React app.
- `src/taskpane/components/App.tsx` owns task pane routing.
- `src/taskpane/context/DashboardContext.tsx` coordinates dashboard state, widget operations, Excel integration, persistence, exports, and version history.
- `src/taskpane/utils/apiClient.ts` contains the fetch-based API wrapper used by dashboard and template operations.

## Reliability and data handling notes

- The API client adds request IDs, authorization headers from Office SSO when available, idempotency keys for write requests, timeouts, and retry handling for transient server errors.
- Dashboard saves validate payload shape before syncing and download a JSON backup if syncing fails.
- Excel range import analyzes the selected range, detects header rows, supports multiple numeric series, and records the source range for refreshes.
- Production identity should come from Office SSO; localStorage user email and the localStorage API fallback are retained only for local development.