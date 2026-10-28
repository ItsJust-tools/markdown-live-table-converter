import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import { DEFAULT_SAMPLE_ID, getPreset } from './lib/samples';
import {
  ALIGNMENTS,
  INPUT_FORMATS,
  MAX_COLUMNS,
  MAX_INPUT_LENGTH,
  MAX_PADDING,
  VIEW_MODES,
  type Alignment,
  type InputFormat,
  type MarkdownTableState,
  type SortDirection,
  type ViewMode,
} from './types';

const DEFAULT_SAMPLE = getPreset(DEFAULT_SAMPLE_ID);

/** State shown on first load: the CSV sample so the preview is never blank. */
export const initialMarkdownTableState: MarkdownTableState = {
  input: DEFAULT_SAMPLE?.data ?? '',
  format: 'auto',
  hasHeaderRow: true,
  alignment: 'left',
  columnAlignments: [],
  padding: 1,
  alignColumns: true,
  escapePipes: true,
  flattenNewlines: true,
  trimCells: true,
  uppercaseHeaders: false,
  includeHeader: true,
  sortColumn: null,
  sortDirection: null,
  viewMode: 'split',
  sampleId: DEFAULT_SAMPLE_ID,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAlignment(value: unknown, fallback: Alignment): Alignment {
  return typeof value === 'string' && (ALIGNMENTS as string[]).includes(value)
    ? (value as Alignment)
    : fallback;
}

function normalizeColumnAlignments(value: unknown, columnCount: number): Alignment[] {
  if (!Array.isArray(value)) return [];
  const limit = Math.min(columnCount, MAX_COLUMNS);
  const result: Alignment[] = [];
  for (let index = 0; index < limit; index += 1) {
    const entry = value[index];
    if (entry === undefined || entry === null) continue;
    const alignment = normalizeAlignment(entry, 'left');
    // Store the index explicitly so sparse overrides survive JSON round trips.
    result[index] = alignment;
  }
  return result;
}

function normalizeSortDirection(value: unknown): SortDirection {
  return value === 'asc' || value === 'desc' ? value : null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeInputFormat(value: unknown): InputFormat {
  return typeof value === 'string' && (INPUT_FORMATS as string[]).includes(value)
    ? (value as InputFormat)
    : 'auto';
}

function normalizeViewMode(value: unknown): ViewMode {
  return typeof value === 'string' && (VIEW_MODES as string[]).includes(value)
    ? (value as ViewMode)
    : 'split';
}

function normalizePadding(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return initialMarkdownTableState.padding;
  return Math.min(MAX_PADDING, Math.max(0, Math.trunc(value)));
}

/**
 * Coerce any candidate state into a valid {@link MarkdownTableState}.
 *
 * Every field is validated independently so a partially corrupt payload still
 * restores as much of the user's work as possible instead of failing wholesale.
 */
export function normalizeMarkdownTableState(value: unknown): MarkdownTableState {
  if (!isRecord(value)) return { ...initialMarkdownTableState };

  const input =
    typeof value.input === 'string'
      ? value.input.slice(0, MAX_INPUT_LENGTH)
      : initialMarkdownTableState.input;

  const sortDirection = normalizeSortDirection(value.sortDirection);
  const rawSortColumn = value.sortColumn;
  const sortColumn =
    sortDirection === null
      ? null
      : typeof rawSortColumn === 'number' &&
          Number.isInteger(rawSortColumn) &&
          rawSortColumn >= 0 &&
          rawSortColumn < MAX_COLUMNS
        ? rawSortColumn
        : null;

  const sampleId = typeof value.sampleId === 'string' ? value.sampleId : null;

  return {
    input,
    format: normalizeInputFormat(value.format),
    hasHeaderRow: normalizeBoolean(value.hasHeaderRow, initialMarkdownTableState.hasHeaderRow),
    alignment: normalizeAlignment(value.alignment, initialMarkdownTableState.alignment),
    columnAlignments: normalizeColumnAlignments(value.columnAlignments, MAX_COLUMNS),
    padding: normalizePadding(value.padding),
    alignColumns: normalizeBoolean(value.alignColumns, initialMarkdownTableState.alignColumns),
    escapePipes: normalizeBoolean(value.escapePipes, initialMarkdownTableState.escapePipes),
    flattenNewlines: normalizeBoolean(
      value.flattenNewlines,
      initialMarkdownTableState.flattenNewlines
    ),
    trimCells: normalizeBoolean(value.trimCells, initialMarkdownTableState.trimCells),
    uppercaseHeaders: normalizeBoolean(
      value.uppercaseHeaders,
      initialMarkdownTableState.uppercaseHeaders
    ),
    includeHeader: normalizeBoolean(value.includeHeader, initialMarkdownTableState.includeHeader),
    sortColumn,
    sortDirection: sortColumn === null ? null : sortDirection,
    viewMode: normalizeViewMode(value.viewMode),
    sampleId,
  };
}

/** True when a candidate matches the serializable state contract. */
export function isMarkdownTableState(value: unknown): value is MarkdownTableState {
  if (!isRecord(value)) return false;
  if (typeof value.input !== 'string') return false;
  return true;
}

/** Apply a column alignment override, keeping the array dense. */
export function withColumnAlignment(
  state: MarkdownTableState,
  column: number,
  alignment: Alignment | null
): MarkdownTableState {
  const next = [...state.columnAlignments];
  if (alignment === null) {
    delete next[column];
  } else {
    next[column] = alignment;
  }
  // `delete` leaves holes; JSON.stringify turns those into null, which
  // normalizeColumnAlignments already treats as "no override".
  return { ...state, columnAlignments: next };
}

/** Reset every alignment override back to the table default. */
export function clearColumnAlignments(state: MarkdownTableState): MarkdownTableState {
  return { ...state, columnAlignments: [] };
}

/** Apply a boolean/text option change immutably. */
export function withOption<K extends keyof MarkdownTableState>(
  state: MarkdownTableState,
  key: K,
  value: MarkdownTableState[K]
): MarkdownTableState {
  return { ...state, [key]: value };
}

/** Load a sample preset into the state. */
export function withSample(state: MarkdownTableState, presetId: string): MarkdownTableState {
  const preset = getPreset(presetId);
  if (!preset) return state;
  return {
    ...state,
    input: preset.data,
    format: preset.format,
    hasHeaderRow: preset.hasHeaderRow,
    sampleId: preset.id,
    sortColumn: null,
    sortDirection: null,
  };
}

/** Clear the pasted payload while keeping the formatting options. */
export function withClearedInput(state: MarkdownTableState): MarkdownTableState {
  return { ...state, input: '', sampleId: null, sortColumn: null, sortDirection: null };
}

/** Reset formatting options to their defaults, keeping the input. */
export function resetFormatting(state: MarkdownTableState): MarkdownTableState {
  return {
    ...state,
    alignment: initialMarkdownTableState.alignment,
    columnAlignments: [],
    padding: initialMarkdownTableState.padding,
    alignColumns: initialMarkdownTableState.alignColumns,
    escapePipes: initialMarkdownTableState.escapePipes,
    flattenNewlines: initialMarkdownTableState.flattenNewlines,
    uppercaseHeaders: initialMarkdownTableState.uppercaseHeaders,
    includeHeader: initialMarkdownTableState.includeHeader,
  };
}

/** Restrict an arbitrary alignment value; used by UI handlers. */
export function isAlignment(value: unknown): value is Alignment {
  return typeof value === 'string' && (ALIGNMENTS as string[]).includes(value);
}

/**
 * Markdown Live Table Converter tool definition for the ItsJust platform.
 * Handles state serialization/deserialization with per-field validation.
 */
export const markdownTableTool: Tool<MarkdownTableState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: initialMarkdownTableState,
  serialize: (state) => JSON.stringify(normalizeMarkdownTableState(state), null, 2),
  deserialize: (data) => {
    if (!isMarkdownTableState(data)) {
      return {
        success: false,
        error:
          'Invalid data format: expected { input: string, format?: "auto" | "csv" | "tsv" | "json", alignment?: "left" | "center" | "right", ... }',
      };
    }
    return { success: true, data: normalizeMarkdownTableState(data) };
  },
  // Markdown and HTML download through dedicated toolbar actions; the canvas
  // exporters here snapshot the rendered table as an image or PDF.
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
