# Markdown Live Table Converter

Paste CSV, TSV, or JSON and get a clean, aligned Markdown table instantly. The
preview, the Markdown source, and the HTML snippet are derived from the same
state, so what you copy is exactly what you see.

**Live:** [markdown-table-converter.itsjust.tools](https://markdown-table-converter.itsjust.tools)

## What it does

- **Three input dialects** — CSV, TSV, and JSON. `Auto` sniffs the payload: a
  parseable `[`/`{` payload is treated as JSON, tabs win when they dominate the
  first line, and everything else parses as CSV with RFC 4180 quoting
  (escaped `""`, delimiters and newlines inside quotes, CRLF or LF).
- **JSON flexibility** — an array of objects becomes one column per key (the
  union of keys, first-seen order); an array of arrays uses the first row as the
  header; an array of primitives becomes a single column; a bare object becomes
  one record. Nested values are stringified, `null` becomes an empty cell.
- **Live preview table** — click any header to sort ascending, descending, and
  back to source order. Numeric cells sort numerically, and empty cells stay at
  the bottom in both directions.
- **Alignment control** — a default alignment for the whole table plus a
  per-column override, written as `:---`, `:---:`, and `---:`. Overrides are
  listed in the sidebar with a one-click reset.
- **Padding and formatting** — 0–4 spaces around every cell, optional
  column-width alignment so the raw Markdown lines up, pipe escaping (`\|`),
  newline flattening (`<br>`), header uppercasing, cell trimming, and an option
  to omit the header and delimiter rows.
- **Copy, download, export** — one click copies the Markdown; the toolbar also
  downloads a `.md` file or an HTML `<table>` snippet. The shell export menu
  saves the full tool state as JSON and snapshots the rendered table as PNG /
  JPEG / WebP / PDF.
- **Sample presets** — four presets (CSV, TSV, JSON, and a messy CSV with quoted
  commas, embedded pipes, and a missing cell) load straight into the editor.
- **Responsive and themed** — split / preview / Markdown layouts, a mobile
  single-column fallback, and full light/dark/high-contrast support.

## Keyboard shortcuts

| Shortcut       | Action                      |
| -------------- | --------------------------- |
| `Mod+Shift+C`  | Copy the Markdown table     |
| `Mod+Shift+P`  | Toggle padded columns       |
| `Mod+Shift+A`  | Cycle the default alignment |
| `Mod+Shift+L`  | Load the current sample     |
| `Mod+Shift+X`  | Clear the input             |

## Project structure

```text
src/tool/
  tool.config.ts          tool identity, theme, shortcuts
  types.ts                state shape, enums, limits
  tool-definition.ts      initial state, validation, state transitions
  lib/
    parse.ts              CSV/TSV/JSON parsing and format detection
    markdown.ts           Markdown and HTML rendering
    sort.ts               preview sorting
    derive.ts             one state snapshot → preview + output
    samples.ts            built-in presets
    download.ts           .md / .html file downloads
  components/             canvas, toolbar, sidebar, styles
```

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest unit suite
npm run build    # type-check + production build
```

## License

MIT
