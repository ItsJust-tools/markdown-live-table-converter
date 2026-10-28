import { describe, it, expect } from 'vitest';
import { createMockToolState } from '@itsjust/core/testing';
import {
  clearColumnAlignments,
  initialMarkdownTableState,
  isAlignment,
  isMarkdownTableState,
  markdownTableTool,
  normalizeMarkdownTableState,
  resetFormatting,
  withClearedInput,
  withColumnAlignment,
  withOption,
  withSample,
} from '@/tool/tool-definition';
import { MAX_INPUT_LENGTH, MAX_PADDING } from '@/tool/types';
import type { MarkdownTableState } from '@/tool/types';

function state(overrides: Partial<MarkdownTableState> = {}): MarkdownTableState {
  return { ...initialMarkdownTableState, ...overrides };
}

describe('Markdown table state transitions', () => {
  it('initializes with sensible defaults', () => {
    expect(initialMarkdownTableState.input.length).toBeGreaterThan(0);
    expect(initialMarkdownTableState.format).toBe('auto');
    expect(initialMarkdownTableState.hasHeaderRow).toBe(true);
    expect(initialMarkdownTableState.alignment).toBe('left');
    expect(initialMarkdownTableState.columnAlignments).toEqual([]);
    expect(initialMarkdownTableState.padding).toBe(1);
    expect(initialMarkdownTableState.alignColumns).toBe(true);
    expect(initialMarkdownTableState.viewMode).toBe('split');
    expect(initialMarkdownTableState.sortColumn).toBeNull();
    expect(initialMarkdownTableState.sortDirection).toBeNull();
    expect(initialMarkdownTableState.sampleId).toBe('people-csv');
  });

  it('updates input immutably', () => {
    const mock = createMockToolState(state());
    mock.setData((prev) => ({ ...prev, input: 'a,b\n1,2' }));

    expect(mock.data.input).toBe('a,b\n1,2');
    expect(initialMarkdownTableState.input).not.toBe('a,b\n1,2');
  });

  it('supports undo/redo across formatting toggles', () => {
    const mock = createMockToolState(state());

    mock.setData((prev) => withOption(prev, 'alignment', 'center'));
    expect(mock.data.alignment).toBe('center');
    expect(mock.canUndo).toBe(true);

    mock.undo();
    expect(mock.data.alignment).toBe('left');
    expect(mock.canRedo).toBe(true);

    mock.redo();
    expect(mock.data.alignment).toBe('center');
  });

  it('supports undo/redo across sort changes', () => {
    const mock = createMockToolState(state());

    mock.setData((prev) => ({ ...prev, sortColumn: 1, sortDirection: 'asc' }));
    expect(mock.data.sortColumn).toBe(1);

    mock.undo();
    expect(mock.data.sortColumn).toBeNull();
  });

  it('switches view modes', () => {
    const mock = createMockToolState(state());
    mock.setData((prev) => withOption(prev, 'viewMode', 'preview'));
    expect(mock.data.viewMode).toBe('preview');
    mock.setData((prev) => withOption(prev, 'viewMode', 'markdown'));
    expect(mock.data.viewMode).toBe('markdown');
  });
});

describe('withColumnAlignment', () => {
  it('adds an override at the requested index', () => {
    const next = withColumnAlignment(state(), 1, 'right');
    expect(next.columnAlignments[1]).toBe('right');
    expect(next.columnAlignments[0]).toBeUndefined();
  });

  it('replaces an existing override', () => {
    const first = withColumnAlignment(state(), 0, 'right');
    const second = withColumnAlignment(first, 0, 'center');
    expect(second.columnAlignments[0]).toBe('center');
  });

  it('removes an override when passed null', () => {
    const withOverride = withColumnAlignment(state(), 0, 'right');
    const cleared = withColumnAlignment(withOverride, 0, null);
    expect(cleared.columnAlignments[0]).toBeUndefined();
  });

  it('does not mutate the original state', () => {
    const original = state();
    withColumnAlignment(original, 0, 'right');
    expect(original.columnAlignments).toEqual([]);
  });

  it('clears every override at once', () => {
    const many = withColumnAlignment(withColumnAlignment(state(), 0, 'left'), 2, 'right');
    expect(clearColumnAlignments(many).columnAlignments).toEqual([]);
  });
});

describe('withOption', () => {
  it('sets a single key without touching others', () => {
    const next = withOption(state(), 'padding', 3);
    expect(next.padding).toBe(3);
    expect(next.alignment).toBe(initialMarkdownTableState.alignment);
  });

  it('toggles booleans', () => {
    const next = withOption(state(), 'alignColumns', false);
    expect(next.alignColumns).toBe(false);
  });
});

