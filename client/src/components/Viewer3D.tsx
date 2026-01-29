import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewcube, Html, Line, Sphere } from '@react-three/drei';
import { RefreshCw } from 'lucide-react';
import * as THREE from 'three';
import { OBJLoader, STLLoader, GLTFLoader } from 'three-stdlib';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import * as fflate from 'fflate';
import JSZip from 'jszip';

// ThreeMFLoader specifically looks for JSZip on the window object
if (typeof window !== 'undefined') {
    (window as any).fflate = fflate;
    (window as any).JSZip = JSZip;
}

export interface LightConfig {
    id: string;
    position: [number, number, number];
    color: string;
    intensity: number;
}

interface Viewer3DProps {
  url: string | null;
  type: 'image' | 'stl' | 'obj' | '3mf' | 'glb' | 'scad' | null;
  cameraPreset?: string;
  zoom?: number;
  onError?: (err: Error) => void;
  // Scene Options
  showGrid?: boolean;
  showAxes?: boolean;
  bgColor?: string;
  bgImage?: string | null;
  // Lighting
  lights: LightConfig[];
  isEditingLights?: boolean;
  onAddLight?: (pos: [number, number, number]) => void;
  onSelectLight?: (id: string) => void;
  selectedLightId?: string | null;
  lightGizmoRadius?: number;
}

class ModelErrorBoundary extends React.Component<{ children: React.ReactNode, onError: (err: Error) => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, onError: (err: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { this.props.onError(error); }
  render() { return this.state.hasError ? null : this.props.children; }
}

const ModelInner: React.FC<{ 
    url: string; 
    type: 'stl' | 'obj' | '3mf' | 'glb'; 
    onPointClick: (pt: THREE.Vector3) => void; 
    onLoad?: () => void; 
    onProgress?: (percent: number) => void;
}> = ({ url, type, onPointClick, onLoad, onProgress }) => {
  const [manualResult, setManualResult] = useState<THREE.Object3D | null>(null);
  
  const handleProgress = (ev: ProgressEvent) => {
      if (ev.lengthComputable) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
  };

  const normalizedType = type?.toLowerCase();
  
  // Use standard loaders for STL/OBJ
  const stl = useLoader(STLLoader, normalizedType === 'stl' ? url : [], undefined, handleProgress);
  const obj = useLoader(OBJLoader, normalizedType === 'obj' ? url : [], undefined, handleProgress);
  const glb = useLoader(GLTFLoader, normalizedType === 'glb' ? url : [], undefined, handleProgress);
  
  // For 3MF, we follow the manual "Vanilla" approach from the example
  useEffect(() => {
      if (normalizedType !== '3mf' || !url) {
          setManualResult(null);
          return;
      }

      const load3MF = async () => {
          try {
              // 1. Fetch as ArrayBuffer
              const response = await fetch(url);
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              const buffer = await response.arrayBuffer();
              
              // 2. Setup Loader (Vanilla Three.js style)
              const loader = new ThreeMFLoader();
              // Standard ThreeMFLoader expects JSZip on window or passed via library
              if (typeof (loader as any).setLibraryPath === 'function') {
                  // Some versions
              }
              
              // 3. Parse
              console.log("Parsing 3MF manually...");
              const group = loader.parse(buffer);
              setManualResult(group);
              onLoad?.();
          } catch (err) {
              console.error("Manual 3MF Load Error:", err);
              // Let the ErrorBoundary handle it by re-throwing or setting state
              setManualResult(null);
          }
      };

      load3MF();
  }, [url, normalizedType, onLoad]);

  const result = normalizedType === 'stl' ? stl : (normalizedType === 'obj' ? obj : (normalizedType === 'glb' ? glb : manualResult));

  useEffect(() => {
      // For STL/OBJ, onLoad is called here. For 3MF, it's called inside the manual effect.
      if (result && normalizedType !== '3mf') onLoad?.();
  }, [result, normalizedType, onLoad]);

  const scene = useMemo(() => {
      if (!result) return new THREE.Group();
      let object: THREE.Object3D;
      
      if (normalizedType === 'stl') {
          const geometry = result as THREE.BufferGeometry;
          geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({ 
              color: 0xcccccc,
              roughness: 0.5,
              metalness: 0.1,
              side: THREE.FrontSide
          });
          object = new THREE.Mesh(geometry, material);
          object.castShadow = true;
          object.receiveShadow = true;
      } else {
          // OBJ or 3MF or GLB
          if (normalizedType === 'glb') {
              object = (result as any).scene.clone();
          } else {
              object = (result as THREE.Group).clone();
          }

          object.traverse((child) => {
              if ((child as any).isMesh) {
                  const mesh = child as THREE.Mesh;
                  mesh.castShadow = true;
                  mesh.receiveShadow = true;
                  
                  if (mesh.material) {
                      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                      materials.forEach((m: any) => {
                          if (m && 'side' in m) m.side = THREE.DoubleSide;
                          
                          // If it's a 3MF and has vertex colors, ensure they are enabled
                          if (mesh.geometry.attributes.color) {
                              m.vertexColors = true;
                              // Important: For vertex colors, sometimes the material color must be white 
                              // to avoid tinting the vertex colors
                              if (m.color) m.color.set('#ffffff');
                          }
                      });
                  }
              }
          });
      }
      return object;
  }, [result, normalizedType]);

  useEffect(() => {
     if (!scene) return;
     const box = new THREE.Box3().setFromObject(scene);
     if (box.isEmpty()) return;
     const center = box.getCenter(new THREE.Vector3());
     scene.position.sub(center);
  }, [scene]);

  return (
    <primitive 
        object={scene} 
        rotation={[-Math.PI / 2, 0, 0]} 
        onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onPointClick(e.point);
        }}
    />
  );
};

