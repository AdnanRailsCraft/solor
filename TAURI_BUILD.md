# Tauri Build

## Local build

```bash
npm run tauri:build
# or
cd src-tauri && cargo tauri build
```

Output: `src-tauri/target/release/bundle/` (NSIS/MSI on Windows).

## Rust-only (dev)

```bash
cd src-tauri && cargo build
```

## CI

GitHub Actions workflow `.github/workflows/build.yml` builds on `windows-latest` using MSVC toolchain and uploads the bundle as an artifact.

## Cross-platform

- Windows: NSIS/MSI.
- Linux: .deb/.rpm/AppImage (configure targets in tauri.conf.json).
- macOS: .dmg/.app.

Platform-specific deps: WebView2 (Windows), WebKitGTK (Linux), WKWebView (macOS).