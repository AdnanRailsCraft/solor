# AGENTS.md

## Project

Single-package Electron desktop app for solar equipment business management (inventory, quotations, invoices, orders, dashboard). No monorepo, no tests/lint/typecheck configured.

## Commands

- Install: `npm install`
- Dev: `npm start` / `npm run dev` / `npm run tauri:dev`
- Build: `npm run build` / `npm run tauri:build` -> `src-tauri/target/release/bundle/`
- Rust build (dev): `cd src-tauri && cargo build`
- No test/lint/typecheck scripts exist.

Avoid `install.bat`/`run.bat`: they hardcode a stale path (`c:\Users\x\Desktop\inv\befirst-energy`) and will run in the wrong directory. Use the npm commands above.

## Architecture (actual)

Tauri 2 + Rust with the existing vanilla JS frontend preserved.

Frontend:
- `frontend/index.html` + `frontend/scripts/app.js` — single-page frontend.
- `frontend/styles/*.css` — styling.
- `frontend/tauri-bridge.js` — defines `window.electronAPI` mapping to Tauri `invoke` (Tauri-only now).

Rust backend:
- `src-tauri/src/lib.rs` — commands + rusqlite DB + PDF (printpdf).
- `src-tauri/tauri.conf.json` — config; `frontendDist: ../frontend`.
- `src-tauri/icons/icon.ico` — required for Windows build.

`README.md`/`SPEC.md` are aspirational and inaccurate: there is no `better-sqlite3`, no `models/`, `controllers/`, or `database/db.js`. The DB is sql.js, persisted manually.

## Database

- sql.js (in-memory SQLite) stored at `%APPDATA%/befirst_energy.db` (`app.getPath('userData')`).
- `saveDatabase()` writes the full DB to disk; `runQuery()` calls it after every write. Read helpers (`getAll`/`getOne`) do not.
- Tables created with `CREATE TABLE IF NOT EXISTS`; no migrations. Schema changes need manual handling of existing DB files.
- Sample products inserted only when `products` is empty.
- DB file persists across app updates; deleting it resets to sample data.

## IPC / preload gotchas

- Handler names: `product:*`, `quotation:*`, `invoice:*`, `order:*`, `dashboard:*`, `pdf:generate`, `window:*`.
- `preload.js` also exposes `runQuery`/`getAll`/`getOne` mapped to `db:run`/`db:all`/`db:get`, but **no main-process handlers exist for those**. Do not use them; use the domain wrappers.
- When adding an IPC handler, add the matching wrapper in `preload.js`.

## Business-logic quirks

- Inventory is auto-reduced when an invoice is created (direct add, quotation conversion, or order conversion) via `reduceInventory`, which throws on insufficient stock; errors propagate to the renderer.
- Converting an order to an invoice assumes 0 tax (orders store only `total`).
- Invoice/quotation/order numbers are generated as `COUNT(*) + 1` (not concurrency-safe, but single process).
- PDFs are written to `app.getPath('documents')` with a sanitized filename derived from customer name + document number.

## Environment

- Node.js v18+, Electron 28, electron-builder 24.
- No env files or special env loading.