const Model: React.FC<{ 
    url: string; 
    type: 'stl' | 'obj' | '3mf' | 'glb'; 
    onPointClick: (pt: THREE.Vector3) => void; 
    onLoad?: () => void; 
    onError?: (err: Error) => void;
    onProgress?: (percent: number) => void;
}> = (props) => {
    return (
        <ModelErrorBoundary onError={(err: Error) => props.onError?.(err)}>
            <ModelInner 
                url={props.url} 
                type={props.type} 
                onPointClick={props.onPointClick} 
                onLoad={props.onLoad} 
                onProgress={props.onProgress} 
            />
        </ModelErrorBoundary>
    );
};

const MeasurementTool: React.FC<{ points: THREE.Vector3[], clear: () => void }> = ({ points, clear }) => {
    if (points.length === 0) return null;

    return (
        <group>
            {points.map((pt, i) => (
                <mesh key={i} position={pt}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            ))}
            
            {points.length === 2 && (
                <>
                    <Line points={[points[0], points[1]]} color="red" lineWidth={2} />
                    <Html position={points[0].clone().lerp(points[1], 0.5)}>
                        <div className="bg-black/70 text-white px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-md flex items-center gap-2">
                            <span>{points[0].distanceTo(points[1]).toFixed(2)} mm</span>
                            <button onClick={clear} className="text-red-300 hover:text-red-100 font-bold px-1">×</button>
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
};

const CameraController: React.FC<{ preset?: string; zoom: number }> = ({ preset, zoom }) => {
    const { camera } = useThree();
    
    // Handle Presets
    useEffect(() => {
        if (!preset) return;
        
        const dist = 100; // Default distance
        const positions: Record<string, [number, number, number]> = {
            top: [0, dist, 0],
            bottom: [0, -dist, 0],
            front: [0, 0, dist],
            back: [0, 0, -dist],
            left: [-dist, 0, 0],
            right: [dist, 0, 0],
            iso: [dist, dist, dist],
        };

        if (positions[preset]) {
            camera.position.set(...positions[preset]);
            camera.lookAt(0,0,0);
        }
    }, [preset, camera]);

    // Handle Zoom declaratively by updating the camera's zoom property
    useEffect(() => {
       if (camera instanceof THREE.PerspectiveCamera) {
           camera.zoom = zoom / 50;
           camera.updateProjectionMatrix();
       }
    }, [zoom, camera]);
    
    return null;
}

const BackgroundImage: React.FC<{ url: string }> = ({ url }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    return <primitive object={texture} attach="background" />;
}

const Background: React.FC<{ color: string; image: string | null }> = ({ color, image }) => {
    return (
        <>
            {image ? (
                <Suspense fallback={null}>
                    <BackgroundImage url={image} />
                </Suspense>
            ) : (
                <color attach="background" args={[color]} />
            )}
        </>
    );
}

const LightEditor: React.FC<{ 
    lights: LightConfig[], 
    radius: number,
    onAdd: (pos: [number, number, number]) => void,
    onSelect: (id: string) => void,
    selectedId: string | null
}> = ({ lights, radius, onAdd, onSelect, selectedId }) => {
    return (
        <group>
            {/* Interaction Sphere */}
            <Sphere args={[radius, 32, 32]} onClick={(e) => {
                e.stopPropagation();
                onAdd([e.point.x, e.point.y, e.point.z]);
            }}>
                <meshBasicMaterial wireframe color="#666" transparent opacity={0.2} />
            </Sphere>

            {/* Light Markers */}
            {lights.map(l => (
                <group key={l.id} position={l.position}>
                    <Sphere args={[2, 16, 16]} onClick={(e) => {
                        e.stopPropagation();
                        onSelect(l.id);
                    }}>
                        <meshBasicMaterial color={l.id === selectedId ? "#ffff00" : l.color} />
                    </Sphere>
                    {/* Visual Line to Center */}
                    <Line points={[[0,0,0], [0,0,0]]} color={l.color} lineWidth={1} dashed /> 
                </group>
            ))}
        </group>
    );
};

const Viewer3D: React.FC<Viewer3DProps> = ({ 
    url, type, cameraPreset, zoom = 50,
    showGrid = true, showAxes = true,
    bgColor = '#f0f0f0', bgImage = null,
    lights, isEditingLights = false, onAddLight, onSelectLight, selectedLightId,
    lightGizmoRadius = 80, onError
}) => {
  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  // Reset state immediately when URL changes to prevent "stuck" UI
  useEffect(() => {
      const isMesh = !!url && (type === 'stl' || type === 'obj' || type === '3mf');
      setIsModelLoading(isMesh);
      setLoadError(null);
      setLoadProgress(0);
      setPoints([]);

      if (isMesh) {
          const timeout = setTimeout(() => {
              setIsModelLoading(prev => {
                  if (prev) setLoadError("Loading timed out. The model might be too large or invalid.");
                  return false;
              });
          }, 30000); // 30s timeout
          return () => clearTimeout(timeout);
      }
  }, [url, type]);

  const handlePointClick = (pt: THREE.Vector3) => {
      if (isEditingLights) return; // Disable measuring while editing lights
      setPoints(prev => {
          if (prev.length >= 2) return [pt];
          return [...prev, pt];
      });
  };

  if (!url) {
      return (
          <div className="flex items-center justify-center h-full text-gray-400 select-none">
              No model loaded
          </div>
      );
  }

  if (type === 'image') {
      return (
          <div className="flex items-center justify-center h-full bg-checkered overflow-hidden p-4">
              <img src={url} alt="Preview" className="object-contain max-w-full max-h-full shadow-lg rounded" />
          </div>
      );
  }

  return (
    <div className="w-full h-full relative">
       {/* Instructions Overlay */}
       {points.length === 1 && !isEditingLights && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm shadow-lg pointer-events-none">
               Click second point to measure
           </div>
       )}
       {isEditingLights && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-yellow-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm shadow-lg pointer-events-none">
               Click on the sphere wireframe to add lights
           </div>
       )}
       {isModelLoading && (
           <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 pointer-events-none">
               <RefreshCw className="animate-spin" size={32}/>
               <div className="flex flex-col items-center">
                   <span className="font-medium tracking-wide">Loading 3D Model...</span>
                   {loadProgress > 0 && <span className="text-xs text-gray-300 font-mono">{loadProgress}%</span>}
               </div>
           </div>
       )}
       {loadError && (
           <div className="absolute inset-0 z-20 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center gap-3">
               <div className="bg-red-500 p-2 rounded-full"><RefreshCw size={24}/></div>
               <span className="font-bold text-lg">Failed to Load Model</span>
               <p className="text-sm text-red-200 max-w-xs">{loadError}</p>
               <button onClick={() => window.location.reload()} className="mt-2 btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">Retry</button>
           </div>
       )}

      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [0, 0, 100], fov: 50 }}
        gl={{ 
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            shadowMapType: THREE.PCFSoftShadowMap,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true
        }}
      >
        <Background color={bgColor} image={bgImage} />
        
        {/* Dynamic Lights */}
        {lights.map(l => (
            <pointLight 
                key={l.id}
                position={l.position}
                intensity={l.intensity * Math.PI}
                decay={0}
                distance={0}
                color={l.color}
                castShadow
                shadow-bias={-0.001} // Fixes shadow acne (zebra lines)
                shadow-mapSize={[1024, 1024]}
            />
        ))}
        {/* Fallback Ambient - Increased Intensity */}
        <ambientLight intensity={0.4} color={bgColor === '#f0f0f0' ? '#ffffff' : '#aaaaaa'} />

        {isEditingLights && onAddLight && onSelectLight && (
            <LightEditor 
                lights={lights} 
                radius={lightGizmoRadius}
                onAdd={onAddLight} 
                onSelect={onSelectLight} 
                selectedId={selectedLightId || null}
            />
        )}

        <Suspense fallback={null}>
            {(type === 'stl' || type === 'obj' || type === '3mf') && (
                <Model 
                    url={url} 
                    type={type} 
                    onPointClick={handlePointClick} 
                    onLoad={() => setIsModelLoading(false)} 
                    onProgress={(p) => setLoadProgress(p)}
                    onError={(err) => {
                        console.error("3D Load Error:", err);
                        setLoadError(err.message);
                        setIsModelLoading(false);
                        onError?.(err);
                    }}
                />
            )}
            <MeasurementTool points={points} clear={() => setPoints([])} />
        </Suspense>
        
        {showGrid && (
            <Grid 
                infiniteGrid 
                fadeDistance={500} 
                sectionSize={10} 
                cellSize={1} 
                sectionColor="#666" 
                cellColor="#ccc" 
                position={[0, -0.1, 0]} 
            />
        )}
        
        {showAxes && (
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewcube />
            </GizmoHelper>
        )}

        <OrbitControls makeDefault />
        <CameraController preset={cameraPreset} zoom={zoom} />
      </Canvas>
    </div>
  );
};

export default Viewer3D;