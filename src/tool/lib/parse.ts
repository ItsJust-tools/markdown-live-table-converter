import type { InputFormat, ResolvedFormat } from '../types';

/** Maximum number of rows the parser will materialize. */
export const MAX_PARSED_ROWS = 5_000;

/** A table extracted from the pasted payload. */
export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/** How the JSON payload mapped onto a table. */
export interface JsonTable extends ParsedTable {
  /**
   * `objects` — array of objects, keys already became headers.
   * `records` — array of arrays, so the first row may be a header.
   * `primitives` — flat values; headers are always generated.
   */
  kind: 'objects' | 'records' | 'primitives';
}

/** Result of parsing the pasted input. */
export type ParseResult =
  | { status: 'empty' }
  | ({ status: 'valid'; format: ResolvedFormat; truncated: boolean } & ParsedTable)
  | { status: 'error'; error: string; hint?: string };

/** Options that influence parsing rather than Markdown rendering. */
export interface ParseOptions {
  format: InputFormat;
  hasHeaderRow: boolean;
  trimCells: boolean;
}

const BOM = '\uFEFF';

/**
 * Sniff the concrete format of a payload.
 *
 * JSON wins when the payload opens with `[` or `{` and parses, otherwise the
 * delimiter with the highest count on the first meaningful line decides.
 */
export function detectFormat(input: string, requested: InputFormat = 'auto'): ResolvedFormat {
  if (requested !== 'auto') return requested;

  const text = stripBom(input).trim();
  if (!text) return 'csv';

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      JSON.parse(text);
      return 'json';
    } catch {
      // Not valid JSON after all — fall through to delimiter sniffing so a CSV
      // that happens to start with a bracket still parses.
    }
  }

  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const tabs = countChar(firstLine, '\t');
  const commas = countChar(firstLine, ',');
  const semicolons = countChar(firstLine, ';');
  const pipes = countChar(firstLine, '|');

  if (tabs > 0 && tabs >= commas && tabs >= semicolons && tabs >= pipes) return 'tsv';
  if (semicolons > commas && semicolons >= pipes) return 'csv';
  return 'csv';
}

function stripBom(value: string): string {
  return value.startsWith(BOM) ? value.slice(1) : value;
}

function countChar(value: string, char: string): number {
  let total = 0;
  for (const current of value) {
    if (current === char) total += 1;
  }
  return total;
}

/**
 * Split a delimited payload into records using RFC 4180 quoting rules.
 *
 * Supports escaped quotes (`""`), delimiters and newlines inside quoted fields,
 * and both CRLF and LF line endings. Throws when a quote is never closed so the
 * caller can report a useful line number.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;

  const pushField = () => {
    record.push(field);
    field = '';
  };

  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      pushField();
      continue;
    }

    if (char === '\r') {
      // A bare CR also ends the record; CRLF is consumed in one step.
      if (text[i + 1] === '\n') i += 1;
      pushRecord();
      line += 1;
      continue;
    }

    if (char === '\n') {
      pushRecord();
      line += 1;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error(`Unterminated quoted field starting near line ${line}`);
  }

  // A trailing newline should not create a phantom empty record.
  if (field.length > 0 || record.length > 0) {
    pushRecord();
  }

  return records;
}

/** True when every cell in the record is empty (blank separator line). */
function isBlankRecord(record: string[]): boolean {
  return record.every((cell) => cell.trim().length === 0);
}

/** Pad or truncate a record so every row has exactly `width` cells. */
function normalizeWidth(record: string[], width: number): string[] {
  if (record.length === width) return record;
  if (record.length > width) return record.slice(0, width);
  return [...record, ...Array.from({ length: width - record.length }, () => '')];
}

/**
 * Turn parsed JSON into a rectangular table.
 *
 * - Array of objects → union of keys (first-seen order) becomes the header.
 * - Array of arrays → first row is the header when `hasHeaderRow` is set.
 * - Array of primitives → single column table.
 * - Plain object → one record whose keys are the headers.
 */
