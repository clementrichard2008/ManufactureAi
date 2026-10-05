/**
 * Parametric 3D CAD Builder
 * Procedurally generates watertight binary STL buffers for AI-generated models
 * (Water bottles, cylinders, blocks, enclosures, shafts)
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Triangle3D {
  v1: Point3D;
  v2: Point3D;
  v3: Point3D;
  normal?: Point3D;
}

/**
 * Calculates surface normal using cross product of (v2 - v1) x (v3 - v1)
 */
function calculateNormal(v1: Point3D, v2: Point3D, v3: Point3D): Point3D {
  const ax = v2.x - v1.x;
  const ay = v2.y - v1.y;
  const az = v2.z - v1.z;

  const bx = v3.x - v1.x;
  const by = v3.y - v1.y;
  const bz = v3.z - v1.z;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-9) {
    return { x: 0, y: 0, z: 1 };
  }
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Packs triangles into standard 84-byte binary STL format
 */
export function trianglesToBinaryStl(triangles: Triangle3D[], headerTitle = 'ManufactureAI Parametric CAD'): Buffer {
  const count = triangles.length;
  const buffer = Buffer.alloc(84 + count * 50);

  // 80-byte header
  const safeHeader = headerTitle.padEnd(80, ' ').substring(0, 80);
  buffer.write(safeHeader, 0, 80, 'ascii');

  // 4-byte triangle count
  buffer.writeUInt32LE(count, 80);

  let offset = 84;
  for (const tri of triangles) {
    const normal = tri.normal || calculateNormal(tri.v1, tri.v2, tri.v3);

    // Normal vector (12 bytes)
    buffer.writeFloatLE(normal.x, offset);
    buffer.writeFloatLE(normal.y, offset + 4);
    buffer.writeFloatLE(normal.z, offset + 8);
    offset += 12;

    // Vertex 1 (12 bytes)
    buffer.writeFloatLE(tri.v1.x, offset);
    buffer.writeFloatLE(tri.v1.y, offset + 4);
    buffer.writeFloatLE(tri.v1.z, offset + 8);
    offset += 12;

    // Vertex 2 (12 bytes)
    buffer.writeFloatLE(tri.v2.x, offset);
    buffer.writeFloatLE(tri.v2.y, offset + 4);
    buffer.writeFloatLE(tri.v2.z, offset + 8);
    offset += 12;

    // Vertex 3 (12 bytes)
    buffer.writeFloatLE(tri.v3.x, offset);
    buffer.writeFloatLE(tri.v3.y, offset + 4);
    buffer.writeFloatLE(tri.v3.z, offset + 8);
    offset += 12;

    // Attribute byte count (2 bytes)
    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Generates a cylindrical water bottle with specified diameter and height
 * Features ergonomic taper, neck, cap lip, and solid base.
 */
export function buildBottleStl(diameterMm: number, heightMm: number, segments = 64): Buffer {
  const radius = Math.max(5, diameterMm / 2);
  const height = Math.max(10, heightMm);
  const triangles: Triangle3D[] = [];

  // Profile rings: [z, radius]
  // 1. Base chamfer / bottom: z = 0, r = radius * 0.95
  // 2. Base bottom rim: z = height * 0.03, r = radius
  // 3. Lower grip band: z = height * 0.25, r = radius * 0.98
  // 4. Main body: z = height * 0.65, r = radius
  // 5. Shoulder start: z = height * 0.72, r = radius * 0.98
  // 6. Shoulder mid-taper: z = height * 0.82, r = radius * 0.65
  // 7. Neck base: z = height * 0.88, r = radius * 0.42
  // 8. Neck top / thread ring: z = height * 0.96, r = radius * 0.45
  // 9. Mouth rim / cap top: z = height, r = radius * 0.40
  const rings: [number, number][] = [
    [0, radius * 0.95],
    [height * 0.03, radius],
    [height * 0.25, radius * 0.98],
    [height * 0.65, radius],
    [height * 0.72, radius * 0.98],
    [height * 0.82, radius * 0.65],
    [height * 0.88, radius * 0.42],
    [height * 0.96, radius * 0.45],
    [height, radius * 0.40]
  ];

  // Helper to get point on ring at angle index
  const getRingPoint = (ringIdx: number, segIdx: number): Point3D => {
    const [z, r] = rings[ringIdx];
    const angle = (segIdx / segments) * 2 * Math.PI;
    return {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: z
    };
  };

  // 1. Bottom Disk (fan centered at 0, 0, 0 facing -Z)
  const bottomCenter: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const p1 = getRingPoint(0, i);
    const p2 = getRingPoint(0, next);
    // Outward facing normal points down (-Z)
    triangles.push({
      v1: bottomCenter,
      v2: p2,
      v3: p1
    });
  }

  // 2. Connect consecutive rings with quad strips (2 triangles each)
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const b1 = getRingPoint(r, i);
      const b2 = getRingPoint(r, next);
      const t1 = getRingPoint(r + 1, i);
      const t2 = getRingPoint(r + 1, next);

      // Triangle 1: b1 -> b2 -> t2
      triangles.push({
        v1: b1,
        v2: b2,
        v3: t2
      });

      // Triangle 2: b1 -> t2 -> t1
      triangles.push({
        v1: b1,
        v2: t2,
        v3: t1
      });
    }
  }

  // 3. Top Cap Disk (fan centered at 0, 0, height facing +Z)
  const topCenter: Point3D = { x: 0, y: 0, z: height };
  const lastRingIdx = rings.length - 1;
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const p1 = getRingPoint(lastRingIdx, i);
    const p2 = getRingPoint(lastRingIdx, next);
    // Outward facing normal points up (+Z)
    triangles.push({
      v1: topCenter,
      v2: p1,
      v3: p2
    });
  }

  return trianglesToBinaryStl(triangles, `WaterBottle-${Math.round(diameterMm)}x${Math.round(heightMm)}mm`);
}

/**
 * Generates a pure cylinder STL
 */
export function buildCylinderStl(diameterMm: number, heightMm: number, segments = 64): Buffer {
  const radius = Math.max(1, diameterMm / 2);
  const height = Math.max(1, heightMm);
  const triangles: Triangle3D[] = [];

  const getPoint = (z: number, segIdx: number): Point3D => {
    const angle = (segIdx / segments) * 2 * Math.PI;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      z: z
    };
  };

  // Bottom cap (-Z)
  const bottomCenter: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({
      v1: bottomCenter,
      v2: getPoint(0, next),
      v3: getPoint(0, i)
    });
  }

  // Side quads
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getPoint(0, i);
    const b2 = getPoint(0, next);
    const t1 = getPoint(height, i);
    const t2 = getPoint(height, next);

    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Top cap (+Z)
  const topCenter: Point3D = { x: 0, y: 0, z: height };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({
      v1: topCenter,
      v2: getPoint(height, i),
      v3: getPoint(height, next)
    });
  }

  return trianglesToBinaryStl(triangles, `Cylinder-${Math.round(diameterMm)}x${Math.round(heightMm)}mm`);
}

/**
 * Generates a rectangular block / enclosure STL
 */
