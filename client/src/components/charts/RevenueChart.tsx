import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/currencyUtils';

export function RevenueChart() {
  const { data: financialSummary = [], isLoading } = useQuery({
    queryKey: ['/api/dashboard/financial-summary'],
  });

  if (isLoading) {
    return <div className="h-[300px] flex items-center justify-center">Loading...</div>;
  }

  const chartData = financialSummary.map((item: any) => ({
    month: item.month,
    profit: Math.round(item.totalProfitEur || 0),
    revenue: Math.round(item.totalRevenueEur || 0),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded shadow">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, 'EUR')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" stroke="#64748B" />
          <YAxis stroke="#64748B" tickFormatter={(value) => `€${value}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="profit" fill="hsl(142, 76%, 36%)" name="Profit" radius={[4, 4, 0, 0]} />
          <Bar dataKey="revenue" fill="hsl(215, 20%, 65%)" name="Revenue" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
