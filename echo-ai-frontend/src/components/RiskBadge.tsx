interface RiskBadgeProps {
  risk: string;
  score: number;
  status?: string;
}

function getBadgeConfig(
  risk: string,
  score: number,
  status?: string,
): { label: string; className: string } {
  if (status === 'done') {
    return {
      label: 'RESOLVED',
      className: 'border border-gray-300 bg-gray-100 text-gray-600',
    };
  }

  if (risk === 'high' && score >= 90) {
    return {
      label: 'CRITICAL',
      className: 'border border-red-200 bg-red-100 text-red-700',
    };
  }

  if (risk === 'high') {
    return {
      label: 'HIGH',
      className: 'border border-orange-200 bg-orange-100 text-orange-700',
    };
  }

  if (risk === 'medium') {
    return {
      label: 'MEDIUM',
      className: 'border border-yellow-200 bg-yellow-100 text-yellow-700',
    };
  }

  return {
    label: 'LOW',
    className: 'border border-green-200 bg-green-100 text-green-700',
  };
}

export function RiskBadge({ risk, score, status }: RiskBadgeProps): JSX.Element {
  const config = getBadgeConfig(risk, score, status);

  return (
    <span
      className={`inline-flex min-w-[88px] justify-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] ${config.className}`}
    >
      {config.label}
    </span>
  );
}
