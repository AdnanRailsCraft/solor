# Tauri Migration Plan

## 1. Existing Architecture (Electron)

- Runtime: Electron 28, Node 18+, electron-builder 24.
- Main process: `main.js` (monolithic) — sql.js DB, ~40 IPC handlers, PDFKit, window controls.
- Preload: `preload.js` exposes `window.electronAPI` (context bridge).
- Frontend: single-page HTML/CSS/JS in `frontend/` (moved from `views/`, `styles/`, `scripts/`).
- Database: sql.js (in-memory SQLite) persisted to `%APPDATA%/befirst_energy.db`.
- Packaging: NSIS installer to `dist/`.

## 2. Existing Electron Features

- Window controls (minimize/maximize/close), min size 1200x700.
- Product CRUD + search.
- Quotations CRUD + convert to invoice.
- Invoices CRUD + mark paid + convert from quotation/order.
- Orders CRUD + status update + convert to invoice.
- Dashboard stats, low stock, recent transactions.
- PDF generation (quotation/invoice) to Documents folder.
- Inventory auto-reduction with stock validation.

## 3. Dependencies: keep vs replace

Keep (frontend): HTML/CSS/JS, phosphor icons, no framework.
Replace: Electron, electron-builder, sql.js, PDFKit, electron-log.
Tauri equivalents: tauri 2, rusqlite, printpdf, tauri-plugin-opener, tauri-plugin-log (optional).

## 4. Electron-to-Tauri API Mappings

- `BrowserWindow` -> Tauri window config in `tauri.conf.json`.
- `ipcMain.handle` -> `#[tauri::command]` + `invoke_handler`.
- `contextBridge.exposeInMainWorld` -> `frontend/tauri-bridge.js` using `window.__TAURI__.core.invoke`.
- `app.getPath('userData')` -> `app.path().app_data_dir()`.
- `app.getPath('documents')` -> `app.path().document_dir()`.
- `dialog.showErrorBox` -> Tauri dialog plugin (not yet wired; errors returned to frontend).
- PDFKit -> printpdf.

## 5. Compatibility Issues

- Preload's `runQuery/getAll/getOne` mapped to unimplemented `db:*` channels — dropped in port.
- SPEC.md/README.md are aspirational and inaccurate (no better-sqlite3, no models/controllers).
- `install.bat`/`run.bat` hardcode stale path — removed from use.
- GNU toolchain link has export-ordinal limit; solved by rlib-only crate type.
- MSVC builds require Windows SDK (available on CI via windows-latest).

## 6. Migration Phases (status)

1. Analysis & feature inventory — DONE.
2. Create/configure Tauri 2 — DONE.
3. Integrate existing frontend — DONE (`frontendDist: ../frontend`).
4. Migrate main-process functionality — DONE (commands in `src-tauri/src/lib.rs`).
5. Migrate preload/IPC — DONE (`tauri-bridge.js`).
6. Implement Rust commands/services — DONE (monolithic; modularization pending).
7. Migrate native desktop features — PARTIAL (window controls via bridge; menus/tray/shortcuts not in original app, so N/A).
8. Remove Electron — PENDING.
9. Testing/optimization/packaging — PARTIAL (builds pass; no automated tests).
10. Documentation — IN PROGRESS.

## 7. Testing Strategy

- `cargo build` / `cargo build --release` in `src-tauri/`.
- `npm run tauri:build` via CI (windows-latest).
- Manual smoke: launch app, CRUD all entities, convert flows, PDF generation, dashboard.
- Future: Rust unit tests for DB helpers; frontend E2E.

## 8. Known Limitations

- No system tray/menus/shortcuts in original Electron app (none to migrate).
- PDF layout is basic (printpdf) vs PDFKit.
- Order->invoice conversion assumes 0 tax (preserved from original).
- Invoice numbers use COUNT(*)+1 (preserved).
- No automated test suite.