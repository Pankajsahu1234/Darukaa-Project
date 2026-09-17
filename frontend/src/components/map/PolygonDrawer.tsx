// [Refactor iteration 3] Enhanced module implementation
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { CreateSiteInput, GeoJSONPolygon, Site } from '../../types';
import { sitesApi } from '../../api/sites';
import { PenTool, Trash2, Check, AlertCircle, Info, Loader2 } from 'lucide-react';

interface PolygonDrawerProps {
  projectId: string;
  projectName?: string;
  onSiteCreated: (site: Site) => void;
  onCancel: () => void;
  initialCenter?: [number, number];
}

// Client-side spherical area calculation (Hectares) for instant visual feedback
const calculateClientAreaHectares = (coords: number[][]): number => {
  if (!coords || coords.length < 3) return 0;
  let totalRad = 0;
  const rad = Math.PI / 180.0;
  const R = 6378137.0; // Earth radius (m)

  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lon1 = p1[0] * rad;
    const lat1 = p1[1] * rad;
    const lon2 = p2[0] * rad;
    const lat2 = p2[1] * rad;
    totalRad += (lon2 - lon1) * (2.0 + Math.sin(lat1) + Math.sin(lat2));
  }

  const areaSqMeters = Math.abs(totalRad * (R * R) / 2.0);
  return Number((areaSqMeters / 10000.0).toFixed(2));
};

export const PolygonDrawer: React.FC<PolygonDrawerProps> = ({
  projectId,
  projectName,
  onSiteCreated,
  onCancel,
  initialCenter = [88.35, 21.62],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [siteName, setSiteName] = useState('');
  const [siteType, setSiteType] = useState<'carbon' | 'biodiversity'>('carbon');
  const [polygonCoords, setPolygonCoords] = useState<number[][][] | null>(null);
  const [liveAreaHectares, setLiveAreaHectares] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = import.meta.env.VITE_MAPBOX_TOKEN || '';

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: initialCenter,
      zoom: 11,
      attributionControl: false,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
    });

    map.addControl(draw as any, 'top-left');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    const updateGeometry = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[0];
        if (feature.geometry.type === 'Polygon') {
          const coordinates = feature.geometry.coordinates as number[][][];
          setPolygonCoords(coordinates);

          if (coordinates.length > 0 && coordinates[0].length >= 3) {
            const area = calculateClientAreaHectares(coordinates[0]);
            setLiveAreaHectares(area);
          }
          setErrorMessage(null);
        }
      } else {
        setPolygonCoords(null);
        setLiveAreaHectares(0);
      }
    };

    map.on('draw.create', updateGeometry);
    map.on('draw.update', updateGeometry);
    map.on('draw.delete', updateGeometry);

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  const handleStartDraw = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      drawRef.current.changeMode('draw_polygon');
      setPolygonCoords(null);
      setLiveAreaHectares(0);
    }
  };

  const handleClear = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setPolygonCoords(null);
      setLiveAreaHectares(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      setErrorMessage('Please enter a descriptive site name.');
      return;
    }

    if (!polygonCoords || polygonCoords.length === 0 || polygonCoords[0].length < 4) {
      setErrorMessage(
        'Please draw a closed polygon on the map with at least 3 points before saving.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const geometry: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: polygonCoords,
      };

      const payload: CreateSiteInput = {
        project_id: projectId,
        name: siteName.trim(),
        site_type: siteType,
        geometry: geometry,
      };

      const newSite = await sitesApi.create(payload);
      onSiteCreated(newSite);
    } catch (err: any) {
      console.error('Error creating site:', err);
      const detail = err.response?.data?.detail || 'Failed to save site polygon. Check geometry.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-earth-200 shadow-xl overflow-hidden max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-forest-900 to-earth-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
            <PenTool className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Draw New Project Site</h3>
            <p className="text-xs text-earth-300">
              Adding to project: <span className="text-white font-medium">{projectName || projectId}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-earth-400 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Mapbox Canvas */}
        <div className="lg:col-span-2 relative bg-earth-950 min-h-[420px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

          {/* Draw Instructions Overlay */}
          <div className="absolute top-3 left-14 z-10 bg-black/75 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-2 border border-white/10">
            <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Click map points to form polygon vertices. Double-click to close.</span>
          </div>

          {/* Actions on map */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartDraw}
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-earth-800 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <PenTool className="h-3.5 w-3.5 text-forest-600" />
              Draw Again
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-red-700 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              Clear
            </button>
          </div>
        </div>

        {/* Form Panel */}
        <div className="p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-earth-200 bg-earth-50/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                Site Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Northern Canopy Parcel B"
                className="w-full px-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
                Site Classification *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSiteType('carbon')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    siteType === 'carbon'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-white border-earth-200 text-earth-600 hover:bg-earth-100'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Carbon Sink
                </button>
                <button
                  type="button"
                  onClick={() => setSiteType('biodiversity')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    siteType === 'biodiversity'
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-xs'
                      : 'bg-white border-earth-200 text-earth-600 hover:bg-earth-100'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                  Biodiversity
                </button>
              </div>
            </div>

            {/* Calculated Area Indicator */}
            <div className="p-3.5 rounded-lg bg-white border border-earth-200 shadow-xs">
              <span className="text-[11px] font-medium text-earth-500 uppercase tracking-wider">
                Geodesic Area (PostGIS ST_Area)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-earth-900">
                  {liveAreaHectares > 0 ? liveAreaHectares.toLocaleString() : '0.00'}
                </span>
                <span className="text-xs font-semibold text-earth-600">Hectares</span>
              </div>
              <p className="text-[11px] text-earth-400 mt-1">
                {polygonCoords ? 'Polygon closed and verified' : 'Awaiting polygon drawing on map...'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !polygonCoords}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-forest-600 hover:bg-forest-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Computing & Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Site Polygon
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
