import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '../api/sites';
import { analyticsApi } from '../api/analytics';
import { MapView } from '../components/map/MapView';
import { AnalyticsChart } from '../components/charts/AnalyticsChart';
import {
  ArrowLeft,
  Layers,
  PlusCircle,
  Clock,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

export const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selectedMetric, setSelectedMetric] = useState<string>('carbon_sequestered_tons');
  const [isAddMetricOpen, setIsAddMetricOpen] = useState(false);
  const [newMetricName, setNewMetricName] = useState('carbon_sequestered_tons');
  const [newMetricValue, setNewMetricValue] = useState<number | ''>('');
  const [newMetricDate, setNewMetricDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Fetch site details
  const { data: site, isLoading: siteLoading, isError: siteError } = useQuery({
    queryKey: ['site', id],
    queryFn: () => sitesApi.getById(id!),
    enabled: !!id,
  });

  // Fetch analytics summary & time-series
  const {
    data: analyticsSummary,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ['analyticsSummary', id],
    queryFn: () => analyticsApi.getSiteSummary(id!),
    enabled: !!id,
  });

  // Add observation mutation
  const addMetricMutation = useMutation({
    mutationFn: (data: {
      site_id: string;
      metric_name: string;
      value: number;
      recorded_at?: string;
    }) => analyticsApi.recordMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary', id] });
      queryClient.invalidateQueries({ queryKey: ['site', id] });
      setIsAddMetricOpen(false);
      setNewMetricValue('');
    },
  });

  const handleAddMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMetricValue === '' || isNaN(Number(newMetricValue))) return;

    addMetricMutation.mutate({
      site_id: id!,
      metric_name: newMetricName,
      value: Number(newMetricValue),
      recorded_at: new Date(newMetricDate).toISOString(),
    });
  };

  if (siteLoading || analyticsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
          <p className="text-sm text-earth-500 font-medium">
            Loading site analytics cockpit...
          </p>
        </div>
      </div>
    );
  }

  if (siteError || !site) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-earth-50">
        <h2 className="text-xl font-bold text-earth-800">Site Not Found</h2>
        <p className="text-sm text-earth-500 mt-1 mb-4">
          The requested geographical site could not be retrieved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-forest-600 text-white text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Determine center from polygon coordinates
  const siteCenter: [number, number] =
    site.geometry?.coordinates?.[0]?.[0]
      ? [site.geometry.coordinates[0][0][0], site.geometry.coordinates[0][0][1]]
      : [88.35, 21.62];

  const timeSeriesData = analyticsSummary?.time_series || {};
  const currentMetricRecords = timeSeriesData[selectedMetric] || [];

  return (
    <div className="min-h-screen bg-earth-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-earth-500 font-medium">
          <Link to="/" className="hover:text-earth-900 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            to={`/projects/${site.project_id}`}
            className="hover:text-earth-900 transition-colors"
          >
            {site.project_name || 'Project'}
          </Link>
          <span>/</span>
          <span className="text-earth-800">{site.name}</span>
        </div>

        {/* Site Header Banner */}
        <div className="bg-white rounded-2xl border border-earth-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-earth-900 font-sans tracking-tight">
                {site.name}
              </h1>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                  site.site_type === 'biodiversity'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {site.site_type === 'biodiversity' ? 'Biodiversity Reserve' : 'Carbon Sink'}
              </span>
            </div>
            <p className="text-xs text-earth-500 flex items-center gap-2">
              <span>Parent Project: <strong>{site.project_name || 'Conservation Zone'}</strong></span>
              <span>&bull;</span>
              <span>Established: {new Date(site.created_at).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAddMetricOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Record Observation</span>
            </button>
          </div>
        </div>

        {/* Top Grid: High-res Site Mini-Map + Site Summary KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Site Mini-Map */}
          <div className="bg-white rounded-xl border border-earth-200 shadow-xs p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-earth-800 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-forest-600" />
                <span>Geospatial Boundary</span>
              </span>
              <span className="font-mono text-xs text-earth-500 font-medium">
                {site.area_hectares.toLocaleString()} ha
              </span>
            </div>
            <MapView
              sites={[site]}
              height="260px"
              initialCenter={siteCenter}
              initialZoom={12}
              interactive={true}
            />
          </div>

          {/* Quick Metrics Summary Cards (2 cols on lg) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white border border-earth-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-earth-500 uppercase tracking-wider">
                  Computed Area
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-bold text-earth-900">
                    {site.area_hectares.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-earth-600">Hectares</span>
                </div>
              </div>
              <span className="text-[11px] text-earth-400 mt-2">
                Calculated via PostGIS ST_Area(geography)
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-earth-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-earth-500 uppercase tracking-wider">
                  Carbon Stock
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-bold text-emerald-700">
                    {analyticsSummary?.latest_values['carbon_sequestered_tons']?.toLocaleString() ||
                      '0.0'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">t CO₂e</span>
                </div>
              </div>
              <span className="text-[11px] text-earth-400 mt-2">
                Latest monthly observation
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-earth-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-earth-500 uppercase tracking-wider">
                  Biodiversity Health
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-bold text-cyan-700">
                    {analyticsSummary?.latest_values['biodiversity_index']?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-xs font-semibold text-cyan-600">/ 100</span>
                </div>
              </div>
              <span className="text-[11px] text-earth-400 mt-2">
                Composite species diversity index
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-earth-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-earth-500 uppercase tracking-wider">
                  Canopy Density
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-bold text-amber-700">
                    {analyticsSummary?.latest_values['canopy_cover_percent']?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-xs font-semibold text-amber-600">% Cover</span>
                </div>
              </div>
              <span className="text-[11px] text-earth-400 mt-2">
                PlanetScope 3m high-resolution sensors
              </span>
            </div>
          </div>
        </div>

        {/* Primary Interactive Chart.js Visualizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-earth-900">
              Time-Series Performance & Environmental Trends
            </h2>
            <span className="text-xs text-earth-500">
              Chart.js Visualization &bull; Multi-metric comparative view
            </span>
          </div>

          <AnalyticsChart
            timeSeriesData={timeSeriesData}
            statistics={analyticsSummary?.statistics}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            availableMetrics={analyticsSummary?.metrics_available}
          />
        </div>

        {/* Historical Observations Log Table */}
        <div className="bg-white rounded-xl border border-earth-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-earth-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-forest-600" />
              <h3 className="font-bold text-earth-900 text-sm">
                Historical Observation Logs ({currentMetricRecords.length})
              </h3>
            </div>
            <span className="text-xs text-earth-500 font-mono">
              Displaying metric: {selectedMetric}
            </span>
          </div>

          {currentMetricRecords.length === 0 ? (
            <div className="p-8 text-center text-earth-400 text-xs">
              No historical records for this metric.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-earth-50/90 backdrop-blur-xs">
                  <tr className="border-b border-earth-200 text-earth-600 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-6">Timestamp (UTC)</th>
                    <th className="py-2.5 px-6">Recorded Value</th>
                    <th className="py-2.5 px-6">Verification Method</th>
                    <th className="py-2.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-100">
                  {currentMetricRecords
                    .slice()
                    .reverse()
                    .map((rec, idx) => (
                      <tr key={idx} className="hover:bg-earth-50/60 transition-colors">
                        <td className="py-2.5 px-6 font-mono text-earth-600">
                          {new Date(rec.recorded_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-6 font-bold text-earth-900">
                          {rec.value.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-6 text-earth-600">
                          Remote Sensing / Ground Truth Sensor
                        </td>
                        <td className="py-2.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Observation Modal */}
      {isAddMetricOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-earth-200">
            <div className="flex items-center justify-between pb-4 border-b border-earth-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-forest-50 text-forest-600">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-earth-900">
                    Record New Observation
                  </h3>
                  <p className="text-xs text-earth-500">
                    Append verification data point to {site.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddMetricOpen(false)}
                className="text-earth-400 hover:text-earth-700 p-1 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMetric} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                  Metric Target *
                </label>
                <select
                  value={newMetricName}
                  onChange={(e) => setNewMetricName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
                >
                  <option value="carbon_sequestered_tons">Carbon Sequestered (t CO₂e)</option>
                  <option value="biodiversity_index">Biodiversity Index (0-100)</option>
                  <option value="canopy_cover_percent">Canopy Cover (% Density)</option>
                  <option value="soil_organic_carbon">Soil Organic Carbon (t C/ha)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                  Observed Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 485.50"
                  value={newMetricValue}
                  onChange={(e) =>
                    setNewMetricValue(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                  Date of Observation *
                </label>
                <input
                  type="date"
                  required
                  value={newMetricDate}
                  onChange={(e) => setNewMetricDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddMetricOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-earth-600 hover:bg-earth-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMetricMutation.isPending || newMetricValue === ''}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
                >
                  {addMetricMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Save Observation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
