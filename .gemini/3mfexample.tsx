import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { FileUp, Box, RotateCcw, Info, AlertCircle, Loader2, Maximize2 } from 'lucide-react';

export default function App() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const frameIdRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jsZipReady, setJsZipReady] = useState(false);

  // 1. Initialize JSZip Dependency
  useEffect(() => {
    if (window.JSZip) {
      setJsZipReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.async = true;
    script.onload = () => {
      setJsZipReady(true);
    };
    script.onerror = () => setError("Failed to load JSZip library.");
    document.head.appendChild(script);
  }, []);

  // 2. Initialize Vanilla Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(200, 200, 200);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 0.5);
    pointLight.position.set(-100, -100, -100);
    scene.add(pointLight);

    // Grid
    const grid = new THREE.GridHelper(1000, 50, 0x222222, 0x111111);
    grid.position.y = -0.1;
    scene.add(grid);

    // Animation Loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const loadModel = (file) => {
    if (!jsZipReady || !sceneRef.current) return;
    
    setError(null);
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loader = new ThreeMFLoader();
        const group = loader.parse(event.target.result);
        
        // Remove existing model
        if (modelRef.current) {
          sceneRef.current.remove(modelRef.current);
        }

        // Process meshes
        group.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
            }
          }
        });

        // Center the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        group.position.x += (group.position.x - center.x);
        group.position.y += (group.position.y - box.min.y); // Set on floor
        group.position.z += (group.position.z - center.z);

        // Adjust camera to fit
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.5; // Zoom out a bit

        cameraRef.current.position.set(cameraZ, cameraZ, cameraZ);
        controlsRef.current.target.set(0, size.y / 2, 0);
        controlsRef.current.update();

        sceneRef.current.add(group);
        modelRef.current = group;
        setFileName(file.name);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError("Error parsing 3MF. Ensure it's a valid 3D Manufacturing archive.");
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.3mf')) {
      loadModel(file);
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#020202] text-white font-sans overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {/* 3D Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <header className="flex justify-between items-start pointer-events-auto">
          <div className="bg-black/70 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
                <Box size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Pro 3MF Viewer</h1>
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest opacity-80">Vanilla Three.js Engine</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-90 shadow-xl"
          >
            <RotateCcw size={20} />
          </button>
        </header>

        {/* Loading/Error Alerts */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 pointer-events-auto">
          {isLoading && (
            <div className="bg-black/80 backdrop-blur-2xl border border-white/10 px-10 py-8 rounded-[2rem] flex flex-col items-center gap-4 shadow-2xl">
              <div className="relative">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
              </div>
              <p className="text-lg font-bold tracking-tight">Analyzing 3MF Mesh...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-xl px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <footer className="flex flex-col items-center gap-4 pointer-events-auto">
          {fileName ? (
            <div className="bg-black/80 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] flex items-center gap-5 shadow-2xl w-full max-w-xl mb-6">
              <div className="bg-blue-500/10 p-4 rounded-2xl">
                <Info className="text-blue-400" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold truncate pr-4">{fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded uppercase">3MF Archive</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Geometry Parsed</span>
                </div>
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-tight transition-all shadow-lg shadow-blue-600/20">
                Switch Model
                <input type="file" className="hidden" accept=".3mf" onChange={(e) => loadModel(e.target.files[0])} />
              </label>
            </div>
          ) : !isLoading && (
            <div className="mb-16 flex flex-col items-center gap-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Precision Browser Renderer
                </div>
                <h2 className="text-6xl font-black tracking-tighter leading-none">Drop 3MF Files</h2>
                <p className="text-slate-500 text-base max-w-md">The 3D Manufacturing Format (3MF) is the industry standard for high-fidelity 3D printing data.</p>
              </div>
              
              <label className="cursor-pointer group flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_-10px_rgba(37,99,235,0.7)] group-hover:scale-110 group-active:scale-95 transition-all z-10 relative">
                    <FileUp size={36} />
                  </div>
                  <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                </div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-blue-400 transition-colors">Select from Device</span>
                <input type="file" className="hidden" accept=".3mf" onChange={(e) => loadModel(e.target.files[0])} disabled={!jsZipReady} />
              </label>
            </div>
          )}
        </footer>
      </div>

      {/* Dragging State */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-md flex items-center justify-center pointer-events-none border-[12px] border-blue-600/30 m-6 rounded-[3rem]">
          <div className="flex flex-col items-center scale-110">
            <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <Maximize2 size={48} className="text-white" />
            </div>
            <h3 className="text-5xl font-black mt-10 uppercase tracking-tighter italic">Release to View</h3>
          </div>
        </div>
      )}
    </div>
  );
}
