import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { CadMeshStats } from '@shared/types';
import {
  Upload,
  AlertTriangle,
  RotateCcw,
  Box,
  Eye,
  Maximize2,
  Check,
  X,
  FileCode,
  Layers
} from 'lucide-react';

interface Props {
  meshStats: CadMeshStats | null;
  fileBuffer?: ArrayBuffer | null;
  fileName?: string;
  onCadLoaded: (stats: CadMeshStats, buffer: ArrayBuffer, name: string) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export const CadViewer: React.FC<Props> = ({
  meshStats,
  fileBuffer,
  fileName,
  onCadLoaded,
  onClose,
  embedded = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [unit, setUnit] = useState<'mm' | 'cm' | 'in'>('mm');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(150, 150, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00d2ff, 1.2);
    dirLight1.position.set(200, 300, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-200, -100, -200);
    scene.add(dirLight2);

    const gridHelper = new THREE.GridHelper(300, 30, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const axes = new THREE.AxesHelper(60);
    scene.add(axes);
    axesHelperRef.current = axes;

    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      renderer.dispose();
    };
  }, []);

  // Update wireframe / bbox / axes
  useEffect(() => {
    if (!meshGroupRef.current) return;
    meshGroupRef.current.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => (m.wireframe = wireframe));
          } else {
            child.material.wireframe = wireframe;
          }
        }
      }
    });
  }, [wireframe]);

  useEffect(() => {
    if (boxHelperRef.current) {
      boxHelperRef.current.visible = showBoundingBox;
    }
  }, [showBoundingBox]);

  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showAxes;
    }
  }, [showAxes]);

  // Load mesh into scene when fileBuffer is provided
  useEffect(() => {
    if (!fileBuffer || !sceneRef.current || !meshGroupRef.current) return;

    const group = meshGroupRef.current;
    group.clear();

    if (boxHelperRef.current) {
      sceneRef.current.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }

    try {
      const lowerName = (fileName || '').toLowerCase();
      const material = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.7,
        roughness: 0.3,
        wireframe
      });

      if (lowerName.endsWith('.stl') || lowerName.endsWith('.step') || lowerName.endsWith('.stp')) {
        const loader = new STLLoader();
        const geometry = loader.parse(fileBuffer);
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Center mesh
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        mesh.position.sub(center);

        group.add(mesh);

        // Add bounding box helper
        const boxHelper = new THREE.BoxHelper(mesh, 0x00f2fe);
        boxHelper.visible = showBoundingBox;
        sceneRef.current.add(boxHelper);
        boxHelperRef.current = boxHelper;

        // Fit camera
        fitCameraToObject(mesh);
      } else if (lowerName.endsWith('.obj')) {
        const loader = new OBJLoader();
        const text = new TextDecoder().decode(fileBuffer);
        const obj = loader.parse(text);

        obj.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
          }
        });

        // Center object
        const bbox = new THREE.Box3().setFromObject(obj);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        obj.position.sub(center);

        group.add(obj);

        const boxHelper = new THREE.BoxHelper(obj, 0x00f2fe);
        boxHelper.visible = showBoundingBox;
        sceneRef.current.add(boxHelper);
        boxHelperRef.current = boxHelper;

        fitCameraToObject(obj);
      }
    } catch (err: any) {
      console.error('Failed to render 3D mesh:', err);
    }
  }, [fileBuffer, fileName]);

  const fitCameraToObject = (object: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 20);

    const camera = cameraRef.current;
    camera.position.set(maxDim * 1.5, maxDim * 1.3, maxDim * 2.0);
    camera.lookAt(0, 0, 0);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const lowerName = file.name.toLowerCase();

      // Check format
      const isStep = lowerName.endsWith('.step') || lowerName.endsWith('.stp');
      const isStl = lowerName.endsWith('.stl');
      const isObj = lowerName.endsWith('.obj');
      const isIges = lowerName.endsWith('.iges') || lowerName.endsWith('.igs');

      if (!isStep && !isStl && !isObj && !isIges) {
        setErrorMsg('Please upload a valid 3D file (.step, .stp, .stl, or .obj).');
        setLoading(false);
        return;
      }

      // Send to backend for server-side validated parsing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('unit', unit);

      const res = await fetch('/api/cad/parse', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errorMsg = `Server returned HTTP ${res.status}`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const err = await res.json();
            if (err?.error) errorMsg = err.error;
          } else {
            const text = await res.text();
            const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            if (cleanText) errorMsg = cleanText.slice(0, 150);
          }
        } catch {
          // ignore parse error
        }
        throw new Error(errorMsg);
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Received unexpected empty or non-JSON response from server.');
      }
      if (data.stats) {
        let renderBuffer: ArrayBuffer = buffer;
        if (data.stlBase64) {
          // Convert base64 back to binary ArrayBuffer for Three.js STLLoader
          const binaryStr = atob(data.stlBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          renderBuffer = bytes.buffer;
        }
        onCadLoaded(data.stats, renderBuffer, file.name);
      } else if (data.message) {
        setInfoMsg(data.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing CAD mesh.');
    } finally {
      setLoading(false);
    }
  };

  const resetCamera = () => {
    if (meshGroupRef.current) {
      fitCameraToObject(meshGroupRef.current);
    }
  };

  return (
    <div className={`relative flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden ${embedded ? 'h-[500px]' : 'h-full max-h-[85vh]'}`}>
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800 z-10">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-white truncate max-w-[200px]">
            {fileName || (meshStats ? meshStats.filename : '3D CAD Viewport')}
          </span>
          {meshStats && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
              {meshStats.format} • {meshStats.triangleCount.toLocaleString()} tris
            </span>
          )}
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Unit selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-slate-300">
            <span className="px-1.5 text-[10px] text-slate-400 font-medium">Unit:</span>
            {(['mm', 'cm', 'in'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  unit === u ? 'bg-cyan-500 text-slate-950' : 'hover:text-white'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Toggle buttons */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded-lg border transition-colors ${
              wireframe ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Toggle Wireframe"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showBoundingBox ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Toggle Bounding Box"
          >
            <Box className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={resetCamera}
            className="p-1.5 rounded-lg border bg-slate-900 border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div className="relative flex-1 w-full bg-[#07090e]">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Upload Overlay if no mesh loaded */}
        {!fileBuffer && !meshStats && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm z-20">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 glow-cyan">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Upload CAD Model</h3>
            <p className="text-xs text-slate-400 max-w-sm text-center mb-6">
              Supported formats: <strong className="text-cyan-300">.STEP / .STP</strong> (OpenCASCADE B-Rep), <strong className="text-slate-200">.STL</strong>, and <strong className="text-slate-200">.OBJ</strong>.
              Volume and surface area are computed via divergence theorem signed tetrahedrons.
            </p>

            <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>{loading ? 'Analyzing Mesh...' : 'Choose CAD File'}</span>
              <input
                type="file"
                accept=".stl,.obj,.step,.stp,.iges,.igs"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Watertight Warning Banner (Mandated in Prompt) */}
        {meshStats && !meshStats.isWatertight && (
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs backdrop-blur-md shadow-lg z-20">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Warning:</strong> Mesh is not watertight (open manifold). Volume and mass estimates may be approximate. Verify internal features manually.
            </span>
          </div>
        )}

        {/* STEP / IGES guidance notice */}
        {infoMsg && (
          <div className="absolute top-3 left-3 right-3 flex items-start gap-2 p-3 rounded-xl bg-sky-950/90 border border-sky-500/50 text-sky-200 text-xs backdrop-blur-md shadow-lg z-20">
            <Layers className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-1">Analytical CAD File (STEP/IGES)</span>
              <p className="leading-relaxed">{infoMsg}</p>
            </div>
            <button onClick={() => setInfoMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between p-3 rounded-xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs backdrop-blur-md shadow-lg z-20">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bounding box dimensions HUD overlay */}
        {meshStats && (
          <div className="absolute bottom-3 left-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs backdrop-blur-md shadow-lg z-10 pointer-events-none">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
              Extracted Dimensions ({meshStats.unit})
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono-num text-slate-200 text-xs">
              <div>L: <span className="text-cyan-400 font-semibold">{meshStats.boundingBoxMm.length}</span> mm</div>
              <div>W: <span className="text-cyan-400 font-semibold">{meshStats.boundingBoxMm.width}</span> mm</div>
              <div>H: <span className="text-cyan-400 font-semibold">{meshStats.boundingBoxMm.height}</span> mm</div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
              Volume: <span className="text-emerald-400 font-semibold">{meshStats.volumeMm3.toLocaleString()}</span> mm³
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
