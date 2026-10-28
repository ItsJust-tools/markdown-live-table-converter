'use client';

import { useMemo } from 'react';
import {
  ALIGNMENTS,
  ALIGNMENT_LABELS,
  MAX_COLUMNS,
  MAX_PADDING,
  MIN_PADDING,
  type Alignment,
} from '../types';
import { SAMPLE_PRESETS } from '../lib/samples';

interface ToolSidebarProps {
  headers: string[];
  columnAlignments: Alignment[];
  defaultAlignment: Alignment;
  onColumnAlignmentChange: (column: number, alignment: Alignment | null) => void;
  onClearColumnAlignments: () => void;
  padding: number;
  onPaddingChange: (padding: number) => void;
  alignColumns: boolean;
  onAlignColumnsChange: (value: boolean) => void;
  escapePipes: boolean;
  onEscapePipesChange: (value: boolean) => void;
  flattenNewlines: boolean;
  onFlattenNewlinesChange: (value: boolean) => void;
  trimCells: boolean;
  onTrimCellsChange: (value: boolean) => void;
  uppercaseHeaders: boolean;
  onUppercaseHeadersChange: (value: boolean) => void;
  includeHeader: boolean;
  onIncludeHeaderChange: (value: boolean) => void;
  hasHeaderRow: boolean;
  onHasHeaderRowChange: (value: boolean) => void;
  sampleId: string | null;
  onLoadSample: (id: string) => void;
  overrideCount: number;
}

function Toggle({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint: string;
}) {
  return (
    <label className="mtc-switch" htmlFor={id} title={hint}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function ToolSidebar({
  headers,
  columnAlignments,
  defaultAlignment,
  onColumnAlignmentChange,
  onClearColumnAlignments,
  padding,
  onPaddingChange,
  alignColumns,
  onAlignColumnsChange,
  escapePipes,
  onEscapePipesChange,
  flattenNewlines,
  onFlattenNewlinesChange,
  trimCells,
  onTrimCellsChange,
  uppercaseHeaders,
  onUppercaseHeadersChange,
  includeHeader,
  onIncludeHeaderChange,
  hasHeaderRow,
  onHasHeaderRowChange,
  sampleId,
  onLoadSample,
  overrideCount,
}: ToolSidebarProps) {
  const columns = useMemo(
    () => headers.slice(0, MAX_COLUMNS).map((header, index) => ({ header, index })),
    [headers]
  );

  return (
    <div className="mtc-sidebar">
      <section className="mtc-side-section" aria-labelledby="mtc-presets-heading">
        <h3 id="mtc-presets-heading">Sample data</h3>
        <ul className="mtc-preset-list">
          {SAMPLE_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className="mtc-preset-btn"
                aria-pressed={sampleId === preset.id}
                onClick={() => onLoadSample(preset.id)}
                title={preset.description}
              >
                <span className="mtc-preset-name">{preset.label}</span>
                <span className="mtc-preset-desc">{preset.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mtc-side-section" aria-labelledby="mtc-format-heading">
        <h3 id="mtc-format-heading">Table options</h3>
        <Toggle
          id="mtc-header-row"
          label="First row is a header"
          checked={hasHeaderRow}
          onChange={onHasHeaderRowChange}
          hint="Use the first parsed record as column names"
        />
        <Toggle
          id="mtc-include-header"
          label="Emit header row"
          checked={includeHeader}
          onChange={onIncludeHeaderChange}
          hint="Include the header and delimiter rows in the Markdown output"
        />
        <Toggle
          id="mtc-uppercase"
          label="Uppercase headers"
          checked={uppercaseHeaders}
          onChange={onUppercaseHeadersChange}
          hint="Transform header text to upper case"
        />
      </section>

      <section className="mtc-side-section" aria-labelledby="mtc-padding-heading">
        <h3 id="mtc-padding-heading">Markdown formatting</h3>
        <label className="mtc-field-label" htmlFor="mtc-padding">
          Cell padding
        </label>
        <div className="mtc-padding-row">
          <input
            id="mtc-padding"
            className="mtc-input-number"
            type="number"
            min={MIN_PADDING}
            max={MAX_PADDING}
            step={1}
            value={padding}
            onChange={(event) => onPaddingChange(Number(event.target.value))}
            aria-label="Cell padding in spaces"
          />
          <span className="mtc-side-note">
            {padding === 0 ? 'Compact' : `${padding} space${padding === 1 ? '' : 's'}`}
          </span>
        </div>
        <Toggle
          id="mtc-align-columns"
          label="Pad columns to equal width"
          checked={alignColumns}
          onChange={onAlignColumnsChange}
          hint="Align the raw Markdown source so columns line up"
        />
        <Toggle
          id="mtc-escape-pipes"
          label="Escape pipes"
          checked={escapePipes}
          onChange={onEscapePipesChange}
          hint="Write literal | characters as \\| so the table stays valid"
        />
        <Toggle
          id="mtc-flatten-newlines"
          label="Flatten newlines to <br>"
          checked={flattenNewlines}
          onChange={onFlattenNewlinesChange}
          hint="Keep every record on a single Markdown line"
        />
        <Toggle
          id="mtc-trim-cells"
          label="Trim cell whitespace"
          checked={trimCells}
          onChange={onTrimCellsChange}
          hint="Strip leading and trailing spaces from each parsed value"
        />
      </section>

      <section className="mtc-side-section" aria-labelledby="mtc-align-heading">
        <h3 id="mtc-align-heading">
          Column alignment
          {overrideCount > 0 ? (
            <span className="mtc-count">
              {overrideCount} override{overrideCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </h3>
        {columns.length === 0 ? (
          <p className="mtc-side-note">Paste data to configure per-column alignment.</p>
        ) : (
          <ul className="mtc-column-list">
            {columns.map(({ header, index }) => {
              const id = `mtc-align-${index}`;
              const value = columnAlignments[index];
              return (
                <li key={`${header}-${index}`} className="mtc-column-row">
                  <label className="mtc-column-name" htmlFor={id} title={header}>
                    {header || `Column ${index + 1}`}
                  </label>
                  <select
                    id={id}
                    className="mtc-select"
                    value={value ?? ''}
                    onChange={(event) => {
                      const next = event.target.value;
                      onColumnAlignmentChange(index, next === '' ? null : (next as Alignment));
                    }}
                    aria-label={`Alignment for ${header || `column ${index + 1}`}`}
                  >
                    <option value="">Default ({ALIGNMENT_LABELS[defaultAlignment]})</option>
                    {ALIGNMENTS.map((alignment) => (
                      <option key={alignment} value={alignment}>
                        {ALIGNMENT_LABELS[alignment]}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
        {overrideCount > 0 ? (
          <button
            type="button"
            className="mtc-btn"
            onClick={onClearColumnAlignments}
            aria-label="Clear all column alignment overrides"
          >
            Reset all to default
          </button>
        ) : null}
      </section>
    </div>
  );
}

ToolSidebar.displayName = 'ToolSidebar';