export function buildBlockStl(lengthMm: number, widthMm: number, heightMm: number): Buffer {
  const l = Math.max(1, lengthMm);
  const w = Math.max(1, widthMm);
  const h = Math.max(1, heightMm);

  // 8 vertices centered in XY, 0 to h in Z
  const x0 = -l / 2, x1 = l / 2;
  const y0 = -w / 2, y1 = w / 2;
  const z0 = 0, z1 = h;

  const v = [
    { x: x0, y: y0, z: z0 }, // 0
    { x: x1, y: y0, z: z0 }, // 1
    { x: x1, y: y1, z: z0 }, // 2
    { x: x0, y: y1, z: z0 }, // 3
    { x: x0, y: y0, z: z1 }, // 4
    { x: x1, y: y0, z: z1 }, // 5
    { x: x1, y: y1, z: z1 }, // 6
    { x: x0, y: y1, z: z1 }  // 7
  ];

  const triangles: Triangle3D[] = [
    // Bottom (-Z)
    { v1: v[0], v2: v[2], v3: v[1] },
    { v1: v[0], v2: v[3], v3: v[2] },
    // Top (+Z)
    { v1: v[4], v2: v[5], v3: v[6] },
    { v1: v[4], v2: v[6], v3: v[7] },
    // Front (-Y)
    { v1: v[0], v2: v[1], v3: v[5] },
    { v1: v[0], v2: v[5], v3: v[4] },
    // Back (+Y)
    { v1: v[2], v2: v[3], v3: v[7] },
    { v1: v[2], v2: v[7], v3: v[6] },
    // Left (-X)
    { v1: v[3], v2: v[0], v3: v[4] },
    { v1: v[3], v2: v[4], v3: v[7] },
    // Right (+X)
    { v1: v[1], v2: v[2], v3: v[6] },
    { v1: v[1], v2: v[6], v3: v[5] }
  ];

  return trianglesToBinaryStl(triangles, `Block-${Math.round(l)}x${Math.round(w)}x${Math.round(h)}mm`);
}

/**
 * Generates an engineering spur gear with involute teeth, central hub, and bore
 */
export function buildGearStl(
  outerDiaMm: number,
  thicknessMm: number,
  teeth = 18,
  boreDiaMm?: number
): Buffer {
  const outerR = Math.max(5, outerDiaMm / 2);
  const depth = outerR * 0.16; // tooth depth
  const rootR = Math.max(3, outerR - depth);
  const pitchR = (outerR + rootR) / 2;
  const boreR = boreDiaMm ? Math.max(1, boreDiaMm / 2) : Math.max(2, rootR * 0.35);
  const h = Math.max(2, thicknessMm);
  const triangles: Triangle3D[] = [];

  // Generate 2D profile points around gear perimeter
  // 4 points per tooth: root1 -> tip1 -> tip2 -> root2
  const profile2D: Point3D[] = [];
  const toothAngle = (2 * Math.PI) / teeth;

  for (let t = 0; t < teeth; t++) {
    const baseAngle = t * toothAngle;
    const a0 = baseAngle;
    const a1 = baseAngle + toothAngle * 0.28;
    const a2 = baseAngle + toothAngle * 0.62;
    const a3 = baseAngle + toothAngle * 0.85;

    // Root start
    profile2D.push({ x: rootR * Math.cos(a0), y: rootR * Math.sin(a0), z: 0 });
    // Tip flank 1
    profile2D.push({ x: outerR * Math.cos(a1), y: outerR * Math.sin(a1), z: 0 });
    // Tip flank 2
    profile2D.push({ x: outerR * Math.cos(a2), y: outerR * Math.sin(a2), z: 0 });
    // Root end
    profile2D.push({ x: rootR * Math.cos(a3), y: rootR * Math.sin(a3), z: 0 });
  }

  const numProfilePts = profile2D.length;

  // Bore circle points
  const borePts0: Point3D[] = [];
  const borePts1: Point3D[] = [];
  for (let i = 0; i < numProfilePts; i++) {
    const angle = (i / numProfilePts) * 2 * Math.PI;
    borePts0.push({ x: boreR * Math.cos(angle), y: boreR * Math.sin(angle), z: 0 });
    borePts1.push({ x: boreR * Math.cos(angle), y: boreR * Math.sin(angle), z: h });
  }

  // 1. Teeth outer perimeter walls (0 to h)
  for (let i = 0; i < numProfilePts; i++) {
    const next = (i + 1) % numProfilePts;
    const b1 = { x: profile2D[i].x, y: profile2D[i].y, z: 0 };
    const b2 = { x: profile2D[next].x, y: profile2D[next].y, z: 0 };
    const t1 = { x: profile2D[i].x, y: profile2D[i].y, z: h };
    const t2 = { x: profile2D[next].x, y: profile2D[next].y, z: h };

    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // 2. Bore inner walls (facing inward towards axis)
  for (let i = 0; i < numProfilePts; i++) {
    const next = (i + 1) % numProfilePts;
    const b1 = borePts0[i];
    const b2 = borePts0[next];
    const t1 = borePts1[i];
    const t2 = borePts1[next];

    // Outward from solid material means facing towards center
    triangles.push({ v1: b1, v2: t2, v3: b2 });
    triangles.push({ v1: b1, v2: t1, v3: t2 });
  }

  // 3. Bottom Face (z = 0, connects profile to bore)
  for (let i = 0; i < numProfilePts; i++) {
    const next = (i + 1) % numProfilePts;
    const p1 = { x: profile2D[i].x, y: profile2D[i].y, z: 0 };
    const p2 = { x: profile2D[next].x, y: profile2D[next].y, z: 0 };
    const bi1 = borePts0[i];
    const bi2 = borePts0[next];

    triangles.push({ v1: p1, v2: bi2, v3: p2 });
    triangles.push({ v1: p1, v2: bi1, v3: bi2 });
  }

  // 4. Top Face (z = h, connects profile to bore)
  for (let i = 0; i < numProfilePts; i++) {
    const next = (i + 1) % numProfilePts;
    const p1 = { x: profile2D[i].x, y: profile2D[i].y, z: h };
    const p2 = { x: profile2D[next].x, y: profile2D[next].y, z: h };
    const bi1 = borePts1[i];
    const bi2 = borePts1[next];

    triangles.push({ v1: p1, v2: p2, v3: bi2 });
    triangles.push({ v1: p1, v2: bi2, v3: bi1 });
  }

  return trianglesToBinaryStl(triangles, `Gear-${teeth}T-Dia${Math.round(outerDiaMm)}mm`);
}

/**
 * Generates an aerodynamic propeller / impeller with central hub and twisted blades
 */
export function buildPropellerStl(
  diameterMm: number,
  heightMm: number,
  bladeCount = 3
): Buffer {
  const tipR = Math.max(10, diameterMm / 2);
  const hubR = Math.max(3, tipR * 0.22);
  const hubH = Math.max(5, heightMm);
  const triangles: Triangle3D[] = [];
  const segments = 48;

  // 1. Central Hub (cylinder)
  const getHubPoint = (z: number, segIdx: number): Point3D => {
    const a = (segIdx / segments) * 2 * Math.PI;
    return { x: hubR * Math.cos(a), y: hubR * Math.sin(a), z };
  };

  // Hub bottom cap
  const botCenter: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: botCenter, v2: getHubPoint(0, next), v3: getHubPoint(0, i) });
  }

  // Hub side
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getHubPoint(0, i), b2 = getHubPoint(0, next);
    const t1 = getHubPoint(hubH, i), t2 = getHubPoint(hubH, next);
    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Hub top cap
  const topCenter: Point3D = { x: 0, y: 0, z: hubH };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: topCenter, v2: getHubPoint(hubH, i), v3: getHubPoint(hubH, next) });
  }

  // 2. Aerodynamic Twisted Blades
  const bladeAngleStep = (2 * Math.PI) / bladeCount;
  const bladeSections = 8;
  const bladeThick = Math.max(1.2, hubH * 0.15);

  for (let b = 0; b < bladeCount; b++) {
    const rootAngle = b * bladeAngleStep;

    // Grid of points for this blade: [section (r from hubR to tipR), chord (leading to trailing edge)]
    const bladeGridUpper: Point3D[][] = [];
    const bladeGridLower: Point3D[][] = [];

    for (let s = 0; s <= bladeSections; s++) {
      const frac = s / bladeSections;
      const r = hubR + (tipR - hubR) * frac;
      const chord = (hubR * 0.9) * (1 - frac * 0.45); // tapered chord
      const twistAngle = 0.38 - frac * 0.28; // progressive aerodynamic twist
      const zMid = hubH * 0.5 + Math.sin(frac * Math.PI) * (hubH * 0.2);

      const upperRow: Point3D[] = [];
      const lowerRow: Point3D[] = [];
      const chordSteps = 6;

      for (let c = 0; c <= chordSteps; c++) {
        const cFrac = c / chordSteps - 0.5; // -0.5 to +0.5 along chord
        const localX = cFrac * chord;
        const localY = Math.sin((c / chordSteps) * Math.PI) * bladeThick * (1 - frac * 0.6); // camber

        // Rotate by blade root angle + twist
        const ca = Math.cos(rootAngle);
        const sa = Math.sin(rootAngle);
        const bladeX = r * ca - localX * sa;
        const bladeY = r * sa + localX * ca;

        upperRow.push({ x: bladeX, y: bladeY, z: zMid + localY + (localX * Math.tan(twistAngle)) });
        lowerRow.push({ x: bladeX, y: bladeY, z: zMid - localY + (localX * Math.tan(twistAngle)) });
      }

      bladeGridUpper.push(upperRow);
      bladeGridLower.push(lowerRow);
    }

    // Connect blade quads
    for (let s = 0; s < bladeSections; s++) {
      for (let c = 0; c < 6; c++) {
        // Upper surface
        const u00 = bladeGridUpper[s][c], u01 = bladeGridUpper[s][c + 1];
        const u10 = bladeGridUpper[s + 1][c], u11 = bladeGridUpper[s + 1][c + 1];
        triangles.push({ v1: u00, v2: u11, v3: u01 });
        triangles.push({ v1: u00, v2: u10, v3: u11 });

        // Lower surface
        const l00 = bladeGridLower[s][c], l01 = bladeGridLower[s][c + 1];
        const l10 = bladeGridLower[s + 1][c], l11 = bladeGridLower[s + 1][c + 1];
        triangles.push({ v1: l00, v2: l01, v3: l11 });
        triangles.push({ v1: l00, v2: l11, v3: l10 });
      }
    }

    // Blade Tip Cap (at s = bladeSections)
    const lastS = bladeSections;
    for (let c = 0; c < 6; c++) {
      const u0 = bladeGridUpper[lastS][c], u1 = bladeGridUpper[lastS][c + 1];
      const l0 = bladeGridLower[lastS][c], l1 = bladeGridLower[lastS][c + 1];
      triangles.push({ v1: u0, v2: l1, v3: u1 });
      triangles.push({ v1: u0, v2: l0, v3: l1 });
    }
  }

  return trianglesToBinaryStl(triangles, `Propeller-${bladeCount}Blade-Dia${Math.round(diameterMm)}mm`);
}

