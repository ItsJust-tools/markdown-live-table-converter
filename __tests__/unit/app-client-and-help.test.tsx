import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import ToolClient from '@/app/tool-client';
import ToolClientWrapper from '@/app/tool-client-wrapper';
import { initialMarkdownTableState } from '@/tool/tool-definition';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-tool-client">dynamic-tool-client</div>,
}));

vi.mock('@/tool/components/markdown-table.css', () => ({}));

const mockSetData = vi.fn();
const mockToast = vi.fn();
const mockHandleExport = vi.fn().mockResolvedValue({ success: true });
const mockImport = vi.fn();
const mockToolbarActions = { canUndo: false, canRedo: false, onUndo: vi.fn(), onRedo: vi.fn() };

vi.mock('@itsjust/core', () => ({
  ToolShell: ({ toolbar, sidebar, canvas, statusBar, actions }: Record<string, unknown>) => {
    void actions;
    return (
      <div>
        <div>{toolbar as ReactNode}</div>
        <div>{sidebar as ReactNode}</div>
        <div>{canvas as ReactNode}</div>
        <div>{statusBar as ReactNode}</div>
      </div>
    );
  },
  ImportExport: ({ onShare }: { onShare?: () => void }) => (
    <button type="button" onClick={onShare}>
      trigger-share
    </button>
  ),
  useTool: () => ({
    state: {
      data: initialMarkdownTableState,
      setData: mockSetData,
      isDirty: false,
      lastSaved: 'just now',
      saveNow: vi.fn().mockResolvedValue(undefined),
    },
    toast: mockToast,
    supportedFormats: ['json'],
    handleExport: mockHandleExport,
    importFromFile: mockImport,
    isImporting: false,
    isExporting: false,
    toolbarActions: mockToolbarActions,
  }),
}));

vi.mock('@/tool', async () => {
  const actual = await vi.importActual<typeof import('@/tool')>('@/tool');
  return {
    ...actual,
    toolConfig: {
      ...actual.toolConfig,
      features: { ...actual.toolConfig.features, sidebar: true, export: true },
    },
    templateBaseVersion: '1.4.0',
  };
});

describe('app client', () => {
  beforeEach(() => {
    mockSetData.mockReset();
    mockToast.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    window.history.replaceState(null, '', 'http://localhost:3000/');
  });

  it('renders dynamic tool client wrapper', () => {
    render(<ToolClientWrapper />);
    expect(screen.getByTestId('dynamic-tool-client')).toBeInTheDocument();
  });

  it('renders the full tool shell with canvas, sidebar, and status bar', () => {
    render(<ToolClient />);

    expect(
      screen.getByRole('application', { name: 'Markdown table converter canvas' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Output actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /People \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByText(/Template v1.4.0/)).toBeInTheDocument();
  });

  it('propagates input edits to tool state', () => {
    render(<ToolClient />);

    fireEvent.change(screen.getByLabelText('CSV, TSV, or JSON input'), {
      target: { value: 'a,b\n1,2' },
    });

    expect(mockSetData).toHaveBeenCalledTimes(1);
    const updater = mockSetData.mock.calls[0]?.[0] as (prev: unknown) => unknown;
    const next = updater(initialMarkdownTableState) as typeof initialMarkdownTableState;
    expect(next.input).toBe('a,b\n1,2');
    expect(next.sampleId).toBeNull();
  });

  it('copies the generated markdown to the clipboard', async () => {
    render(<ToolClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown table' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Markdown table copied', 'success');
    });
    const writeText = navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('| Name'));
  });

  it('loads a sample preset into state', () => {
    render(<ToolClient />);

    fireEvent.click(screen.getByRole('button', { name: /Inventory \(TSV\)/ }));

    expect(mockSetData).toHaveBeenCalledTimes(1);
    const updater = mockSetData.mock.calls[0]?.[0] as (prev: unknown) => unknown;
    const next = updater(initialMarkdownTableState) as typeof initialMarkdownTableState;
    expect(next.sampleId).toBe('inventory-tsv');
    expect(next.input).toContain('SKU');
    expect(mockToast).toHaveBeenCalledWith('Loaded “Inventory (TSV)”', 'success');
  });

  it('clears the input and keeps formatting options', () => {
    render(<ToolClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear input' }));

    const updater = mockSetData.mock.calls[0]?.[0] as (prev: unknown) => unknown;
    const next = updater(initialMarkdownTableState) as typeof initialMarkdownTableState;
    expect(next.input).toBe('');
    expect(next.padding).toBe(initialMarkdownTableState.padding);
    expect(mockToast).toHaveBeenCalledWith('Input cleared', 'success');
  });

  it('cycles the default alignment through the toolbar', () => {
    render(<ToolClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Align columns right' }));

    const updater = mockSetData.mock.calls[0]?.[0] as (prev: unknown) => unknown;
    const next = updater(initialMarkdownTableState) as typeof initialMarkdownTableState;
    expect(next.alignment).toBe('right');
  });

  it('sorts the preview when a header is clicked', () => {
    render(<ToolClient />);

    fireEvent.click(screen.getByRole('button', { name: /Name: Sort ascending/ }));

    const updater = mockSetData.mock.calls[0]?.[0] as (prev: unknown) => unknown;
    const next = updater(initialMarkdownTableState) as typeof initialMarkdownTableState;
    expect(next.sortColumn).toBe(0);
    expect(next.sortDirection).toBe('asc');
  });

  it('sets a per-column alignment from the sidebar', () => {
    render(<ToolClient />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Alignment for Commits' }), {
      target: { value: 'right' },
    });

    const updater = mockSetData.mock.calls[0]?.[0] as (prev: unknown) => unknown;
    const next = updater(initialMarkdownTableState) as typeof initialMarkdownTableState;
    expect(next.columnAlignments[3]).toBe('right');
  });

  it('handles the share flow', async () => {
    render(<ToolClient />);

    fireEvent.click(screen.getByText('trigger-share'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Shared URL ready', 'success');
    });
  });

  it('loads shared state from the URL', async () => {
    const { compressToEncodedURIComponent } = await import('lz-string');
    const encoded = compressToEncodedURIComponent(
      JSON.stringify({ ...initialMarkdownTableState, input: 'from,url\n1,2' })
    );
    window.history.replaceState(null, '', `http://localhost:3000/?state=${encoded}`);

    render(<ToolClient />);

    await waitFor(() => {
      expect(mockSetData).toHaveBeenCalled();
    });
    const loaded = mockSetData.mock.calls[0]?.[0] as typeof initialMarkdownTableState;
    expect(loaded.input).toBe('from,url\n1,2');
    expect(mockToast).toHaveBeenCalledWith('Loaded state from shared URL', 'success');
  });
});
