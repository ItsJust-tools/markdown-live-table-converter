import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: 'markdown-table-converter',
  name: 'Markdown Live Table Converter',
  description:
    'Paste CSV, TSV, or JSON and get a clean, aligned Markdown table instantly — with live sorting, per-column alignment, padding controls, and HTML export.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'Markdown Table',
    icon: '\u{1F4CB}',
  },
  shortcuts: [
    {
      title: 'Formatting',
      shortcuts: [
        {
          label: 'Copy Markdown',
          keys: 'Mod+Shift+C',
          description: 'Copy the generated Markdown table to the clipboard',
        },
        {
          label: 'Toggle padded columns',
          keys: 'Mod+Shift+P',
          description: 'Switch between width-aligned and compact output',
        },
        {
          label: 'Cycle alignment',
          keys: 'Mod+Shift+A',
          description: 'Cycle the default column alignment',
        },
      ],
    },
    {
      title: 'Data',
      shortcuts: [
        {
          label: 'Load sample data',
          keys: 'Mod+Shift+L',
          description: 'Load the current sample preset into the input',
        },
        {
          label: 'Clear input',
          keys: 'Mod+Shift+X',
          description: 'Clear the pasted data and the preview',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
