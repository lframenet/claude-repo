# Scribe

A clean, notepad-style macOS app for reading and writing almost any text-ish file:

- **Code & text** — TypeScript, JavaScript, Python, HTML, CSS, JSON, YAML, Shell, SQL, C/C++, Java, Go, Rust, Swift, PHP, Ruby, Lua, Markdown, diffs, logs, and ~50 more (syntax highlighting via CodeMirror).
- **PDF** — extracts embedded text with pdf.js; scanned PDFs can be transcribed in-app with the **OCR PDF** button (Tesseract, fully offline, English).
- **DOCX** — converted to plain text (mammoth).
- **RTF** — parsed to plain text.
- **Legacy .doc** — best-effort text extraction.

## macOS integration

- Native `.app` bundle (arm64 and x64 builds), traffic-light window controls, native menu bar with Open Recent, single-instance, drag & drop, "Reveal in Finder", document proxy icon + edited dot in the title bar, registered as an editor/viewer for plain text, Markdown, source code, PDF, RTF, DOC/DOCX.
- Unsigned (no Apple Developer ID): on first launch, right-click the app → **Open** (or System Settings → Privacy & Security → "Open Anyway").

## Using

1. Download `Scribe-macOS-arm64.zip` (Apple Silicon) or `Scribe-macOS-x64.zip` (Intel).
2. Unzip, drag `Scribe.app` to `/Applications`.
3. Open files via ⌘O, drag & drop, Finder "Open With", or double-click supported files.

## Building from source

```sh
npm install
node build/vendor.mjs          # fetch vendor assets + OCR language data
node build/make-mac-app.mjs arm64   # or: x64
# -> dist/darwin-arm64/Scribe.app
```
