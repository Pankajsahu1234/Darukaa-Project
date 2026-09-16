import React from 'react';
import { Database, ShieldCheck, Activity, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-earth-200 bg-white py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-earth-500">
        {/* Brand & Copyright */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-earth-800">Darukaa.Earth</span>
          <span>&bull;</span>
          <span>Geospatial Platform for Carbon & Biodiversity Monitoring</span>
        </div>

        {/* System & Architecture Status Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
            <Activity className="h-3 w-3 text-emerald-500" />
            <span>FastAPI 0.111 / Async</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
            <Database className="h-3 w-3 text-blue-500" />
            <span>PostgreSQL 16 + PostGIS 3.4</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] font-medium">
            <MapPin className="h-3 w-3 text-cyan-500" />
            <span>Mapbox GL JS & Draw</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
            <ShieldCheck className="h-3 w-3 text-slate-500" />
            <span>JWT Auth & ST_Area Verification</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
