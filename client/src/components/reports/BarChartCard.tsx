import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BarDataItem {
  name: string;
  [key: string]: any;
}

interface BarConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface BarChartCardProps {
  title: string;
  data: BarDataItem[];
  bars: BarConfig[];
  xAxisKey?: string;
  formatValue?: (value: number) => string;
  testId?: string;
}

export function BarChartCard({
  title,
  data,
  bars,
  xAxisKey = 'name',
  formatValue = (value) => value.toLocaleString(),
  testId,
}: BarChartCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis 
              dataKey={xAxisKey}
              className="text-xs"
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: '#64748b' }}
              tickFormatter={formatValue}
            />
            <Tooltip 
              formatter={formatValue}
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
              }}
            />
            <Legend />
            {bars.map((bar) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
