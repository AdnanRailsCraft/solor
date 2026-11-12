# Tauri Setup

## Prerequisites

- Node.js 18+
- Rust stable (rustup) — MSVC on Windows (needs Visual Studio Build Tools + Windows SDK) or GNU toolchain.
- On Windows: WebView2 runtime (usually present).

## Install

```bash
npm install
```

## Development

```bash
npm run tauri:dev
# or
cd src-tauri && cargo tauri dev
```

## Notes

- Electron is removed in the final Tauri build; `npm start` is no longer available after migration. Use `npm run tauri:dev`.
- Database file persists in `%APPDATA%/befirst_energy.db` (Windows). Delete to reset sample data.