import React, { useState, useEffect } from 'react';
import { ServiceStatus } from '@shared/types';
import { Cpu, RefreshCw, MessageSquare, Sliders, Layers, Sparkles, CheckCircle2, AlertCircle, Volume2, VolumeX, Printer } from 'lucide-react';
import { soundManager } from '../../utils/soundEffects';

interface Props {
  serviceStatus: ServiceStatus | null;
  hasActiveAnalysis: boolean;
  onNewAnalysis: () => void;
  onOpenAssumptions: () => void;
  onOpenChat: () => void;
  onOpenQuotation?: () => void;
  chatOpen: boolean;
  assumptionsOpen: boolean;
}

export const TopNavBar: React.FC<Props> = ({
  serviceStatus,
  hasActiveAnalysis,
  onNewAnalysis,
  onOpenAssumptions,
  onOpenChat,
  onOpenQuotation,
  chatOpen,
  assumptionsOpen
}) => {
  const gemmaActive = serviceStatus?.gemma?.status === 'Active';
  const perplexityActive = serviceStatus?.perplexity?.status === 'Active';

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundManager.getSoundEnabled());

  useEffect(() => {
    return soundManager.subscribe(enabled => {
      setSoundEnabled(enabled);
    });
  }, []);

  const handleToggleSound = () => {
    soundManager.toggleSound();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0">ManufactureAI</h1>
              <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
                Gemma 4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              From CAD to Cost to Production Strategy
            </p>
          </div>
        </div>

        {/* System & service status badges */}
        <div className="flex items-center gap-2">
          {/* Gemma status */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
              gemmaActive
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
            }`}
            title={serviceStatus?.gemma?.details || 'AI inference status'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium">
              Gemma: {gemmaActive ? serviceStatus?.gemma?.model || 'Active' : 'Fallback (Rule-Based)'}
            </span>
            {gemmaActive ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
          </div>

          {/* Price status */}
          <div
            className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
              perplexityActive
                ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-700/60 text-slate-400'
            }`}
            title={perplexityActive ? 'Live raw-material prices via Perplexity API' : 'Manual price input / local handbook baseline active'}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-medium">
              Market Price: {perplexityActive ? 'Live (Perplexity)' : 'Manual / Base'}
            </span>
          </div>

          {/* CAD engine */}
          <div
            className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border bg-slate-900 border-slate-700/60 text-slate-300"
            title="Native STL/OBJ divergence theorem signed tetrahedron parser"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>CAD Kernel: STL/OBJ Active</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {/* Sound click effect toggle */}
          <button
            onClick={handleToggleSound}
            className={`cursor-target flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-400 hover:text-cyan-300 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Click Sound: Enabled (Click to Mute)' : 'Click Sound: Muted (Click to Unmute)'}
            aria-label="Toggle click sound effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          {hasActiveAnalysis && (
            <>
              {onOpenQuotation && (
                <button
                  onClick={onOpenQuotation}
                  className="cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 shadow-sm shadow-emerald-500/10 transition-all hover:scale-[1.02]"
                  title="Print quotation and complete product technical specifications"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Quotation</span>
                </button>
              )}

              <button
                onClick={onOpenAssumptions}
                className={`cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  assumptionsOpen
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Assumptions</span>
              </button>

              <button
                onClick={onOpenChat}
                className={`cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  chatOpen
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-sm shadow-indigo-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ask AI</span>
              </button>

              <button
                onClick={onNewAnalysis}
                className="cursor-target flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/30 hover:bg-red-900/40 text-red-300 transition-colors"
                title="Clear all data and return to initial empty state"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Analysis</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
