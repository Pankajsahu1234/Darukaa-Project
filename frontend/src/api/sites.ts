import { apiClient } from './client';
import { CreateSiteInput, Site, SiteFeatureCollection } from '../types';

export const sitesApi = {
  list: async (projectId?: string, siteType?: string): Promise<Site[]> => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (siteType) params.append('site_type', siteType);
    const response = await apiClient.get<Site[]>(`/sites/?${params.toString()}`);
    return response.data;
  },

  getGeoJSON: async (projectId?: string): Promise<SiteFeatureCollection> => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    const response = await apiClient.get<SiteFeatureCollection>(
      `/sites/geojson?${params.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<Site> => {
    const response = await apiClient.get<Site>(`/sites/${id}`);
    return response.data;
  },

  create: async (data: CreateSiteInput): Promise<Site> => {
    const response = await apiClient.post<Site>('/sites/', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sites/${id}`);
  },
};
