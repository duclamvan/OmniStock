import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
  month: string;
  [key: string]: any;
}

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface TrendLineChartProps {
  title: string;
  data: DataPoint[];
  lines: LineConfig[];
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
  testId?: string;
}

export function TrendLineChart({
  title,
  data,
  lines,
  yAxisLabel,
  formatValue = (value) => value.toLocaleString(),
  testId,
}: TrendLineChartProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
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
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={{ fill: line.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
