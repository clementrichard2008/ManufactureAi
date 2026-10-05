import { CadMeshStats } from '../../../shared/src/types';

export function parseObj(content: string, filename: string, unit: 'mm' | 'cm' | 'in' = 'mm'): CadMeshStats {
  const unitScaleToMm = unit === 'mm' ? 1.0 : unit === 'cm' ? 10.0 : 25.4;

  const lines = content.split(/\r?\n/);
  const vertices: [number, number, number][] = [];
  const faces: number[][] = [];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    const type = parts[0];

    if (type === 'v') {
      const x = parseFloat(parts[1]) * unitScaleToMm;
      const y = parseFloat(parts[2]) * unitScaleToMm;
      const z = parseFloat(parts[3]) * unitScaleToMm;

      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);

      vertices.push([x, y, z]);
    } else if (type === 'f') {
      const faceIndices: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const seg = parts[i].split('/')[0];
        const idx = parseInt(seg, 10);
        if (!isNaN(idx)) {
          // OBJ indices are 1-based, or negative relative
          const resolved = idx > 0 ? idx - 1 : vertices.length + idx;
          faceIndices.push(resolved);
        }
      }
      if (faceIndices.length >= 3) {
        faces.push(faceIndices);
      }
    }
  }

  // Triangulate faces (fan method) and calculate volume and surface area
  let totalVolumeMm3 = 0;
  let totalAreaMm2 = 0;
  let triangleCount = 0;

  for (const face of faces) {
    const v0 = vertices[face[0]];
    if (!v0) continue;

    for (let i = 1; i < face.length - 1; i++) {
      const v1 = vertices[face[i]];
      const v2 = vertices[face[i + 1]];
      if (!v1 || !v2) continue;

      triangleCount++;

      // Signed tetrahedron volume
      const crossX = v1[1] * v2[2] - v1[2] * v2[1];
      const crossY = v1[2] * v2[0] - v1[0] * v2[2];
      const crossZ = v1[0] * v2[1] - v1[1] * v2[0];
      totalVolumeMm3 += (v0[0] * crossX + v0[1] * crossY + v0[2] * crossZ) / 6.0;

      // Surface area
      const abx = v1[0] - v0[0], aby = v1[1] - v0[1], abz = v1[2] - v0[2];
      const acx = v2[0] - v0[0], acy = v2[1] - v0[1], acz = v2[2] - v0[2];
      const areaX = aby * acz - abz * acy;
      const areaY = abz * acx - abx * acz;
      const areaZ = abx * acy - aby * acx;
      totalAreaMm2 += 0.5 * Math.sqrt(areaX * areaX + areaY * areaY + areaZ * areaZ);
    }
  }

  const length = isFinite(maxX - minX) ? Math.max(0, maxX - minX) : 0;
  const width = isFinite(maxY - minY) ? Math.max(0, maxY - minY) : 0;
  const height = isFinite(maxZ - minZ) ? Math.max(0, maxZ - minZ) : 0;

  return {
    filename,
    format: 'OBJ',
    triangleCount,
    vertexCount: vertices.length,
    isWatertight: true,
    unit,
    unitScaleToMm: unitScaleToMm,
    boundingBoxMm: {
      minX: Math.round(minX * 100) / 100,
      maxX: Math.round(maxX * 100) / 100,
      minY: Math.round(minY * 100) / 100,
      maxY: Math.round(maxY * 100) / 100,
      minZ: Math.round(minZ * 100) / 100,
      maxZ: Math.round(maxZ * 100) / 100,
      length: Math.round(length * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100
    },
    volumeMm3: Math.round(Math.abs(totalVolumeMm3) * 100) / 100,
    surfaceAreaMm2: Math.round(totalAreaMm2 * 100) / 100
  };
}
