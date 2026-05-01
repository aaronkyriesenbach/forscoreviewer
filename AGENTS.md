# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-01
**Branch:** master

## OVERVIEW

forScore Viewer — web app to upload, browse, and view forScore `.4sb` music sheet archives (PDFs with metadata, bookmarks, setlists, and annotations). TypeScript monorepo: React 19 + Vite client, Hono server, shared types.

## STRUCTURE

```
forscoreviewer/
├── src/
│   ├── client/              # React SPA (Vite root: src/client)
│   │   ├── components/      # Feature components (App, PdfViewer, Sidebar, Upload, etc.)
│   │   │   └── ui/          # shadcn/ui primitives (13 files, generated via components.json)
│   │   ├── hooks/           # Data-fetching hooks (useLibraries, useMetadata, useAnnotations)
│   │   └── lib/             # API wrappers (api.ts), search (search.ts), cn() utility
│   ├── server/              # Hono HTTP server
│   │   ├── routes/          # API route modules (libraries.ts, upload.ts)
│   │   └── parser/          # .4sb archive extractor (four-sb.ts) + plist→metadata (metadata.ts)
│   └── shared/              # Types shared across client/server (types.ts = single source of truth)
├── tests/                   # Vitest unit tests + Playwright e2e
│   └── e2e/                 # E2E specs + fixtures (PDFs, PNGs, metadata.json)
├── dist/                    # Built artifacts (committed — client + server bundles)
└── extracted_sample/        # Sample .4sb data for development
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add/change shared types | `src/shared/types.ts` | Single source of truth — update server parser + client consumers |
| Add API endpoint | `src/server/routes/` | Mount new router in `src/server/index.ts` via `app.route()` |
| Change upload flow | `src/server/routes/upload.ts` | Orchestrates extract4sb → transformPlistToMetadata → metadata.json |
| Change archive parsing | `src/server/parser/four-sb.ts` | Binary .4sb format: 12-byte tag + repeated (32-byte header + filename + gzip payload) |
| Change metadata transform | `src/server/parser/metadata.ts` | Plist key conventions: `&SET;` = setlist, `&SYS;` = system (skipped), `filename\|field` = score data |
| Add UI component | `src/client/components/` | Feature components; use shadcn primitives from `ui/` |
| Add shadcn/ui primitive | Run `npx shadcn@latest add <component>` | Config in `components.json`; aliases point to `@/client/components/ui` |
| Change client API calls | `src/client/lib/api.ts` | All fetch wrappers + URL builders centralized here |
| Add React hook | `src/client/hooks/` | Follow existing pattern: fetch → useState → useEffect |
| Add unit test | `tests/*.test.ts` | Vitest; use `@/` path alias; see `parser.test.ts` for helpers |
| Add e2e test | `tests/e2e/*.spec.ts` | Playwright; fixtures copied by `global-setup.ts` into DATA_DIR |
| Static file serving | `src/server/index.ts` | `/data/:library/documents/*` and `/data/:library/aux/*` handlers |

## CONVENTIONS

- **Path alias**: `@/*` → `./src/*` (tsconfig + vite + vitest all resolve it)
- **Imports**: Always use `@/client/...`, `@/server/...`, `@/shared/...` — never relative across module boundaries
- **shadcn/ui pattern**: Components in `ui/` use `forwardRef` + `cva` variants + `cn()` for class merging
- **Server framework**: Hono (not Express) — routes use `new Hono()` + `c.req`/`c.json()` API
- **No ESLint/Prettier/EditorConfig** configured — formatting is not enforced by tooling
- **TypeScript strict mode** enabled (`strict: true`)
- **Dual tsconfig**: `tsconfig.json` (client, module: ESNext) + `tsconfig.server.json` (server, module: NodeNext)
- **Dual lockfiles**: `package-lock.json` (npm, used by Docker) + `bun.lock` (local dev via Justfile)

## ANTI-PATTERNS (THIS PROJECT)

- **No `any` types** — `[key: string]: unknown` pattern used in `ScoreMetadata` (see `src/shared/types.ts`)
- **No `@ts-ignore`/`@ts-expect-error`** — fix the type, don't suppress
- **Do not edit `src/client/components/ui/`** by hand — these are shadcn-generated; re-add via CLI if changes needed
- **Do not edit `dist/`** — build artifacts are committed but should be regenerated via `npm run build`
- **Hono `c.req.param('*')` is broken** in v4.12.16 — extract wildcard paths from `c.req.path` instead (see `src/server/index.ts` comments)

## DATA FLOW

```
Upload .4sb → POST /api/libraries/:name/upload
  → extract4sb(buf, tempDir)     # decompress gzip entries → documents/ + aux/ + plist
  → transformPlistToMetadata()   # bplist → LibraryMetadata (scores, setlists, bookmarks)
  → write metadata.json          # atomic: temp dir → rename to final
  → UploadResponse

Browse → GET /api/libraries → LibraryInfo[]
       → GET /api/libraries/:name/metadata → LibraryMetadata
       → GET /api/libraries/:name/annotations → { annotations: string[] }

View PDF → /data/:library/documents/<filename> (streamed via Node Readable)
Annotations → /data/:library/aux/<filename>_<page>.png (overlaid on PDF pages)
```

## ENVIRONMENT

- `DATA_DIR` — where libraries are stored (default: `/data`; local dev: `/tmp/forscoreviewer`)
- `PORT` — server port (default: `3000`)
- Libraries stored at `$DATA_DIR/libraries/<name>/` with `metadata.json`, `documents/`, `aux/`

## COMMANDS

```bash
# Development (two terminals)
npm run dev:server       # tsx watch src/server/index.ts
npm run dev:client       # vite dev server (proxies /api + /data to :3000)

# Build & run
npm run build            # vite build + tsup src/server/index.ts --format cjs
npm start                # node dist/server/index.js

# Tests
npm run test             # vitest run (unit tests)
npm run test:e2e         # DATA_DIR=/tmp/forscoreviewer playwright test
npm run typecheck        # tsc --noEmit

# Docker
docker build -t forscore-viewer .
docker run -p 3000:3000 -v /path/to/data:/data forscore-viewer
```

## NOTES

- **Placeholder files exist** (`placeholder.ts` in routes, parser, hooks, components/ui) — stubs for dev scaffolding, safe to ignore or remove
- **Upload limit**: 1 GiB (`MAX_UPLOAD_SIZE` in `upload.ts`)
- **Unicode normalization**: Server normalizes file paths with `.normalize('NFD')` for macOS plist compatibility
- **Client search**: Simple substring matching in `search.ts` (title, composer, genre, keywords, labels) — no Fuse.js despite dependency being present
- **PdfViewer**: Dual-page layout on desktop (≥768px), single-page on mobile; keyboard nav (arrow keys); annotation PNG overlay at z-index 4
- **pdfjs-dist alias**: Vite config aliases `pdfjs-dist` to `react-pdf/node_modules/pdfjs-dist` — required for react-pdf compatibility
- **No CI/CD pipeline** — no GitHub Actions, no automated tests on push
- **`package.json` main field** is `postcss.config.js` — incorrect but harmless for an app (not a published package)
