'use client';

import {
  ALIGNMENTS,
  ALIGNMENT_LABELS,
  INPUT_FORMATS,
  INPUT_FORMAT_LABELS,
  VIEW_MODES,
  VIEW_MODE_LABELS,
  type Alignment,
  type InputFormat,
  type ViewMode,
} from '../types';

interface ToolToolbarProps {
  format: InputFormat;
  onFormatChange: (format: InputFormat) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  alignment: Alignment;
  onAlignmentChange: (alignment: Alignment) => void;
  canCopy: boolean;
  onCopy: () => void;
  onDownloadMarkdown: () => void;
  onDownloadHtml: () => void;
  onClear: () => void;
}

export function ToolToolbar({
  format,
  onFormatChange,
  viewMode,
  onViewModeChange,
  alignment,
  onAlignmentChange,
  canCopy,
  onCopy,
  onDownloadMarkdown,
  onDownloadHtml,
  onClear,
}: ToolToolbarProps) {
  return (
    <div className="mtc-toolbar">
      <div className="mtc-segmented" role="group" aria-label="Input format">
        {INPUT_FORMATS.map((value) => (
          <button
            key={value}
            type="button"
            className={`mtc-seg-btn ${format === value ? 'is-active' : ''}`}
            aria-pressed={format === value}
            onClick={() => onFormatChange(value)}
            title={`Parse input as ${INPUT_FORMAT_LABELS[value]}`}
          >
            {INPUT_FORMAT_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="mtc-segmented" role="group" aria-label="Canvas layout">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`mtc-seg-btn ${viewMode === mode ? 'is-active' : ''}`}
            aria-pressed={viewMode === mode}
            onClick={() => onViewModeChange(mode)}
            title={`${VIEW_MODE_LABELS[mode]} layout`}
            aria-label={`${VIEW_MODE_LABELS[mode]} layout`}
          >
            {VIEW_MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="mtc-segmented" role="group" aria-label="Default alignment">
        {ALIGNMENTS.map((value) => (
          <button
            key={value}
            type="button"
            className={`mtc-seg-btn ${alignment === value ? 'is-active' : ''}`}
            aria-pressed={alignment === value}
            onClick={() => onAlignmentChange(value)}
            title={`Align columns ${ALIGNMENT_LABELS[value].toLowerCase()}`}
            aria-label={`Align columns ${ALIGNMENT_LABELS[value].toLowerCase()}`}
          >
            {ALIGNMENT_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="mtc-toolbar-actions" role="group" aria-label="Output actions">
        <button
          type="button"
          className="mtc-btn mtc-btn-primary"
          onClick={onCopy}
          disabled={!canCopy}
          title="Copy the Markdown table (Ctrl+Shift+C)"
          aria-label="Copy Markdown table"
        >
          <span aria-hidden="true">⧉</span>
          <span className="mtc-btn-label">Copy</span>
        </button>
        <button
          type="button"
          className="mtc-btn"
          onClick={onDownloadMarkdown}
          disabled={!canCopy}
          title="Download the Markdown table as a .md file"
          aria-label="Download Markdown file"
        >
          <span aria-hidden="true">↓MD</span>
          <span className="mtc-btn-label">.md</span>
        </button>
        <button
          type="button"
          className="mtc-btn"
          onClick={onDownloadHtml}
          disabled={!canCopy}
          title="Download the HTML table snippet as a .html file"
          aria-label="Download HTML table snippet"
        >
          <span aria-hidden="true">↓HTML</span>
          <span className="mtc-btn-label">.html</span>
        </button>
        <button
          type="button"
          className="mtc-btn mtc-btn-danger"
          onClick={onClear}
          title="Clear the pasted data (Ctrl+Shift+X)"
          aria-label="Clear input"
        >
          <span aria-hidden="true">⌫</span>
          <span className="mtc-btn-label">Clear</span>
        </button>
      </div>
    </div>
  );
}

ToolToolbar.displayName = 'ToolToolbar';
