import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const data = [
  { year: '2019', expenses: 400 },
  { year: '2020', expenses: 350 },
  { year: '2021', expenses: 450 },
  { year: '2022', expenses: 500 },
  { year: '2023', expenses: 550 },
  { year: '2024', expenses: 625 },
];

export function ExpensesChart() {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="year" stroke="#64748B" />
          <YAxis stroke="#64748B" />
          <Bar dataKey="expenses" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
