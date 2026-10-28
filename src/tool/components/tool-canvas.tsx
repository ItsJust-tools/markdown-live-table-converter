'use client';

import { useCallback, useMemo } from 'react';
import { MAX_PREVIEW_ROWS, RESOLVED_FORMAT_LABELS, type Alignment, type ViewMode } from '../types';
import type { DerivedTable } from '../lib/derive';
import { nextSort, nextSortLabel } from '../lib/sort';

interface ToolCanvasProps {
  value: string;
  onChange: (value: string) => void;
  derived: DerivedTable;
  viewMode: ViewMode;
  sortColumn: number | null;
  sortDirection: 'asc' | 'desc' | null;
  onSortColumn: (column: number) => void;
  alignments: Alignment[];
  readOnly?: boolean;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

const SORT_GLYPH = { asc: '▲', desc: '▼' } as const;

export function ToolCanvas({
  value,
  onChange,
  derived,
  viewMode,
  sortColumn,
  sortDirection,
  onSortColumn,
  alignments,
  readOnly = false,
  canvasRef,
}: ToolCanvasProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const { parsed, rows, headers } = derived;
  const visibleRows = useMemo(() => rows.slice(0, MAX_PREVIEW_ROWS), [rows]);

  const sortState = useMemo(
    () => ({ column: sortColumn, direction: sortDirection }),
    [sortColumn, sortDirection]
  );

  const showInput = viewMode === 'split';
  const showPreview = viewMode !== 'markdown';
  const showMarkdown = viewMode !== 'preview';

  const formatLabel = parsed.status === 'valid' ? RESOLVED_FORMAT_LABELS[parsed.format] : null;

  return (
    <div
      ref={canvasRef}
      className="mtc-canvas"
      role="application"
      aria-label="Markdown table converter canvas"
    >
      <div className="mtc-panes" data-view={viewMode}>
        {showInput ? (
          <section className="mtc-pane" aria-labelledby="mtc-input-heading">
            <div className="mtc-pane-head">
              <h2 className="mtc-pane-title" id="mtc-input-heading">
                Input
              </h2>
              <div className="mtc-pane-meta">
                {formatLabel ? <span className="mtc-chip">{formatLabel}</span> : null}
                <span>{value.length.toLocaleString()} chars</span>
              </div>
            </div>
            <textarea
              className="mtc-textarea"
              value={value}
              onChange={handleChange}
              readOnly={readOnly}
              spellCheck={false}
              aria-label="CSV, TSV, or JSON input"
              placeholder={'Paste CSV, TSV, or JSON here…\n\nname,role\nAda Lovelace,Engineer'}
            />
            {parsed.status === 'error' ? (
              <p className="mtc-error" role="alert">
                {parsed.error}
                {parsed.hint ? <span className="mtc-error-hint">{parsed.hint}</span> : null}
              </p>
            ) : null}
          </section>
        ) : null}

        {showPreview ? (
          <section className="mtc-pane" aria-labelledby="mtc-preview-heading">
            <div className="mtc-pane-head">
              <h2 className="mtc-pane-title" id="mtc-preview-heading">
                Preview
              </h2>
              <div className="mtc-pane-meta">
                {parsed.status === 'valid' ? (
                  <>
                    <span>
                      {headers.length} × {rows.length}
                    </span>
                    {rows.length > MAX_PREVIEW_ROWS || parsed.truncated ? (
                      <span className="mtc-chip mtc-chip-warn">
                        First {Math.min(rows.length, MAX_PREVIEW_ROWS).toLocaleString()} rows
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span>No data</span>
                )}
              </div>
            </div>
            {parsed.status === 'valid' && headers.length > 0 ? (
              <div className="mtc-table-scroll">
                <table className="mtc-table">
                  <thead>
                    <tr>
                      {headers.map((header, index) => {
                        const isSorted = sortColumn === index && sortDirection !== null;
                        return (
                          <th
                            key={`${header}-${index}`}
                            scope="col"
                            className={`mtc-align-${alignments[index] ?? 'left'}`}
                          >
                            <button
                              type="button"
                              className="mtc-sort-btn"
                              aria-pressed={isSorted}
                              aria-label={`${header || `Column ${index + 1}`}: ${nextSortLabel(
                                isSorted ? sortDirection : null
                              )}`}
                              onClick={() => onSortColumn(index)}
                            >
                              <span>{header || `Column ${index + 1}`}</span>
                              {isSorted ? (
                                <span className="mtc-sort-indicator" aria-hidden="true">
                                  {SORT_GLYPH[sortDirection]}
                                </span>
                              ) : null}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {headers.map((_header, columnIndex) => (
                          <td
                            key={columnIndex}
                            className={`mtc-align-${alignments[columnIndex] ?? 'left'}`}
                            title={row[columnIndex] ?? ''}
                          >
                            {row[columnIndex] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 ? (
                  <p className="mtc-empty">No data rows yet — the header row is parsed.</p>
                ) : null}
                {rows.length > MAX_PREVIEW_ROWS ? (
                  <p className="mtc-empty">
                    Preview limited to the first {MAX_PREVIEW_ROWS.toLocaleString()} rows. The
                    Markdown output includes every row.
                  </p>
                ) : null}
              </div>
            ) : parsed.status === 'error' ? (
              <p className="mtc-empty">Fix the input error to see the preview.</p>
            ) : (
              <p className="mtc-empty">
                Paste CSV, TSV, or JSON on the left, or load a sample preset from the sidebar.
              </p>
            )}
          </section>
        ) : null}

        {showMarkdown ? (
          <section className="mtc-pane mtc-pane-output" aria-labelledby="mtc-markdown-heading">
            <div className="mtc-pane-head">
              <h2 className="mtc-pane-title" id="mtc-markdown-heading">
                Markdown
              </h2>
              <div className="mtc-pane-meta">
                <span>{derived.markdown.markdown.length.toLocaleString()} chars</span>
              </div>
            </div>
            <div className="mtc-markdown-wrap">
              {derived.markdown.markdown ? (
                <pre className="mtc-markdown" aria-label="Generated Markdown table">
                  <code>{derived.markdown.markdown}</code>
                </pre>
              ) : (
                <p className="mtc-empty mtc-markdown-empty">Markdown output appears here.</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

ToolCanvas.displayName = 'ToolCanvas';

/** Re-exported so tests can assert the same transition logic the UI uses. */
export { nextSort };
