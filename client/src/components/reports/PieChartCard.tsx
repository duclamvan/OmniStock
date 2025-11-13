import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieDataItem {
  name: string;
  value: number;
  percentage?: string;
}

interface PieChartCardProps {
  title: string;
  data: PieDataItem[];
  colors?: string[];
  formatValue?: (value: number) => string;
  testId?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function PieChartCard({
  title,
  data,
  colors = DEFAULT_COLORS,
  formatValue = (value) => value.toLocaleString(),
  testId,
}: PieChartCardProps) {
  const renderLabel = (entry: PieDataItem) => {
    return `${entry.name}: ${entry.percentage || '0'}%`;
  };

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatValue} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
