import { describe, it, expect } from 'vitest';
import {
  alignmentMarker,
  cellWidth,
  clampPadding,
  countCells,
  escapeCell,
  escapeHtml,
  resolveAlignment,
  resolveColumns,
  toHtml,
  toMarkdown,
} from '@/tool/lib/markdown';
import type { MarkdownOptions } from '@/tool/types';

const BASE: MarkdownOptions = {
  alignment: 'left',
  columnAlignments: [],
  padding: 1,
  alignColumns: false,
  escapePipes: true,
  flattenNewlines: true,
  uppercaseHeaders: false,
  includeHeader: true,
};

const TABLE = {
  headers: ['Name', 'Role'],
  rows: [
    ['Ada', 'Engineer'],
    ['Grace', 'Admiral'],
  ],
};

function options(overrides: Partial<MarkdownOptions> = {}): MarkdownOptions {
  return { ...BASE, ...overrides };
}

describe('clampPadding', () => {
  it('clamps into the supported range', () => {
    expect(clampPadding(-3)).toBe(0);
    expect(clampPadding(0)).toBe(0);
    expect(clampPadding(2)).toBe(2);
    expect(clampPadding(99)).toBe(4);
  });

  it('truncates fractional and rejects non-finite values', () => {
    expect(clampPadding(1.9)).toBe(1);
    expect(clampPadding(Number.NaN)).toBe(0);
    expect(clampPadding(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('resolveAlignment', () => {
  it('prefers a column override over the default', () => {
    expect(resolveAlignment(['right'], 0, 'left')).toBe('right');
  });

  it('falls back to the default when the entry is missing', () => {
    expect(resolveAlignment([], 0, 'center')).toBe('center');
    expect(resolveAlignment(undefined, 2, 'right')).toBe('right');
    expect(resolveAlignment([], 3, 'left')).toBe('left');
  });
});

describe('alignmentMarker', () => {
  it('emits valid Markdown alignment markers', () => {
    expect(alignmentMarker('left', 0)).toBe(':---');
    expect(alignmentMarker('center', 0)).toBe(':---:');
    expect(alignmentMarker('right', 0)).toBe('---:');
  });

  it('adds padding around the marker', () => {
    expect(alignmentMarker('left', 1)).toBe(' :--- ');
    expect(alignmentMarker('center', 2)).toBe('  :---:  ');
  });
});

describe('escapeCell', () => {
  it('escapes pipes when enabled', () => {
    expect(escapeCell('a|b', { escapePipes: true, flattenNewlines: true })).toBe('a\\|b');
  });

  it('leaves pipes alone when disabled', () => {
    expect(escapeCell('a|b', { escapePipes: false, flattenNewlines: true })).toBe('a|b');
  });

  it('flattens newlines into <br> when enabled', () => {
    expect(escapeCell('a\nb', { escapePipes: false, flattenNewlines: true })).toBe('a<br>b');
    expect(escapeCell('a\r\nb', { escapePipes: false, flattenNewlines: true })).toBe('a<br>b');
  });

  it('keeps newlines when flattening is disabled', () => {
    expect(escapeCell('a\nb', { escapePipes: false, flattenNewlines: false })).toBe('a\nb');
  });
});

describe('cellWidth', () => {
  it('counts source characters, including escape backslashes', () => {
    expect(cellWidth('a\\|b')).toBe(4);
    expect(cellWidth('plain')).toBe(5);
  });
});

describe('toMarkdown', () => {
  it('generates a valid Markdown table with a delimiter row', () => {
    const { markdown } = toMarkdown(TABLE, options());
    const lines = markdown.split('\n');

    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('| Name | Role |');
    expect(lines[1]).toBe('| :--- | :--- |');
    expect(lines[2]).toBe('| Ada | Engineer |');
    expect(lines[3]).toBe('| Grace | Admiral |');
  });

  it('produces valid output with zero padding', () => {
    const { markdown } = toMarkdown(TABLE, options({ padding: 0 }));
    const lines = markdown.split('\n');

    expect(lines[0]).toBe('|Name|Role|');
    expect(lines[1]).toBe('|:---|:---|');
    expect(lines[2]).toBe('|Ada|Engineer|');
  });

  it('pads every column to the widest cell when alignColumns is on', () => {
    const { markdown, widths } = toMarkdown(TABLE, options({ alignColumns: true }));
    const lines = markdown.split('\n');

    expect(widths).toEqual([5, 8]);
    expect(lines[0]).toBe('| Name  | Role     |');
    expect(lines[1]).toBe('| :---  | :---     |');
    expect(lines[2]).toBe('| Ada   | Engineer |');
    expect(lines[3]).toBe('| Grace | Admiral  |');
    // Every rendered line must be the same length for the source to line up.
    const lengths = new Set(lines.map((line) => line.length));
    expect(lengths.size).toBe(1);
  });

  it('applies text alignments properly per column', () => {
    const { markdown } = toMarkdown(
      TABLE,
      options({ alignment: 'left', columnAlignments: ['right', 'center'] })
    );
    const delimiter = markdown.split('\n')[1];

    expect(delimiter).toBe('| ---: | :---: |');
  });

  it('honours a right default alignment for every column', () => {
    const { columns, markdown } = toMarkdown(TABLE, options({ alignment: 'right' }));

    expect(columns.map((column) => column.alignment)).toEqual(['right', 'right']);
    expect(markdown.split('\n')[1]).toBe('| ---: | ---: |');
  });

  it('uppercases headers on request', () => {
    const { markdown } = toMarkdown(TABLE, options({ uppercaseHeaders: true }));
    expect(markdown.split('\n')[0]).toBe('| NAME | ROLE |');
  });

  it('omits the header and delimiter rows when includeHeader is false', () => {
    const { markdown } = toMarkdown(TABLE, options({ includeHeader: false }));
    const lines = markdown.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('| Ada | Engineer |');
  });

  it('keeps ragged rows rectangular by padding missing cells', () => {
    const { markdown } = toMarkdown(
      { headers: ['a', 'b', 'c'], rows: [['1']] },
      options({ padding: 0 })
    );
    expect(markdown.split('\n')[2]).toBe('|1|||');
  });

  it('escapes pipes so the table structure survives', () => {
    const { markdown } = toMarkdown(
      { headers: ['note'], rows: [['a|b']] },
      options({ padding: 0, alignColumns: true })
    );
    const row = markdown.split('\n')[2];
    // `a\|b` is exactly as wide as the delimiter row, so no padding is added.
    expect(row).toBe('|a\\|b|');
    // Exactly two unescaped pipes delimit the single column.
    expect(row?.replace(/\\\|/g, '').split('|').length).toBe(3);
  });

  it('flattens multi-line cells into a single row', () => {
    const { markdown } = toMarkdown(
      { headers: ['note'], rows: [['a\nb']] },
      options({ padding: 0 })
    );
    expect(markdown.split('\n')).toHaveLength(3);
    expect(markdown).toContain('|a<br>b|');
  });

  it('returns an empty string for a table with no columns', () => {
    const result = toMarkdown({ headers: [], rows: [] }, options());
    expect(result.markdown).toBe('');
    expect(result.widths).toEqual([]);
  });

  it('exposes resolved columns with effective alignments', () => {
    const { columns } = toMarkdown(TABLE, options({ alignment: 'center' }));
    expect(columns).toEqual([
      { header: 'Name', alignment: 'center' },
      { header: 'Role', alignment: 'center' },
    ]);
  });

  it('clamps out-of-range padding from state', () => {
    const { markdown } = toMarkdown(TABLE, options({ padding: 12 }));
    // MAX_PADDING is 4, so each side gets exactly four spaces.
    expect(markdown.split('\n')[0]).toBe('|    Name    |    Role    |');
  });
});

describe('toHtml', () => {
  it('emits a table snippet with alignment styles', () => {
    const html = toHtml(TABLE, options({ columnAlignments: ['left', 'right'] }));

    expect(html.startsWith('<table>')).toBe(true);
    expect(html.endsWith('</table>')).toBe(true);
    expect(html).toContain('<thead>');
    expect(html).toContain('<th style="text-align: left">Name</th>');
    expect(html).toContain('<th style="text-align: right">Role</th>');
    expect(html).toContain('<td style="text-align: left">Ada</td>');
    expect(html).toContain('<td style="text-align: right">Engineer</td>');
  });

  it('escapes HTML special characters in cells', () => {
    const html = toHtml({ headers: ['<script>'], rows: [['a & b "c"']] }, options({ padding: 0 }));

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b &quot;c&quot;');
  });

  it('renders newlines as <br> tags', () => {
    const html = toHtml({ headers: ['n'], rows: [['a\nb']] }, options());
    expect(html).toContain('a<br>b');
  });

  it('omits the header block when includeHeader is false', () => {
    const html = toHtml(TABLE, options({ includeHeader: false }));
    expect(html).not.toContain('<thead>');
    expect(html).toContain('<tbody>');
  });

  it('returns an empty string when there are no columns', () => {
    expect(toHtml({ headers: [], rows: [] }, options())).toBe('');
  });

  it('uppercases headers in the HTML output too', () => {
    const html = toHtml(TABLE, options({ uppercaseHeaders: true }));
    expect(html).toContain('>NAME<');
  });
});

describe('escapeHtml', () => {
  it('escapes all five significant characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});

describe('countCells and resolveColumns', () => {
  it('counts rows times columns', () => {
    expect(countCells(TABLE)).toBe(4);
  });

  it('caps resolved columns at MAX_COLUMNS', () => {
    const headers = Array.from({ length: 60 }, (_unused, index) => `c${index}`);
    const columns = resolveColumns({ headers, rows: [] }, options());
    expect(columns.length).toBe(50);
  });
});
