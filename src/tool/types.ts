/**
 * Input dialect the converter parses.
 *
 * `auto` sniffs the payload (JSON when it starts with `[` / `{`, TSV when tabs
 * dominate, CSV otherwise) while the explicit values force a parser.
 */
export type InputFormat = 'auto' | 'csv' | 'tsv' | 'json';

/** Concrete format reported by the parser once `auto` detection has run. */
export type ResolvedFormat = 'csv' | 'tsv' | 'json';

/** Markdown column alignment, mapped to `:---`, `:---:`, and `---:` markers. */
export type Alignment = 'left' | 'center' | 'right';

/** Sort direction for the interactive preview. */
export type SortDirection = 'asc' | 'desc' | null;

/** Which pane(s) the canvas renders. */
export type ViewMode = 'split' | 'preview' | 'markdown';

/** Serializable state of the Markdown Live Table Converter. */
export interface MarkdownTableState {
  /** Raw pasted CSV / TSV / JSON text. */
  input: string;
  /** Requested parser; `auto` sniffs the dialect. */
  format: InputFormat;
  /** Treat the first parsed record as the header row. */
  hasHeaderRow: boolean;
  /** Alignment applied to columns without an explicit override. */
  alignment: Alignment;
  /**
   * Per-column alignment overrides. Index matches the column position; an
   * `undefined` entry falls back to `alignment`.
   */
  columnAlignments: Alignment[];
  /** Extra spaces added on both sides of every cell (0–4). */
  padding: number;
  /** Pad every column to its widest cell so the raw Markdown lines up. */
  alignColumns: boolean;
  /** Escape literal `|` characters inside cell text as `\|`. */
  escapePipes: boolean;
  /** Replace newlines inside cells with `<br>` so one row stays one line. */
  flattenNewlines: boolean;
  /** Trim surrounding whitespace from each parsed cell. */
  trimCells: boolean;
  /** Uppercase every header cell. */
  uppercaseHeaders: boolean;
  /** Emit the header row and delimiter row. */
  includeHeader: boolean;
  /** Column index used for preview sorting, or `null` for source order. */
  sortColumn: number | null;
  /** Direction of the preview sort. */
  sortDirection: SortDirection;
  /** Which pane(s) the canvas renders. */
  viewMode: ViewMode;
  /** Id of the selected sample preset, or `null` when none is loaded. */
  sampleId: string | null;
}

/** Option subset that mutates the generated Markdown only. */
export type MarkdownOptions = Pick<
  MarkdownTableState,
  | 'alignment'
  | 'columnAlignments'
  | 'padding'
  | 'alignColumns'
  | 'escapePipes'
  | 'flattenNewlines'
  | 'uppercaseHeaders'
  | 'includeHeader'
>;

export const INPUT_FORMATS: InputFormat[] = ['auto', 'csv', 'tsv', 'json'];

export const INPUT_FORMAT_LABELS: Record<InputFormat, string> = {
  auto: 'Auto',
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON',
};

export const RESOLVED_FORMAT_LABELS: Record<ResolvedFormat, string> = {
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON',
};

export const ALIGNMENTS: Alignment[] = ['left', 'center', 'right'];

export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  left: 'Left',
  center: 'Center',
  right: 'Right',
};

export const VIEW_MODES: ViewMode[] = ['split', 'preview', 'markdown'];

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  split: 'Split',
  preview: 'Preview',
  markdown: 'Markdown',
};

/** Minimum padding accepted by the UI and the serializer. */
export const MIN_PADDING = 0;
/** Maximum padding accepted by the UI and the serializer. */
export const MAX_PADDING = 4;
/** Upper bound on pasted input, keeps parsing and rendering responsive. */
export const MAX_INPUT_LENGTH = 200_000;
/** Upper bound on rendered preview rows; the Markdown output is never truncated. */
export const MAX_PREVIEW_ROWS = 500;
/** Upper bound on columns, guards the per-column alignment array. */
export const MAX_COLUMNS = 50;