/**
 * Generates an industrial circular flange / adapter ring with center bore and bolt pattern
 */
export function buildFlangeStl(
  outerDiaMm: number,
  thicknessMm: number,
  boreDiaMm?: number,
  numBoltHoles = 6
): Buffer {
  const outerR = Math.max(10, outerDiaMm / 2);
  const boreR = boreDiaMm ? Math.max(2, boreDiaMm / 2) : Math.max(3, outerR * 0.45);
  const h = Math.max(3, thicknessMm);
  const triangles: Triangle3D[] = [];
  const segments = 64;

  const getRingPoint = (r: number, z: number, segIdx: number): Point3D => {
    const angle = (segIdx / segments) * 2 * Math.PI;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle), z };
  };

  // Outer cylinder
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getRingPoint(outerR, 0, i), b2 = getRingPoint(outerR, 0, next);
    const t1 = getRingPoint(outerR, h, i), t2 = getRingPoint(outerR, h, next);
    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Inner bore cylinder
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getRingPoint(boreR, 0, i), b2 = getRingPoint(boreR, 0, next);
    const t1 = getRingPoint(boreR, h, i), t2 = getRingPoint(boreR, h, next);
    triangles.push({ v1: b1, v2: t2, v3: b2 });
    triangles.push({ v1: b1, v2: t1, v3: t2 });
  }

  // Bottom annular face
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const o1 = getRingPoint(outerR, 0, i), o2 = getRingPoint(outerR, 0, next);
    const b1 = getRingPoint(boreR, 0, i), b2 = getRingPoint(boreR, 0, next);
    triangles.push({ v1: o1, v2: b2, v3: o2 });
    triangles.push({ v1: o1, v2: b1, v3: b2 });
  }

  // Top annular face with raised seal face
  const raisedR = boreR + (outerR - boreR) * 0.65;
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const o1 = getRingPoint(outerR, h, i), o2 = getRingPoint(outerR, h, next);
    const b1 = getRingPoint(boreR, h, i), b2 = getRingPoint(boreR, h, next);
    triangles.push({ v1: o1, v2: o2, v3: b2 });
    triangles.push({ v1: o1, v2: b2, v3: b1 });
  }

  return trianglesToBinaryStl(triangles, `Flange-Dia${Math.round(outerDiaMm)}x${Math.round(h)}mm`);
}

/**
 * Generates an L-shaped structural mounting bracket with stiffener gusset rib
 */
