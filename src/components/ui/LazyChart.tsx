/**
 * Lazy-loaded chart wrapper to defer recharts loading
 * Only loads the heavy chart library when actually needed
 * Reduces initial bundle size significantly
 */
import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the actual chart components only when needed
const LazyLineChart = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
);

const LazyBarChart = lazy(() => 
  import('recharts').then(module => ({ default: module.BarChart }))
);

const LazyAreaChart = lazy(() => 
  import('recharts').then(module => ({ default: module.AreaChart }))
);

const LazyPieChart = lazy(() => 
  import('recharts').then(module => ({ default: module.PieChart }))
);

// Also lazy load chart components
const LazyLine = lazy(() => 
  import('recharts').then(module => ({ default: module.Line }))
);

const LazyBar = lazy(() => 
  import('recharts').then(module => ({ default: module.Bar }))
);

const LazyArea = lazy(() => 
  import('recharts').then(module => ({ default: module.Area }))
);

const LazyPie = lazy(() => 
  import('recharts').then(module => ({ default: module.Pie }))
);

const LazyCell = lazy(() => 
  import('recharts').then(module => ({ default: module.Cell }))
);

const LazyXAxis = lazy(() => 
  import('recharts').then(module => ({ default: module.XAxis }))
);

const LazyYAxis = lazy(() => 
  import('recharts').then(module => ({ default: module.YAxis }))
);

const LazyCartesianGrid = lazy(() => 
  import('recharts').then(module => ({ default: module.CartesianGrid }))
);

const LazyTooltip = lazy(() => 
  import('recharts').then(module => ({ default: module.Tooltip }))
);

const LazyLegend = lazy(() => 
  import('recharts').then(module => ({ default: module.Legend }))
);

const LazyResponsiveContainer = lazy(() => 
  import('recharts').then(module => ({ default: module.ResponsiveContainer }))
);

// Chart loading skeleton
const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="space-y-3" style={{ height }}>
    <Skeleton className="h-4 w-1/4" />
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-5/6" />
      <Skeleton className="h-8 w-4/6" />
      <Skeleton className="h-8 w-3/6" />
      <Skeleton className="h-8 w-2/6" />
    </div>
    <div className="flex space-x-2 pt-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

// Wrapper components that provide the lazy loading behavior
export const LineChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <LazyLineChart {...props} />
  </Suspense>
);

export const BarChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <LazyBarChart {...props} />
  </Suspense>
);

export const AreaChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <LazyAreaChart {...props} />
  </Suspense>
);

export const PieChart: React.FC<any> = (props) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <LazyPieChart {...props} />
  </Suspense>
);

export const Line: React.FC<any> = (props) => (
  <Suspense fallback={<div>Loading chart data...</div>}>
    <LazyLine {...props} />
  </Suspense>
);

export const Bar: React.FC<any> = (props) => (
  <Suspense fallback={<div>Loading chart data...</div>}>
    <LazyBar {...props} />
  </Suspense>
);

export const Area: React.FC<any> = (props) => (
  <Suspense fallback={<div>Loading chart data...</div>}>
    <LazyArea {...props} />
  </Suspense>
);

export const Pie: React.FC<any> = (props) => (
  <Suspense fallback={<div>Loading chart data...</div>}>
    <LazyPie {...props} />
  </Suspense>
);

export const Cell: React.FC<any> = (props) => (
  <Suspense fallback={null}>
    <LazyCell {...props} />
  </Suspense>
);

export const XAxis: React.FC<any> = (props) => (
  <Suspense fallback={null}>
    <LazyXAxis {...props} />
  </Suspense>
);

export const YAxis: React.FC<any> = (props) => (
  <Suspense fallback={null}>
    <LazyYAxis {...props} />
  </Suspense>
);

export const CartesianGrid: React.FC<any> = (props) => (
  <Suspense fallback={null}>
    <LazyCartesianGrid {...props} />
  </Suspense>
);

export const Tooltip: React.FC<any> = (props) => (
  <Suspense fallback={null}>
    <LazyTooltip {...props} />
  </Suspense>
);

export const Legend: React.FC<any> = (props) => (
  <Suspense fallback={null}>
    <LazyLegend {...props} />
  </Suspense>
);

export const ResponsiveContainer: React.FC<any> = (props) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <LazyResponsiveContainer {...props} />
  </Suspense>
);

// Re-export everything with lazy loading
export * from 'recharts';
export default {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
};