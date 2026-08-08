# Beacon — QR Maker

Vue + NestJS platform for generating QR codes with optional brand marks.

## Features

- Encode any URL or text into a QR code
- Optional **center logo** with adjustable size
- Optional **finder square marks** on all three corners, or just one (top-left, top-right, bottom-left)
- Custom foreground / background colors and export size
- PNG download
- Browser-side generation for instant preview and export

Finder images sit inside the corner squares while the outer ring is kept so codes stay scannable. Center logos use high error correction (`H`).

## Stack

- **web** — Vue 3 + Vite + TypeScript + browser-side `qrcode` rendering
- **api** — NestJS + `qrcode` + Sharp (default port **3401**), retained for future server-side work
- **brand** — `LiteShadeBrand` from `@jeffgo10/helpers`, wrapped with `@r2wc/react-to-web-component` as `<liteshade-brand>`

## Setup

```bash
# GitHub Packages auth for @jeffgo10/*
export GITHUB_TOKEN=ghp_xxx   # needs read:packages
cp web/.npmrc.example web/.npmrc

npm --prefix api install
npm --prefix web install
```

## Run

Both API + web with aggregated watch logs:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:api   # NestJS → :3401
npm run dev:web   # Vue → :5401
```

Open [http://localhost:5401](http://localhost:5401).

## Current architecture

The Vue app now generates the QR image fully in the browser, including center and finder image overlays. The NestJS API is still present in the repo, but it is no longer required for the current preview/download flow.

## Deploy (Cloudflare Workers)

Worker name: `beacon`  
Custom domain: [beaconqr.liteshademedia.com](https://beaconqr.liteshademedia.com)

The web app is a static Vue SPA deployed with Wrangler Workers Assets (`web/wrangler.jsonc`). The Nest API is not part of this deploy.

### One-time setup

1. Create a Cloudflare API token with Workers Scripts Edit, Account Settings Read, and Zone DNS Edit for `liteshademedia.com`.
2. Add GitHub repo secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `GH_PACKAGES_TOKEN` (optional) — PAT with `read:packages` if the default Actions token cannot install `@jeffgo10/helpers`

### Local deploy

```bash
npm run deploy
```

Requires Cloudflare auth (`npx wrangler login` or the same `CLOUDFLARE_*` env vars).

### CI

Pushes to `master` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the Vue app and deploys the Worker. You can also run it manually via **Actions → Deploy to Cloudflare Workers → Run workflow**.

### Preview in the Workers runtime

```bash
npm run preview:cf
```

## Tests

Run everything:

```bash
npm test
npm run test:cov
```

Or per package:

```bash
npm run test:web
npm run test:api
npm run test:cov:web
npm run test:cov:api
```

- **web** — Vitest unit tests for `src/lib/qr.ts` (finder geometry + PNG generation)
- **api** — Jest unit tests for `QrService` (PNG/SVG output + image overlays)

Coverage reports are written to `web/coverage` and `api/coverage`.

## Cursor

Project rules and slash commands live under `.cursor/`:

| Path | Purpose |
|---|---|
| `.cursor/rules/beacon-project.mdc` | Stack, layout, conventions |
| `.cursor/rules/beacon-local-dev.mdc` | Ports and `npm run` commands |
| `.cursor/rules/clean-code.mdc` | Coding standards |
| `.cursor/rules/UI-UX/` | Design / a11y / frontend UX rules |
| `.cursor/commands/create-github-pr.md` | `/create-github-pr` |
| `.cursor/commands/handoff.md` | `/handoff` |

## API

`POST /qr/generate` (multipart/form-data)

| Field | Type | Notes |
| --- | --- | --- |
| `value` | string | Required content to encode |
| `size` | number | 128–2048, default 512 |
| `darkColor` | string | Hex, default `#0B1F1A` |
| `lightColor` | string | Hex, default `#F7F3EB` |
| `finderTarget` | string | `none` \| `all` \| `top-left` \| `top-right` \| `bottom-left` |
| `centerScale` | number | 12–35, default 22 |
| `format` | string | `png` (default) or `svg` |
| `centerImage` | file | Optional |
| `finderImage` | file | Optional |