export function jsonToTable(value: unknown): JsonTable {
  if (Array.isArray(value)) {
    if (value.length === 0) return { headers: [], rows: [], kind: 'objects' };

    const allObjects = value.every(
      (entry) => typeof entry === 'object' && entry !== null && !Array.isArray(entry)
    );

    if (allObjects) {
      const headers: string[] = [];
      const seen = new Set<string>();
      for (const entry of value as Record<string, unknown>[]) {
        for (const key of Object.keys(entry)) {
          if (!seen.has(key)) {
            seen.add(key);
            headers.push(key);
          }
        }
      }
      const rows = (value as Record<string, unknown>[]).map((entry) =>
        headers.map((header) => stringifyCell(entry[header]))
      );
      return { headers, rows, kind: 'objects' };
    }

    const allArrays = value.every((entry) => Array.isArray(entry));
    if (allArrays) {
      const rows = (value as unknown[][]).map((entry) => entry.map(stringifyCell));
      return { headers: [], rows, kind: 'records' };
    }

    return { headers: [], rows: value.map((entry) => [stringifyCell(entry)]), kind: 'primitives' };
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const headers = Object.keys(record);
    return {
      headers,
      rows: [headers.map((header) => stringifyCell(record[header]))],
      kind: 'objects',
    };
  }

  return { headers: [], rows: [[stringifyCell(value)]], kind: 'primitives' };
}

/** Render a JSON leaf as a table cell; nested structures stay JSON. */
export function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Parse pasted text into a rectangular table.
 *
 * Never throws: every failure is reported as an `error` result so the UI can
 * render the message next to the input.
 */
export function parseTable(input: string, options: ParseOptions): ParseResult {
  const text = stripBom(input);
  if (!text.trim()) return { status: 'empty' };

  const format = detectFormat(text, options.format);

  if (format === 'json') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      return {
        status: 'error',
        error: `Invalid JSON: ${message}`,
        hint: 'JSON input must be an array of objects, an array of arrays, or an object.',
      };
    }

    const table = jsonToTable(parsed);
    if (table.headers.length === 0 && table.rows.length === 0) {
      return { status: 'empty' };
    }

    const truncated = table.rows.length > MAX_PARSED_ROWS;
    const rows = truncated ? table.rows.slice(0, MAX_PARSED_ROWS) : table.rows;

    if (table.kind === 'objects' && table.headers.length > 0) {
      const headers = options.trimCells ? table.headers.map((h) => h.trim()) : table.headers;
      return {
        status: 'valid',
        format,
        truncated,
        headers,
        rows: rows.map((row) => normalizeWidth(row, headers.length)),
      };
    }

    // Arrays of arrays honour the header toggle; flat primitives never do,
    // because consuming the first value as a column name would lose data.
    return finishRectangular(
      rows,
      table.kind === 'primitives' ? { ...options, hasHeaderRow: false } : options,
      format,
      truncated
    );
  }

  const delimiter = format === 'tsv' ? '\t' : ',';
  let records: string[][];
  try {
    records = parseDelimited(text, delimiter);
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to parse delimited input',
      hint: 'Check for an unclosed double quote in your pasted data.',
    };
  }

  const cleaned = records.filter((record) => !isBlankRecord(record));
  if (cleaned.length === 0) return { status: 'empty' };

  const truncated = cleaned.length > MAX_PARSED_ROWS + 1;
  const limited = truncated ? cleaned.slice(0, MAX_PARSED_ROWS + 1) : cleaned;
  return finishRectangular(limited, options, format, truncated);
}

/**
 * Apply header handling to a raw record matrix.
 *
 * When `hasHeaderRow` is false every record is data and headers are generated
 * as `Column 1..N`. Ragged rows are padded to the widest record.
 */
function finishRectangular(
  records: string[][],
  options: ParseOptions,
  format: ResolvedFormat,
  truncated: boolean
): ParseResult {
  const cell = (value: string | undefined): string => {
    const text = value ?? '';
    return options.trimCells ? text.trim() : text;
  };

  const widthLimit = Math.max(...records.map((record) => record.length));

  if (options.hasHeaderRow) {
    const [headerRecord, ...bodyRecords] = records;
    const headerCells = (headerRecord ?? []).map(cell);
    const width = Math.max(headerCells.length, 1);
    const headers = normalizeWidth(headerCells, width).map((value) => value);
    return {
      status: 'valid',
      format,
      truncated,
      headers,
      rows: bodyRecords.map((record) => normalizeWidth(record.map(cell), width)),
    };
  }

  const width = Math.max(widthLimit, 1);
  const headers = Array.from({ length: width }, (_unused, index) => `Column ${index + 1}`);
  return {
    status: 'valid',
    format,
    truncated,
    headers,
    rows: records.map((record) => normalizeWidth(record.map(cell), width)),
  };
}

/** True when the parse result carries renderable cells. */
export function hasTable(result: ParseResult): result is Extract<ParseResult, { status: 'valid' }> {
  return result.status === 'valid' && result.headers.length > 0;
}
