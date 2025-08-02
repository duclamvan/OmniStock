import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/currencyUtils';

export function ExpensesChart() {
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['/api/expenses'],
    queryFn: async () => {
      // Fetch exchange rates
      const exchangeRateResponse = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
      const exchangeRates = await exchangeRateResponse.json();
      
      const convertToEur = (amount: number, currency: string): number => {
        if (!amount || !currency) return 0;
        if (currency === 'EUR') return amount;
        
        const currencyLower = currency.toLowerCase();
        if (exchangeRates.eur && exchangeRates.eur[currencyLower]) {
          return amount / exchangeRates.eur[currencyLower];
        }
        return amount;
      };
      
      // Fetch expenses
      const response = await fetch('/api/expenses');
      const expensesData = await response.json();
      
      // Group by year and convert to EUR
      const yearlyExpenses: { [key: string]: number } = {};
      const currentYear = new Date().getFullYear();
      
      for (let year = currentYear - 5; year <= currentYear; year++) {
        yearlyExpenses[year.toString()] = 0;
      }
      
      expensesData.forEach((expense: any) => {
        const year = new Date(expense.createdAt).getFullYear().toString();
        if (yearlyExpenses.hasOwnProperty(year)) {
          const amount = parseFloat(expense.amount || '0');
          yearlyExpenses[year] += convertToEur(amount, expense.currency);
        }
      });
      
      return Object.entries(yearlyExpenses).map(([year, amount]) => ({
        year,
        expenses: Math.round(amount)
      }));
    }
  });

  if (isLoading) {
    return <div className="h-[300px] flex items-center justify-center">Loading...</div>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded shadow">
          <p className="font-medium">{label}</p>
          <p style={{ color: payload[0].color }}>
            Expenses: {formatCurrency(payload[0].value, 'EUR')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={expenses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="year" stroke="#64748B" />
          <YAxis stroke="#64748B" tickFormatter={(value) => `€${value}`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="expenses" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
