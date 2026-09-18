import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { sitesApi } from '../api/sites';
import { MapView } from '../components/map/MapView';
import { PolygonDrawer } from '../components/map/PolygonDrawer';
import {
  ArrowLeft,
  Plus,
  PenTool,
  MapPin,
  Layers,
  ExternalLink,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Site } from '../types';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  // Fetch project details
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  // Fetch sites for this project
  const { data: sites = [] } = useQuery({
    queryKey: ['sites', { projectId: id }],
    queryFn: () => sitesApi.list(id!),
    enabled: !!id,
  });

  const handleSiteCreated = (_newSite: Site) => {
    queryClient.invalidateQueries({ queryKey: ['sites', { projectId: id }] });
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setIsDrawingOpen(false);
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (window.confirm(`Are you sure you want to delete "${siteName}"?`)) {
      try {
        await sitesApi.delete(siteId);
        queryClient.invalidateQueries({ queryKey: ['sites', { projectId: id }] });
        queryClient.invalidateQueries({ queryKey: ['project', id] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      } catch (err) {
        console.error('Failed to delete site:', err);
      }
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
          <p className="text-sm text-earth-500 font-medium">Loading project geospatial data...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-earth-50">
        <h2 className="text-xl font-bold text-earth-800">Project Not Found</h2>
        <p className="text-sm text-earth-500 mt-1 mb-4">
          The requested conservation project could not be located.
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

  // Calculate project map center from first site or default
  const initialCenter: [number, number] =
    sites.length > 0 && sites[0].geometry?.coordinates?.[0]?.[0]
      ? [sites[0].geometry.coordinates[0][0][0], sites[0].geometry.coordinates[0][0][1]]
      : [88.35, 21.62];

  return (
    <div className="min-h-screen bg-earth-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-earth-500 font-medium">
          <Link to="/" className="hover:text-earth-900 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-earth-800">{project.name}</span>
        </div>

        {/* Project Header Banner */}
        <div className="bg-white rounded-2xl border border-earth-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-earth-900 font-sans tracking-tight">
                {project.name}
              </h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Active Project
              </span>
            </div>
            <p className="text-sm text-earth-600 leading-relaxed">
              {project.description || 'No detailed scope description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsDrawingOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md"
            >
              <PenTool className="h-4 w-4" />
              <span>Draw New Site</span>
            </button>
          </div>
        </div>

        {/* Project KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-earth-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-earth-500 uppercase tracking-wider">
              Total Sites Monitored
            </span>
            <div className="text-2xl font-bold text-earth-900 mt-1">
              {sites.length}
            </div>
            <span className="text-[11px] text-earth-400">PostGIS Geometry Polygons</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-earth-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-earth-500 uppercase tracking-wider">
              Project Surface Area
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-earth-900">
                {project.total_area_hectares.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-earth-600">ha</span>
            </div>
            <span className="text-[11px] text-earth-400">ST_Area(geography)</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-earth-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-earth-500 uppercase tracking-wider">
              Carbon Sequestration
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-emerald-700">
                {project.total_carbon_sequestered.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-emerald-600">t CO₂e</span>
            </div>
            <span className="text-[11px] text-earth-400">Aggregated remote sensing</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-earth-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-earth-500 uppercase tracking-wider">
              Mean Biodiversity
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-cyan-700">
                {project.biodiversity_average_score}
              </span>
              <span className="text-xs font-semibold text-cyan-600">/ 100</span>
            </div>
            <span className="text-[11px] text-earth-400">Flora & fauna index</span>
          </div>
        </div>

        {/* Interactive Polygon Drawer Modal if active */}
        {isDrawingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <PolygonDrawer
              projectId={id!}
              projectName={project.name}
              initialCenter={initialCenter}
              onSiteCreated={handleSiteCreated}
              onCancel={() => setIsDrawingOpen(false)}
            />
          </div>
        )}

        {/* Project Interactive Map */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-earth-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-forest-600" />
              <span>Project Site Boundaries</span>
            </h2>
            <span className="text-xs text-earth-500">
              Click a site polygon to inspect time-series charts
            </span>
          </div>

          <MapView
            sites={sites}
            height="460px"
            initialCenter={initialCenter}
            initialZoom={11}
            onSiteClick={(siteId) => navigate(`/sites/${siteId}`)}
          />
        </div>

        {/* Sites List Table */}
        <div className="bg-white rounded-xl border border-earth-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-earth-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-forest-600" />
              <h3 className="font-bold text-earth-900 text-sm">
                Monitored Sites Directory ({sites.length})
              </h3>
            </div>

            <button
              onClick={() => setIsDrawingOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Site</span>
            </button>
          </div>

          {sites.length === 0 ? (
            <div className="py-12 text-center text-earth-500 p-6">
              <PenTool className="h-8 w-8 mx-auto text-earth-400 mb-2" />
              <p className="text-sm font-semibold text-earth-800">No geographical sites added yet</p>
              <p className="text-xs text-earth-500 max-w-sm mx-auto mt-1 mb-4">
                Use the map polygon drawing tool to delimit your first conservation site parcel.
              </p>
              <button
                onClick={() => setIsDrawingOpen(true)}
                className="px-4 py-2 rounded-lg bg-forest-600 text-white text-xs font-semibold hover:bg-forest-700"
              >
                Draw First Site Polygon
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-earth-100 bg-earth-50/60 text-earth-600 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-6">Site Name</th>
                    <th className="py-3 px-6">Classification</th>
                    <th className="py-3 px-6">Computed Area</th>
                    <th className="py-3 px-6">Coordinates</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-100">
                  {sites.map((site) => (
                    <tr
                      key={site.id}
                      className="hover:bg-earth-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/sites/${site.id}`)}
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-earth-900 group-hover:text-forest-700 transition-colors">
                          {site.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            site.site_type === 'biodiversity'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              site.site_type === 'biodiversity' ? 'bg-cyan-500' : 'bg-emerald-500'
                            }`}
                          />
                          {site.site_type === 'biodiversity' ? 'Biodiversity' : 'Carbon Sink'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-mono font-medium text-earth-800">
                          {site.area_hectares.toLocaleString()} ha
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-mono text-earth-500 text-[11px]">
                          {site.geometry?.coordinates?.[0]?.length || 0} vertices
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/sites/${site.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-forest-600 hover:text-forest-800"
                          >
                            <span>Analytics</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <button
                            onClick={() => handleDeleteSite(site.id, site.name)}
                            className="text-earth-400 hover:text-red-600 transition-colors"
                            title="Delete site"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
