import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { month: 'Jan', profit: 20, revenue: 30 },
  { month: 'Feb', profit: 35, revenue: 45 },
  { month: 'Mar', profit: 30, revenue: 40 },
  { month: 'Apr', profit: 35, revenue: 45 },
  { month: 'May', profit: 40, revenue: 50 },
  { month: 'Jun', profit: 25, revenue: 35 },
  { month: 'Jul', profit: 35, revenue: 45 },
  { month: 'Aug', profit: 45, revenue: 55 },
  { month: 'Sep', profit: 40, revenue: 50 },
  { month: 'Oct', profit: 35, revenue: 45 },
  { month: 'Nov', profit: 50, revenue: 60 },
  { month: 'Dec', profit: 55, revenue: 65 },
];

export function RevenueChart() {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" stroke="#64748B" />
          <YAxis stroke="#64748B" />
          <Legend />
          <Bar dataKey="profit" fill="hsl(142, 76%, 36%)" name="Profit" radius={[4, 4, 0, 0]} />
          <Bar dataKey="revenue" fill="hsl(215, 20%, 65%)" name="Revenue" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