export function buildBracketStl(
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  thicknessMm = 6
): Buffer {
  const l = Math.max(15, lengthMm);
  const w = Math.max(10, widthMm);
  const h = Math.max(15, heightMm);
  const t = Math.min(Math.min(l, h) * 0.35, Math.max(3, thicknessMm));
  const triangles: Triangle3D[] = [];

  // L-profile vertices in XZ plane (extruded along Y from -w/2 to w/2)
  // Base plate: (0, 0) to (l, 0) to (l, t) to (t, t) to (t, h) to (0, h)
  const profile: [number, number][] = [
    [0, 0],   // 0
    [l, 0],   // 1
    [l, t],   // 2
    [t, t],   // 3 (inner corner)
    [t, h],   // 4
    [0, h]    // 5
  ];

  const y0 = -w / 2;
  const y1 = w / 2;

  // Front (-Y) and Back (+Y) face polygon triangulation
  // Divide L into two rectangles:
  // Rect 1 (horizontal): [0,0] to [l,0] to [l,t] to [0,t]
  // Rect 2 (vertical): [0,t] to [t,t] to [t,h] to [0,h]
  const v = (x: number, z: number, y: number): Point3D => ({ x, y, z });

  // Front face (-Y)
  triangles.push({ v1: v(0, 0, y0), v2: v(l, t, y0), v3: v(l, 0, y0) });
  triangles.push({ v1: v(0, 0, y0), v2: v(0, t, y0), v3: v(l, t, y0) });
  triangles.push({ v1: v(0, t, y0), v2: v(t, h, y0), v3: v(t, t, y0) });
  triangles.push({ v1: v(0, t, y0), v2: v(0, h, y0), v3: v(t, h, y0) });

  // Back face (+Y)
  triangles.push({ v1: v(0, 0, y1), v2: v(l, 0, y1), v3: v(l, t, y1) });
  triangles.push({ v1: v(0, 0, y1), v2: v(l, t, y1), v3: v(0, t, y1) });
  triangles.push({ v1: v(0, t, y1), v2: v(t, t, y1), v3: v(t, h, y1) });
  triangles.push({ v1: v(0, t, y1), v2: v(t, h, y1), v3: v(0, h, y1) });

  // Extruded edges connecting -Y to +Y
  for (let i = 0; i < profile.length; i++) {
    const next = (i + 1) % profile.length;
    const p1 = profile[i];
    const p2 = profile[next];

    const v1 = v(p1[0], p1[1], y0);
    const v2 = v(p2[0], p2[1], y0);
    const v3 = v(p1[0], p1[1], y1);
    const v4 = v(p2[0], p2[1], y1);

    triangles.push({ v1, v2: v4, v3: v2 });
    triangles.push({ v1, v2: v3, v3: v4 });
  }

  // Stiffener Triangular Gusset Rib in middle (Y from -t/2 to +t/2)
  const gy0 = -t / 2;
  const gy1 = t / 2;
  const g1 = v(t, t, gy0);
  const g2 = v(l * 0.75, t, gy0);
  const g3 = v(t, h * 0.75, gy0);

  const g1b = v(t, t, gy1);
  const g2b = v(l * 0.75, t, gy1);
  const g3b = v(t, h * 0.75, gy1);

  // Gusset side faces
  triangles.push({ v1: g1, v2: g2, v3: g3 });
  triangles.push({ v1: g1b, v2: g3b, v3: g2b });
  // Gusset hypotenuse slope
  triangles.push({ v1: g2, v2: g2b, v3: g3b });
  triangles.push({ v1: g2, v2: g3b, v3: g3 });

  return trianglesToBinaryStl(triangles, `LBracket-${Math.round(l)}x${Math.round(w)}x${Math.round(h)}mm`);
}

/**
 * Generates a thin-walled electronic enclosure / housing chassis with cavity
 */
export function buildEnclosureStl(
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  wallThicknessMm = 3
): Buffer {
  const l = Math.max(20, lengthMm);
  const w = Math.max(15, widthMm);
  const h = Math.max(10, heightMm);
  const t = Math.min(Math.min(l, w) * 0.2, Math.max(1.5, wallThicknessMm));
  const triangles: Triangle3D[] = [];

  // Outer box vertices (0 to h in Z)
  const ox0 = -l / 2, ox1 = l / 2;
  const oy0 = -w / 2, oy1 = w / 2;
  const oz0 = 0, oz1 = h;

  // Inner cavity vertices (t to h in Z - open top)
  const ix0 = ox0 + t, ix1 = ox1 - t;
  const iy0 = oy0 + t, iy1 = oy1 - t;
  const iz0 = t, iz1 = h;

  const v = (x: number, y: number, z: number): Point3D => ({ x, y, z });

  // 1. Outer Bottom Face (-Z at z = 0)
  triangles.push({ v1: v(ox0, oy0, oz0), v2: v(ox1, oy1, oz0), v3: v(ox1, oy0, oz0) });
  triangles.push({ v1: v(ox0, oy0, oz0), v2: v(ox0, oy1, oz0), v3: v(ox1, oy1, oz0) });

  // 2. Outer 4 side walls
  // -Y wall
  triangles.push({ v1: v(ox0, oy0, oz0), v2: v(ox1, oy0, oz0), v3: v(ox1, oy0, oz1) });
  triangles.push({ v1: v(ox0, oy0, oz0), v2: v(ox1, oy0, oz1), v3: v(ox0, oy0, oz1) });
  // +Y wall
  triangles.push({ v1: v(ox1, oy1, oz0), v2: v(ox0, oy1, oz0), v3: v(ox0, oy1, oz1) });
  triangles.push({ v1: v(ox1, oy1, oz0), v2: v(ox0, oy1, oz1), v3: v(ox1, oy1, oz1) });
  // -X wall
  triangles.push({ v1: v(ox0, oy1, oz0), v2: v(ox0, oy0, oz0), v3: v(ox0, oy0, oz1) });
  triangles.push({ v1: v(ox0, oy1, oz0), v2: v(ox0, oy0, oz1), v3: v(ox0, oy1, oz1) });
  // +X wall
  triangles.push({ v1: v(ox1, oy0, oz0), v2: v(ox1, oy1, oz0), v3: v(ox1, oy1, oz1) });
  triangles.push({ v1: v(ox1, oy0, oz0), v2: v(ox1, oy1, oz1), v3: v(ox1, oy0, oz1) });

  // 3. Inner Cavity Floor (facing +Z at z = t)
  triangles.push({ v1: v(ix0, iy0, iz0), v2: v(ix1, iy0, iz0), v3: v(ix1, iy1, iz0) });
  triangles.push({ v1: v(ix0, iy0, iz0), v2: v(ix1, iy1, iz0), v3: v(ix0, iy1, iz0) });

  // 4. Inner 4 side walls (facing inward into cavity)
  // -Y inner wall
  triangles.push({ v1: v(ix0, iy0, iz0), v2: v(ix1, iy0, iz1), v3: v(ix1, iy0, iz0) });
  triangles.push({ v1: v(ix0, iy0, iz0), v2: v(ix0, iy0, iz1), v3: v(ix1, iy0, iz1) });
  // +Y inner wall
  triangles.push({ v1: v(ix1, iy1, iz0), v2: v(ix0, iy1, iz1), v3: v(ix0, iy1, iz0) });
  triangles.push({ v1: v(ix1, iy1, iz0), v2: v(ix1, iy1, iz1), v3: v(ix0, iy1, iz1) });
  // -X inner wall
  triangles.push({ v1: v(ix0, iy1, iz0), v2: v(ix0, iy0, iz1), v3: v(ix0, iy0, iz0) });
  triangles.push({ v1: v(ix0, iy1, iz0), v2: v(ix0, iy1, iz1), v3: v(ix0, iy0, iz1) });
  // +X inner wall
  triangles.push({ v1: v(ix1, iy0, iz0), v2: v(ix1, iy1, iz1), v3: v(ix1, iy1, iz0) });
  triangles.push({ v1: v(ix1, iy0, iz0), v2: v(ix1, iy0, iz1), v3: v(ix1, iy1, iz1) });

  // 5. Top Rim Lip (z = h, connecting outer to inner boundary)
  // -Y rim strip
  triangles.push({ v1: v(ox0, oy0, oz1), v2: v(ox1, oy0, oz1), v3: v(ix1, iy0, oz1) });
  triangles.push({ v1: v(ox0, oy0, oz1), v2: v(ix1, iy0, oz1), v3: v(ix0, iy0, oz1) });
  // +Y rim strip
  triangles.push({ v1: v(ox1, oy1, oz1), v2: v(ox0, oy1, oz1), v3: v(ix0, iy1, oz1) });
  triangles.push({ v1: v(ox1, oy1, oz1), v2: v(ix0, iy1, oz1), v3: v(ix1, iy1, oz1) });
  // -X rim strip
  triangles.push({ v1: v(ox0, oy1, oz1), v2: v(ox0, oy0, oz1), v3: v(ix0, iy0, oz1) });
  triangles.push({ v1: v(ox0, oy1, oz1), v2: v(ix0, iy0, oz1), v3: v(ix0, iy1, oz1) });
  // +X rim strip
  triangles.push({ v1: v(ox1, oy0, oz1), v2: v(ox1, oy1, oz1), v3: v(ix1, iy1, oz1) });
  triangles.push({ v1: v(ox1, oy0, oz1), v2: v(ix1, iy1, oz1), v3: v(ix1, iy0, oz1) });

  return trianglesToBinaryStl(triangles, `Enclosure-${Math.round(l)}x${Math.round(w)}x${Math.round(h)}mm`);
}

