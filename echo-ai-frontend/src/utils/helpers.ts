export function todayISO(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

export function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getRiskColor(risk: 'high' | 'medium' | 'low'): string {
  if (risk === 'high') {
    return 'text-orange-400';
  }

  if (risk === 'medium') {
    return 'text-yellow-300';
  }

  return 'text-emerald-400';
}
