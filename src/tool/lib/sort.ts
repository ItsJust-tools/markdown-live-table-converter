import type { SortDirection } from '../types';

/** Compare two cell strings as numbers when both look numeric, else textually. */
export function compareCells(a: string, b: string): number {
  const numA = Number(a);
  const numB = Number(b);
  const aNumeric = a.trim() !== '' && Number.isFinite(numA);
  const bNumeric = b.trim() !== '' && Number.isFinite(numB);

  if (aNumeric && bNumeric) return numA - numB;

  // Empty cells always sort last regardless of direction handling by callers.
  if (a.trim() === '' && b.trim() === '') return 0;
  if (a.trim() === '') return 1;
  if (b.trim() === '') return -1;

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sort rows by one column without mutating the input.
 *
 * Returns the original array reference when no sort is active so React can
 * skip re-rendering unchanged data.
 */
export function sortRows(
  rows: string[][],
  column: number | null,
  direction: SortDirection
): string[][] {
  if (column === null || direction === null) return rows;

  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((rowA, rowB) => {
    const result = compareCells(rowA[column] ?? '', rowB[column] ?? '');
    // Keep empty cells at the bottom for descending order too.
    const aEmpty = (rowA[column] ?? '').trim() === '';
    const bEmpty = (rowB[column] ?? '').trim() === '';
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;
    return result * factor;
  });
}

/**
 * Advance a column header click through asc → desc → off for the same column,
 * and reset to ascending when a different column is clicked.
 */
export function nextSort(
  current: { column: number | null; direction: SortDirection },
  clicked: number
): { column: number | null; direction: SortDirection } {
  if (current.column !== clicked) return { column: clicked, direction: 'asc' };
  if (current.direction === 'asc') return { column: clicked, direction: 'desc' };
  return { column: null, direction: null };
}

/** Accessible label describing what the next header click will do. */
export function nextSortLabel(currentDirection: SortDirection): string {
  if (currentDirection === 'asc') return 'Sort descending';
  if (currentDirection === 'desc') return 'Clear sort';
  return 'Sort ascending';
}
