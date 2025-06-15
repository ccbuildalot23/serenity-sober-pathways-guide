
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface AlertHistoryChartsProps {
  chartData: { name: string; alerts: number }[];
  chartPeriod: 'week' | 'month';
  onChartPeriodChange: (value: 'week' | 'month') => void;
}

const AlertHistoryCharts: React.FC<AlertHistoryChartsProps> = ({
  chartData,
  chartPeriod,
  onChartPeriodChange
}) => {
  const chartConfig = {
    alerts: {
      label: "Alerts",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Alert Frequency</h3>
        <Select value={chartPeriod} onValueChange={onChartPeriodChange}>
          <SelectTrigger className="w-32" aria-label="Select time period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 4 weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Alert Trends</CardTitle>
          <CardDescription>
            Number of alerts sent over {chartPeriod === 'week' ? 'the last 7 days' : 'the last 4 weeks'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="h-[300px]"
            role="img"
            aria-label="Alert frequency bar chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="alerts" fill="var(--color-alerts)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertHistoryCharts;
