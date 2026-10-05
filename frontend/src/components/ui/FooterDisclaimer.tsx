import React from 'react';
import { ShieldAlert, Cpu } from 'lucide-react';

export const FooterDisclaimer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-sm py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/30">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="font-semibold text-slate-200">
            ManufactureAI <span className="text-cyan-400 font-bold">| TorqueTech</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">
            Developed & Engineered by <strong className="text-cyan-400 font-bold">Team TorqueTech</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-center md:text-right max-w-2xl">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:inline-block" />
          <span>
            ManufactureAI provides engineering and manufacturing estimates for decision support. Final material selection, manufacturing parameters, tolerances, and production decisions should be validated by a qualified manufacturing engineer.
          </span>
        </div>
      </div>
    </footer>
  );
};
