import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolToolbar } from '@/tool/components/tool-toolbar';
import { ToolSidebar } from '@/tool/components/tool-sidebar';
import { ToolCanvas } from '@/tool/components/tool-canvas';
import { deriveTable } from '@/tool/lib/derive';
import { initialMarkdownTableState } from '@/tool/tool-definition';
import type { Alignment, MarkdownTableState } from '@/tool/types';

function state(overrides: Partial<MarkdownTableState> = {}): MarkdownTableState {
  return { ...initialMarkdownTableState, ...overrides };
}

function renderToolbar(overrides: Partial<Parameters<typeof ToolToolbar>[0]> = {}) {
  const props = {
    format: 'auto' as const,
    onFormatChange: vi.fn(),
    viewMode: 'split' as const,
    onViewModeChange: vi.fn(),
    alignment: 'left' as Alignment,
    onAlignmentChange: vi.fn(),
    canCopy: true,
    onCopy: vi.fn(),
    onDownloadMarkdown: vi.fn(),
    onDownloadHtml: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<ToolToolbar {...props} />);
  return props;
}

function renderSidebar(overrides: Partial<Parameters<typeof ToolSidebar>[0]> = {}) {
  const props = {
    headers: ['Name', 'Role'],
    columnAlignments: [] as Alignment[],
    defaultAlignment: 'left' as Alignment,
    onColumnAlignmentChange: vi.fn(),
    onClearColumnAlignments: vi.fn(),
    padding: 1,
    onPaddingChange: vi.fn(),
    alignColumns: true,
    onAlignColumnsChange: vi.fn(),
    escapePipes: true,
    onEscapePipesChange: vi.fn(),
    flattenNewlines: true,
    onFlattenNewlinesChange: vi.fn(),
    trimCells: true,
    onTrimCellsChange: vi.fn(),
    uppercaseHeaders: false,
    onUppercaseHeadersChange: vi.fn(),
    includeHeader: true,
    onIncludeHeaderChange: vi.fn(),
    hasHeaderRow: true,
    onHasHeaderRowChange: vi.fn(),
    sampleId: 'people-csv',
    onLoadSample: vi.fn(),
    overrideCount: 0,
    ...overrides,
  };
  render(<ToolSidebar {...props} />);
  return props;
}

function renderCanvas(overrides: Partial<Parameters<typeof ToolCanvas>[0]> = {}) {
  const base = state();
  const props = {
    value: base.input,
    onChange: vi.fn(),
    derived: deriveTable(base),
    viewMode: 'split' as const,
    sortColumn: null,
    sortDirection: null,
    onSortColumn: vi.fn(),
    alignments: ['left', 'left'] as Alignment[],
    ...overrides,
  };
  render(<ToolCanvas {...props} />);
  return props;
}