describe('withSample', () => {
  it('loads a preset and resets the sort', () => {
    const next = withSample(state({ sortColumn: 1, sortDirection: 'desc' }), 'inventory-tsv');

    expect(next.sampleId).toBe('inventory-tsv');
    expect(next.format).toBe('tsv');
    expect(next.input).toContain('SKU');
    expect(next.sortColumn).toBeNull();
    expect(next.sortDirection).toBeNull();
  });

  it('ignores an unknown preset id', () => {
    const original = state();
    expect(withSample(original, 'missing')).toBe(original);
  });
});

describe('withClearedInput', () => {
  it('empties the payload while keeping formatting options', () => {
    const next = withClearedInput(state({ padding: 3, alignment: 'right' }));

    expect(next.input).toBe('');
    expect(next.sampleId).toBeNull();
    expect(next.padding).toBe(3);
    expect(next.alignment).toBe('right');
    expect(next.sortColumn).toBeNull();
  });
});

describe('resetFormatting', () => {
  it('restores formatting defaults and keeps the input', () => {
    const dirty = state({
      input: 'a,b\n1,2',
      padding: 4,
      alignment: 'right',
      columnAlignments: ['center'],
      alignColumns: false,
      uppercaseHeaders: true,
      includeHeader: false,
    });

    const next = resetFormatting(dirty);

    expect(next.input).toBe('a,b\n1,2');
    expect(next.padding).toBe(initialMarkdownTableState.padding);
    expect(next.alignment).toBe('left');
    expect(next.columnAlignments).toEqual([]);
    expect(next.alignColumns).toBe(true);
    expect(next.uppercaseHeaders).toBe(false);
    expect(next.includeHeader).toBe(true);
  });
});

describe('isAlignment', () => {
  it('accepts only supported values', () => {
    expect(isAlignment('left')).toBe(true);
    expect(isAlignment('center')).toBe(true);
    expect(isAlignment('right')).toBe(true);
    expect(isAlignment('justify')).toBe(false);
    expect(isAlignment(1)).toBe(false);
    expect(isAlignment(null)).toBe(false);
  });
});

describe('normalizeMarkdownTableState', () => {
  it('returns defaults for a non-object payload', () => {
    expect(normalizeMarkdownTableState(null)).toEqual(initialMarkdownTableState);
    expect(normalizeMarkdownTableState('nope')).toEqual(initialMarkdownTableState);
    expect(normalizeMarkdownTableState([])).toEqual(initialMarkdownTableState);
  });

  it('keeps a valid payload intact', () => {
    const valid = state({ input: 'a,b', padding: 2, alignment: 'center' });
    expect(normalizeMarkdownTableState(valid)).toEqual(valid);
  });

  it('clamps padding and rejects non-numeric values', () => {
    expect(normalizeMarkdownTableState({ input: '', padding: 99 }).padding).toBe(MAX_PADDING);
    expect(normalizeMarkdownTableState({ input: '', padding: -4 }).padding).toBe(0);
    expect(normalizeMarkdownTableState({ input: '', padding: 'two' }).padding).toBe(
      initialMarkdownTableState.padding
    );
  });

  it('truncates oversized input', () => {
    const huge = 'a'.repeat(MAX_INPUT_LENGTH + 500);
    expect(normalizeMarkdownTableState({ input: huge }).input).toHaveLength(MAX_INPUT_LENGTH);
  });

  it('drops an unknown alignment in favour of the default', () => {
    expect(normalizeMarkdownTableState({ input: '', alignment: 'justify' }).alignment).toBe('left');
  });

  it('keeps only the first MAX_COLUMNS alignment overrides', () => {
    const overrides = Array.from({ length: 80 }, () => 'right');
    const next = normalizeMarkdownTableState({ input: '', columnAlignments: overrides });
    expect(next.columnAlignments.length).toBe(50);
  });

  it('drops invalid alignment entries but keeps valid neighbours', () => {
    const next = normalizeMarkdownTableState({
      input: '',
      columnAlignments: ['right', 'bogus', 'center'],
    });
    expect(next.columnAlignments[0]).toBe('right');
    expect(next.columnAlignments[1]).toBe('left');
    expect(next.columnAlignments[2]).toBe('center');
  });

  it('clears the direction when no sort column survives', () => {
    const next = normalizeMarkdownTableState({ input: '', sortColumn: -1, sortDirection: 'asc' });
    expect(next.sortColumn).toBeNull();
    expect(next.sortDirection).toBeNull();
  });

  it('keeps a valid sort pair', () => {
    const next = normalizeMarkdownTableState({ input: '', sortColumn: 2, sortDirection: 'desc' });
    expect(next.sortColumn).toBe(2);
    expect(next.sortDirection).toBe('desc');
  });

  it('rejects an out-of-range sort column', () => {
    const next = normalizeMarkdownTableState({ input: '', sortColumn: 500, sortDirection: 'asc' });
    expect(next.sortColumn).toBeNull();
  });

  it('falls back for unknown enum values', () => {
    const next = normalizeMarkdownTableState({
      input: '',
      format: 'xml',
      viewMode: 'grid',
    });
    expect(next.format).toBe('auto');
    expect(next.viewMode).toBe('split');
  });

  it('coerces non-boolean flags to their defaults', () => {
    const next = normalizeMarkdownTableState({ input: '', alignColumns: 'yes', trimCells: 0 });
    expect(next.alignColumns).toBe(true);
    expect(next.trimCells).toBe(true);
  });
});