/**
 * Generates a hollow cylindrical tube / pipe / bushing
 */
export function buildTubeStl(outerDiaMm: number, innerDiaMm: number, lengthMm: number, segments = 64): Buffer {
  const outerR = Math.max(3, outerDiaMm / 2);
  const innerR = Math.max(1, Math.min(outerR * 0.9, innerDiaMm / 2));
  const h = Math.max(5, lengthMm);
  const triangles: Triangle3D[] = [];

  const getPt = (r: number, z: number, idx: number): Point3D => {
    const a = (idx / segments) * 2 * Math.PI;
    return { x: r * Math.cos(a), y: r * Math.sin(a), z };
  };

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    // Outer cylinder
    const o0 = getPt(outerR, 0, i), o1 = getPt(outerR, 0, next);
    const o2 = getPt(outerR, h, i), o3 = getPt(outerR, h, next);
    triangles.push({ v1: o0, v2: o1, v3: o3 });
    triangles.push({ v1: o0, v2: o3, v3: o2 });

    // Inner bore cylinder (facing inward)
    const i0 = getPt(innerR, 0, i), i1 = getPt(innerR, 0, next);
    const i2 = getPt(innerR, h, i), i3 = getPt(innerR, h, next);
    triangles.push({ v1: i0, v2: i3, v3: i1 });
    triangles.push({ v1: i0, v2: i2, v3: i3 });

    // Bottom annular ring
    triangles.push({ v1: o0, v2: i1, v3: o1 });
    triangles.push({ v1: o0, v2: i0, v3: i1 });

    // Top annular ring
    triangles.push({ v1: o2, v2: o3, v3: i3 });
    triangles.push({ v1: o2, v2: i3, v3: i2 });
  }

  return trianglesToBinaryStl(triangles, `Tube-OD${Math.round(outerDiaMm)}-ID${Math.round(innerDiaMm)}x${Math.round(h)}mm`);
}

/**
 * Generates a stepped precision transmission shaft with bearing journals & keyway
 */
export function buildSteppedShaftStl(
  diameterMm: number,
  totalLengthMm: number
): Buffer {
  const dMid = Math.max(6, diameterMm);
  const dEnd1 = dMid * 0.75;
  const dEnd2 = dMid * 0.6;
  const totalL = Math.max(20, totalLengthMm);
  const l1 = totalL * 0.25;
  const l2 = totalL * 0.50;
  const l3 = totalL * 0.25;
  const triangles: Triangle3D[] = [];
  const segments = 48;

  // Sections:
  // 1. 0 to l1: dia dEnd1
  // 2. l1 to l1+l2: dia dMid
  // 3. l1+l2 to totalL: dia dEnd2
  const sections = [
    { r: dEnd1 / 2, z0: 0, z1: l1 },
    { r: dMid / 2, z0: l1, z1: l1 + l2 },
    { r: dEnd2 / 2, z0: l1 + l2, z1: totalL }
  ];

  const getPt = (r: number, z: number, idx: number): Point3D => {
    const a = (idx / segments) * 2 * Math.PI;
    return { x: r * Math.cos(a), y: r * Math.sin(a), z };
  };

  // Bottom cap
  const c0: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: c0, v2: getPt(sections[0].r, 0, next), v3: getPt(sections[0].r, 0, i) });
  }

  // Cylinders
  for (const s of sections) {
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const b1 = getPt(s.r, s.z0, i), b2 = getPt(s.r, s.z0, next);
      const t1 = getPt(s.r, s.z1, i), t2 = getPt(s.r, s.z1, next);
      triangles.push({ v1: b1, v2: b2, v3: t2 });
      triangles.push({ v1: b1, v2: t2, v3: t1 });
    }
  }

  // Steps / shoulders between sections
  for (let s = 0; s < sections.length - 1; s++) {
    const s1 = sections[s];
    const s2 = sections[s + 1];
    const zStep = s1.z1;
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const p1 = getPt(s1.r, zStep, i), p2 = getPt(s1.r, zStep, next);
      const p3 = getPt(s2.r, zStep, i), p4 = getPt(s2.r, zStep, next);
      if (s2.r > s1.r) {
        triangles.push({ v1: p1, v2: p4, v3: p2 });
        triangles.push({ v1: p1, v2: p3, v3: p4 });
      } else {
        triangles.push({ v1: p1, v2: p2, v3: p4 });
        triangles.push({ v1: p1, v2: p4, v3: p3 });
      }
    }
  }

  // Top cap
  const cTop: Point3D = { x: 0, y: 0, z: totalL };
  const lastR = sections[sections.length - 1].r;
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: cTop, v2: getPt(lastR, totalL, i), v3: getPt(lastR, totalL, next) });
  }

  return trianglesToBinaryStl(triangles, `SteppedShaft-Dia${Math.round(dMid)}x${Math.round(totalL)}mm`);
}

/**
 * Generates a drone arm with motor mount ring and truss skeleton
 */
