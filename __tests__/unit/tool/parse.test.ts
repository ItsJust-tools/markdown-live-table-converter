import { describe, it, expect } from 'vitest';
import {
  MAX_PARSED_ROWS,
  detectFormat,
  hasTable,
  jsonToTable,
  parseDelimited,
  parseTable,
  stringifyCell,
} from '@/tool/lib/parse';

describe('detectFormat', () => {
  it('honours an explicit format request', () => {
    expect(detectFormat('a,b\n1,2', 'tsv')).toBe('tsv');
    expect(detectFormat('a\tb\n1\t2', 'csv')).toBe('csv');
    expect(detectFormat('[{"a":1}]', 'json')).toBe('json');
  });

  it('sniffs JSON when the payload parses', () => {
    expect(detectFormat('[{"a":1}]')).toBe('json');
    expect(detectFormat('  {"a": 1}  ')).toBe('json');
  });

  it('falls back to CSV when a bracket payload is not valid JSON', () => {
    expect(detectFormat('[not json],second')).toBe('csv');
  });

  it('sniffs TSV when tabs are the dominant delimiter', () => {
    expect(detectFormat('a\tb\tc\n1\t2\t3')).toBe('tsv');
  });

  it('defaults to CSV for comma and semicolon data', () => {
    expect(detectFormat('a,b,c\n1,2,3')).toBe('csv');
    expect(detectFormat('a;b;c\n1;2;3')).toBe('csv');
  });

  it('defaults to CSV for empty input', () => {
    expect(detectFormat('')).toBe('csv');
    expect(detectFormat('   \n  ')).toBe('csv');
  });

  it('strips a byte order mark before sniffing', () => {
    expect(detectFormat('\uFEFF[{"a":1}]')).toBe('json');
  });
});

