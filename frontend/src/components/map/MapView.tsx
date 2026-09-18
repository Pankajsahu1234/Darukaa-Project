import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Site, SiteFeatureCollection } from '../../types';
import { Layers, Maximize2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MapViewProps {
  sites?: Site[];
  geojsonData?: SiteFeatureCollection;
  _selectedSiteId?: string | null;
  onSiteClick?: (siteId: string) => void;
  height?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  interactive?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  sites,
  geojsonData,
  _selectedSiteId,
  onSiteClick,
  height = '540px',
  initialCenter = [88.5, 21.8], // Default to Sundarbans / Indo-Pacific region
  initialZoom = 3,
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'outdoors'>('satellite');
  const [mapError, setMapError] = useState<string | null>(null);
  const navigate = useNavigate();

  const token = import.meta.env.VITE_MAPBOX_TOKEN || '';

  const styleUrls = {
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  };

  // Convert sites list to GeoJSON if not directly provided
  const featureCollection: SiteFeatureCollection = React.useMemo(() => {
    if (geojsonData) return geojsonData;
    if (!sites || sites.length === 0) return { type: 'FeatureCollection', features: [] };

    return {
      type: 'FeatureCollection',
      features: sites
        .filter((s) => s.geometry && s.geometry.coordinates && s.geometry.coordinates.length > 0)
        .map((s) => ({
          type: 'Feature',
          id: s.id,
          geometry: s.geometry,
          properties: {
            id: s.id,
            name: s.name,
            site_type: s.site_type,
            area_hectares: s.area_hectares,
            project_id: s.project_id,
            project_name: s.project_name || 'Conservation Project',
            latest_metrics: s.latest_metrics || {},
          },
        })),
    };
  }, [sites, geojsonData]);

  // Fit bounds to all site coordinates
  const fitToSites = useCallback(() => {
    if (!mapRef.current || featureCollection.features.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    featureCollection.features.forEach((feature) => {
      const rings = feature.geometry.coordinates;
      rings.forEach((ring) => {
        ring.forEach(([lng, lat]) => {
          if (!isNaN(lng) && !isNaN(lat)) {
            bounds.extend([lng, lat]);
            hasCoords = true;
          }
        });
      });
    });

    if (hasCoords) {
      mapRef.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 14,
        duration: 1200,
      });
    }
  }, [featureCollection]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: styleUrls[mapStyle],
        center: initialCenter,
        zoom: initialZoom,
        interactive: interactive,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true, customAttribution: 'Darukaa.Earth PostGIS' }),
        'bottom-left'
      );

      map.on('load', () => {
        setMapLoaded(true);
        mapRef.current = map;
      });

      map.on('error', (e) => {
        console.warn('Mapbox GL warning:', e);
        if (e?.error?.message?.includes('token') || (e?.error as any)?.status === 401) {
          setMapError('Mapbox token verification required for full satellite imagery tiles.');
        }
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize Mapbox:', err);
      setMapError('WebGL not supported or Mapbox failed to initialize.');
    }
  }, []);

  // Switch styles
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    mapRef.current.setStyle(styleUrls[mapStyle]);
  }, [mapStyle]);

  // Update GeoJSON layers whenever data or map style updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = 'sites-source';
    const fillLayerId = 'sites-fill';
    const outlineLayerId = 'sites-outline';
    const labelLayerId = 'sites-label';

    const renderLayers = () => {
      // Remove previous layers and source if existing
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      // Add fresh GeoJSON source
      map.addSource(sourceId, {
        type: 'geojson',
        data: featureCollection as any,
      });

      // Add Polygon Fill Layer with color-coding by site_type
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'match',
            ['get', 'site_type'],
            'biodiversity',
            '#06b6d4', // Teal/cyan for biodiversity
            '#10b981', // Emerald for carbon
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.65,
            0.4,
          ],
        },
      });

      // Add Boundary Outlines
      map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'match',
            ['get', 'site_type'],
            'biodiversity',
            '#0891b2',
            '#059669',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            3,
            2,
          ],
        },
      });

      // Add Site Name Labels on centroid
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.5,
        },
      });

      // Setup Click & Hover Interactivity
      if (interactive) {
        let hoveredId: string | null = null;

        map.on('mouseenter', fillLayerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', fillLayerId, () => {
          map.getCanvas().style.cursor = '';
          if (hoveredId) {
            map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
            hoveredId = null;
          }
          if (popupRef.current) {
            popupRef.current.remove();
          }
        });

        map.on('mousemove', fillLayerId, (e) => {
          if (e.features && e.features.length > 0) {
            const feat = e.features[0];
            const featId = feat.id as string;

            if (hoveredId !== featId) {
              if (hoveredId) {
                map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
              }
              hoveredId = featId;
              map.setFeatureState({ source: sourceId, id: featId }, { hover: true });
            }

            // Create or update interactive popup
            const props = feat.properties as any;
            const area = props.area_hectares ? Number(props.area_hectares).toFixed(1) : 'N/A';
            const typeBadge =
              props.site_type === 'biodiversity'
                ? '<span style="background-color:#cffafe; color:#0e7490; padding:2px 6px; border-radius:9999px; font-size:10px; font-weight:700;">BIODIVERSITY</span>'
                : '<span style="background-color:#d1fae5; color:#065f46; padding:2px 6px; border-radius:9999px; font-size:10px; font-weight:700;">CARBON SINK</span>';

            const popupHtml = `
              <div style="font-family:system-ui; padding:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
                  <strong style="font-size:13px; color:#0f172a;">${props.name}</strong>
                  ${typeBadge}
                </div>
                <div style="font-size:11px; color:#64748b; margin-bottom:4px;">
                  Project: <em>${props.project_name || 'Conservation Zone'}</em>
                </div>
                <div style="font-size:12px; font-weight:600; color:#166534;">
                  &bull; Area: ${area} hectares
                </div>
                <div style="font-size:10px; color:#2563eb; margin-top:6px; text-decoration:underline;">
                  Click to open site analytics cockpit &rarr;
                </div>
              </div>
            `;

            if (!popupRef.current) {
              popupRef.current = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 12,
              });
            }

            popupRef.current.setLngLat(e.lngLat).setHTML(popupHtml).addTo(map);
          }
        });

        map.on('click', fillLayerId, (e) => {
          if (e.features && e.features.length > 0) {
            const siteId = e.features[0].id as string;
            if (onSiteClick) {
              onSiteClick(siteId);
            } else {
              navigate(`/sites/${siteId}`);
            }
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      renderLayers();
    } else {
      map.once('style.load', renderLayers);
    }

    // Automatically zoom to sites on load
    if (featureCollection.features.length > 0) {
      setTimeout(fitToSites, 300);
    }
  }, [mapLoaded, featureCollection, mapStyle, onSiteClick, navigate, fitToSites, interactive]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-earth-200 shadow-sm bg-earth-900">
      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-earth-200 shadow-sm text-xs">
        <Layers className="h-3.5 w-3.5 text-forest-600" />
        <span className="font-semibold text-earth-800">Map Layer:</span>
        <select
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value as any)}
          className="bg-transparent font-medium text-earth-700 outline-none cursor-pointer hover:text-earth-900"
        >
          <option value="satellite">Satellite Streets</option>
          <option value="outdoors">Terrain Outdoors</option>
          <option value="streets">Standard Streets</option>
        </select>
      </div>

      {/* Legend & Fit Button */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={fitToSites}
          title="Zoom to fit all sites"
          className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-earth-200 shadow-sm text-xs font-medium text-earth-700 hover:bg-earth-50 hover:text-earth-900 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5 text-earth-500" />
          <span className="hidden sm:inline">Fit All Sites</span>
        </button>

        <div className="hidden sm:flex items-center gap-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-earth-200 shadow-sm text-[11px] font-medium text-earth-700">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-emerald-600"></span>
            <span>Carbon Sink</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 border border-cyan-600"></span>
            <span>Biodiversity</span>
          </div>
        </div>
      </div>

      {/* Warning banner if token or WebGL fallback */}
      {mapError && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-lg shadow-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{mapError}</span>
        </div>
      )}

      {/* Mapbox Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="relative z-0" />
    </div>
  );
};