describe('ToolToolbar', () => {
  it('renders the format, layout, and alignment groups', () => {
    renderToolbar();

    expect(screen.getByRole('group', { name: 'Input format' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Canvas layout' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Default alignment' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Output actions' })).toBeInTheDocument();
  });

  it('marks the active format and layout with aria-pressed', () => {
    renderToolbar({ format: 'tsv', viewMode: 'markdown' });

    expect(screen.getByRole('button', { name: 'TSV' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Markdown layout' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('reports format changes', () => {
    const props = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    expect(props.onFormatChange).toHaveBeenCalledWith('json');
  });

  it('reports alignment changes', () => {
    const props = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Align columns center' }));
    expect(props.onAlignmentChange).toHaveBeenCalledWith('center');
  });

  it('reports view mode changes', () => {
    const props = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Preview layout' }));
    expect(props.onViewModeChange).toHaveBeenCalledWith('preview');
  });

  it('wires copy, download, and clear actions', () => {
    const props = renderToolbar();

    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown table' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download Markdown file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download HTML table snippet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear input' }));

    expect(props.onCopy).toHaveBeenCalledTimes(1);
    expect(props.onDownloadMarkdown).toHaveBeenCalledTimes(1);
    expect(props.onDownloadHtml).toHaveBeenCalledTimes(1);
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });

  it('disables output actions when there is nothing to copy', () => {
    renderToolbar({ canCopy: false });

    expect(screen.getByRole('button', { name: 'Copy Markdown table' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download Markdown file' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download HTML table snippet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear input' })).not.toBeDisabled();
  });
});

describe('ToolSidebar', () => {
  it('lists every sample preset', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /People \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inventory \(TSV\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Releases \(JSON\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Messy CSV/ })).toBeInTheDocument();
  });

  it('marks the active preset', () => {
    renderSidebar({ sampleId: 'inventory-tsv' });
    expect(screen.getByRole('button', { name: /Inventory \(TSV\)/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /People \(CSV\)/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('loads a preset on click', () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /Releases \(JSON\)/ }));
    expect(props.onLoadSample).toHaveBeenCalledWith('releases-json');
  });

  it('renders one alignment control per column', () => {
    renderSidebar();
    expect(screen.getByRole('combobox', { name: 'Alignment for Name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Alignment for Role' })).toBeInTheDocument();
  });

  it('reports a per-column alignment change', () => {
    const props = renderSidebar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Alignment for Role' }), {
      target: { value: 'right' },
    });
    expect(props.onColumnAlignmentChange).toHaveBeenCalledWith(1, 'right');
  });

  it('reports clearing an override when "Default" is chosen', () => {
    const props = renderSidebar({ columnAlignments: ['right'], overrideCount: 1 });
    fireEvent.change(screen.getByRole('combobox', { name: 'Alignment for Name' }), {
      target: { value: '' },
    });
    expect(props.onColumnAlignmentChange).toHaveBeenCalledWith(0, null);
  });

  it('shows the reset button only when overrides exist', () => {
    const { unmount } = render(
      <ToolSidebar
        headers={['a']}
        columnAlignments={[]}
        defaultAlignment="left"
        onColumnAlignmentChange={vi.fn()}
        onClearColumnAlignments={vi.fn()}
        padding={1}
        onPaddingChange={vi.fn()}
        alignColumns
        onAlignColumnsChange={vi.fn()}
        escapePipes
        onEscapePipesChange={vi.fn()}
        flattenNewlines
        onFlattenNewlinesChange={vi.fn()}
        trimCells
        onTrimCellsChange={vi.fn()}
        uppercaseHeaders={false}
        onUppercaseHeadersChange={vi.fn()}
        includeHeader
        onIncludeHeaderChange={vi.fn()}
        hasHeaderRow
        onHasHeaderRowChange={vi.fn()}
        sampleId={null}
        onLoadSample={vi.fn()}
        overrideCount={0}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'Clear all column alignment overrides' })
    ).not.toBeInTheDocument();
    unmount();

    const props = renderSidebar({ overrideCount: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all column alignment overrides' }));
    expect(props.onClearColumnAlignments).toHaveBeenCalledTimes(1);
  });

  it('clamps padding input through the callback', () => {
    const props = renderSidebar();
    fireEvent.change(screen.getByLabelText('Cell padding in spaces'), { target: { value: '3' } });
    expect(props.onPaddingChange).toHaveBeenCalledWith(3);
  });

  it('toggles formatting switches', () => {
    const props = renderSidebar();

    fireEvent.click(screen.getByLabelText('Pad columns to equal width'));
    expect(props.onAlignColumnsChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByLabelText('Escape pipes'));
    expect(props.onEscapePipesChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByLabelText('Uppercase headers'));
    expect(props.onUppercaseHeadersChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByLabelText('First row is a header'));
    expect(props.onHasHeaderRowChange).toHaveBeenCalledWith(false);
  });

  it('explains how to configure columns when there are none', () => {
    renderSidebar({ headers: [] });
    expect(screen.getByText(/Paste data to configure per-column alignment/)).toBeInTheDocument();
  });
});

describe('ToolCanvas', () => {
  it('renders the input textarea, preview table, and Markdown output', () => {
    renderCanvas();

    expect(
      screen.getByRole('application', { name: 'Markdown table converter canvas' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('CSV, TSV, or JSON input')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByLabelText('Generated Markdown table')).toBeInTheDocument();
  });

  it('reports input edits', () => {
    const props = renderCanvas();
    fireEvent.change(screen.getByLabelText('CSV, TSV, or JSON input'), {
      target: { value: 'a,b\n1,2' },
    });
    expect(props.onChange).toHaveBeenCalledWith('a,b\n1,2');
  });

  it('renders one sort button per header and reports clicks', () => {
    const props = renderCanvas();
    const sortButton = screen.getByRole('button', { name: /Name: Sort ascending/ });
    fireEvent.click(sortButton);
    expect(props.onSortColumn).toHaveBeenCalledWith(0);
  });

  it('shows the active sort indicator and next action', () => {
    renderCanvas({ sortColumn: 1, sortDirection: 'desc' });
    const button = screen.getByRole('button', { name: /Role: Clear sort/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('▼');
  });
  it('hides the input pane in preview mode', () => {
    renderCanvas({ viewMode: 'preview' });
    expect(screen.queryByLabelText('CSV, TSV, or JSON input')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('hides the preview pane in markdown mode', () => {
    renderCanvas({ viewMode: 'markdown' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Generated Markdown table')).toBeInTheDocument();
  });

  it('renders a parse error with its hint', () => {
    renderCanvas({ derived: deriveTable(state({ input: '{"a":', format: 'json' })) });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Invalid JSON/);
    expect(alert).toHaveTextContent(/array of objects/);
  });

  it('renders an empty placeholder for empty input', () => {
    renderCanvas({ value: '', derived: deriveTable(state({ input: '' })) });
    expect(screen.getByText(/Paste CSV, TSV, or JSON on the left/)).toBeInTheDocument();
  });

  it('applies alignment classes to header and body cells', () => {
    renderCanvas({ alignments: ['right', 'center'] });
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveClass('mtc-align-right');
    expect(headers[1]).toHaveClass('mtc-align-center');
  });

  it('notes when the preview is truncated', () => {
    const rows = Array.from({ length: 600 }, (_unused, index) => [`r${index}`, 'x']);
    const derived = {
      ...deriveTable(state({ input: 'a,b\n1,2' })),
      rows,
      headers: ['a', 'b'],
    };
    renderCanvas({ derived });
    expect(screen.getByText(/First 500 rows/)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(501);
  });
});
