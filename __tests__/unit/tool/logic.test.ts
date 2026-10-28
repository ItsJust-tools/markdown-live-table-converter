import { describe, it, expect, vi } from 'vitest';
import { compareCells, nextSort, nextSortLabel, sortRows } from '@/tool/lib/sort';
import { deriveTable } from '@/tool/lib/derive';
import {
  downloadFilename,
  downloadHtml,
  downloadMarkdown,
  downloadTextFile,
  toolSlug,
} from '@/tool/lib/download';
import { DEFAULT_SAMPLE_ID, SAMPLE_PRESETS, getPreset } from '@/tool/lib/samples';
import { initialMarkdownTableState } from '@/tool/tool-definition';
import type { MarkdownTableState } from '@/tool/types';

function state(overrides: Partial<MarkdownTableState> = {}): MarkdownTableState {
  return { ...initialMarkdownTableState, ...overrides };
}

describe('compareCells', () => {
  it('compares numeric strings numerically', () => {
    expect(compareCells('9', '10')).toBeLessThan(0);
    expect(compareCells('10', '9')).toBeGreaterThan(0);
    expect(compareCells('5', '5')).toBe(0);
  });

  it('compares text case-insensitively', () => {
    expect(compareCells('apple', 'Banana')).toBeLessThan(0);
  });

  it('sorts empty cells last', () => {
    expect(compareCells('', 'a')).toBeGreaterThan(0);
    expect(compareCells('a', '')).toBeLessThan(0);
  });
});

describe('sortRows', () => {
  const rows = [
    ['Grace', '398'],
    ['Ada', '412'],
    ['Alan', '377'],
  ];

  it('returns the same array when unsorted', () => {
    expect(sortRows(rows, null, null)).toBe(rows);
    expect(sortRows(rows, 0, null)).toBe(rows);
  });

  it('sorts ascending without mutating the input', () => {
    const sorted = sortRows(rows, 0, 'asc');
    expect(sorted.map((row) => row[0])).toEqual(['Ada', 'Alan', 'Grace']);
    expect(rows[0]?.[0]).toBe('Grace');
  });

  it('sorts descending', () => {
    const sorted = sortRows(rows, 1, 'desc');
    expect(sorted.map((row) => row[1])).toEqual(['412', '398', '377']);
  });

  it('keeps empty cells at the bottom in descending order', () => {
    const withEmpty = [
      ['b', '2'],
      ['a', ''],
      ['c', '9'],
    ];
    const sorted = sortRows(withEmpty, 1, 'desc');
    expect(sorted[sorted.length - 1]?.[1]).toBe('');
  });
});

describe('nextSort', () => {
  it('cycles asc → desc → off for the same column', () => {
    const first = nextSort({ column: null, direction: null }, 2);
    expect(first).toEqual({ column: 2, direction: 'asc' });

    const second = nextSort(first, 2);
    expect(second).toEqual({ column: 2, direction: 'desc' });

    const third = nextSort(second, 2);
    expect(third).toEqual({ column: null, direction: null });
  });

  it('restarts at ascending when a different column is clicked', () => {
    expect(nextSort({ column: 0, direction: 'desc' }, 1)).toEqual({ column: 1, direction: 'asc' });
  });

  it('describes the next action', () => {
    expect(nextSortLabel(null)).toBe('Sort ascending');
    expect(nextSortLabel('asc')).toBe('Sort descending');
    expect(nextSortLabel('desc')).toBe('Clear sort');
  });
});

describe('deriveTable', () => {
  it('derives preview rows, Markdown, and HTML from one state', () => {
    const derived = deriveTable(
      state({ input: 'a,b\n1,2', format: 'csv', padding: 0, alignColumns: false })
    );

    expect(derived.headers).toEqual(['a', 'b']);
    expect(derived.rows).toEqual([['1', '2']]);
    expect(derived.markdown.markdown).toBe('|a|b|\n|:---|:---|\n|1|2|');
    expect(derived.html).toContain('<table>');
    expect(derived.cellCount).toBe(2);
  });

  it('applies preview sorting to both the preview and the Markdown', () => {
    const derived = deriveTable(
      state({
        input: 'n\n3\n1\n2',
        format: 'csv',
        padding: 0,
        alignColumns: false,
        sortColumn: 0,
        sortDirection: 'asc',
      })
    );

    expect(derived.rows.map((row) => row[0])).toEqual(['1', '2', '3']);
    expect(derived.markdown.markdown.split('\n').slice(2)).toEqual(['|1|', '|2|', '|3|']);
  });

  it('reports parse errors without throwing', () => {
    const derived = deriveTable(state({ input: '{bad json', format: 'json' }));
    expect(derived.parsed.status).toBe('error');
    expect(derived.markdown.markdown).toBe('');
    expect(derived.html).toBe('');
  });

  it('flags a header-only table', () => {
    const derived = deriveTable(state({ input: 'a,b', format: 'csv' }));
    expect(derived.isEmptyTable).toBe(true);
    expect(derived.markdown.markdown).toContain('a');
    expect(derived.rows).toEqual([]);
  });

  it('uses the initial sample so the first render is never blank', () => {
    const derived = deriveTable(initialMarkdownTableState);
    expect(derived.parsed.status).toBe('valid');
    expect(derived.markdown.markdown.length).toBeGreaterThan(0);
  });
});

describe('samples', () => {
  it('exposes unique preset ids with parseable data', () => {
    const ids = SAMPLE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of SAMPLE_PRESETS) {
      expect(preset.data.trim().length).toBeGreaterThan(0);
    }
  });

  it('resolves the default preset', () => {
    expect(getPreset(DEFAULT_SAMPLE_ID)?.id).toBe(DEFAULT_SAMPLE_ID);
    expect(getPreset(null)).toBeUndefined();
    expect(getPreset('nope')).toBeUndefined();
  });
});

describe('download helpers', () => {
  it('builds a readable slug and filenames', () => {
    expect(toolSlug()).toBe('markdown-live-table-converter');
    expect(downloadFilename('markdown')).toBe('markdown-live-table-converter.md');
    expect(downloadFilename('html')).toBe('markdown-live-table-converter.html');
  });

  it('triggers a blob download and revokes the URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    try {
      downloadTextFile('t.md', '# hi', 'text/markdown');

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      anchorClick.mockRestore();
      vi.useRealTimers();
    }
  });

  it('downloads Markdown with the text/markdown MIME type', () => {
    const types: string[] = [];
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob: Blob | MediaSource) => {
        if (blob instanceof Blob) types.push(blob.type);
        return 'blob:md';
      });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    try {
      downloadMarkdown('|a|');
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(types[0]).toContain('text/markdown');
    } finally {
      createObjectURL.mockRestore();
      anchorClick.mockRestore();
    }
  });

  it('wraps the HTML snippet in a document', () => {
    const types: string[] = [];
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob: Blob | MediaSource) => {
        if (blob instanceof Blob) types.push(blob.type);
        return 'blob:html';
      });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    try {
      downloadHtml('<table></table>');
      expect(types[0]).toContain('text/html');
      expect(anchorClick).toHaveBeenCalledTimes(1);
    } finally {
      createObjectURL.mockRestore();
      anchorClick.mockRestore();
    }
  });
});