describe('parseDelimited', () => {
  it('splits simple comma records', () => {
    expect(parseDelimited('a,b\n1,2', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps delimiters inside quoted fields', () => {
    expect(parseDelimited('a,"b,c",d', ',')).toEqual([['a', 'b,c', 'd']]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseDelimited('"He said ""hi""",x', ',')).toEqual([['He said "hi"', 'x']]);
  });

  it('preserves newlines inside quoted fields', () => {
    expect(parseDelimited('"line1\nline2",b', ',')).toEqual([['line1\nline2', 'b']]);
  });

  it('handles CRLF line endings without trailing empties', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('does not emit a phantom record for a trailing newline', () => {
    expect(parseDelimited('a,b\n', ',')).toHaveLength(1);
  });

  it('supports tab delimiters with quoted tabs', () => {
    expect(parseDelimited('a\t"b\tc"', '\t')).toEqual([['a', 'b\tc']]);
  });

  it('throws on an unterminated quoted field', () => {
    expect(() => parseDelimited('a,"broken', ',')).toThrow(/Unterminated quoted field/);
  });
});

describe('parseTable — CSV', () => {
  it('parses CSV into table rows', () => {
    const result = parseTable('name,role\nAda,Engineer\nGrace,Admiral', {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.format).toBe('csv');
    expect(result.headers).toEqual(['name', 'role']);
    expect(result.rows).toEqual([
      ['Ada', 'Engineer'],
      ['Grace', 'Admiral'],
    ]);
  });

  it('generates Column N headers when there is no header row', () => {
    const result = parseTable('Ada,Engineer\nGrace,Admiral', {
      format: 'csv',
      hasHeaderRow: false,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['Column 1', 'Column 2']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['Ada', 'Engineer']);
  });

  it('pads ragged rows to the widest record', () => {
    const result = parseTable('a,b,c\n1,2\n1,2,3,4', {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['a', 'b', 'c']);
    expect(result.rows).toEqual([
      ['1', '2', ''],
      ['1', '2', '3'],
    ]);
  });

  it('skips blank separator lines', () => {
    const result = parseTable('a,b\n1,2\n\n3,4\n', {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('respects trimCells=false', () => {
    const result = parseTable('a , b\n 1 , 2 ', {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: false,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['a ', ' b']);
    expect(result.rows[0]).toEqual([' 1 ', ' 2 ']);
  });

  it('reports an empty result for whitespace-only input', () => {
    expect(parseTable('   \n\t ', { format: 'auto', hasHeaderRow: true, trimCells: true })).toEqual(
      { status: 'empty' }
    );
  });

  it('reports unclosed quotes as a parse error with a hint', () => {
    const result = parseTable('a,b\n"oops,2', {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.error).toMatch(/Unterminated/);
    expect(result.hint).toBeTruthy();
  });

  it('truncates oversized inputs and flags the truncation', () => {
    const rows = Array.from({ length: MAX_PARSED_ROWS + 5 }, (_unused, index) => `r${index},x`);
    const result = parseTable(['a,b', ...rows].join('\n'), {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.truncated).toBe(true);
    expect(result.rows.length).toBeLessThanOrEqual(MAX_PARSED_ROWS);
  });
});

describe('parseTable — TSV', () => {
  it('parses tab-separated input into columns', () => {
    const result = parseTable('SKU\tQty\nTS-1\t42\nTS-2\t17', {
      format: 'tsv',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.format).toBe('tsv');
    expect(result.headers).toEqual(['SKU', 'Qty']);
    expect(result.rows).toEqual([
      ['TS-1', '42'],
      ['TS-2', '17'],
    ]);
  });

  it('auto-detects TSV without an explicit format', () => {
    const result = parseTable('a\tb\n1\t2', {
      format: 'auto',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.format).toBe('tsv');
  });
});

describe('parseTable — JSON', () => {
  it('handles a JSON array of objects', () => {
    const result = parseTable(
      JSON.stringify([
        { name: 'Ada', role: 'Engineer' },
        { name: 'Grace', role: 'Admiral' },
      ]),
      { format: 'json', hasHeaderRow: true, trimCells: true }
    );

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['name', 'role']);
    expect(result.rows).toEqual([
      ['Ada', 'Engineer'],
      ['Grace', 'Admiral'],
    ]);
  });

  it('takes the union of keys in first-seen order', () => {
    const result = parseTable(JSON.stringify([{ a: 1 }, { b: 2, a: 3 }, { c: 4 }]), {
      format: 'auto',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['a', 'b', 'c']);
    expect(result.rows).toEqual([
      ['1', '', ''],
      ['3', '2', ''],
      ['', '', '4'],
    ]);
  });

  it('stringifies nested values and booleans', () => {
    const result = parseTable(
      JSON.stringify([{ tags: ['x', 'y'], active: true, meta: { k: 1 }, missing: null }]),
      { format: 'json', hasHeaderRow: true, trimCells: true }
    );

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.rows[0]).toEqual(['["x","y"]', 'true', '{"k":1}', '']);
  });

  it('treats a JSON array of arrays as rows using the first as header', () => {
    const result = parseTable(
      JSON.stringify([
        ['Name', 'Score'],
        ['Ada', 99],
      ]),
      { format: 'json', hasHeaderRow: true, trimCells: true }
    );

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['Name', 'Score']);
    expect(result.rows).toEqual([['Ada', '99']]);
  });

  it('handles a plain object as a single record', () => {
    const result = jsonToTable({ a: 1, b: 'two' });
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows).toEqual([['1', 'two']]);
  });

  it('handles an empty array', () => {
    expect(parseTable('[]', { format: 'json', hasHeaderRow: true, trimCells: true })).toEqual({
      status: 'empty',
    });
  });

  it('reports invalid JSON with the parser message and a hint', () => {
    const result = parseTable('{"a":', {
      format: 'json',
      hasHeaderRow: true,
      trimCells: true,
    });

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.error).toMatch(/Invalid JSON/);
    expect(result.hint).toContain('array of objects');
  });

  it('does not silently accept a bare primitive as a table', () => {
    const result = parseTable('42', { format: 'json', hasHeaderRow: true, trimCells: true });
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.headers).toEqual(['Column 1']);
  });
});

describe('stringifyCell', () => {
  it('renders each JSON leaf sensibly', () => {
    expect(stringifyCell(null)).toBe('');
    expect(stringifyCell(undefined)).toBe('');
    expect(stringifyCell('text')).toBe('text');
    expect(stringifyCell(0)).toBe('0');
    expect(stringifyCell(false)).toBe('false');
    expect(stringifyCell([1, 2])).toBe('[1,2]');
  });
});

describe('hasTable', () => {
  it('is true only for valid results with headers', () => {
    const valid = parseTable('a,b\n1,2', {
      format: 'csv',
      hasHeaderRow: true,
      trimCells: true,
    });
    expect(hasTable(valid)).toBe(true);
    expect(hasTable({ status: 'empty' })).toBe(false);
  });
});