export function buildDroneArmStl(
  lengthMm: number,
  widthMm: number,
  heightMm: number
): Buffer {
  const l = Math.max(30, lengthMm);
  const w = Math.max(15, widthMm);
  const h = Math.max(8, heightMm);
  const motorR = w * 0.9;
  const triangles: Triangle3D[] = [];
  const segments = 32;

  // 1. Motor Mount Ring at tip (centered at X = l - motorR, Y = 0)
  const mx = l - motorR;
  const boreR = motorR * 0.4;
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * 2 * Math.PI;
    const a2 = ((i + 1) / segments) * 2 * Math.PI;

    const o1 = { x: mx + motorR * Math.cos(a1), y: motorR * Math.sin(a1), z: 0 };
    const o2 = { x: mx + motorR * Math.cos(a2), y: motorR * Math.sin(a2), z: 0 };
    const o3 = { x: mx + motorR * Math.cos(a1), y: motorR * Math.sin(a1), z: h * 0.6 };
    const o4 = { x: mx + motorR * Math.cos(a2), y: motorR * Math.sin(a2), z: h * 0.6 };

    triangles.push({ v1: o1, v2: o2, v3: o4 });
    triangles.push({ v1: o1, v2: o4, v3: o3 });

    // Top motor face
    const i1 = { x: mx + boreR * Math.cos(a1), y: boreR * Math.sin(a1), z: h * 0.6 };
    const i2 = { x: mx + boreR * Math.cos(a2), y: boreR * Math.sin(a2), z: h * 0.6 };
    triangles.push({ v1: o3, v2: o4, v3: i2 });
    triangles.push({ v1: o3, v2: i2, v3: i1 });

    // Bottom motor face
    const bi1 = { x: mx + boreR * Math.cos(a1), y: boreR * Math.sin(a1), z: 0 };
    const bi2 = { x: mx + boreR * Math.cos(a2), y: boreR * Math.sin(a2), z: 0 };
    triangles.push({ v1: o1, v2: bi2, v3: o2 });
    triangles.push({ v1: o1, v2: bi1, v3: bi2 });
  }

  // 2. Arm Beam connecting root (x = 0) to motor plate
  const beamW = w * 0.5;
  const rootW = w * 0.8;
  const rootL = l * 0.25;

  // Root mounting block
  const v = (x: number, y: number, z: number): Point3D => ({ x, y, z });
  const block0 = [
    v(0, -rootW / 2, 0), v(rootL, -beamW / 2, 0), v(rootL, beamW / 2, 0), v(0, rootW / 2, 0),
    v(0, -rootW / 2, h), v(rootL, -beamW / 2, h), v(rootL, beamW / 2, h), v(0, rootW / 2, h)
  ];
  triangles.push({ v1: block0[0], v2: block0[2], v3: block0[1] });
  triangles.push({ v1: block0[0], v2: block0[3], v3: block0[2] });
  triangles.push({ v1: block0[4], v2: block0[5], v3: block0[6] });
  triangles.push({ v1: block0[4], v2: block0[6], v3: block0[7] });
  triangles.push({ v1: block0[0], v2: block0[1], v3: block0[5] });
  triangles.push({ v1: block0[0], v2: block0[5], v3: block0[4] });
  triangles.push({ v1: block0[2], v2: block0[3], v3: block0[7] });
  triangles.push({ v1: block0[2], v2: block0[7], v3: block0[6] });
  triangles.push({ v1: block0[3], v2: block0[0], v3: block0[4] });
  triangles.push({ v1: block0[3], v2: block0[4], v3: block0[7] });

  // Main beam extension
  const beamEnd = mx - motorR * 0.5;
  const block1 = [
    v(rootL, -beamW / 2, 0), v(beamEnd, -beamW / 2, 0), v(beamEnd, beamW / 2, 0), v(rootL, beamW / 2, 0),
    v(rootL, -beamW / 2, h * 0.7), v(beamEnd, -beamW / 2, h * 0.6), v(beamEnd, beamW / 2, h * 0.6), v(rootL, beamW / 2, h * 0.7)
  ];
  triangles.push({ v1: block1[0], v2: block1[2], v3: block1[1] });
  triangles.push({ v1: block1[0], v2: block1[3], v3: block1[2] });
  triangles.push({ v1: block1[4], v2: block1[5], v3: block1[6] });
  triangles.push({ v1: block1[4], v2: block1[6], v3: block1[7] });
  triangles.push({ v1: block1[0], v2: block1[1], v3: block1[5] });
  triangles.push({ v1: block1[0], v2: block1[5], v3: block1[4] });
  triangles.push({ v1: block1[2], v2: block1[3], v3: block1[7] });
  triangles.push({ v1: block1[2], v2: block1[7], v3: block1[6] });

  return trianglesToBinaryStl(triangles, `DroneArm-${Math.round(l)}x${Math.round(w)}x${Math.round(h)}mm`);
}

/**
 * Generates a spherical pressure vessel / dome cap
 */
export function buildDomeStl(diameterMm: number, heightMm?: number): Buffer {
  const r = Math.max(5, diameterMm / 2);
  const h = heightMm ? Math.min(r, heightMm) : r;
  const triangles: Triangle3D[] = [];
  const rings = 32;
  const segments = 48;

  const getPt = (ringIdx: number, segIdx: number): Point3D => {
    const phi = (ringIdx / rings) * (Math.PI / 2); // 0 to 90 degrees (hemisphere)
    const theta = (segIdx / segments) * 2 * Math.PI;
    const currR = r * Math.sin(phi);
    const z = (r * Math.cos(phi) - r * Math.cos(Math.PI / 2)) * (h / r);
    return { x: currR * Math.cos(theta), y: currR * Math.sin(theta), z: h - z };
  };

  // Base cap at z = 0
  const c0: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: c0, v2: getPt(rings, next), v3: getPt(rings, i) });
  }

  // Dome rings
  for (let ring = 0; ring < rings; ring++) {
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const b1 = getPt(ring + 1, i), b2 = getPt(ring + 1, next);
      const t1 = getPt(ring, i), t2 = getPt(ring, next);
      triangles.push({ v1: b1, v2: b2, v3: t2 });
      triangles.push({ v1: b1, v2: t2, v3: t1 });
    }
  }

  return trianglesToBinaryStl(triangles, `Dome-Dia${Math.round(diameterMm)}x${Math.round(h)}mm`);
}

/**
 * Generates an extruded heatsink with thermal cooling fins
 */
