import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CostHistoryData {
  id: number;
  landingCostUnitBase: string;
  method: string;
  computedAt: string;
  createdAt: string;
  source?: string;
}

interface CostHistoryChartProps {
  data: CostHistoryData[];
  isLoading?: boolean;
  currency?: string;
  height?: number;
}

export default function CostHistoryChart({ 
  data, 
  isLoading = false, 
  currency = '€',
  height = 300 
}: CostHistoryChartProps) {
  // Process and calculate trends
  const { chartData, average, trend, trendPercentage } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], average: 0, trend: 'stable', trendPercentage: 0 };
    }

    // Sort data by date and format for chart
    const sortedData = [...data].sort((a, b) => 
      new Date(a.computedAt).getTime() - new Date(b.computedAt).getTime()
    );

    const chartData = sortedData.map((item) => ({
      date: format(new Date(item.computedAt), 'MMM dd'),
      fullDate: format(new Date(item.computedAt), 'PPP'),
      cost: parseFloat(item.landingCostUnitBase),
      method: item.method,
      source: item.source || item.method
    }));

    // Calculate average
    const sum = chartData.reduce((acc, item) => acc + item.cost, 0);
    const average = sum / chartData.length;

    // Calculate trend (compare last 3 entries with first 3 if enough data)
    let trend = 'stable';
    let trendPercentage = 0;
    
    if (chartData.length >= 2) {
      const recentCount = Math.min(3, Math.floor(chartData.length / 2));
      const recentAvg = chartData
        .slice(-recentCount)
        .reduce((acc, item) => acc + item.cost, 0) / recentCount;
      const olderAvg = chartData
        .slice(0, recentCount)
        .reduce((acc, item) => acc + item.cost, 0) / recentCount;
      
      trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (trendPercentage > 5) trend = 'increasing';
      else if (trendPercentage < -5) trend = 'decreasing';
    }

    return { chartData, average, trend, trendPercentage };
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-sm">{data.fullDate}</p>
          <p className="text-lg font-bold text-primary">
            {currency}{data.cost.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Method: {data.method}
          </p>
          {data.source !== data.method && (
            <p className="text-xs text-muted-foreground">
              Source: {data.source}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <p>No cost history data available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="cost-history-chart-container">
      {/* Trend indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {trend === 'increasing' && (
            <>
              <TrendingUp className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600 font-medium">
                +{Math.abs(trendPercentage).toFixed(1)}% trend
              </span>
            </>
          )}
          {trend === 'decreasing' && (
            <>
              <TrendingDown className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600 font-medium">
                -{Math.abs(trendPercentage).toFixed(1)}% trend
              </span>
            </>
          )}
          {trend === 'stable' && (
            <>
              <Minus className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">
                Stable
              </span>
            </>
          )}
        </div>
        <Badge variant="outline">
          Avg: {currency}{average.toFixed(2)}
        </Badge>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart 
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            tickFormatter={(value) => `${currency}${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Average line */}
          <ReferenceLine 
            y={average} 
            stroke="#888" 
            strokeDasharray="5 5" 
            label={{ value: "Average", position: "right", className: "text-xs" }}
          />
          
          {/* Main cost line */}
          <Line 
            type="monotone" 
            dataKey="cost" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
            name="Landing Cost"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-muted-foreground">Min</div>
          <div className="font-semibold">
            {currency}{Math.min(...chartData.map(d => d.cost)).toFixed(2)}
          </div>
        </div>
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-muted-foreground">Average</div>
          <div className="font-semibold">
            {currency}{average.toFixed(2)}
          </div>
        </div>
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-muted-foreground">Max</div>
          <div className="font-semibold">
            {currency}{Math.max(...chartData.map(d => d.cost)).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}