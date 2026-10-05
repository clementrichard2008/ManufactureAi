import React, { useState, useRef } from 'react';
import {
  PenTool,
  Upload,
  Cpu,
  ShieldCheck,
  Database,
  Sliders,
  Sparkles,
  Bot,
  Loader2,
  ExternalLink,
  Box,
  Zap,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw
} from 'lucide-react';

interface Props {
  onEnterManual: () => void;
  onUploadCad: () => void;
  onGenerateAiCad: (prompt: string, model: 'prompt2cad' | 'claude' | 'gemini') => Promise<void>;
  isGenerating?: boolean;
}

export const EmptyState: React.FC<Props> = ({
  onEnterManual,
  onUploadCad,
  onGenerateAiCad,
  isGenerating = false
}) => {
  const [selectedAiModel, setSelectedAiModel] = useState<'prompt2cad' | 'claude' | 'gemini'>('prompt2cad');
  const [promptInput, setPromptInput] = useState('');

  // 16:9 Video State & Controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsVideoMuted(nextMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleRestartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsVideoPlaying(true);
  };

  const quickPromptsByModel = {
    prompt2cad: [
      'precision spur gear with 20 teeth 90mm diameter with 25mm center bore',
      'aerodynamic 3-blade propeller 180mm diameter with central hub',
      'extruded thermal heatsink 100mm x 80mm with 7 vertical cooling fins',
      'l-shaped mounting bracket 80mm length 50mm width with stiffener gusset',
      'industrial piping flange 120mm diameter 18mm thickness with 6 bolt holes',
      'articulated robotic gripper claw 90mm length 50mm width',
      'thin-wall electronics enclosure chassis 120mm length 80mm width 45mm height',
      'drone quadcopter motor arm 140mm length 35mm width with motor mount ring',
      'stepped power transmission shaft 40mm diameter 180mm length with bearing journals',
      'create a cylindrical water bottle with 80mm diameter 180 mm height'
    ],
    claude: [
      'stepped power transmission shaft 40mm diameter 180mm length with bearing journals',
      'drone quadcopter motor arm 140mm length 35mm width with motor mount ring',
      'hemispherical pressure vessel dome cap 100mm diameter 50mm height',
      'hollow cylindrical pipe sleeve 60mm outer diameter 120mm length 5mm wall',
      'aluminum electronics enclosure 120mm length 80mm width 45mm height with cavity',
      'create a cylindrical water bottle with 80mm diameter 180 mm height'
    ],
    gemini: [
      'precision spur gear 20 teeth 90mm diameter 20mm thickness with 25mm bore',
      'aerodynamic 3-blade propeller 180mm diameter with central hub',
      'industrial piping flange 120mm diameter 18mm thickness with 6 bolt holes',
      'l-shaped mounting bracket 80mm length 50mm width 70mm height with gusset rib',
      'thin-wall electronics enclosure chassis 120mm length 80mm width 45mm height',
      'create a cylindrical water bottle with 80mm diameter 180 mm height'
    ]
  };

  const currentPrompts = quickPromptsByModel[selectedAiModel];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;
    onGenerateAiCad(promptInput.trim(), selectedAiModel);
  };

  const handleSelectQuickPrompt = (prompt: string) => {
    setPromptInput(prompt);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full py-4 sm:py-6 space-y-8 animate-fadeIn">
      {/* Top Hero Typography & Team TorqueTech Header */}
      <div className="w-full flex flex-col items-center text-center space-y-3">
        {/* Team TorqueTech Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-medium text-cyan-300 shadow-lg shadow-cyan-950/40">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-slate-400">Engineered by</span>
          <strong className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300 font-bold tracking-wide">
            Team TorqueTech
          </strong>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">Autonomous Manufacturing Intelligence</span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-2">
            Manufacture<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">AI</span>
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 font-medium max-w-3xl mx-auto">
            AI-Powered Manufacturing Engineering, CAD Synthesis & Economic Optimization (INR ₹)
          </p>
        </div>
      </div>

      {/* 2-Column Split: 16:9 Metallurgy Evolution Video on Left, Input Box on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
        {/* ===================== LEFT COLUMN: 16:9 Metallurgy Evolution Video ===================== */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 text-left shadow-2xl relative overflow-hidden group">
            {/* Ambient background glow */}
            <div className="absolute -top-12 -left-12 w-56 h-56 bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Video Header / Status */}
            <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20">
                  <Play className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white block">Evolution of Metallurgy</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                      16:9 HD
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Ore smelting to high-precision 5-axis CNC machining
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-cyan-300/80 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                  TorqueTech Media
                </span>
              </div>
            </div>

            {/* 16:9 Aspect Ratio Video Frame */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40">
              <video
                ref={videoRef}
                src="https://res.cloudinary.com/ew2a27vg/video/upload/v1791196482/Video_of_metallurgy_evolution_20261005160417.mp4"
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                className="w-full h-full object-cover rounded-xl"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              />

              {/* Floating Sleek Controls Bar */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/60 shadow-lg transition-all">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleVideoPlay}
                    className="cursor-target p-1.5 rounded-md text-slate-200 hover:text-cyan-400 hover:bg-slate-800/80 transition-all cursor-pointer"
                    title={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                    aria-label={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleVideoMute}
                    className="cursor-target p-1.5 rounded-md text-slate-200 hover:text-cyan-400 hover:bg-slate-800/80 transition-all cursor-pointer"
                    title={isVideoMuted ? 'Unmute Sound' : 'Mute Sound'}
                    aria-label={isVideoMuted ? 'Unmute Sound' : 'Mute Sound'}
                  >
                    {isVideoMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRestartVideo}
                    className="cursor-target p-1.5 rounded-md text-slate-200 hover:text-cyan-400 hover:bg-slate-800/80 transition-all cursor-pointer"
                    title="Replay Video from Start"
                    aria-label="Replay Video"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[11px] text-slate-300 font-medium pl-1 hidden sm:inline">
                    Metallurgy Evolution Timeline
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold uppercase tracking-wider hidden xs:inline">
                    TorqueTech
                  </span>
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="cursor-target p-1.5 rounded-md text-slate-200 hover:text-cyan-400 hover:bg-slate-800/80 transition-all cursor-pointer"
                    title="Fullscreen"
                    aria-label="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Metallurgy Timeline Information Badges */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  From Foundry Refining to Autonomous CNC Manufacturing
                </span>
                <span className="text-[10px] font-mono text-cyan-400/90 font-semibold">
                  Team TorqueTech
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Metallurgy drives every manufacturing boundary. ManufactureAI pairs historical metallurgical principles with AI-driven parametric CAD solid modeling and deterministic cycle-time algorithms.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Ancient Smelting',
                  'Bessemer Steel',
                  'Superalloys (Inconel)',
                  '5-Axis Subtractive CNC',
                  'AI Parametric CAD'
                ].map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN: The Input Box & Actions ===================== */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          {/* AI CAD Generator Card (The Input Box) */}
          <div className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 text-left shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-500/15 via-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white block">Generate 3D CAD & Analyze with AI</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                      Instant &lt;50ms
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Text prompt → Parametric 3D solid model + exact volume + automated material
                  </span>
                </div>
              </div>

              {/* Model Selector: Prompt2CAD | Claude AI | Gemini AI */}
              <div className="flex flex-wrap items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedAiModel('prompt2cad')}
                  className={`cursor-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedAiModel === 'prompt2cad'
                      ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Prompt2CAD™</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAiModel('claude')}
                  className={`cursor-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedAiModel === 'claude'
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Claude AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAiModel('gemini')}
                  className={`cursor-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedAiModel === 'gemini'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm shadow-blue-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini AI</span>
                </button>
              </div>
            </div>

            {/* Prompt2CAD attribution note */}
            <div className="mb-3 px-3 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  Powered by <strong>Prompt2CAD™</strong> architecture for production-ready 3D CAD models.
                </span>
              </div>
              <a
                href="https://prompt2cad.com"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-target inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
              >
                <span>prompt2cad.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Prompt Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <textarea
                  rows={2}
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  placeholder="e.g. precision spur gear with 20 teeth 90mm diameter with central bore"
                  className="cursor-target w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder-slate-500 text-sm resize-none transition-all outline-none"
                  disabled={isGenerating}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-400">
                  Active Engine:{' '}
                  <strong className="text-cyan-300 font-semibold">
                    {selectedAiModel === 'prompt2cad'
                      ? 'Prompt2CAD™ Parametric Solid Synthesizer'
                      : selectedAiModel === 'claude'
                      ? 'Claude AI Analytical CAD Engine'
                      : 'Google Gemini (Gemma 4)'}
                  </strong>
                </span>

                <button
                  type="submit"
                  disabled={!promptInput.trim() || isGenerating}
                  className={`cursor-target flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                    !promptInput.trim() || isGenerating
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-cyan-500/25 cursor-pointer transform hover:-translate-y-0.5'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing 3D CAD...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Build 3D Model & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick prompt example chips */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Click to try an example prompt:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickPrompt(qp)}
                    className="cursor-target text-left text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Entry & CAD Upload Buttons in Right Column */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Or Use Standard Engineering Inputs
              </span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onEnterManual}
                className="cursor-target w-full sm:w-1/2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-white font-semibold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <PenTool className="w-4 h-4 text-cyan-400" />
                <span>Enter Dimensions Manually</span>
              </button>

              <button
                onClick={onUploadCad}
                className="cursor-target w-full sm:w-1/2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-white font-semibold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload CAD (STEP, STP, STL, OBJ)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Core Engineering Principles Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left pt-6 border-t border-slate-800/80">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Real Geometry Only</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Prompt2CAD builds true 3D solid geometry and computes exact mathematical volume, area, and bounding envelope.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>INR (₹) Deterministic Math</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI never invents prices or costs. All rupee calculations derive from verified physical machining cycle times and industrial rates.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Automated & Editable</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI recommends materials automatically based on functionality, but you can override to any alloy or price with 1 click.
          </p>
        </div>
      </div>

      {/* Team TorqueTech Bottom Info Section */}
      <div className="w-full bg-slate-900/60 border border-cyan-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-indigo-600/20 border border-cyan-500/40 flex items-center justify-center glow-cyan shrink-0">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Engineered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300 font-extrabold">Team TorqueTech</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                TorqueTech Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous Manufacturing Cost Engine, 3D CAD Synthesis & Real-Time Metallurgy Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] font-semibold">
            Team TorqueTech • 2026
          </span>
        </div>
      </div>
    </div>
  );
};
