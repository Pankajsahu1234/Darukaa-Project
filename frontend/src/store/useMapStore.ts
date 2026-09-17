import { create } from 'zustand';
import { Site } from '../types';

interface MapState {
  selectedSite: Site | null;
  hoveredSiteId: string | null;
  selectedProjectId: string | null;
  filterSiteType: 'all' | 'carbon' | 'biodiversity';
  isDrawingMode: boolean;
  drawnCoordinates: number[][][] | null;
  calculatedAreaHectares: number;

  setSelectedSite: (site: Site | null) => void;
  setHoveredSiteId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setFilterSiteType: (type: 'all' | 'carbon' | 'biodiversity') => void;
  setIsDrawingMode: (active: boolean) => void;
  setDrawnCoordinates: (coords: number[][][] | null, area?: number) => void;
  resetDraw: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedSite: null,
  hoveredSiteId: null,
  selectedProjectId: null,
  filterSiteType: 'all',
  isDrawingMode: false,
  drawnCoordinates: null,
  calculatedAreaHectares: 0,

  setSelectedSite: (site) => set({ selectedSite: site }),
  setHoveredSiteId: (id) => set({ hoveredSiteId: id }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setFilterSiteType: (filterSiteType) => set({ filterSiteType }),
  setIsDrawingMode: (isDrawingMode) => set({ isDrawingMode }),
  setDrawnCoordinates: (coords, area = 0) =>
    set({ drawnCoordinates: coords, calculatedAreaHectares: area }),
  resetDraw: () =>
    set({
      isDrawingMode: false,
      drawnCoordinates: null,
      calculatedAreaHectares: 0,
    }),
}));
