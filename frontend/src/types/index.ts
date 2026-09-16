export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'viewer' | 'evaluator';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithStats extends Project {
  sites_count: number;
  total_area_hectares: number;
  total_carbon_sequestered: number;
  biodiversity_average_score: number;
  primary_site_type: 'carbon' | 'biodiversity';
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  site_type: 'carbon' | 'biodiversity';
  area_hectares: number;
  geometry: GeoJSONPolygon;
  created_at: string;
  project_name?: string;
  latest_metrics?: Record<string, number>;
}

export interface CreateSiteInput {
  project_id: string;
  name: string;
  site_type: 'carbon' | 'biodiversity';
  geometry: GeoJSONPolygon;
}

export interface SiteGeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJSONPolygon;
  properties: {
    id: string;
    name: string;
    site_type: 'carbon' | 'biodiversity';
    area_hectares: number;
    project_id: string;
    project_name?: string;
    latest_metrics?: Record<string, number>;
  };
}

export interface SiteFeatureCollection {
  type: 'FeatureCollection';
  features: SiteGeoJSONFeature[];
}

export interface TimeSeriesPoint {
  recorded_at: string;
  value: number;
  metric_name: string;
}

export interface MetricStatistic {
  current: number;
  min: number;
  max: number;
  average: number;
  trend_percentage: number;
}

export interface SiteAnalyticsSummary {
  site_id: string;
  site_name: string;
  site_type: 'carbon' | 'biodiversity';
  area_hectares: number;
  metrics_available: string[];
  latest_values: Record<string, number>;
  statistics: Record<string, MetricStatistic>;
  time_series: Record<string, TimeSeriesPoint[]>;
}
