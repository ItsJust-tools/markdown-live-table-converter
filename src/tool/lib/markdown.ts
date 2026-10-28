import { MAX_COLUMNS, MAX_PADDING, type Alignment, type MarkdownOptions } from '../types';
import type { ParsedTable } from './parse';

/** A fully resolved column: header text plus effective alignment. */
export interface ResolvedColumn {
  header: string;
  alignment: Alignment;
}

/** Clamp a padding value into the supported range. */
export function clampPadding(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_PADDING, Math.max(0, Math.trunc(value)));
}

/** Resolve a column's alignment, falling back to the table default. */
export function resolveAlignment(
  columnAlignments: Alignment[] | undefined,
  index: number,
  fallback: Alignment
): Alignment {
  const override = columnAlignments?.[index];
  return override ?? fallback;
}

/** The Markdown delimiter cell for an alignment (`:---`, `:---:`, `---:`). */
export function alignmentMarker(alignment: Alignment, padding: number): string {
  const pad = ' '.repeat(clampPadding(padding));
  const dashes = '---';
  if (alignment === 'center') return `${pad}:${dashes}:${pad}`;
  if (alignment === 'right') return `${pad}${dashes}:${pad}`;
  return `${pad}:${dashes}${pad}`;
}

/** Escape cell content so it cannot break the table structure. */
export function escapeCell(
  value: string,
  options: Pick<MarkdownOptions, 'escapePipes' | 'flattenNewlines'>
): string {
  let text = value;
  if (options.flattenNewlines) {
    text = text.replace(/\r\n|\r|\n/g, '<br>');
  }
  if (options.escapePipes) {
    text = text.replace(/\|/g, '\\|');
  }
  return text;
}

/** Build the resolved column list for a table. */
export function resolveColumns(table: ParsedTable, options: MarkdownOptions): ResolvedColumn[] {
  return table.headers.slice(0, MAX_COLUMNS).map((header, index) => ({
    header,
    alignment: resolveAlignment(options.columnAlignments, index, options.alignment),
  }));
}

/**
 * Width of a Markdown cell as it appears in the source.
 *
 * Escapes count as characters because the goal of `alignColumns` is to line up
 * the raw output, where `\|` occupies two columns of the source text.
 */
export function cellWidth(value: string): number {
  return value.length;
}

export interface MarkdownResult {
  markdown: string;
  columns: ResolvedColumn[];
  /** Column widths used for padding (content width, excluding padding spaces). */
  widths: number[];
}

/**
 * Render a rectangular table as GitHub-flavoured Markdown.
 *
 * With `alignColumns` the output is padded so the raw source lines up; otherwise
 * cells are emitted compactly. The delimiter row is always present when
 * `includeHeader` is on, because Markdown requires it to recognize a table.
 */
export function toMarkdown(table: ParsedTable, options: MarkdownOptions): MarkdownResult {
  const columns = resolveColumns(table, options);
  const padding = clampPadding(options.padding);

  if (columns.length === 0) {
    return { markdown: '', columns, widths: [] };
  }

  const headerCells = columns.map((column) => {
    const header = options.uppercaseHeaders ? column.header.toUpperCase() : column.header;
    return escapeCell(header, options);
  });

  const bodyCells = table.rows.map((row) =>
    columns.map((_column, index) => escapeCell(row[index] ?? '', options))
  );

  const widths = columns.map((column, index) => {
    if (!options.alignColumns) return 0;
    let width = cellWidth(headerCells[index] ?? '');
    for (const row of bodyCells) {
      width = Math.max(width, cellWidth(row[index] ?? ''));
    }
    // The delimiter cell must not be the widest thing in the column, otherwise
    // the padding below cannot line the source up.
    width = Math.max(width, alignmentMarker(column.alignment, 0).length);
    return width;
  });

  const pad = ' '.repeat(padding);
  const fill = (value: string, index: number): string => {
    if (!options.alignColumns) return value;
    const width = widths[index] ?? 0;
    const missing = Math.max(0, width - cellWidth(value));
    return `${value}${' '.repeat(missing)}`;
  };

  const renderRow = (cells: string[]): string =>
    `|${cells.map((value, index) => `${pad}${fill(value, index)}${pad}`).join('|')}|`;

  const lines: string[] = [];

  if (options.includeHeader) {
    lines.push(renderRow(headerCells));
    const markers = columns.map((column, index) =>
      fill(alignmentMarker(column.alignment, 0), index)
    );
    lines.push(renderRow(markers));
  }

  for (const row of bodyCells) {
    lines.push(renderRow(row));
  }

  return { markdown: lines.join('\n'), columns, widths };
}

/** Escape text for use inside an HTML element. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the same table as a standalone HTML `<table>` snippet.
 *
 * Cells keep `<br>` line breaks, alignment becomes `text-align`, and every
 * value is HTML-escaped.
 */
export function toHtml(table: ParsedTable, options: MarkdownOptions): string {
  const columns = resolveColumns(table, options);
  if (columns.length === 0) return '';

  const alignStyle = (alignment: Alignment): string =>
    alignment === 'left' ? 'left' : alignment === 'center' ? 'center' : 'right';

  const htmlCell = (value: string): string =>
    escapeHtml(options.flattenNewlines ? value.replace(/\r\n|\r|\n/g, '\n') : value).replace(
      /\n/g,
      '<br>'
    );

  const lines: string[] = ['<table>'];

  if (options.includeHeader) {
    lines.push('  <thead>');
    lines.push('    <tr>');
    for (const column of columns) {
      const header = options.uppercaseHeaders ? column.header.toUpperCase() : column.header;
      lines.push(
        `      <th style="text-align: ${alignStyle(column.alignment)}">${htmlCell(header)}</th>`
      );
    }
    lines.push('    </tr>');
    lines.push('  </thead>');
  }

  lines.push('  <tbody>');
  for (const row of table.rows) {
    lines.push('    <tr>');
    columns.forEach((column, index) => {
      lines.push(
        `      <td style="text-align: ${alignStyle(column.alignment)}">${htmlCell(row[index] ?? '')}</td>`
      );
    });
    lines.push('    </tr>');
  }
  lines.push('  </tbody>');
  lines.push('</table>');

  return lines.join('\n');
}

/** Count table cells for the status bar summary. */
export function countCells(table: ParsedTable): number {
  return table.rows.length * table.headers.length;
}