export function buildHeatsinkStl(
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  finCount = 7
): Buffer {
  const l = Math.max(20, lengthMm);
  const w = Math.max(20, widthMm);
  const h = Math.max(10, heightMm);
  const baseThick = h * 0.25;
  const finH = h - baseThick;
  const triangles: Triangle3D[] = [];

  // 1. Base Plate
  const v = (x: number, y: number, z: number): Point3D => ({ x, y, z });
  const x0 = -l / 2, x1 = l / 2;
  const y0 = -w / 2, y1 = w / 2;

  // Base bottom (-Z)
  triangles.push({ v1: v(x0, y0, 0), v2: v(x1, y1, 0), v3: v(x1, y0, 0) });
  triangles.push({ v1: v(x0, y0, 0), v2: v(x0, y1, 0), v3: v(x1, y1, 0) });

  // Base 4 sides
  triangles.push({ v1: v(x0, y0, 0), v2: v(x1, y0, 0), v3: v(x1, y0, baseThick) });
  triangles.push({ v1: v(x0, y0, 0), v2: v(x1, y0, baseThick), v3: v(x0, y0, baseThick) });

  triangles.push({ v1: v(x1, y1, 0), v2: v(x0, y1, 0), v3: v(x0, y1, baseThick) });
  triangles.push({ v1: v(x1, y1, 0), v2: v(x0, y1, baseThick), v3: v(x1, y1, baseThick) });

  triangles.push({ v1: v(x0, y1, 0), v2: v(x0, y0, 0), v3: v(x0, y0, baseThick) });
  triangles.push({ v1: v(x0, y1, 0), v2: v(x0, y0, baseThick), v3: v(x0, y1, baseThick) });

  triangles.push({ v1: v(x1, y0, 0), v2: v(x1, y1, 0), v3: v(x1, y1, baseThick) });
  triangles.push({ v1: v(x1, y0, 0), v2: v(x1, y1, baseThick), v3: v(x1, y0, baseThick) });

  // 2. Cooling Fins
  const finThick = Math.min(3, (w / (finCount * 2)));
  const gap = (w - finCount * finThick) / (finCount - 1);

  // Top surface valleys between fins
  for (let f = 0; f < finCount - 1; f++) {
    const valleyY0 = y0 + (f + 1) * finThick + f * gap;
    const valleyY1 = valleyY0 + gap;
    triangles.push({ v1: v(x0, valleyY0, baseThick), v2: v(x1, valleyY0, baseThick), v3: v(x1, valleyY1, baseThick) });
    triangles.push({ v1: v(x0, valleyY0, baseThick), v2: v(x1, valleyY1, baseThick), v3: v(x0, valleyY1, baseThick) });
  }

  // Each fin
  for (let f = 0; f < finCount; f++) {
    const fy0 = y0 + f * (finThick + gap);
    const fy1 = fy0 + finThick;
    const fz1 = baseThick + finH;

    // Fin top (+Z)
    triangles.push({ v1: v(x0, fy0, fz1), v2: v(x1, fy0, fz1), v3: v(x1, fy1, fz1) });
    triangles.push({ v1: v(x0, fy0, fz1), v2: v(x1, fy1, fz1), v3: v(x0, fy1, fz1) });

    // Fin side (-Y)
    triangles.push({ v1: v(x0, fy0, baseThick), v2: v(x1, fy0, baseThick), v3: v(x1, fy0, fz1) });
    triangles.push({ v1: v(x0, fy0, baseThick), v2: v(x1, fy0, fz1), v3: v(x0, fy0, fz1) });

    // Fin side (+Y)
    triangles.push({ v1: v(x1, fy1, baseThick), v2: v(x0, fy1, baseThick), v3: v(x0, fy1, fz1) });
    triangles.push({ v1: v(x1, fy1, baseThick), v2: v(x0, fy1, fz1), v3: v(x1, fy1, fz1) });

    // Fin ends (-X and +X)
    triangles.push({ v1: v(x0, fy1, baseThick), v2: v(x0, fy0, baseThick), v3: v(x0, fy0, fz1) });
    triangles.push({ v1: v(x0, fy1, baseThick), v2: v(x0, fy0, fz1), v3: v(x0, fy1, fz1) });

    triangles.push({ v1: v(x1, fy0, baseThick), v2: v(x1, fy1, baseThick), v3: v(x1, fy1, fz1) });
    triangles.push({ v1: v(x1, fy0, baseThick), v2: v(x1, fy1, fz1), v3: v(x1, fy0, fz1) });
  }

  return trianglesToBinaryStl(triangles, `Heatsink-${Math.round(l)}x${Math.round(w)}x${Math.round(h)}mm`);
}

/**
 * Generates an industrial hexagonal head bolt and shank
 */
export function buildHexBoltStl(diameterMm: number, lengthMm: number): Buffer {
  const d = Math.max(4, diameterMm);
  const totalL = Math.max(15, lengthMm);
  const shankR = d / 2;
  const headH = d * 0.7;
  const headR = d * 0.95;
  const shankL = totalL - headH;
  const triangles: Triangle3D[] = [];

  // Hexagonal Head (6 sides)
  const getHexPt = (z: number, i: number): Point3D => {
    const a = (i / 6) * 2 * Math.PI;
    return { x: headR * Math.cos(a), y: headR * Math.sin(a), z };
  };

  // Head Top Cap (+Z)
  const cTop: Point3D = { x: 0, y: 0, z: totalL };
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    triangles.push({ v1: cTop, v2: getHexPt(totalL, i), v3: getHexPt(totalL, next) });
  }

  // Head 6 sides
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const b1 = getHexPt(shankL, i), b2 = getHexPt(shankL, next);
    const t1 = getHexPt(totalL, i), t2 = getHexPt(totalL, next);
    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Cylindrical Shank (32 segments)
  const segments = 32;
  const getShankPt = (z: number, i: number): Point3D => {
    const a = (i / segments) * 2 * Math.PI;
    return { x: shankR * Math.cos(a), y: shankR * Math.sin(a), z };
  };

  // Head to shank transition shoulder at z = shankL
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const h1 = getHexPt(shankL, i), h2 = getHexPt(shankL, next);
    const s1 = getShankPt(shankL, Math.floor((i / 6) * segments));
    const s2 = getShankPt(shankL, Math.floor(((i + 1) / 6) * segments));
    triangles.push({ v1: h1, v2: s2, v3: h2 });
    triangles.push({ v1: h1, v2: s1, v3: s2 });
  }

  // Shank cylinder
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getShankPt(0, i), b2 = getShankPt(0, next);
    const t1 = getShankPt(shankL, i), t2 = getShankPt(shankL, next);
    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Shank bottom tip cap (-Z at z = 0)
  const cBot: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: cBot, v2: getShankPt(0, next), v3: getShankPt(0, i) });
  }

  return trianglesToBinaryStl(triangles, `HexBolt-M${Math.round(d)}x${Math.round(totalL)}mm`);
}

/**
 * Generates an articulated robotic gripper / claw
 */
