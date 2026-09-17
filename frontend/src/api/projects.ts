import { apiClient } from './client';
import { CreateProjectInput, ProjectWithStats } from '../types';

export const projectsApi = {
  list: async (): Promise<ProjectWithStats[]> => {
    const response = await apiClient.get<ProjectWithStats[]>('/projects/');
    return response.data;
  },

  getById: async (id: string): Promise<ProjectWithStats> => {
    const response = await apiClient.get<ProjectWithStats>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectInput): Promise<ProjectWithStats> => {
    const response = await apiClient.post<ProjectWithStats>('/projects/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateProjectInput>): Promise<ProjectWithStats> => {
    const response = await apiClient.put<ProjectWithStats>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
