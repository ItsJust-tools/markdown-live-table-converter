import type { MarkdownTableState } from '../types';
import { toHtml, toMarkdown, countCells, type MarkdownResult } from './markdown';
import { parseTable, hasTable, type ParseResult } from './parse';
import { sortRows } from './sort';

/** Everything the UI derives from one state snapshot. */
export interface DerivedTable {
  parsed: ParseResult;
  /** Table with preview sorting applied (never mutates the parsed rows). */
  rows: string[][];
  headers: string[];
  markdown: MarkdownResult;
  html: string;
  cellCount: number;
  /** True when a header row exists but holds no data rows. */
  isEmptyTable: boolean;
}

/**
 * Derive the preview, the Markdown, and the HTML snippet from a state snapshot.
 *
 * Sorting only affects the preview and the generated output together, so what
 * the user copies always matches what they see.
 */
export function deriveTable(state: MarkdownTableState): DerivedTable {
  const parsed = parseTable(state.input, {
    format: state.format,
    hasHeaderRow: state.hasHeaderRow,
    trimCells: state.trimCells,
  });

  if (!hasTable(parsed)) {
    return {
      parsed,
      rows: [],
      headers: [],
      markdown: { markdown: '', columns: [], widths: [] },
      html: '',
      cellCount: 0,
      isEmptyTable: false,
    };
  }

  const rows = sortRows(parsed.rows, state.sortColumn, state.sortDirection);

  const options = {
    alignment: state.alignment,
    columnAlignments: state.columnAlignments,
    padding: state.padding,
    alignColumns: state.alignColumns,
    escapePipes: state.escapePipes,
    flattenNewlines: state.flattenNewlines,
    uppercaseHeaders: state.uppercaseHeaders,
    includeHeader: state.includeHeader,
  };

  const table = { headers: parsed.headers, rows };

  return {
    parsed,
    rows,
    headers: parsed.headers,
    markdown: toMarkdown(table, options),
    html: toHtml(table, options),
    cellCount: countCells(table),
    isEmptyTable: rows.length === 0,
  };
}
