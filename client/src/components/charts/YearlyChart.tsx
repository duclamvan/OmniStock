import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/currencyUtils';

export function YearlyChart() {
  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['/api/dashboard/yearly-report'],
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
      
      // Fetch purchases and orders
      const [purchasesRes, ordersRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/orders')
      ]);
      
      const purchases = await purchasesRes.json();
      const orders = await ordersRes.json();
      
      // Calculate monthly data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      
      const monthlyData = monthNames.map((month, index) => {
        const monthStart = new Date(currentYear, index, 1);
        const monthEnd = new Date(currentYear, index + 1, 0, 23, 59, 59, 999);
        
        // Calculate purchased amount
        const monthPurchases = purchases.filter((p: any) => {
          const purchaseDate = new Date(p.createdAt);
          return purchaseDate >= monthStart && purchaseDate <= monthEnd;
        });
        
        const purchased = monthPurchases.reduce((sum: number, p: any) => {
          const amount = parseFloat(p.totalAmount || '0');
          return sum + convertToEur(amount, p.currency);
        }, 0);
        
        // Calculate sold amount
        const monthOrders = orders.filter((o: any) => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= monthStart && orderDate <= monthEnd && o.orderStatus === 'shipped';
        });
        
        const sold = monthOrders.reduce((sum: number, o: any) => {
          const amount = parseFloat(o.grandTotal || '0');
          return sum + convertToEur(amount, o.currency);
        }, 0);
        
        return {
          month,
          purchased: Math.round(purchased),
          sold: Math.round(sold)
        };
      });
      
      return monthlyData;
    }
  });

  if (isLoading) {
    return <div className="h-[400px] flex items-center justify-center">Loading...</div>;
  }

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
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" stroke="#64748B" />
          <YAxis stroke="#64748B" tickFormatter={(value) => `€${value}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="purchased" fill="hsl(224, 76%, 48%)" name="Purchased" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sold" fill="hsl(214, 95%, 69%)" name="Sold Amount" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
