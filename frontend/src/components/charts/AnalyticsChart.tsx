// [Refactor iteration 2] Enhanced module implementation
import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { TimeSeriesPoint, MetricStatistic } from '../../types';
import { TrendingUp, TrendingDown, Calendar, BarChart2, LineChart } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsChartProps {
  timeSeriesData: Record<string, TimeSeriesPoint[]>;
  statistics?: Record<string, MetricStatistic>;
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  availableMetrics?: string[];
}

const METRIC_CONFIGS: Record<
  string,
  { label: string; unit: string; color: string; bgColor: string; borderColor: string }
> = {
  carbon_sequestered_tons: {
    label: 'Carbon Sequestered',
    unit: 't CO₂e',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#059669',
  },
  biodiversity_index: {
    label: 'Biodiversity Health Index',
    unit: 'Score / 100',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#0891b2',
  },
  canopy_cover_percent: {
    label: 'Canopy Density Cover',
    unit: '% Cover',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#d97706',
  },
  soil_organic_carbon: {
    label: 'Soil Organic Carbon (SOC)',
    unit: 't C/ha',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#7c3aed',
  },
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  timeSeriesData,
  statistics,
  selectedMetric,
  onMetricChange,
  availableMetrics = [
    'carbon_sequestered_tons',
    'biodiversity_index',
    'canopy_cover_percent',
    'soil_organic_carbon',
  ],
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '12m' | 'all'>('all');

  const currentConfig = METRIC_CONFIGS[selectedMetric] || {
    label: selectedMetric,
    unit: '',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#059669',
  };

  const rawPoints = timeSeriesData[selectedMetric] || [];

  // Filter by date range preset
  const filteredPoints = useMemo(() => {
    if (rawPoints.length === 0) return [];
    if (dateRange === 'all') return rawPoints;

    const count = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : 12;
    return rawPoints.slice(-count);
  }, [rawPoints, dateRange]);

  const currentStats = statistics?.[selectedMetric];

  // Prepare Chart.js dataset
  const chartData: ChartData<'line' | 'bar'> = useMemo(() => {
    const labels = filteredPoints.map((p) => {
      const d = new Date(p.recorded_at);
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    });

    const values = filteredPoints.map((p) => p.value);

    return {
      labels,
      datasets: [
        {
          label: `${currentConfig.label} (${currentConfig.unit})`,
          data: values,
          borderColor: currentConfig.borderColor,
          backgroundColor:
            chartType === 'line' ? currentConfig.bgColor : currentConfig.color,
          tension: 0.35,
          fill: chartType === 'line',
          pointBackgroundColor: currentConfig.borderColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderRadius: 6,
        },
      ],
    };
  }, [filteredPoints, currentConfig, chartType]);

  const chartOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return ` ${context.parsed.y} ${currentConfig.unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
        },
      },
      y: {
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
        },
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="bg-white rounded-xl border border-earth-200 shadow-sm p-5 space-y-5">
      {/* Top Header Controls: Metric Selector & Chart Type */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-earth-100 pb-4">
        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {availableMetrics.map((metricKey) => {
            const cfg = METRIC_CONFIGS[metricKey] || { label: metricKey };
            const isActive = selectedMetric === metricKey;
            return (
              <button
                key={metricKey}
                onClick={() => onMetricChange(metricKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-earth-900 text-white shadow-xs'
                    : 'bg-earth-50 text-earth-600 hover:bg-earth-100 hover:text-earth-900'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* View Options: Date Filter & Chart Type */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Date Filter */}
          <div className="flex items-center bg-earth-50 rounded-lg p-0.5 border border-earth-200 text-xs">
            {(['3m', '6m', '12m', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2 py-1 rounded-md font-medium uppercase text-[11px] transition-all ${
                  dateRange === range
                    ? 'bg-white text-earth-900 shadow-xs font-bold'
                    : 'text-earth-500 hover:text-earth-800'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Line vs Bar toggle */}
          <div className="flex items-center bg-earth-50 rounded-lg p-0.5 border border-earth-200 text-xs">
            <button
              onClick={() => setChartType('line')}
              title="Line Chart"
              className={`p-1.5 rounded-md transition-all ${
                chartType === 'line'
                  ? 'bg-white text-earth-900 shadow-xs'
                  : 'text-earth-500 hover:text-earth-800'
              }`}
            >
              <LineChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              title="Bar Chart"
              className={`p-1.5 rounded-md transition-all ${
                chartType === 'bar'
                  ? 'bg-white text-earth-900 shadow-xs'
                  : 'text-earth-500 hover:text-earth-800'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {currentStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-earth-50/60 p-3.5 rounded-lg border border-earth-100">
          <div>
            <span className="text-[11px] font-medium text-earth-500 uppercase tracking-wider">
              Current / Latest
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-earth-900">
                {currentStats.current.toLocaleString()}
              </span>
              <span className="text-xs text-earth-500">{currentConfig.unit}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-earth-500 uppercase tracking-wider">
              12-Month Period Delta
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {currentStats.trend_percentage >= 0 ? (
                <div className="flex items-center gap-0.5 text-emerald-700 font-bold text-sm bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+{currentStats.trend_percentage}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-red-700 font-bold text-sm bg-red-100/70 px-1.5 py-0.5 rounded">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>{currentStats.trend_percentage}%</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-earth-500 uppercase tracking-wider">
              Min Observation
            </span>
            <div className="text-sm font-semibold text-earth-700 mt-0.5">
              {currentStats.min} {currentConfig.unit}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-earth-500 uppercase tracking-wider">
              Max Observation
            </span>
            <div className="text-sm font-semibold text-earth-700 mt-0.5">
              {currentStats.max} {currentConfig.unit}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="h-72 w-full">
        {filteredPoints.length > 0 ? (
          chartType === 'line' ? (
            <Line data={chartData as any} options={chartOptions as any} />
          ) : (
            <Bar data={chartData as any} options={chartOptions as any} />
          )
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-earth-400 text-sm">
            <Calendar className="h-8 w-8 mb-2 stroke-1 text-earth-300" />
            <span>No historical observation records available for this metric.</span>
          </div>
        )}
      </div>
    </div>
  );
};
