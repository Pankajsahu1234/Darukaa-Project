import { apiClient } from './client';
import { SiteAnalyticsSummary, TimeSeriesPoint } from '../types';

export const analyticsApi = {
  getSiteSummary: async (
    siteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SiteAnalyticsSummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await apiClient.get<SiteAnalyticsSummary>(
      `/analytics/sites/${siteId}/summary?${params.toString()}`
    );
    return response.data;
  },

  getTimeSeries: async (
    siteId: string,
    metricName?: string,
    startDate?: string,
    endDate?: string
  ): Promise<TimeSeriesPoint[]> => {
    const params = new URLSearchParams();
    if (metricName) params.append('metric_name', metricName);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await apiClient.get<TimeSeriesPoint[]>(
      `/analytics/sites/${siteId}/time-series?${params.toString()}`
    );
    return response.data;
  },

  recordMetric: async (data: {
    site_id: string;
    metric_name: string;
    value: number;
    recorded_at?: string;
    metric_metadata?: Record<string, unknown>;
  }): Promise<void> => {
    await apiClient.post('/analytics/records', data);
  },
};
