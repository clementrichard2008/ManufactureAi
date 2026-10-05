import { CadMeshStats } from '../../../shared/src/types';

export function parseStl(buffer: Buffer, filename: string, unit: 'mm' | 'cm' | 'in' = 'mm'): CadMeshStats {
  const unitScaleToMm = unit === 'mm' ? 1.0 : unit === 'cm' ? 10.0 : 25.4;

  // Check if ASCII STL or Binary STL
  // ASCII files start with "solid" and only contain ASCII characters in the first 80 bytes
  let isAscii = false;
  const header = buffer.subarray(0, 80).toString('utf8');
  if (header.trim().startsWith('solid')) {
    // Check if the rest is text
    const sample = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8');
    if (sample.includes('facet') && sample.includes('vertex')) {
      isAscii = true;
    }
  }

  if (isAscii) {
    return parseAsciiStl(buffer.toString('utf8'), filename, unit, unitScaleToMm);
  } else {
    return parseBinaryStl(buffer, filename, unit, unitScaleToMm);
  }
}

function parseBinaryStl(buffer: Buffer, filename: string, unit: 'mm' | 'cm' | 'in', unitScale: number): CadMeshStats {
  if (buffer.length < 84) {
    throw new Error('STL file is too small to be a valid binary STL.');
  }

  const triangleCount = buffer.readUInt32LE(80);
  const expectedSize = 84 + triangleCount * 50;

  if (buffer.length < expectedSize) {
    // Some STL files might have slight truncation or extra metadata, but let's be resilient
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  let totalVolumeMm3 = 0;
  let totalAreaMm2 = 0;

  // Edge map to check watertightness
  const edgeCountMap = new Map<string, number>();

  let offset = 84;
  const actualTriangles = Math.min(triangleCount, Math.floor((buffer.length - 84) / 50));

  for (let i = 0; i < actualTriangles; i++) {
    // Skip normal vector (12 bytes)
    offset += 12;

    const v1x = buffer.readFloatLE(offset) * unitScale;
    const v1y = buffer.readFloatLE(offset + 4) * unitScale;
    const v1z = buffer.readFloatLE(offset + 8) * unitScale;
    offset += 12;

    const v2x = buffer.readFloatLE(offset) * unitScale;
    const v2y = buffer.readFloatLE(offset + 4) * unitScale;
    const v2z = buffer.readFloatLE(offset + 8) * unitScale;
    offset += 12;

    const v3x = buffer.readFloatLE(offset) * unitScale;
    const v3y = buffer.readFloatLE(offset + 4) * unitScale;
    const v3z = buffer.readFloatLE(offset + 8) * unitScale;
    offset += 12;

    // Skip attribute byte count (2 bytes)
    offset += 2;

    // Bounding box
    minX = Math.min(minX, v1x, v2x, v3x);
    maxX = Math.max(maxX, v1x, v2x, v3x);
    minY = Math.min(minY, v1y, v2y, v3y);
    maxY = Math.max(maxY, v1y, v2y, v3y);
    minZ = Math.min(minZ, v1z, v2z, v3z);
    maxZ = Math.max(maxZ, v1z, v2z, v3z);

    // Signed tetrahedron volume = (v1 . (v2 x v3)) / 6
    const crossX = v2y * v3z - v2z * v3y;
    const crossY = v2z * v3x - v2x * v3z;
    const crossZ = v2x * v3y - v2y * v3x;
    const signedVol = (v1x * crossX + v1y * crossY + v1z * crossZ) / 6.0;
    totalVolumeMm3 += signedVol;

    // Triangle surface area = |(v2 - v1) x (v3 - v1)| / 2
    const abx = v2x - v1x, aby = v2y - v1y, abz = v2z - v1z;
    const acx = v3x - v1x, acy = v3y - v1y, acz = v3z - v1z;
    const areaCrossX = aby * acz - abz * acy;
    const areaCrossY = abz * acx - abx * acz;
    const areaCrossZ = abx * acy - aby * acx;
    const triArea = 0.5 * Math.sqrt(areaCrossX * areaCrossX + areaCrossY * areaCrossY + areaCrossZ * areaCrossZ);
    totalAreaMm2 += triArea;

    // Edge check (sample up to 20000 triangles to maintain fast responsiveness)
    if (actualTriangles <= 30000) {
      addEdge(edgeCountMap, v1x, v1y, v1z, v2x, v2y, v2z);
      addEdge(edgeCountMap, v2x, v2y, v2z, v3x, v3y, v3z);
      addEdge(edgeCountMap, v3x, v3y, v3z, v1x, v1y, v1z);
    }
  }

  // Watertight check
  let isWatertight = true;
  if (actualTriangles <= 30000 && edgeCountMap.size > 0) {
    for (const count of edgeCountMap.values()) {
      if (count !== 2) {
        isWatertight = false;
        break;
      }
    }
  }

  const length = Math.max(0, maxX - minX);
  const width = Math.max(0, maxY - minY);
  const height = Math.max(0, maxZ - minZ);

  return {
    filename,
    format: 'STL',
    triangleCount: actualTriangles,
    vertexCount: actualTriangles * 3,
    isWatertight,
    unit,
    unitScaleToMm: unitScale,
    boundingBoxMm: {
      minX: round(minX), maxX: round(maxX),
      minY: round(minY), maxY: round(maxY),
      minZ: round(minZ), maxZ: round(maxZ),
      length: round(length),
      width: round(width),
      height: round(height)
    },
    volumeMm3: round(Math.abs(totalVolumeMm3)),
    surfaceAreaMm2: round(totalAreaMm2)
  };
}

function parseAsciiStl(content: string, filename: string, unit: 'mm' | 'cm' | 'in', unitScale: number): CadMeshStats {
  const vertexRegex = /vertex\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)/gi;

  const vertices: number[][] = [];
  let match: RegExpExecArray | null;

  while ((match = vertexRegex.exec(content)) !== null) {
    vertices.push([
      parseFloat(match[1]) * unitScale,
      parseFloat(match[2]) * unitScale,
      parseFloat(match[3]) * unitScale
    ]);
  }

  const triangleCount = Math.floor(vertices.length / 3);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let totalVolumeMm3 = 0;
  let totalAreaMm2 = 0;

  for (let i = 0; i < triangleCount; i++) {
    const v1 = vertices[i * 3];
    const v2 = vertices[i * 3 + 1];
    const v3 = vertices[i * 3 + 2];

    minX = Math.min(minX, v1[0], v2[0], v3[0]);
    maxX = Math.max(maxX, v1[0], v2[0], v3[0]);
    minY = Math.min(minY, v1[1], v2[1], v3[1]);
    maxY = Math.max(maxY, v1[1], v2[1], v3[1]);
    minZ = Math.min(minZ, v1[2], v2[2], v3[2]);
    maxZ = Math.max(maxZ, v1[2], v2[2], v3[2]);

    const crossX = v2[1] * v3[2] - v2[2] * v3[1];
    const crossY = v2[2] * v3[0] - v2[0] * v3[2];
    const crossZ = v2[0] * v3[1] - v2[1] * v3[0];
    totalVolumeMm3 += (v1[0] * crossX + v1[1] * crossY + v1[2] * crossZ) / 6.0;

    const abx = v2[0] - v1[0], aby = v2[1] - v1[1], abz = v2[2] - v1[2];
    const acx = v3[0] - v1[0], acy = v3[1] - v1[1], acz = v3[2] - v1[2];
    const areaCrossX = aby * acz - abz * acy;
    const areaCrossY = abz * acx - abx * acz;
    const areaCrossZ = abx * acy - aby * acx;
    totalAreaMm2 += 0.5 * Math.sqrt(areaCrossX * areaCrossX + areaCrossY * areaCrossY + areaCrossZ * areaCrossZ);
  }

  const length = Math.max(0, maxX - minX);
  const width = Math.max(0, maxY - minY);
  const height = Math.max(0, maxZ - minZ);

  return {
    filename,
    format: 'STL',
    triangleCount,
    vertexCount: vertices.length,
    isWatertight: true,
    unit,
    unitScaleToMm: unitScale,
    boundingBoxMm: {
      minX: round(minX), maxX: round(maxX),
      minY: round(minY), maxY: round(maxY),
      minZ: round(minZ), maxZ: round(maxZ),
      length: round(length),
      width: round(width),
      height: round(height)
    },
    volumeMm3: round(Math.abs(totalVolumeMm3)),
    surfaceAreaMm2: round(totalAreaMm2)
  };
}

function addEdge(map: Map<string, number>, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
  // Quantize vertices to avoid floating point drift
  const p1 = `${Math.round(x1 * 100)},${Math.round(y1 * 100)},${Math.round(z1 * 100)}`;
  const p2 = `${Math.round(x2 * 100)},${Math.round(y2 * 100)},${Math.round(z2 * 100)}`;
  const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
  map.set(key, (map.get(key) || 0) + 1);
}

function round(val: number): number {
  return Math.round(val * 100) / 100;
}
