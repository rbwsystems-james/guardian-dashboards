# Guardian RMS – Route Operator Dashboards (mockup)

Clickable two-tab dashboard mockup (**Performance** and **Service**) for a US route operator, shown inside a replica of the Guardian CMS shell with a new selected **Dashboard** menu item. Everything runs on seeded synthetic data; nothing calls a real API.

Stack: Vite + React 18 + TypeScript, Apache ECharts, Tailwind CSS v4, hash routing, static build.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # metric unit tests + data sanity checks
npm run build      # type-checks, then builds to dist/
```

## Deploy to GitHub Pages

1. Push this project to a GitHub repository on the `main` branch.
2. In the repo go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` (install, test, build, deploy). The site is served at `https://<owner>.github.io/<repo>/`.

`vite.config.ts` reads `BASE_PATH`; the workflow sets it to `/<repo-name>/`, so the repo name is never hard-coded. Hash routing (`#/performance`, `#/service`) is used because Pages has no SPA fallback.

## Sharing a view

Period, filters and chart choices live in the URL hash, e.g. `#/service?mode=month&m=2026-09&reg=2&s7=validator`. Copy the address bar to share the exact view; reloading restores it.

## Where things live

| Need | File |
| --- | --- |
| Tune counts, names, rates, targets, week start | `src/config.ts` |
| Colours and design tokens | `src/theme.ts` |
| Metric definitions (all maths) | `src/metrics.ts` (tests in `src/metrics.test.ts`) |
| Synthetic data generator (seeded) | `src/data/generate.ts` |
| Data layer charts read from, e.g. `getRevenueTrend(filters, period)` | `src/data/api.ts` |
| Period / trend-bucket rules | `src/periods.ts` |
| Guardian shell (sidebar, status bar, logo) | `src/shell/` |
| Chart options | `src/charts/options.ts` |
| Info-icon definitions | `src/defs.ts` |

To move to real data, replace the internals of `src/data/api.ts` with Guardian API calls; chart components only import from there.

## Choices made where the spec was silent

- **Week / month defaults.** Weeks start Sunday (`WEEK_START`). Month defaults to the last complete month in the data (Oct 2026). Week defaults to the last complete week (10/25–10/31/2026).
- **Early periods.** All 24 months and every complete week are selectable. Trend charts only draw buckets that fall inside the data, so early selections show fewer than 12 points, and the first period's change vs prior shows “—”.
- **Range mode.** Dates are limited to the data window. Highlighting applies to every bucket (the whole range is the selection). The “previous equivalent period” is the preceding range of equal length.
- **Filters.** Company → Operator → Region → Site, cascading; selecting a parent prunes children that no longer fit. Clicking a site in P4, P5 or S9 replaces the Site filter with that site.
- **Games (P6).** Each EGM carries 3–5 games from its game pack with fixed play, net-win and coin-in shares; per-game figures are those shares of the EGM’s totals.
- **Heatmap (P8).** Net win per EGM-hour = each site type’s hourly profile applied to daily net win, averaged over the days of that weekday in the period.
- **P5 “active days”.** Days between a site’s first install and last removal, clipped to the period.
- **Float (P9).** Weekly per-site values (weeks counted from 11/01/2024), read at the week containing each period end.
- **Revenue lost (S2).** A new asset with no prior 30 days uses its own NWPD for the period.
- **FTFR.** Calls closed in the last 7 days of data are ineligible, so the KPI shows “—” for a week that ends at the data end.
- **Backlog buckets (S8).** Age under 2 days, 2 to under 4, 4 to under 7, and 7+.
- **S3 default.** Raw. **S7 default.** Per 100 EGMs, as specified.
- **Pie (S4).** Subtitle states the share of all calls the top 5 cover; “Other” is excluded.
- **Chart interactions.** The info icon opens the definition from the spec.
- **Branding.** The logo is the supplied Guardian CMS White.svg in `src/assets/`; the sidebar blue (matched by eye from the screenshot) is in `src/theme.ts`.

## Built-in data patterns

Visible by design so each chart has something to show: one bill validator model (BV-300) has a 3× jam rate, roughly 1.8× the call rate per EGM (S7 by Bill validator); one cabinet (Dual-Screen) has a weak first-time fix rate (S6 / S7); resolution time has a long tail so average sits above median (S5); a handful of chronic repeat-offender assets (S9); calls still open at the data end across all age buckets (S8); about 60% of calls are auto-generated.

## Open questions (built with the stated default)

- Filter hierarchy Company → Operator → Region → Site? Default: yes.
- Week starts Sunday or Monday? Default: Sunday.
- Month default last complete month or month to date? Default: last complete month.
- Uptime target 98%?
- Exact Guardian brand blue (currently matched by eye).
