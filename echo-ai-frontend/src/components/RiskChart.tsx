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
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md md:p-6">
      <div className="flex h-full flex-col">
        <h2 className="text-lg font-semibold text-primary">Risk Distribution</h2>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-4 md:gap-5 md:pt-6">
          <div className="h-[260px] w-full max-w-[360px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={4}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex w-full flex-wrap justify-center gap-3">
            {data.map((entry) => (
              <div
                key={entry.name}
                className="flex min-w-[132px] items-center justify-center gap-3 rounded-full border border-border bg-panel px-4 py-2 text-sm text-secondary"
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
        </div>
      </div>
    </section>
  );
}
