import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { Analytics } from '../types/meeting';

interface RiskChartProps {
  analytics: Analytics;
}

const COLORS = {
  high: '#DC2626',
  medium: '#F59E0B',
  low: '#10B981',
};

export function RiskChart({ analytics }: RiskChartProps): JSX.Element {
  const data = [
    { name: 'High', value: analytics.high, color: COLORS.high },
    { name: 'Medium', value: analytics.medium, color: COLORS.medium },
    { name: 'Low', value: analytics.low, color: COLORS.low },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-primary">Risk Distribution</h2>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {data.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-secondary"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}</span>
            <span className="font-semibold text-primary">{entry.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
