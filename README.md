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
- `npm run validate` — Office manifest validation.

## Backend API contract

The add-in expects these JSON endpoints under `/api`:

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
4. Configure authentication/identity for `userEmail` instead of relying on local development storage.
5. Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run validate` before distributing the manifest.

## Architecture notes

- `src/taskpane/index.tsx` initializes Office and mounts the React app.
- `src/taskpane/components/App.tsx` owns task pane routing.
- `src/taskpane/context/DashboardContext.tsx` coordinates dashboard state, widget operations, Excel integration, persistence, exports, and version history.
- `src/taskpane/utils/apiClient.ts` contains the fetch-based API wrapper used by dashboard and template operations.