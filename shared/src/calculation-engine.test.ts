import {
  computeGeometryMetrics,
  calculateRawMaterialCost,
  calculateMachiningCost,
  calculateTotalCost,
  calculateBusinessMetrics,
  rankProcesses,
  calculateQuantityTiers,
  runFullCalculation,
  DEFAULT_MACHINING_ASSUMPTIONS
} from './calculation-engine';
import { STANDARD_MATERIALS, getMaterialById } from './materials';
import { PartDimensions } from './types';

export function runTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      const msg = `FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`;
      errors.push(msg);
      console.error(`  ✗ ${msg}`);
    }
  }

  function assertClose(actual: number, expected: number, tolerance: number, testName: string) {
    const diff = Math.abs(actual - expected);
    assert(diff <= tolerance, testName, `Expected ~${expected}, got ${actual} (diff: ${diff})`);
  }

  console.log('\n--- Running Calculation Engine Unit Tests ---');

  // Test 1: Block geometry volume & area
  {
    const dims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Test Block',
      length: 100,
      width: 50,
      height: 20,
      quantity: 10
    };
    const metrics = computeGeometryMetrics(dims);
    assertClose(metrics.grossVolumeMm3, 100000, 1, 'Block gross volume = 100 * 50 * 20 = 100,000 mm3');
    assertClose(metrics.netVolumeMm3, 100000, 1, 'Block net volume with no holes = 100,000 mm3');
    assertClose(metrics.surfaceAreaMm2, 2 * (100 * 50 + 100 * 20 + 50 * 20), 1, 'Block surface area = 16,000 mm2');
  }

  // Test 2: Cylinder geometry volume
  {
    const dims: PartDimensions = {
      geometryType: 'Cylinder',
      partName: 'Test Pin',
      diameter: 40,
      length: 100,
      quantity: 5
    };
    const metrics = computeGeometryMetrics(dims);
    const expectedVol = Math.PI * 20 * 20 * 100;
    assertClose(metrics.grossVolumeMm3, expectedVol, 10, 'Cylinder volume = pi * r^2 * h');
  }

  // Test 3: Tube geometry volume
  {
    const dims: PartDimensions = {
      geometryType: 'Tube',
      partName: 'Test Sleeve',
      outerDiameter: 60,
      thickness: 5,
      length: 100,
      quantity: 1
    };
    const metrics = computeGeometryMetrics(dims);
    // ro = 30, ri = 25. V = pi * (30^2 - 25^2) * 100 = pi * (900 - 625) * 100 = 27,500 * pi
    const expectedVol = Math.PI * (30 * 30 - 25 * 25) * 100;
    assertClose(metrics.grossVolumeMm3, expectedVol, 10, 'Tube hollow volume calculation');
  }

  // Test 4: Hole and Pocket deduction
  {
    const dims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Drilled Block',
      length: 100,
      width: 100,
      height: 20, // 200,000 mm3
      holeCount: 4,
      holeDiameter: 10, // radius 5. hole vol = 4 * pi * 25 * 20 = 2000 * pi ~ 6283.18
      holeDepth: 20,
      pocketCount: 1,
      pocketLength: 40,
      pocketWidth: 40,
      pocketDepth: 10, // 16,000 mm3
      quantity: 1
    };
    const metrics = computeGeometryMetrics(dims);
    const holeVol = 4 * Math.PI * 25 * 20;
    const pocketVol = 40 * 40 * 10;
    const expectedNet = 200000 - holeVol - pocketVol;
    assertClose(metrics.netVolumeMm3, expectedNet, 50, 'Net volume after holes and pockets deducted');
    assert(metrics.netVolumeMm3 < metrics.grossVolumeMm3, 'Net volume is strictly less than gross volume');
  }

  // Test 5: Raw Material Cost & Stock Mass (Al 6061 in INR)
  {
    const al = getMaterialById('al-6061-t6')!;
    const netVol = 100000; // 100 cm3
    const allowancePct = 15;
    const rawCostResult = calculateRawMaterialCost(
      netVol,
      al,
      480, // ₹480/kg INR
      'Manual Input',
      'Test Suite',
      new Date().toISOString(),
      allowancePct
    );

    // net mass = 100,000 mm3 * 2.7 g/cm3 * 1e-6 = 0.270 kg
    assertClose(rawCostResult.netPartMassKg.value, 0.270, 0.005, 'Net part mass of Al 6061 (0.27 kg)');
    // stock vol = 115,000 mm3 -> stock mass = 0.3105 kg
    assertClose(rawCostResult.stockMassKg.value, 0.311, 0.005, 'Stock mass with 15% allowance (0.311 kg)');
    // gross cost = 0.3105 * 480 = ₹149.04
    assert(rawCostResult.grossMaterialCostPerUnit.value > 140 && rawCostResult.grossMaterialCostPerUnit.value < 160, 'Gross material cost ~₹149');
    assert(rawCostResult.scrapCreditPerUnit.value > 0, 'Scrap credit is computed positive');
    assert(rawCostResult.netMaterialCostPerUnit.value < rawCostResult.grossMaterialCostPerUnit.value, 'Net material cost reflects scrap credit');
  }

  // Test 6: Setup allocation scales inversely with quantity (INR shop rates)
  {
    const al = getMaterialById('al-6061-t6')!;
    const dims1: PartDimensions = {
      geometryType: 'Block',
      partName: 'Part 1 Qty',
      length: 100,
      width: 50,
      height: 25,
      quantity: 1
    };
    const dims100: PartDimensions = {
      ...dims1,
      quantity: 100
    };

    const geom = computeGeometryMetrics(dims1);
    const mach1 = calculateMachiningCost(geom.netVolumeMm3, geom.netVolumeMm3 * 1.15, geom.surfaceAreaMm2, dims1, al, DEFAULT_MACHINING_ASSUMPTIONS);
    const mach100 = calculateMachiningCost(geom.netVolumeMm3, geom.netVolumeMm3 * 1.15, geom.surfaceAreaMm2, dims100, al, DEFAULT_MACHINING_ASSUMPTIONS);

    const setup1 = mach1.setupAllocationPerUnit.value;
    const setup100 = mach100.setupAllocationPerUnit.value;

    assert(setup1 > 1000, 'Setup allocation for qty 1 is high (₹3,750 for 1.5h @ ₹2,500/h)');
    assertClose(setup100, setup1 / 100, 0.5, 'Setup allocation for qty 100 is amortized by 100x');
  }

  // Test 7: Total Cost and Business metrics break-even
  {
    const dims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Gear Plate',
      length: 120,
      width: 80,
      height: 15,
      quantity: 20
    };
    const al = getMaterialById('al-6061-t6')!;
    const fullRes = runFullCalculation({
      dimensions: dims,
      material: al,
      rawPricePerKg: 480,
      rawPriceOrigin: 'Manual Input',
      machiningAssumptions: DEFAULT_MACHINING_ASSUMPTIONS,
      targetMarginPct: 30
    });

    assert(fullRes.totalCost.totalCostPerUnit.value > 0, 'Total cost per unit is positive');
    assert(fullRes.business.sellingPricePerUnit.value > fullRes.totalCost.totalCostPerUnit.value, 'Selling price exceeds cost at 30% margin');
    assertClose(fullRes.business.grossMarginPct.value, 30, 1.0, 'Gross margin matches ~30% target');
    assert(typeof fullRes.business.breakEvenQuantity.value === 'number' && fullRes.business.breakEvenQuantity.value > 0, 'Break-even quantity is calculated');
    
    // Assert Chart Data contains unitProfit and marginPct
    assert(fullRes.chartData.length > 0, 'Chart data generated');
    const firstPoint = fullRes.chartData[0];
    assert(typeof firstPoint.unitProfit === 'number', 'Chart data point has unitProfit');
    assert(typeof firstPoint.marginPct === 'number', 'Chart data point has marginPct');
  }

  // Test 8: Contribution <= 0 condition handles loss gracefully
  {
    const dims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Loss Part',
      length: 120,
      width: 80,
      height: 15,
      quantity: 10
    };
    const al = getMaterialById('al-6061-t6')!;
    // Override selling price to ₹10.00 when cost is ~₹1,500.00
    const fullRes = runFullCalculation({
      dimensions: dims,
      material: al,
      rawPricePerKg: 480,
      rawPriceOrigin: 'Manual Input',
      machiningAssumptions: DEFAULT_MACHINING_ASSUMPTIONS,
      targetSellingPriceOverride: 10.00
    });

    assert(fullRes.business.breakEvenQuantity.value === null, 'Break-even quantity is null when selling at loss');
    assert(fullRes.business.breakEvenStatus === 'No break-even at this price (Loss per unit)', 'Status correctly reports no break-even');
    assert(fullRes.business.profitPerUnit.value < 0, 'Profit per unit is negative when sold below cost');
  }

  // Test 9: Process ranking respects geometry (Turning for rotational vs Milling for block)
  {
    const al = getMaterialById('al-6061-t6')!;
    const blockDims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Milled Block',
      length: 100,
      width: 100,
      height: 25,
      quantity: 20
    };
    const shaftDims: PartDimensions = {
      geometryType: 'Shaft',
      partName: 'Turned Shaft',
      shaftDiameter: 30,
      length: 150,
      quantity: 20
    };

    const blockRanks = rankProcesses(blockDims, al, 20);
    const shaftRanks = rankProcesses(shaftDims, al, 20);

    const turningOnBlock = blockRanks.find(r => r.process === 'CNC Turning');
    assert(turningOnBlock?.isViableForGeometry === false, 'CNC Turning is unviable for prismatic Block');

    const turningOnShaft = shaftRanks.find(r => r.process === 'CNC Turning');
    assert(turningOnShaft?.isViableForGeometry === true, 'CNC Turning is viable for Shaft');
    assert(turningOnShaft?.suitabilityScore! >= 80, 'CNC Turning scores high for Shaft');
  }

  // Test 10: Quantity tiers comparison
  {
    const al = getMaterialById('al-6061-t6')!;
    const dims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Bracket',
      length: 100,
      width: 60,
      height: 20,
      quantity: 50
    };
    const tiers = calculateQuantityTiers(dims, al, DEFAULT_MACHINING_ASSUMPTIONS, 3500.00);
    assert(tiers.length === 4, 'Generates 4 quantity comparison tiers');
    // Unit cost should decrease as quantity increases
    assert(tiers[0].unitCost > tiers[1].unitCost, 'Prototype unit cost > Small batch unit cost');
    assert(tiers[1].unitCost > tiers[3].unitCost, 'Small batch unit cost > Large batch unit cost');
  }

  // Test 11: Industrial Plastics & 3D Printing Materials Library Verification
  {
    const abs = getMaterialById('abs-plastic');
    const pp = getMaterialById('pp-polypropylene');
    const nylon = getMaterialById('nylon-pa6');
    const uhmwpe = getMaterialById('uhmwpe');
    const ptfe = getMaterialById('ptfe-teflon');
    const peek = getMaterialById('peek');
    const pc = getMaterialById('polycarbonate-pc');
    const cfNylon = getMaterialById('cf-nylon-pa12');

    assert(Boolean(abs && abs.isPolymer && abs.is3DPrintable), 'ABS verified as 3D printable industrial polymer');
    assert(Boolean(pp && pp.densityGPerCm3 < 1.0), 'PP (Polypropylene) verified as ultra-lightweight (<1.0 g/cm3)');
    assert(Boolean(nylon && nylon.wearResistanceRating === 'High'), 'Nylon PA6 verified with high wear rating');
    assert(Boolean(uhmwpe && uhmwpe.frictionCoefficient! <= 0.15), 'UHMWPE verified with self-lubricating low friction (<=0.15)');
    assert(Boolean(ptfe && ptfe.continuousServiceTempC! >= 250), 'PTFE verified with extreme continuous temp (>=250°C)');
    assert(Boolean(peek && peek.category === 'High-Performance Polymers'), 'PEEK verified in High-Performance Polymers');
    assert(Boolean(pc && pc.tensileStrengthMpa >= 60), 'Polycarbonate verified with structural tensile strength');
    assert(Boolean(cfNylon && cfNylon.strengthToWeightRatio! > 100), 'CF-Nylon verified with high specific stiffness (>100)');
  }

  // Test 12: Strategic Manufacturing Paradigm Evaluation
  {
    const abs = getMaterialById('abs-plastic')!;
    const pp = getMaterialById('pp-polypropylene')!;
    const peek = getMaterialById('peek')!;
    const al = getMaterialById('al-6061-t6')!;

    const blockDims: PartDimensions = {
      geometryType: 'Block',
      partName: 'Electronics Case',
      length: 120,
      width: 80,
      height: 30,
      quantity: 20
    };

    // Low volume ABS -> Plastic + 3D Printing
    const absCalc = runFullCalculation({
      dimensions: blockDims,
      material: abs,
      rawPricePerKg: abs.typicalRawPricePerKg,
      rawPriceOrigin: 'Assumption',
      machiningAssumptions: DEFAULT_MACHINING_ASSUMPTIONS
    });
    assert(absCalc.paradigmEvaluation.recommendedParadigm === 'Plastic + 3D Printing', 'Low volume ABS correctly recommends Plastic + 3D Printing');

    // High volume PP -> Plastic + Injection Molding
    const ppCalc = runFullCalculation({
      dimensions: { ...blockDims, quantity: 2000 },
      material: pp,
      rawPricePerKg: pp.typicalRawPricePerKg,
      rawPriceOrigin: 'Assumption',
      machiningAssumptions: DEFAULT_MACHINING_ASSUMPTIONS
    });
    assert(ppCalc.paradigmEvaluation.recommendedParadigm === 'Plastic + Injection Molding', 'High volume PP correctly recommends Plastic + Injection Molding');

    // Advanced Polymer PEEK -> Advanced Polymer + 3D Printing
    const peekCalc = runFullCalculation({
      dimensions: blockDims,
      material: peek,
      rawPricePerKg: peek.typicalRawPricePerKg,
      rawPriceOrigin: 'Assumption',
      machiningAssumptions: DEFAULT_MACHINING_ASSUMPTIONS
    });
    assert(peekCalc.paradigmEvaluation.recommendedParadigm === 'Advanced Polymer + 3D Printing', 'PEEK correctly recommends Advanced Polymer + 3D Printing');

    // Metal Al 6061 -> Metal + Machining
    const alCalc = runFullCalculation({
      dimensions: blockDims,
      material: al,
      rawPricePerKg: al.typicalRawPricePerKg,
      rawPriceOrigin: 'Assumption',
      machiningAssumptions: DEFAULT_MACHINING_ASSUMPTIONS
    });
    assert(alCalc.paradigmEvaluation.recommendedParadigm === 'Metal + Machining', 'Aluminum correctly recommends Metal + Machining');
    assert(alCalc.paradigmEvaluation.materialComparison.selectedCategory === 'Metal', 'Material category verified as Metal');
  }

  console.log(`\nUnit Tests Completed: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed, errors };
}

// Self-executing if run directly
if (typeof require !== 'undefined' && require.main === module) {
  const result = runTests();
  process.exit(result.failed > 0 ? 1 : 0);
}