describe('serialize / deserialize', () => {
  it('round-trips a state through JSON', () => {
    const original = state({
      input: 'a,b\n1,2',
      padding: 3,
      alignment: 'right',
      columnAlignments: ['center'],
      sortColumn: 0,
      sortDirection: 'desc',
      viewMode: 'preview',
    });

    const json = markdownTableTool.serialize(original);
    const deserialized = markdownTableTool.deserialize(JSON.parse(json));

    expect(deserialized.success).toBe(true);
    if (!deserialized.success) return;
    expect(deserialized.data.input).toBe(original.input);
    expect(deserialized.data.padding).toBe(3);
    expect(deserialized.data.alignment).toBe('right');
    expect(deserialized.data.columnAlignments[0]).toBe('center');
    expect(deserialized.data.sortColumn).toBe(0);
    expect(deserialized.data.sortDirection).toBe('desc');
    expect(deserialized.data.viewMode).toBe('preview');
  });

  it('serializes to pretty JSON with the expected keys', () => {
    const json = markdownTableTool.serialize(state({ input: 'x' }));
    expect(json).toContain('"input": "x"');
    expect(json).toContain('"columnAlignments"');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('rejects null data', () => {
    const result = markdownTableTool.deserialize(null);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Invalid data');
  });

  it('rejects a non-object payload', () => {
    expect(markdownTableTool.deserialize('string').success).toBe(false);
    expect(markdownTableTool.deserialize(42).success).toBe(false);
  });

  it('rejects an object without a string input', () => {
    expect(markdownTableTool.deserialize({ padding: 2 }).success).toBe(false);
    expect(markdownTableTool.deserialize({ input: 123 }).success).toBe(false);
  });

  it('accepts a minimal payload and fills in defaults', () => {
    const result = markdownTableTool.deserialize({ input: 'a,b\n1,2' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.padding).toBe(initialMarkdownTableState.padding);
    expect(result.data.alignment).toBe('left');
    expect(result.data.viewMode).toBe('split');
  });

  it('survives a payload with a sparse columnAlignments array', () => {
    const result = markdownTableTool.deserialize({
      input: 'a,b',
      // JSON.stringify turns array holes into nulls.
      columnAlignments: [null, 'right'],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.columnAlignments[1]).toBe('right');
  });
});

describe('isMarkdownTableState', () => {
  it('requires an input string', () => {
    expect(isMarkdownTableState({ input: '' })).toBe(true);
    expect(isMarkdownTableState({})).toBe(false);
    expect(isMarkdownTableState([])).toBe(false);
    expect(isMarkdownTableState(null)).toBe(false);
  });
});

describe('tool definition contract', () => {
  it('exposes the config identity', () => {
    expect(markdownTableTool.id).toBe('markdown-table-converter');
    expect(markdownTableTool.name).toBe('Markdown Live Table Converter');
    expect(markdownTableTool.version).toBe('1.0.0');
  });

  it('registers the canvas exporters', async () => {
    const exporters = markdownTableTool.exporters ?? [];
    expect(exporters.map((entry) => entry.format)).toEqual(['png', 'jpeg', 'webp', 'pdf']);

    const png = exporters[0];
    expect(png).toBeDefined();
    if (!png) return;
    const loaded = await png.loader();
    const resolved = 'default' in loaded ? loaded.default : loaded.exporter;
    expect(resolved.format).toBe('png');
  });
});
