import React, { useState } from 'react';
import { GeometryType, PartDimensions } from '@shared/types';
import { X, Check, Box, Circle, Cylinder, Sliders, ChevronRight, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dimensions: PartDimensions) => void;
  initialValues?: Partial<PartDimensions> | null;
}

const GEOMETRY_TYPES: { type: GeometryType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'Block', label: 'Prismatic Block', icon: <Box className="w-4 h-4" />, desc: 'Milled rectangular solid (L x W x H)' },
  { type: 'Plate', label: 'Flat Plate / Sheet', icon: <Layers className="w-4 h-4" />, desc: 'Plate with uniform thickness (L x W x T)' },
  { type: 'Cylinder', label: 'Solid Cylinder', icon: <Circle className="w-4 h-4" />, desc: 'Turned axisymmetric cylinder (Dia x L)' },
  { type: 'Shaft', label: 'Shaft / Pin', icon: <Cylinder className="w-4 h-4" />, desc: 'High-aspect turned shaft with bearing fits' },
  { type: 'Tube', label: 'Hollow Tube', icon: <Circle className="w-4 h-4" />, desc: 'Hollow sleeve (OD x Wall x L)' },
  { type: 'Custom', label: 'Custom Geometry', icon: <Sliders className="w-4 h-4" />, desc: 'Arbitrary 3D shape (Direct volume input)' }
];