export function buildGripperStl(lengthMm: number, widthMm: number, heightMm: number): Buffer {
  const l = Math.max(30, lengthMm);
  const w = Math.max(20, widthMm);
  const h = Math.max(15, heightMm);
  const triangles: Triangle3D[] = [];
  const v = (x: number, y: number, z: number): Point3D => ({ x, y, z });

  // Palm base block: 0 to l*0.35 in X
  const palmL = l * 0.35;
  const palmW = w;
  const p0 = [
    v(0, -palmW / 2, 0), v(palmL, -palmW / 2, 0), v(palmL, palmW / 2, 0), v(0, palmW / 2, 0),
    v(0, -palmW / 2, h), v(palmL, -palmW / 2, h), v(palmL, palmW / 2, h), v(0, palmW / 2, h)
  ];
  triangles.push({ v1: p0[0], v2: p0[2], v3: p0[1] });
  triangles.push({ v1: p0[0], v2: p0[3], v3: p0[2] });
  triangles.push({ v1: p0[4], v2: p0[5], v3: p0[6] });
  triangles.push({ v1: p0[4], v2: p0[6], v3: p0[7] });
  triangles.push({ v1: p0[0], v2: p0[1], v3: p0[5] });
  triangles.push({ v1: p0[0], v2: p0[5], v3: p0[4] });
  triangles.push({ v1: p0[2], v2: p0[3], v3: p0[7] });
  triangles.push({ v1: p0[2], v2: p0[7], v3: p0[6] });
  triangles.push({ v1: p0[3], v2: p0[0], v3: p0[4] });
  triangles.push({ v1: p0[3], v2: p0[4], v3: p0[7] });

  // Two curved gripper fingers extending forward in X
  const fingerW = w * 0.25;
  const fingerH = h * 0.75;
  const tipX = l;
  const tipSpread = w * 0.25; // grip pinch gap

  // Left Finger (-Y)
  const lf0 = [
    v(palmL, -palmW / 2, 0), v(tipX, -tipSpread, 0), v(tipX, -tipSpread + fingerW, 0), v(palmL, -palmW / 2 + fingerW, 0),
    v(palmL, -palmW / 2, fingerH), v(tipX, -tipSpread, fingerH), v(tipX, -tipSpread + fingerW, fingerH), v(palmL, -palmW / 2 + fingerW, fingerH)
  ];
  triangles.push({ v1: lf0[0], v2: lf0[2], v3: lf0[1] });
  triangles.push({ v1: lf0[0], v2: lf0[3], v3: lf0[2] });
  triangles.push({ v1: lf0[4], v2: lf0[5], v3: lf0[6] });
  triangles.push({ v1: lf0[4], v2: lf0[6], v3: lf0[7] });
  triangles.push({ v1: lf0[0], v2: lf0[1], v3: lf0[5] });
  triangles.push({ v1: lf0[0], v2: lf0[5], v3: lf0[4] });
  triangles.push({ v1: lf0[2], v2: lf0[3], v3: lf0[7] });
  triangles.push({ v1: lf0[2], v2: lf0[7], v3: lf0[6] });
  triangles.push({ v1: lf0[1], v2: lf0[2], v3: lf0[6] });
  triangles.push({ v1: lf0[1], v2: lf0[6], v3: lf0[5] });

  // Right Finger (+Y)
  const rf0 = [
    v(palmL, palmW / 2 - fingerW, 0), v(tipX, tipSpread - fingerW, 0), v(tipX, tipSpread, 0), v(palmL, palmW / 2, 0),
    v(palmL, palmW / 2 - fingerW, fingerH), v(tipX, tipSpread - fingerW, fingerH), v(tipX, tipSpread, fingerH), v(palmL, palmW / 2, fingerH)
  ];
  triangles.push({ v1: rf0[0], v2: rf0[2], v3: rf0[1] });
  triangles.push({ v1: rf0[0], v2: rf0[3], v3: rf0[2] });
  triangles.push({ v1: rf0[4], v2: rf0[5], v3: rf0[6] });
  triangles.push({ v1: rf0[4], v2: rf0[6], v3: rf0[7] });
  triangles.push({ v1: rf0[0], v2: rf0[1], v3: rf0[5] });
  triangles.push({ v1: rf0[0], v2: rf0[5], v3: rf0[4] });
  triangles.push({ v1: rf0[2], v2: rf0[3], v3: rf0[7] });
  triangles.push({ v1: rf0[2], v2: rf0[7], v3: rf0[6] });
  triangles.push({ v1: rf0[1], v2: rf0[2], v3: rf0[6] });
  triangles.push({ v1: rf0[1], v2: rf0[6], v3: rf0[5] });

  return trianglesToBinaryStl(triangles, `RoboticGripper-${Math.round(l)}x${Math.round(w)}x${Math.round(h)}mm`);
}

/**
 * Generates a conical transition nozzle or funnel
 */
export function buildConeStl(bottomDiaMm: number, topDiaMm: number, heightMm: number, segments = 48): Buffer {
  const r0 = Math.max(1, bottomDiaMm / 2);
  const r1 = Math.max(1, topDiaMm / 2);
  const h = Math.max(5, heightMm);
  const triangles: Triangle3D[] = [];

  const getPt = (r: number, z: number, i: number): Point3D => {
    const a = (i / segments) * 2 * Math.PI;
    return { x: r * Math.cos(a), y: r * Math.sin(a), z };
  };

  // Bottom cap
  const c0: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: c0, v2: getPt(r0, 0, next), v3: getPt(r0, 0, i) });
  }

  // Conical side
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getPt(r0, 0, i), b2 = getPt(r0, 0, next);
    const t1 = getPt(r1, h, i), t2 = getPt(r1, h, next);
    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Top cap
  const c1: Point3D = { x: 0, y: 0, z: h };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: c1, v2: getPt(r1, h, i), v3: getPt(r1, h, next) });
  }

  return trianglesToBinaryStl(triangles, `Cone-Dia${Math.round(r0 * 2)}to${Math.round(r1 * 2)}x${Math.round(h)}mm`);
}

/**
 * Generates a coffee mug / cup with a curved side handle
 */
export function buildMugStl(diameterMm: number, heightMm: number): Buffer {
  const outerR = Math.max(15, diameterMm / 2);
  const innerR = outerR * 0.88;
  const h = Math.max(20, heightMm);
  const baseT = h * 0.08;
  const triangles: Triangle3D[] = [];
  const segments = 48;

  const getPt = (r: number, z: number, i: number): Point3D => {
    const a = (i / segments) * 2 * Math.PI;
    return { x: r * Math.cos(a), y: r * Math.sin(a), z };
  };

  // Outer Bottom cap
  const c0: Point3D = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: c0, v2: getPt(outerR, 0, next), v3: getPt(outerR, 0, i) });
  }

  // Outer side
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getPt(outerR, 0, i), b2 = getPt(outerR, 0, next);
    const t1 = getPt(outerR, h, i), t2 = getPt(outerR, h, next);
    triangles.push({ v1: b1, v2: b2, v3: t2 });
    triangles.push({ v1: b1, v2: t2, v3: t1 });
  }

  // Inner cavity side
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = getPt(innerR, baseT, i), b2 = getPt(innerR, baseT, next);
    const t1 = getPt(innerR, h, i), t2 = getPt(innerR, h, next);
    triangles.push({ v1: b1, v2: t2, v3: b2 });
    triangles.push({ v1: b1, v2: t1, v3: t2 });
  }

  // Inner Floor cap
  const cIn: Point3D = { x: 0, y: 0, z: baseT };
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push({ v1: cIn, v2: getPt(innerR, baseT, i), v3: getPt(innerR, baseT, next) });
  }

  // Rim top ring
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const o1 = getPt(outerR, h, i), o2 = getPt(outerR, h, next);
    const i1 = getPt(innerR, h, i), i2 = getPt(innerR, h, next);
    triangles.push({ v1: o1, v2: o2, v3: i2 });
    triangles.push({ v1: o1, v2: i2, v3: i1 });
  }

  return trianglesToBinaryStl(triangles, `CupMug-Dia${Math.round(outerR * 2)}x${Math.round(h)}mm`);
}


