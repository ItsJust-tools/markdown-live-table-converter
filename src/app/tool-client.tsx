'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell, useTool, ImportExport } from '@itsjust/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  ALIGNMENTS,
  RESOLVED_FORMAT_LABELS,
  ToolCanvas,
  ToolSidebar,
  ToolToolbar,
  clearColumnAlignments,
  deriveTable,
  downloadHtml,
  downloadMarkdown,
  getPreset,
  markdownTableTool,
  nextSort,
  resetFormatting,
  templateBaseVersion,
  toolConfig,
  withClearedInput,
  withColumnAlignment,
  withOption,
  withSample,
  type Alignment,
  type DerivedTable,
  type InputFormat,
  type MarkdownTableState,
  type ViewMode,
} from '@/tool';
import '@/tool/components/markdown-table.css';

function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export default function ToolClient() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const tool = useTool(markdownTableTool, canvasRef);
  const data = tool.state.data;
  const setToolData = tool.state.setData;
  const showToast = tool.toast;
  const [isSharing, setIsSharing] = useState(false);
  const hasLoadedSharedState = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth > 768 && toolConfig.features.sidebar
  );

  const derived: DerivedTable = useMemo(() => deriveTable(data), [data]);

  /** Effective alignment per column, used by the preview and the sidebar. */
  const alignments = useMemo(() => {
    const columns = derived.headers.length;
    return Array.from({ length: columns }, (_unused, index) => {
      return data.columnAlignments[index] ?? data.alignment;
    });
  }, [data.columnAlignments, data.alignment, derived.headers.length]);

  const overrideCount = useMemo(
    () => data.columnAlignments.filter((value) => value !== undefined && value !== null).length,
    [data.columnAlignments]
  );

  const canCopy = derived.markdown.markdown.length > 0;

  /* -------------------------------- handlers -------------------------------- */

  const update = useCallback(
    (updater: (state: MarkdownTableState) => MarkdownTableState) => {
      setToolData((prev) => updater(prev));
    },
    [setToolData]
  );

  const handleInputChange = useCallback(
    (input: string) => {
      update((prev) => ({ ...prev, input, sampleId: null }));
    },
    [update]
  );

  const handleFormatChange = useCallback(
    (format: InputFormat) => update((prev) => withOption(prev, 'format', format)),
    [update]
  );

  const handleViewModeChange = useCallback(
    (viewMode: ViewMode) => update((prev) => withOption(prev, 'viewMode', viewMode)),
    [update]
  );

  const handleAlignmentChange = useCallback(
    (alignment: Alignment) => update((prev) => withOption(prev, 'alignment', alignment)),
    [update]
  );

  const handleColumnAlignmentChange = useCallback(
    (column: number, alignment: Alignment | null) =>
      update((prev) => withColumnAlignment(prev, column, alignment)),
    [update]
  );

  const handleClearColumnAlignments = useCallback(
    () => update((prev) => clearColumnAlignments(prev)),
    [update]
  );

  const handlePaddingChange = useCallback(
    (padding: number) => update((prev) => withOption(prev, 'padding', padding)),
    [update]
  );

  const handleToggle = useCallback(
    (
      key:
        | 'hasHeaderRow'
        | 'alignColumns'
        | 'escapePipes'
        | 'flattenNewlines'
        | 'trimCells'
        | 'uppercaseHeaders'
        | 'includeHeader'
    ) =>
      (value: boolean) =>
        update((prev) => withOption(prev, key, value)),
    [update]
  );

  const handleSortColumn = useCallback(
    (column: number) => {
      update((prev) => {
        const next = nextSort({ column: prev.sortColumn, direction: prev.sortDirection }, column);
        return { ...prev, sortColumn: next.column, sortDirection: next.direction };
      });
    },
    [update]
  );

  const handleLoadSample = useCallback(
    (id: string) => {
      const preset = getPreset(id);
      update((prev) => withSample(prev, id));
      showToast(preset ? `Loaded “${preset.label}”` : 'Sample loaded', 'success');
    },
    [showToast, update]
  );

  const handleClear = useCallback(() => {
    update((prev) => withClearedInput(prev));
    showToast('Input cleared', 'success');
  }, [showToast, update]);

  const handleResetFormatting = useCallback(() => {
    update((prev) => resetFormatting(prev));
    showToast('Formatting reset', 'success');
  }, [showToast, update]);

  const handleCopy = useCallback(async () => {
    if (!derived.markdown.markdown) {
      showToast('Nothing to copy yet', 'error');
      return;
    }
    const copied = await copyToClipboard(derived.markdown.markdown);
    showToast(
      copied ? 'Markdown table copied' : 'Copy failed — select the output manually',
      copied ? 'success' : 'error'
    );
  }, [derived.markdown.markdown, showToast]);

  const handleDownloadMarkdown = useCallback(() => {
    if (!derived.markdown.markdown) {
      showToast('Nothing to download yet', 'error');
      return;
    }
    downloadMarkdown(derived.markdown.markdown);
    showToast('Markdown file downloaded', 'success');
  }, [derived.markdown.markdown, showToast]);

  const handleDownloadHtml = useCallback(() => {
    if (!derived.html) {
      showToast('Nothing to download yet', 'error');
      return;
    }
    downloadHtml(derived.html);
    showToast('HTML table downloaded', 'success');
  }, [derived.html, showToast]);

  const handleCycleAlignment = useCallback(() => {
    update((prev) => {
      const currentIndex = ALIGNMENTS.indexOf(prev.alignment);
      const next = ALIGNMENTS[(currentIndex + 1) % ALIGNMENTS.length] ?? 'left';
      return { ...prev, alignment: next };
    });
  }, [update]);

  const handleTogglePaddedColumns = useCallback(() => {
    update((prev) => ({ ...prev, alignColumns: !prev.alignColumns }));
  }, [update]);

  const handleLoadDefaultSample = useCallback(() => {
    const preset = getPreset(data.sampleId) ?? getPreset('people-csv');
    if (preset) handleLoadSample(preset.id);
  }, [data.sampleId, handleLoadSample]);

  /* ------------------------------- sharing --------------------------------- */

  useEffect(() => {
    if (hasLoadedSharedState.current) return;
    hasLoadedSharedState.current = true;
    const params = new URLSearchParams(window.location.search);
    const encodedState = params.get('state');
    if (!encodedState) return;
    try {
      const serialized = decompressFromEncodedURIComponent(encodedState);
      if (!serialized) throw new Error('Invalid shared URL');
      const parsed: unknown = JSON.parse(serialized);
      const deserialized = markdownTableTool.deserialize(parsed);
      if (!deserialized.success) throw new Error(deserialized.error);
      setToolData(deserialized.data);
      showToast('Loaded state from shared URL', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shared URL';
      showToast(message, 'error');
    }
  }, [setToolData, showToast]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const serialized = markdownTableTool.serialize(tool.state.data);
      const encodedState = compressToEncodedURIComponent(serialized);
      if (!encodedState) throw new Error('Failed to encode state for URL');
      const url = new URL(window.location.href);
      url.searchParams.set('state', encodedState);
      url.searchParams.set('tool', toolConfig.id);
      window.history.replaceState(null, '', url.toString());

      const shareUrl = url.toString();
      if (navigator.share) {
        try {
          await navigator.share({ title: toolConfig.name, url: shareUrl });
          showToast('Shared URL ready', 'success');
          return;
        } catch (error) {
          const isAbort =
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name?: unknown }).name === 'AbortError';
          if (isAbort) return;
        }
      }
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        showToast('Share URL copied to clipboard', 'success');
      } else {
        throw new Error('Clipboard access denied or not supported');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share URL';
      showToast(message, 'error');
    } finally {
      setIsSharing(false);
    }
  }, [showToast, tool.state.data]);

  /* ----------------------------- shortcuts --------------------------------- */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || !event.shiftKey) return;
      switch (event.key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          void handleCopy();
          break;
        case 'p':
          event.preventDefault();
          handleTogglePaddedColumns();
          break;
        case 'a':
          event.preventDefault();
          handleCycleAlignment();
          break;
        case 'l':
          event.preventDefault();
          handleLoadDefaultSample();
          break;
        case 'x':
          event.preventDefault();
          handleClear();
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleCopy,
    handleTogglePaddedColumns,
    handleCycleAlignment,
    handleLoadDefaultSample,
    handleClear,
  ]);

  /* ------------------------------- rendering -------------------------------- */

  const toolbarActions = useMemo(
    () => ({
      ...tool.toolbarActions,
      onReset: handleResetFormatting,
    }),
    [tool.toolbarActions, handleResetFormatting]
  );

  const toolbarContent = (
    <>
      <ToolToolbar
        format={data.format}
        onFormatChange={handleFormatChange}
        viewMode={data.viewMode}
        onViewModeChange={handleViewModeChange}
        alignment={data.alignment}
        onAlignmentChange={handleAlignmentChange}
        canCopy={canCopy}
        onCopy={handleCopy}
        onDownloadMarkdown={handleDownloadMarkdown}
        onDownloadHtml={handleDownloadHtml}
        onClear={handleClear}
      />
      {toolConfig.features.export ? (
        <ImportExport
          formats={tool.supportedFormats}
          onExport={tool.handleExport}
          onImport={tool.importFromFile}
          isImporting={tool.isImporting}
          onShare={handleShare}
          isSharing={isSharing}
        />
      ) : null}
    </>
  );

  const sidebarContent = (
    <ToolSidebar
      headers={derived.headers}
      columnAlignments={data.columnAlignments}
      defaultAlignment={data.alignment}
      onColumnAlignmentChange={handleColumnAlignmentChange}
      onClearColumnAlignments={handleClearColumnAlignments}
      padding={data.padding}
      onPaddingChange={handlePaddingChange}
      alignColumns={data.alignColumns}
      onAlignColumnsChange={handleToggle('alignColumns')}
      escapePipes={data.escapePipes}
      onEscapePipesChange={handleToggle('escapePipes')}
      flattenNewlines={data.flattenNewlines}
      onFlattenNewlinesChange={handleToggle('flattenNewlines')}
      trimCells={data.trimCells}
      onTrimCellsChange={handleToggle('trimCells')}
      uppercaseHeaders={data.uppercaseHeaders}
      onUppercaseHeadersChange={handleToggle('uppercaseHeaders')}
      includeHeader={data.includeHeader}
      onIncludeHeaderChange={handleToggle('includeHeader')}
      hasHeaderRow={data.hasHeaderRow}
      onHasHeaderRowChange={handleToggle('hasHeaderRow')}
      sampleId={data.sampleId}
      onLoadSample={handleLoadSample}
      overrideCount={overrideCount}
    />
  );

  const canvasContent = (
    <ToolCanvas
      canvasRef={canvasRef}
      value={data.input}
      onChange={handleInputChange}
      derived={derived}
      viewMode={data.viewMode}
      sortColumn={data.sortColumn}
      sortDirection={data.sortDirection}
      onSortColumn={handleSortColumn}
      alignments={alignments}
    />
  );

  const parsedFormat = derived.parsed.status === 'valid' ? derived.parsed.format : null;
  const statusBarContent = (
    <>
      <span
        className={`status-slot status-slot-state ${tool.state.isDirty ? 'status-unsaved' : 'status-saved'}`}
      >
        {tool.state.isDirty ? (
          <>
            <span className="status-saving-dot" />
            Unsaved
          </>
        ) : tool.state.lastSaved ? (
          <>Saved {tool.state.lastSaved}</>
        ) : (
          'Ready'
        )}
      </span>
      <span className="status-slot status-slot-expression">
        {parsedFormat ? RESOLVED_FORMAT_LABELS[parsedFormat] : 'No data'}
      </span>
      <span className="status-slot">
        {derived.headers.length} col · {derived.rows.length} row
      </span>
      <span className="status-slot">{derived.cellCount.toLocaleString()} cells</span>
      <span className="status-slot status-slot-tool-version">Tool v{toolConfig.version}</span>
      <span className="status-slot status-slot-template-version">
        Template v{templateBaseVersion}
      </span>
    </>
  );

  return (
    <ToolShell
      config={toolConfig}
      actions={toolbarActions}
      sidebarOpen={sidebarOpen}
      onSidebarChange={setSidebarOpen}
      toolbar={toolbarContent}
      sidebar={sidebarContent}
      canvas={canvasContent}
      statusBar={statusBarContent}
    />
  );
}
