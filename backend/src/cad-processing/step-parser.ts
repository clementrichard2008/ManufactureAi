import occtimportjs from 'occt-import-js';
import { CadMeshStats } from '../../../shared/src/types';

let occtInstance: any = null;

async function getOcct() {
  if (!occtInstance) {
    occtInstance = await occtimportjs();
  }
  return occtInstance;
}

export interface StepParseResult {
  success: boolean;
  stats?: CadMeshStats;
  stlBuffer?: Buffer;
  message?: string;
}

export async function parseStep(
  buffer: Buffer,
  filename: string,
  unit: 'mm' | 'cm' | 'in' = 'mm'
): Promise<StepParseResult> {
  const unitScaleToMm = unit === 'mm' ? 1.0 : unit === 'cm' ? 10.0 : 25.4;

  try {
    const occt = await getOcct();
    const uint8 = new Uint8Array(buffer);

    // Call OpenCASCADE STEP reader
    const result = occt.ReadStepFile(uint8, null);

    if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
      return {
        success: false,
        message: 'OpenCASCADE was unable to parse the STEP geometry. The file may be corrupt or contain non-manifold surface entities.'
      };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    let totalVolumeMm3 = 0;
    let totalAreaMm2 = 0;
    let totalTriangles = 0;

    // First count total triangles
    for (const mesh of result.meshes) {
      if (mesh.index && mesh.index.array) {
        totalTriangles += Math.floor(mesh.index.array.length / 3);
      }
    }

    // Allocate binary STL buffer: 84 bytes header + 50 bytes per triangle
    const stlBuffer = Buffer.alloc(84 + totalTriangles * 50);
    // Write 80 bytes header
    stlBuffer.write(`ManufactureAI STEP Tessellation: ${filename.slice(0, 50)}`, 0, 'utf8');
    // Write triangle count at offset 80
    stlBuffer.writeUInt32LE(totalTriangles, 80);

    let stlOffset = 84;

    for (const mesh of result.meshes) {
      const pos = mesh.attributes.position.array;
      const indices = mesh.index.array;
      const numTris = Math.floor(indices.length / 3);

      for (let t = 0; t < numTris; t++) {
        const i0 = indices[t * 3];
        const i1 = indices[t * 3 + 1];
        const i2 = indices[t * 3 + 2];

        const v1x = pos[i0 * 3] * unitScaleToMm;
        const v1y = pos[i0 * 3 + 1] * unitScaleToMm;
        const v1z = pos[i0 * 3 + 2] * unitScaleToMm;

        const v2x = pos[i1 * 3] * unitScaleToMm;
        const v2y = pos[i1 * 3 + 1] * unitScaleToMm;
        const v2z = pos[i1 * 3 + 2] * unitScaleToMm;

        const v3x = pos[i2 * 3] * unitScaleToMm;
        const v3y = pos[i2 * 3 + 1] * unitScaleToMm;
        const v3z = pos[i2 * 3 + 2] * unitScaleToMm;

        // Bounding box
        minX = Math.min(minX, v1x, v2x, v3x); maxX = Math.max(maxX, v1x, v2x, v3x);
        minY = Math.min(minY, v1y, v2y, v3y); maxY = Math.max(maxY, v1y, v2y, v3y);
        minZ = Math.min(minZ, v1z, v2z, v3z); maxZ = Math.max(maxZ, v1z, v2z, v3z);

        // Signed tetrahedron volume
        const crossX = v2y * v3z - v2z * v3y;
        const crossY = v2z * v3x - v2x * v3z;
        const crossZ = v2x * v3y - v2y * v3x;
        const signedVol = (v1x * crossX + v1y * crossY + v1z * crossZ) / 6.0;
        totalVolumeMm3 += signedVol;

        // Surface area
        const abx = v2x - v1x, aby = v2y - v1y, abz = v2z - v1z;
        const acx = v3x - v1x, acy = v3y - v1y, acz = v3z - v1z;
        const areaCrossX = aby * acz - abz * acy;
        const areaCrossY = abz * acx - abx * acz;
        const areaCrossZ = abx * acy - aby * acx;
        const triArea = 0.5 * Math.sqrt(areaCrossX * areaCrossX + areaCrossY * areaCrossY + areaCrossZ * areaCrossZ);
        totalAreaMm2 += triArea;

        // Compute normal for binary STL
        const normLen = Math.sqrt(areaCrossX * areaCrossX + areaCrossY * areaCrossY + areaCrossZ * areaCrossZ) || 1;
        const nx = areaCrossX / normLen;
        const ny = areaCrossY / normLen;
        const nz = areaCrossZ / normLen;

        // Write normal (12 bytes)
        stlBuffer.writeFloatLE(nx, stlOffset);
        stlBuffer.writeFloatLE(ny, stlOffset + 4);
        stlBuffer.writeFloatLE(nz, stlOffset + 8);
        stlOffset += 12;

        // Write v1 (12 bytes)
        stlBuffer.writeFloatLE(v1x, stlOffset);
        stlBuffer.writeFloatLE(v1y, stlOffset + 4);
        stlBuffer.writeFloatLE(v1z, stlOffset + 8);
        stlOffset += 12;

        // Write v2 (12 bytes)
        stlBuffer.writeFloatLE(v2x, stlOffset);
        stlBuffer.writeFloatLE(v2y, stlOffset + 4);
        stlBuffer.writeFloatLE(v2z, stlOffset + 8);
        stlOffset += 12;

        // Write v3 (12 bytes)
        stlBuffer.writeFloatLE(v3x, stlOffset);
        stlBuffer.writeFloatLE(v3y, stlOffset + 4);
        stlBuffer.writeFloatLE(v3z, stlOffset + 8);
        stlOffset += 12;

        // Write attribute byte count (2 bytes)
        stlBuffer.writeUInt16LE(0, stlOffset);
        stlOffset += 2;
      }
    }

    const length = Math.max(0, maxX - minX);
    const width = Math.max(0, maxY - minY);
    const height = Math.max(0, maxZ - minZ);

    const stats: CadMeshStats = {
      filename,
      format: 'STEP',
      triangleCount: totalTriangles,
      vertexCount: totalTriangles * 3,
      isWatertight: true,
      unit,
      unitScaleToMm,
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

    return {
      success: true,
      stats,
      stlBuffer
    };
  } catch (err: any) {
    console.error('STEP parse exception:', err);
    return {
      success: false,
      message: `Failed to parse STEP file: ${err.message || 'Unknown OpenCASCADE error'}`
    };
  }
}
