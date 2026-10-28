import toolConfig from '../tool.config';

/** Words that make a readable download basename, derived from the tool name. */
export function toolSlug(): string {
  return (
    toolConfig.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'markdown-table-converter'
  );
}

/** File extension for each downloadable output kind. */
export const DOWNLOAD_EXTENSIONS = {
  markdown: 'md',
  html: 'html',
} as const;

/** Kind of text artifact the tool can produce. */
export type DownloadKind = keyof typeof DOWNLOAD_EXTENSIONS;

/** Build a stable download filename for the given output kind. */
export function downloadFilename(kind: DownloadKind): string {
  return `${toolSlug()}.${DOWNLOAD_EXTENSIONS[kind]}`;
}

/**
 * Trigger a client-side download of a text payload.
 *
 * No-ops during SSR so the module stays importable from server components.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Revoke on the next tick so Safari has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Download the generated Markdown table. */
export function downloadMarkdown(markdown: string): void {
  downloadTextFile(downloadFilename('markdown'), `${markdown}\n`, 'text/markdown');
}

/** Download the generated HTML table snippet, wrapped in a minimal document. */
export function downloadHtml(snippet: string): void {
  const document = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>${toolConfig.name}</title>`,
    '</head>',
    '<body>',
    snippet,
    '</body>',
    '</html>',
  ].join('\n');
  downloadTextFile(downloadFilename('html'), `${document}\n`, 'text/html');
}