export const ManualInputForm: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  initialValues
}) => {
  const [geometryType, setGeometryType] = useState<GeometryType>(initialValues?.geometryType || 'Block');
  const [partName, setPartName] = useState(initialValues?.partName || 'Precision Bracket');

  // Dimensional fields
  const [length, setLength] = useState<number | string>(initialValues?.length ?? 120);
  const [width, setWidth] = useState<number | string>(initialValues?.width ?? 80);
  const [height, setHeight] = useState<number | string>(initialValues?.height ?? 25);
  const [thickness, setThickness] = useState<number | string>(initialValues?.thickness ?? 6);
  const [diameter, setDiameter] = useState<number | string>(initialValues?.diameter ?? 50);
  const [shaftDiameter, setShaftDiameter] = useState<number | string>(initialValues?.shaftDiameter ?? 35);
  const [outerDiameter, setOuterDiameter] = useState<number | string>(initialValues?.outerDiameter ?? 60);
  const [innerDiameter, setInnerDiameter] = useState<number | string>(initialValues?.innerDiameter ?? 50);
  const [customVolumeMm3, setCustomVolumeMm3] = useState<number | string>(initialValues?.customVolumeMm3 ?? 150000);

  // Features
  const [holeCount, setHoleCount] = useState<number | string>(initialValues?.holeCount ?? 4);
  const [holeDiameter, setHoleDiameter] = useState<number | string>(initialValues?.holeDiameter ?? 8.5);
  const [holeDepth, setHoleDepth] = useState<number | string>(initialValues?.holeDepth ?? 20);
  const [pocketCount, setPocketCount] = useState<number | string>(initialValues?.pocketCount ?? 1);
  const [pocketLength, setPocketLength] = useState<number | string>(initialValues?.pocketLength ?? 40);
  const [pocketWidth, setPocketWidth] = useState<number | string>(initialValues?.pocketWidth ?? 40);
  const [pocketDepth, setPocketDepth] = useState<number | string>(initialValues?.pocketDepth ?? 10);

  // Engineering specs
  const [toleranceMm, setToleranceMm] = useState<number | string>(initialValues?.toleranceMm ?? 0.05);
  const [surfaceFinishRaUm, setSurfaceFinishRaUm] = useState<number | string>(initialValues?.surfaceFinishRaUm ?? 1.6);
  const [quantity, setQuantity] = useState<number | string>(initialValues?.quantity ?? 50);
  const [application, setApplication] = useState(initialValues?.application || 'Aerospace mounting flange');
  const [mechanicalRequirements, setMechanicalRequirements] = useState(
    initialValues?.mechanicalRequirements || 'High stiffness, lightweight, anodizable'
  );
  const [targetSellingPrice, setTargetSellingPrice] = useState<number | string>(initialValues?.targetSellingPrice ?? '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dims: PartDimensions = {
      geometryType,
      partName: partName.trim() || 'Custom Part',
      length: Number(length) || undefined,
      width: Number(width) || undefined,
      height: Number(height) || undefined,
      thickness: Number(thickness) || undefined,
      diameter: Number(diameter) || undefined,
      shaftDiameter: Number(shaftDiameter) || undefined,
      outerDiameter: Number(outerDiameter) || undefined,
      innerDiameter: innerDiameter !== '' ? Number(innerDiameter) : undefined,
      customVolumeMm3: Number(customVolumeMm3) || undefined,
      holeCount: Number(holeCount) || 0,
      holeDiameter: Number(holeDiameter) || 0,
      holeDepth: Number(holeDepth) || 0,
      pocketCount: Number(pocketCount) || 0,
      pocketLength: Number(pocketLength) || 0,
      pocketWidth: Number(pocketWidth) || 0,
      pocketDepth: Number(pocketDepth) || 0,
      toleranceMm: Number(toleranceMm) || 0.1,
      surfaceFinishRaUm: Number(surfaceFinishRaUm) || 1.6,
      quantity: Math.max(1, Number(quantity) || 1),
      application: application.trim(),
      mechanicalRequirements: mechanicalRequirements.trim(),
      targetSellingPrice: targetSellingPrice !== '' ? Number(targetSellingPrice) : undefined
    };

    onSubmit(dims);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 my-8 text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Enter Part Dimensions & Engineering Requirements
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter real measurements. Volume and machining MRR are calculated deterministically.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Part Name & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Part Name / Identifier
              </label>
              <input
                type="text"
                required
                value={partName}
                onChange={e => setPartName(e.target.value)}
                placeholder="e.g. Flange Mount Housing"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Order Quantity (units)
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Geometry Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Geometry Classification
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GEOMETRY_TYPES.map(g => (
                <button
                  type="button"
                  key={g.type}
                  onClick={() => setGeometryType(g.type)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    geometryType === g.type
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-white">
                    {g.icon}
                    <span>{g.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-tight">{g.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Geometry Dimensions Form (Only relevant fields shown) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Primary Dimensions (mm)</span>
            </h3>

            {geometryType === 'Block' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={length}
                    onChange={e => setLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={width}
                    onChange={e => setWidth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {geometryType === 'Plate' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={length}
                    onChange={e => setLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={width}
                    onChange={e => setWidth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Thickness (mm)</label>
                  <input
                    type="number"
                    min="0.2"
                    step="any"
                    required
                    value={thickness}
                    onChange={e => setThickness(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {geometryType === 'Cylinder' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Diameter (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={diameter}
                    onChange={e => setDiameter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={length}
                    onChange={e => setLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {geometryType === 'Shaft' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Shaft Diameter (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={shaftDiameter}
                    onChange={e => setShaftDiameter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Overall Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={length}
                    onChange={e => setLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {geometryType === 'Tube' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Outer Diameter (mm)</label>
                  <input
                    type="number"
                    min="2"
                    step="any"
                    required
                    value={outerDiameter}
                    onChange={e => setOuterDiameter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Wall Thickness (mm)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="any"
                    required
                    value={thickness}
                    onChange={e => setThickness(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={length}
                    onChange={e => setLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {geometryType === 'Custom' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Custom Part Net Volume (mm³)</label>
                <input
                  type="number"
                  min="10"
                  step="any"
                  required
                  value={customVolumeMm3}
                  onChange={e => setCustomVolumeMm3(e.target.value)}
                  placeholder="e.g. 125000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tip: 1 cm³ = 1,000 mm³. A 100x50x20 mm block is 100,000 mm³.
                </p>
              </div>
            )}
          </div>

          {/* Machining Features: Holes and Pockets */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              Internal Features (Holes & Pockets)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Holes */}
              <div className="space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Drilled Holes</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Count</label>
                    <input
                      type="number"
                      min="0"
                      value={holeCount}
                      onChange={e => setHoleCount(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Dia (mm)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={holeDiameter}
                      onChange={e => setHoleDiameter(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Depth (mm)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={holeDepth}
                      onChange={e => setHoleDepth(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                </div>
              </div>

              {/* Pockets */}
              <div className="space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Milled Pockets</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Count</label>
                    <input
                      type="number"
                      min="0"
                      value={pocketCount}
                      onChange={e => setPocketCount(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">L (mm)</label>
                    <input
                      type="number"
                      min="0"
                      value={pocketLength}
                      onChange={e => setPocketLength(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">W (mm)</label>
                    <input
                      type="number"
                      min="0"
                      value={pocketWidth}
                      onChange={e => setPocketWidth(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">D (mm)</label>
                    <input
                      type="number"
                      min="0"
                      value={pocketDepth}
                      onChange={e => setPocketDepth(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs font-mono-num"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Engineering Specifications & Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Machining Tolerance (±mm)
              </label>
              <input
                type="number"
                min="0.005"
                max="1.0"
                step="0.005"
                required
                value={toleranceMm}
                onChange={e => setToleranceMm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">e.g. 0.05 for precision CNC</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Surface Finish Ra (µm)
              </label>
              <input
                type="number"
                min="0.1"
                max="12.5"
                step="0.1"
                required
                value={surfaceFinishRaUm}
                onChange={e => setSurfaceFinishRaUm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">e.g. 1.6 standard, 0.8 smooth</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Selling Price (₹) <span className="text-slate-500 font-normal lowercase">(opt)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={targetSellingPrice}
                onChange={e => setTargetSellingPrice(e.target.value)}
                placeholder="Auto (30% margin)"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono-num text-sm focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">Leave blank for margin-based</span>
            </div>
          </div>

          {/* Application and Mechanical Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Application / Environment
              </label>
              <input
                type="text"
                value={application}
                onChange={e => setApplication(e.target.value)}
                placeholder="e.g. Marine drone actuator bracket"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Mechanical Requirements
              </label>
              <input
                type="text"
                value={mechanicalRequirements}
                onChange={e => setMechanicalRequirements(e.target.value)}
                placeholder="e.g. High strength-to-weight, corrosion resistant"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Compute & Run Analysis</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
