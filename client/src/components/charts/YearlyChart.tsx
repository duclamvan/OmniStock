import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { month: 'Jan', purchased: 45, sold: 55 },
  { month: 'Feb', purchased: 40, sold: 50 },
  { month: 'Mar', purchased: 35, sold: 45 },
  { month: 'Apr', purchased: 50, sold: 60 },
  { month: 'May', purchased: 60, sold: 70 },
  { month: 'Jun', purchased: 45, sold: 55 },
  { month: 'Jul', purchased: 55, sold: 65 },
  { month: 'Aug', purchased: 65, sold: 75 },
  { month: 'Sep', purchased: 60, sold: 70 },
  { month: 'Oct', purchased: 55, sold: 65 },
  { month: 'Nov', purchased: 70, sold: 80 },
  { month: 'Dec', purchased: 75, sold: 85 },
];

export function YearlyChart() {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" stroke="#64748B" />
          <YAxis stroke="#64748B" />
          <Legend />
          <Bar dataKey="purchased" fill="hsl(224, 76%, 48%)" name="Purchased" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sold" fill="hsl(214, 95%, 69%)" name="Sold Amount" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
