import type { ActionItem } from '../types/meeting';

const UTF8_BOM = '\uFEFF';

function escapeValue(value: string | number | boolean): string {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

export function buildItemsCsv(items: ActionItem[]): string {
  const header = [
    'ID',
    'Task',
    'Owner',
    'Status',
    'Due Date',
    'Risk',
    'Score',
    'Confidence',
    'Needs Confirmation',
    'Evidence',
  ];

  const rows = items.map((item) =>
    [
      item.id,
      item.task,
      item.owner,
      item.status,
      item.dueDate,
      item.risk,
      item.score,
      item.confidence,
      item.needsConfirmation,
      item.evidence,
    ]
      .map(escapeValue)
      .join(','),
  );

  return `${UTF8_BOM}${[header.map(escapeValue).join(','), ...rows].join('\n')}`;
}

export function downloadCsv(filename: string, items: ActionItem[]): void {
  const blob = new Blob([buildItemsCsv(items)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
