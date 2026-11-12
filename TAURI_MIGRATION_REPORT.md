# Tauri Migration Report

## Summary

Electron runtime replaced by Tauri 2 + Rust. Existing vanilla JS frontend preserved and adapted via `frontend/tauri-bridge.js`. All core features migrated.

## Completed

- Tauri 2 scaffold and configuration.
- Rust commands for products, quotations, invoices, orders, dashboard, PDF.
- rusqlite database (file-backed, same path semantics).
- Frontend integration with Tauri invoke.
- Window controls via Tauri window API.
- CI build workflow.
- Electron dependencies removed (final).

## Testing

- `cargo build` passes (GNU + MSVC via CI).
- `npm run tauri:build` passes in CI.
- Manual smoke of CRUD, conversions, dashboard, PDF.

## Known Limitations

- No automated tests yet.
- PDF layout basic.
- Order->invoice assumes 0 tax (preserved).
- Invoice numbers use COUNT(*)+1 (preserved).
- Modular Rust structure (commands/services/models) not yet split; lib.rs is monolithic but functional.