import type { InputFormat } from '../types';

/** A ready-made payload for quick manual testing. */
export interface SamplePreset {
  id: string;
  label: string;
  description: string;
  format: InputFormat;
  hasHeaderRow: boolean;
  data: string;
}

/** Built-in sample payloads covering every supported input dialect. */
export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'people-csv',
    label: 'People (CSV)',
    description: 'Comma separated roster with quoted commas',
    format: 'csv',
    hasHeaderRow: true,
    data: [
      'Name,Role,Team,Commits',
      'Ada Lovelace,Engineer,Analytical,412',
      'Grace Hopper,Rear Admiral,Compilers,398',
      'Alan Turing,Researcher,Cryptography,377',
      'Katherine Johnson,Mathematician,Orbital,301',
      'Margaret Hamilton,Lead Engineer,Apollo,455',
    ].join('\n'),
  },
  {
    id: 'inventory-tsv',
    label: 'Inventory (TSV)',
    description: 'Tab separated stock list',
    format: 'tsv',
    hasHeaderRow: true,
    data: [
      'SKU\tItem\tQty\tPrice',
      'TS-1001\tMechanical Keyboard\t42\t129.00',
      'TS-1002\tTrackball Mouse\t17\t64.50',
      'TS-1003\tUSB-C Hub\t8\t39.99',
      'TS-1004\tMonitor Stand\t23\t89.00',
    ].join('\n'),
  },
  {
    id: 'releases-json',
    label: 'Releases (JSON)',
    description: 'Array of objects with mixed value types',
    format: 'json',
    hasHeaderRow: true,
    data: JSON.stringify(
      [
        { version: '1.4.0', date: '2026-09-02', downloads: 18420, stable: true },
        { version: '1.3.1', date: '2026-07-18', downloads: 9310, stable: true },
        { version: '1.3.0', date: '2026-06-30', downloads: 15204, stable: false },
        { version: '1.2.4', date: '2026-05-11', downloads: 7402, stable: true },
      ],
      null,
      2
    ),
  },
  {
    id: 'messy-csv',
    label: 'Messy CSV',
    description: 'Quoted commas, embedded pipes, and a missing cell',
    format: 'csv',
    hasHeaderRow: true,
    data: [
      'Ticket,Owner,Status,Notes',
      'A-101,Priya,open,"Needs | review"',
      'A-102,"Marcus, Jr.",closed,"Second ""opinion"""',
      'A-103,Ines,open,',
      'A-104,Tom,blocked,"Waiting on ""API"" v2"',
    ].join('\n'),
  },
];

/** Look up a preset by id. */
export function getPreset(id: string | null): SamplePreset | undefined {
  if (!id) return undefined;
  return SAMPLE_PRESETS.find((preset) => preset.id === id);
}

/** The preset used by the "Load sample" action and the initial state. */
export const DEFAULT_SAMPLE_ID = 'people-csv';
