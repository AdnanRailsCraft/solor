# Converting BEFIRST ENERGY (Electron) to Rust — Plan & Pain Points

Recommended target: **Tauri v2** (Rust backend + keep the existing HTML/CSS/JS frontend). A pure Rust GUI (egui/iced/slint) would require rewriting the entire UI; Tauri reuses `views/` and `styles/` and only ports `main.js`.

## Prerequisites (not installed in this environment)

- Rust toolchain: `rustup`, `cargo`, `rustc`
- Tauri CLI: `cargo install tauri-cli` (or `npm i -D @tauri-apps/cli`)
- MSVC build tools / WebView2 (already present on Windows for Electron, but verify)

## Phase 0 — Inventory what actually exists

Do NOT trust `SPEC.md` (describes models/controllers that don't exist). Real surface area:

- `main.js`: sql.js DB, ~40 IPC handlers, PDF generation, window controls.
- `preload.js`: `window.electronAPI` wrappers.
- `scripts/app.js` (~42KB): all frontend logic, calls `window.electronAPI.*`.
- `views/index.html`, `styles/*`.

No tests exist, so regression risk is high; add smoke tests first if possible.

## Phase 1 — Scaffold Tauri

```bash
npm create tauri-app@latest  # or: cargo tauri init
```

Keep frontend assets; point Tauri's `frontendDist` at the existing `views/`/`styles/`/`scripts/` (or a build output dir). Remove Electron deps after parity.

## Pain points / key mappings

### 1. Database: sql.js -> rusqlite (or sqlx)

- Current: in-memory sql.js persisted to `%APPDATA%/befirst_energy.db` via `saveDatabase()` after every write; `CREATE TABLE IF NOT EXISTS`; sample data if empty.
- Rust: use `rusqlite` with a file-backed DB at the same path for continuity with existing user data.
- **Migration pain**: existing users have a sql.js-produced SQLite file. sql.js writes standard SQLite, so rusqlite can open it directly — verify with a real file before switching. Keep a backup copy first.
- `runQuery` auto-saves; in Rust, writes persist immediately, so remove manual save calls but keep transactional boundaries.
- `last_insert_rowid()` -> `conn.last_insert_rowid()`.
- `JSON.stringify(items)` stored in TEXT columns stays the same; parse with `serde_json`.

### 2. IPC: ipcMain.handle -> Tauri commands

- Each handler becomes `#[tauri::command] fn ...` registered in `tauri::generate_handler![...]`.
- Renderer calls change from `ipcRenderer.invoke('product:getAll')` to `invoke('get_products')` (or keep names). Either update `app.js` call sites or provide a shim in a new preload-like module.
- **Pain**: ~40 handlers to port; error propagation differs (Rust `Result<T, String>` serializes as rejected promise). `reduceInventory` throwing must become `Err(String)`.

### 3. Context isolation / preload -> capabilities

- Electron's `contextBridge` + `nodeIntegration:false` maps to Tauri's capability/permission system (`capabilities/default.json`).
- Only expose what the frontend needs; Tauri commands are the API surface.

### 4. PDF generation: PDFKit -> Rust crate

- Options: `printpdf`, `genpdf`, or `wkhtmltopdf`/`chromiumoxide` sidecar.
- **Pain**: layout code (tables, totals) must be rewritten; PDFKit's imperative API has no direct equivalent. Consider keeping a JS sidecar (`node` + pdfkit) invoked from Rust if fidelity matters, at the cost of bundling Node.
- Output path: `app.path().document_dir()` (equivalent of `app.getPath('documents')`).

### 5. Window controls

- `window:minimize/maximize/close` IPC -> Tauri window APIs (`app_handle.get_webview_window("main").minimize()` etc.) or frontend `@tauri-apps/api/window`.

### 6. Build / packaging

- `electron-builder --win` -> `cargo tauri build` (NSIS/MSI). Configure `tauri.conf.json` (`productName`, `identifier`, `bundle.targets`).
- Output moves from `dist/` to `src-tauri/target/release/bundle/`.
- Icon: `assets/icon.ico` -> `src-tauri/icons/`.

### 7. Logging

- `electron-log` -> `tauri-plugin-log` or `tracing`/`log` crate; file location changes to Tauri's log dir.

### 8. Numbering / concurrency

- `COUNT(*) + 1` invoice numbers are already racy; in Rust with a mutex/transaction this is fine but still not ideal. Consider a dedicated counter table if fixing.

### 9. Order -> invoice conversion assumes 0 tax

- Preserve or fix during port; document either way.

### 10. Dead preload APIs

- `runQuery`/`getAll`/`getOne` -> `db:*` have no handlers. Drop them in the Rust port rather than reimplementing.

## Suggested file layout (Tauri)

```
src-tauri/
  Cargo.toml
  tauri.conf.json
  capabilities/default.json
  src/
    main.rs
    db.rs        # rusqlite init + helpers
    commands/    # product, quotation, invoice, order, dashboard, pdf
views/            # frontend (unchanged, mostly)
scripts/app.js    # update invoke call sites
styles/
```

## Migration / rollout risks

- Existing DB file must open in rusqlite; test before release; ship a backup step.
- No automated tests -> manual smoke test of every CRUD + PDF + inventory reduction.
- `install.bat`/`run.bat` stale paths: replace with `cargo tauri dev` / `npm run tauri dev`.
- WebView2 is required on Windows (usually present); document installer prerequisite.

## Minimal first milestone

1. Scaffold Tauri, render existing `index.html`.
2. Port `product:*` commands + DB init; verify CRUD.
3. Port quotations/invoices/orders + inventory reduction.
4. Port dashboard + PDF (or sidecar).
5. Build NSIS installer and smoke-test on a clean machine.

## Commands (after Rust is installed)

```bash
npm install
npm run tauri dev      # dev
npm run tauri build    # release installer
```

Add to `package.json` scripts:

```json
"tauri": "tauri",
"dev:tauri": "tauri dev",
"build:tauri": "tauri build"
```
