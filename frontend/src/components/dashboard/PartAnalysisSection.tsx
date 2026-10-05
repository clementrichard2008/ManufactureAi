import React from 'react';
import { PartDimensions, CadMeshStats } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import { Box, Layers, ShieldCheck, AlertCircle, FileCode, CheckCircle2, Maximize2 } from 'lucide-react';
import { CadViewer } from '../CadViewer';

interface Props {
  dimensions: PartDimensions;
  cadStats: CadMeshStats | null;
  fileBuffer?: ArrayBuffer | null;
  fileName?: string;
  partAnalysisData?: {
    summary: string;
    complexityRating: 'Low' | 'Medium' | 'High' | 'Very High';
    criticalFeatures: string[];
    manufacturingConsiderations: string[];
    suggestedTolerances: string;
    provider: string;
  } | null;
  onOpenCadViewer: () => void;
  onEditDimensions: () => void;
  onCadLoaded?: (stats: CadMeshStats, buffer: ArrayBuffer, name: string) => void;
}

export const PartAnalysisSection: React.FC<Props> = ({
  dimensions,
  cadStats,
  fileBuffer,
  fileName,
  partAnalysisData,
  onOpenCadViewer,
  onEditDimensions,
  onCadLoaded
}) => {
  return (
    <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white m-0">1. Part Analysis & 3D Geometry</h2>
              <OriginBadge origin={cadStats ? 'Calculated' : 'Manual Input'} />
            </div>
            <p className="text-xs text-slate-400">
              Interactive 3D model viewport, dimensional envelope, and volumetric metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cadStats && (
            <button
              onClick={onOpenCadViewer}
              className="cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen Viewport</span>
            </button>
          )}
          <button
            onClick={onEditDimensions}
            className="cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            <span>Edit Dimensions</span>
          </button>
        </div>
      </div>

      {/* Embedded Interactive 3D CAD Viewport */}
      {fileBuffer && (
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>3D CAD Model: {fileName || dimensions.partName}</span>
              {cadStats && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  {cadStats.triangleCount.toLocaleString()} triangles • {cadStats.isWatertight ? 'Watertight Solid' : 'Open Mesh'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Drag to Orbit • Scroll to Zoom • Right-click to Pan
            </span>
          </div>
          <div className="h-[420px] w-full">
            <CadViewer
              meshStats={cadStats}
              fileBuffer={fileBuffer}
              fileName={fileName}
              onCadLoaded={onCadLoaded || (() => {})}
              embedded={true}
            />
          </div>
        </div>
      )}

      {/* Grid: Primary Dimensions & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Geometry Classification */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Geometry Type</span>
            <OriginBadge origin={cadStats ? 'Calculated' : 'Manual Input'} size="xs" />
          </div>
          <div className="text-lg font-bold text-white">{dimensions.geometryType}</div>
          <div className="text-[11px] text-slate-400 font-mono-num truncate">
            {dimensions.partName}
          </div>
        </div>

        {/* Card 2: Bounding Dimensions */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Envelope Dimensions</span>
            <OriginBadge origin={cadStats ? 'Calculated' : 'Manual Input'} size="xs" />
          </div>
          <div className="text-sm font-bold text-cyan-400 font-mono-num">
            {dimensions.diameter ? (
              <>Ø{dimensions.diameter} × {dimensions.height || dimensions.thickness || dimensions.length || cadStats?.boundingBoxMm.height || 0} mm</>
            ) : (
              <>{dimensions.length || cadStats?.boundingBoxMm.length || 0} × {dimensions.width || cadStats?.boundingBoxMm.width || 0} × {dimensions.height || dimensions.thickness || cadStats?.boundingBoxMm.height || 0} mm</>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            Tolerances: ±{dimensions.toleranceMm ?? 0.05} mm
          </div>
        </div>

        {/* Card 3: Volumetric Extraction */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Part Volume</span>
            <OriginBadge origin="Calculated" size="xs" />
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono-num">
            {cadStats
              ? `${cadStats.volumeMm3.toLocaleString()} mm³`
              : `${(dimensions.customVolumeMm3 || 0).toLocaleString()} mm³`}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-num">
            Surface: {cadStats ? `${cadStats.surfaceAreaMm2.toLocaleString()} mm²` : 'Analytical Envelope'}
          </div>
        </div>

        {/* Card 4: Features & Complexity */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Extracted Features</span>
            <OriginBadge origin={cadStats ? 'Calculated' : 'Manual Input'} size="xs" />
          </div>
          <div className="text-sm font-semibold text-white">
            {(dimensions.holeCount || 0) > 0 ? `${dimensions.holeCount} Holes` : 'Solid Profile'}
            {(dimensions.pocketCount || 0) > 0 ? ` • ${dimensions.pocketCount} Pockets` : ''}
          </div>
          <div className="text-[11px] text-slate-400">
            Finish: Ra {dimensions.surfaceFinishRaUm ?? 1.6} µm
          </div>
        </div>
      </div>

      {/* AI Analysis / Rule-Based Part Insight */}
      {partAnalysisData && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Feature & Complexity Evaluation</span>
            </div>
            <OriginBadge
              origin={partAnalysisData.provider.includes('Gemma') ? 'AI Recommendation' : 'Assumption'}
              size="xs"
            />
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {partAnalysisData.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Critical Features:</span>
              <ul className="space-y-1">
                {partAnalysisData.criticalFeatures.map((f, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Manufacturing Considerations:</span>
              <ul className="space-y-1">
                {partAnalysisData.manufacturingConsiderations.map((c, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
