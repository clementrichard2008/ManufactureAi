import { ManufacturingProcessType, ProcessComparisonItem, PartDimensions, MaterialProperties } from './types';

export interface ProcessProfile {
  name: ManufacturingProcessType;
  category: 'Subtractive' | 'Forming/Casting' | 'Additive' | 'Sheet/Profile' | 'Finishing/Joining';
  baseToolingCostUsd: number;
  baseSetupCostUsd: number;
  standardCycleTimeMinPerDm3: number; // minutes per cubic decimeter (1,000,000 mm^3)
  variableCostMultiplier: number;
  bestQuantityMin: number;
  bestQuantityMax: number;
  achievableToleranceMm: number;
  achievableSurfaceFinishRaUm: number;
  rotationalOnly?: boolean;
  prismaticPreferred?: boolean;
  sheetOnly?: boolean;
  metalsOnly?: boolean;
  plasticsOnly?: boolean;
  allowsHolesAndPockets: boolean;
  description: string;
}

export const PROCESS_PROFILES: Record<ManufacturingProcessType, ProcessProfile> = {
  'CNC Milling': {
    name: 'CNC Milling',
    category: 'Subtractive',
    baseToolingCostUsd: 350,
    baseSetupCostUsd: 150,
    standardCycleTimeMinPerDm3: 25,
    variableCostMultiplier: 1.0,
    bestQuantityMin: 1,
    bestQuantityMax: 2000,
    achievableToleranceMm: 0.025,
    achievableSurfaceFinishRaUm: 1.6,
    prismaticPreferred: true,
    allowsHolesAndPockets: true,
    description: 'Versatile 3/4/5-axis subtractive milling for prismatic geometries, complex pockets, and precision features.'
  },
  'CNC Turning': {
    name: 'CNC Turning',
    category: 'Subtractive',
    baseToolingCostUsd: 250,
    baseSetupCostUsd: 120,
    standardCycleTimeMinPerDm3: 15,
    variableCostMultiplier: 0.85,
    bestQuantityMin: 1,
    bestQuantityMax: 5000,
    achievableToleranceMm: 0.015,
    achievableSurfaceFinishRaUm: 0.8,
    rotationalOnly: true,
    allowsHolesAndPockets: true,
    description: 'High-speed lathe operations for axisymmetric parts, shafts, pins, bushings, and threaded cylinders.'
  },
  'Drilling': {
    name: 'Drilling',
    category: 'Subtractive',
    baseToolingCostUsd: 80,
    baseSetupCostUsd: 40,
    standardCycleTimeMinPerDm3: 8,
    variableCostMultiplier: 0.45,
    bestQuantityMin: 1,
    bestQuantityMax: 10000,
    achievableToleranceMm: 0.08,
    achievableSurfaceFinishRaUm: 3.2,
    allowsHolesAndPockets: false,
    description: 'Simple axial hole making via drill press or multi-spindle drilling heads.'
  },
  'Grinding': {
    name: 'Grinding',
    category: 'Subtractive',
    baseToolingCostUsd: 400,
    baseSetupCostUsd: 180,
    standardCycleTimeMinPerDm3: 45,
    variableCostMultiplier: 1.6,
    bestQuantityMin: 5,
    bestQuantityMax: 2000,
    achievableToleranceMm: 0.005,
    achievableSurfaceFinishRaUm: 0.2,
    allowsHolesAndPockets: false,
    description: 'Abrasive precision finishing for ultra-flat or cylindrical bearing fits requiring sub-micron tolerances.'
  },
  'Sand Casting': {
    name: 'Sand Casting',
    category: 'Forming/Casting',
    baseToolingCostUsd: 2200,
    baseSetupCostUsd: 400,
    standardCycleTimeMinPerDm3: 12,
    variableCostMultiplier: 0.5,
    bestQuantityMin: 20,
    bestQuantityMax: 1000,
    achievableToleranceMm: 0.8,
    achievableSurfaceFinishRaUm: 12.5,
    metalsOnly: true,
    allowsHolesAndPockets: false,
    description: 'Expendable mold casting for large, heavy iron/aluminum components with complex internal cores.'
  },
  'Die Casting': {
    name: 'Die Casting',
    category: 'Forming/Casting',
    baseToolingCostUsd: 16000,
    baseSetupCostUsd: 600,
    standardCycleTimeMinPerDm3: 0.5,
    variableCostMultiplier: 0.25,
    bestQuantityMin: 2500,
    bestQuantityMax: 500000,
    achievableToleranceMm: 0.05,
    achievableSurfaceFinishRaUm: 1.6,
    metalsOnly: true,
    allowsHolesAndPockets: true,
    description: 'High-pressure permanent tooling injecting molten non-ferrous metal at seconds-per-part cycle rates.'
  },
  'Forging': {
    name: 'Forging',
    category: 'Forming/Casting',
    baseToolingCostUsd: 12000,
    baseSetupCostUsd: 700,
    standardCycleTimeMinPerDm3: 2.0,
    variableCostMultiplier: 0.40,
    bestQuantityMin: 1000,
    bestQuantityMax: 100000,
    achievableToleranceMm: 0.5,
    achievableSurfaceFinishRaUm: 6.3,
    metalsOnly: true,
    allowsHolesAndPockets: false,
    description: 'Compressive plastic deformation aligning metal grain structure for critical load-bearing structural parts.'
  },
  'Sheet Metal': {
    name: 'Sheet Metal',
    category: 'Sheet/Profile',
    baseToolingCostUsd: 800,
    baseSetupCostUsd: 120,
    standardCycleTimeMinPerDm3: 6,
    variableCostMultiplier: 0.6,
    bestQuantityMin: 10,
    bestQuantityMax: 20000,
    achievableToleranceMm: 0.15,
    achievableSurfaceFinishRaUm: 2.5,
    sheetOnly: true,
    metalsOnly: true,
    allowsHolesAndPockets: true,
    description: 'Bending, punching, and forming uniform-thickness metal sheets for enclosures, brackets, and chassis.'
  },
  'Laser Cutting': {
    name: 'Laser Cutting',
    category: 'Sheet/Profile',
    baseToolingCostUsd: 50,
    baseSetupCostUsd: 60,
    standardCycleTimeMinPerDm3: 4,
    variableCostMultiplier: 0.55,
    bestQuantityMin: 1,
    bestQuantityMax: 5000,
    achievableToleranceMm: 0.1,
    achievableSurfaceFinishRaUm: 3.2,
    sheetOnly: true,
    allowsHolesAndPockets: true,
    description: 'CNC thermal laser profiling for 2D sheet profiles and plates up to 25mm thickness with zero hard tooling.'
  },
  'Waterjet': {
    name: 'Waterjet',
    category: 'Sheet/Profile',
    baseToolingCostUsd: 60,
    baseSetupCostUsd: 80,
    standardCycleTimeMinPerDm3: 10,
    variableCostMultiplier: 0.75,
    bestQuantityMin: 1,
    bestQuantityMax: 1000,
    achievableToleranceMm: 0.12,
    achievableSurfaceFinishRaUm: 3.2,
    sheetOnly: true,
    allowsHolesAndPockets: true,
    description: 'High-pressure abrasive cold cutting with zero heat-affected zone (HAZ) across thick plates and exotic alloys.'
  },
  'Injection Molding': {
    name: 'Injection Molding',
    category: 'Forming/Casting',
    baseToolingCostUsd: 9500,
    baseSetupCostUsd: 350,
    standardCycleTimeMinPerDm3: 0.4,
    variableCostMultiplier: 0.18,
    bestQuantityMin: 1000,
    bestQuantityMax: 1000000,
    achievableToleranceMm: 0.05,
    achievableSurfaceFinishRaUm: 0.4,
    plasticsOnly: true,
    allowsHolesAndPockets: true,
    description: 'High-pressure plastic resin injection into steel tool cavities for lightweight, thin-walled polymer products.'
  },
  'Additive Manufacturing': {
    name: 'Additive Manufacturing',
    category: 'Additive',
    baseToolingCostUsd: 0,
    baseSetupCostUsd: 45,
    standardCycleTimeMinPerDm3: 90,
    variableCostMultiplier: 2.2,
    bestQuantityMin: 1,
    bestQuantityMax: 50,
    achievableToleranceMm: 0.1,
    achievableSurfaceFinishRaUm: 6.3,
    allowsHolesAndPockets: true,
    description: 'Direct 3D printing (SLS/DMLS/FDM) without tooling. Ideal for low volume, lightweight lattice cores and rapid iterations.'
  },
  'Welding': {
    name: 'Welding',
    category: 'Finishing/Joining',
    baseToolingCostUsd: 300,
    baseSetupCostUsd: 90,
    standardCycleTimeMinPerDm3: 20,
    variableCostMultiplier: 1.1,
    bestQuantityMin: 1,
    bestQuantityMax: 500,
    achievableToleranceMm: 0.5,
    achievableSurfaceFinishRaUm: 6.3,
    metalsOnly: true,
    allowsHolesAndPockets: false,
    description: 'Thermal joining of structural steel/aluminum segments into welded fabrications and frames.'
  },
  'Powder Metallurgy': {
    name: 'Powder Metallurgy',
    category: 'Forming/Casting',
    baseToolingCostUsd: 14000,
    baseSetupCostUsd: 550,
    standardCycleTimeMinPerDm3: 0.8,
    variableCostMultiplier: 0.32,
    bestQuantityMin: 5000,
    bestQuantityMax: 500000,
    achievableToleranceMm: 0.04,
    achievableSurfaceFinishRaUm: 1.6,
    metalsOnly: true,
    allowsHolesAndPockets: true,
    description: 'Compacting metal powders in rigid dies followed by high-temperature sintering for self-lubricating gears and bushings.'
  }
};
