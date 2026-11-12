# Tauri Architecture

## Overview

Dual-runtime during migration; final target is Tauri 2 + Rust with the existing vanilla JS frontend preserved.

## Frontend

- `frontend/index.html` — single-page app shell.
- `frontend/scripts/app.js` — all UI logic, calls `window.electronAPI.*`.
- `frontend/styles/*.css` — styling.
- `frontend/tauri-bridge.js` — when `window.__TAURI__` exists, defines `window.electronAPI` mapping to Tauri commands; no-op under Electron.

## Rust Backend (`src-tauri/`)

- `Cargo.toml` — tauri 2, rusqlite (bundled), serde, serde_json, chrono, printpdf.
- `tauri.conf.json` — `frontendDist: ../frontend`, window 1280x800 min 1200x700, identifier com.befirst.energy.
- `capabilities/default.json` — core:default, opener:default.
- `src/main.rs` — entry point calling `app_lib::run()`.
- `src/lib.rs` — DB init, all `#[tauri::command]` functions, `DbState` (Mutex<Connection>).

## Data Flow

Frontend -> `window.electronAPI.*` -> (Tauri) `invoke(command, args)` -> Rust command -> rusqlite -> SQLite file in app data dir -> response (JSON) -> frontend.

## Database

- Path: `%APPDATA%/befirst_energy.db` (app_data_dir).
- Schema created with `CREATE TABLE IF NOT EXISTS`; no migrations.
- Sample data inserted when products empty.
- Writes persist immediately (rusqlite file-backed); no manual save.

## Security

- Capabilities restricted to core + opener.
- Commands validate inputs via typed structs.
- No unrestricted fs/shell permissions exposed.