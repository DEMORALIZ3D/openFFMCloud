import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../AuthContext';
import { 
    LogOut, Save, Play, FilePlus, File as FileIcon, 
    Moon, Sun, Settings, RefreshCw, Box, Menu, X, Code, Eye, 
    Grid as GridIcon, Move, Image as ImageIcon, Trash2, Download, Printer, Clock, Calculator, Sliders, Share2
} from 'lucide-react';
import Viewer3D, { type LightConfig } from '../components/Viewer3D';
import Customizer from '../components/Customizer';
import CalculatorSettings from '../components/CalculatorSettings';
import { parseScadVariables, updateScadVariable } from '../utils/scadParser';
import type { ScadVariable } from '../utils/scadParser';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

interface ScadFile {
  id: number;
  name: string;
  content: string;
  type?: 'scad' | 'stl' | 'obj' | '3mf';
  updated_at: string;
}

interface PrinterProfile {
    id: number;
    name: string;
    power_watts: number;
    config_content?: string;
}

interface FilamentProfile {
    id: number;
    name: string;
    density: number;
    cost_per_kg: number;
    diameter: number;
}

const Dashboard: React.FC = () => {
  const { logout, user } = useAuth();
  
  // State
  const [files, setFiles] = useState<ScadFile[]>([]);
  const [currentFile, setCurrentFile] = useState<ScadFile | null>(null);
  const [code, setCode] = useState('// Write your OpenSCAD code for openFFM Cloud here\ncube([10, 10, 10]);');
  const [fileName, setFileName] = useState('New Design');
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderType, setRenderType] = useState<'image' | 'stl' | 'obj' | '3mf' | 'glb' | 'scad' | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [useGLB, setUseGLB] = useState(true); // Preferred for 3MF colors
  const [isGeneratingGCode, setIsGeneratingGCode] = useState(false);
  const [printStats, setPrintStats] = useState<{ filament_used: string; estimated_time: string; cost_breakdown?: any } | null>(null);

  // Calculator Data
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [filaments, setFilaments] = useState<FilamentProfile[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<number | null>(null);
  const [selectedFilamentId, setSelectedFilamentId] = useState<number | null>(null);
  const [calcSettings, setCalcSettings] = useState<any>({});
  
  // UI State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'view' | 'customize'>('view');
  const [autoSave, setAutoSave] = useState(true);
  const [variables, setVariables] = useState<ScadVariable[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalcSettings, setShowCalcSettings] = useState(false);
  
  // Mobile UI State
  const [showDrawer, setShowDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  
  // Render Options
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [zoom, setZoom] = useState(50); // Zoom level 0-100
  const [lightGizmoRadius, setLightGizmoRadius] = useState(100);

  // Scene Settings
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [bgColor, setBgColor] = useState('#202020'); 
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  // Interactive Lighting State
  const [lights, setLights] = useState<LightConfig[]>([
      { id: '1', position: [100, 100, 100], color: '#ffffff', intensity: 1.0 },
      { id: '2', position: [-100, 100, -100], color: '#ffffff', intensity: 1.0 }
  ]);
  const [isEditingLights, setIsEditingLights] = useState(false);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);

  // --- Effects ---

  // Responsive Hook
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
        setBgColor('#101010');
    }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
          setBgColor('#101010');
      } else {
          document.documentElement.classList.remove('dark');
          setBgColor('#f0f0f0');
      }
  };

  useEffect(() => {
    fetchFiles();
    fetchCalcData();
  }, []);

  useEffect(() => {
    if (currentFile?.type && ['stl', 'obj', '3mf'].includes(currentFile.type.toLowerCase())) {
        const type = currentFile.type.toLowerCase();
        let url = `/renders/${currentFile.content}`;
        let finalType = type;

        if (type === '3mf' && useGLB) {
            url = url.replace(/\.3mf$/i, '.glb');
            finalType = 'glb';
        }

        setRenderUrl(url);
        setRenderType(finalType as any);
        setActiveTab('view');
        if (isMobile) setMobileTab('preview');
    }
  }, [currentFile, isMobile, useGLB]);

  const fetchCalcData = async () => {
      try {
          const token = localStorage.getItem('token');
          const [pRes, fRes, sRes] = await Promise.all([
              axios.get('/api/printers', { headers: { Authorization: `Bearer ${token}` } }),
              axios.get('/api/filaments', { headers: { Authorization: `Bearer ${token}` } }),
              axios.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setPrinters(pRes.data);
          setFilaments(fRes.data);
          setCalcSettings(sRes.data);
          
          if (pRes.data.length > 0 && !selectedPrinterId) setSelectedPrinterId(pRes.data[0].id);
          if (fRes.data.length > 0 && !selectedFilamentId) setSelectedFilamentId(fRes.data[0].id);
      } catch (e) { console.error("Error fetching calculator data", e); }
  };

  useEffect(() => {
      const vars = parseScadVariables(code);
      setVariables(vars);
  }, [code]);

  useEffect(() => {
      if (!autoSave || !currentFile || currentFile.type !== 'scad') return; 
      const interval = setInterval(() => {
          handleSave(true);
      }, 120000); // 120s
      return () => clearInterval(interval);
  }, [autoSave, currentFile, code, fileName]);


  // --- Actions ---

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/files', { headers: { Authorization: `Bearer ${token}` } });
      setFiles(res.data);
    } catch (e) { console.error(e); }
  };

  const handleLoad = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/files/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      
      // Normalize type and set currentFile
      const type = res.data.type?.toLowerCase() || 'scad';
      const fileData = { ...res.data, type };
      
      setCurrentFile(fileData);
      setFileName(res.data.name);
      setPrintStats(null);
      
      // Set initial tab state based on type
      if (type === 'scad') {
          setCode(res.data.content);
          setRenderUrl(null);
          setRenderType(null);
          setActiveTab('customize');
          if (isMobile) setMobileTab('editor');
      } else {
          setCode(`// ${res.data.name}\n// (Binary or Uploaded Content)`);
          // Note: the useEffect for [currentFile] will handle setRenderUrl and setActiveTab('view')
      }
      
      if (isMobile) {
          setShowDrawer(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteFile = async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this design?')) return;

      try {
          const token = localStorage.getItem('token');
          await axios.delete(`/api/files/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          
          if (currentFile?.id === id) {
              handleNew();
          }
          fetchFiles();
      } catch (e) {
          alert('Failed to delete file');
      }
  };

  const handleSave = async (silent = false) => {
    if (currentFile?.type && currentFile.type !== 'scad') {
        return; // Don't save binary/mesh files from the text editor
    }
    try {
      const token = localStorage.getItem('token');
      const payload = { 
          name: fileName, 
          content: code, 
          id: currentFile?.id,
          type: 'scad'
      };
      const res = await axios.post('/api/files', payload, { headers: { Authorization: `Bearer ${token}` } });
      
      if (!currentFile) {
          setCurrentFile(res.data); 
      }
      
      fetchFiles();
      if (!silent) alert('Saved!');
    } catch (e) { console.error(e); }
  };

  const handleRender = async (preview: boolean) => {
    setIsRendering(true);
    if (activeTab !== 'view') setActiveTab('view');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/render', {
        fileId: currentFile?.id,
        scadContent: code,
        isPreview: preview,
        options: { camera: cameraPreset }
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setRenderUrl(res.data.url);
      setRenderType(preview ? 'image' : 'obj');
    } catch (e) { 
        alert('Render failed'); 
        console.error(e);
    } finally {
      setIsRendering(false);
    }
  };

  const parseTimeHours = (timeStr: string): number => {
      // Format: "7h 55m 57s" or "10m 30s" etc.
      let hours = 0;
      const h = timeStr.match(/(\d+)h/);
      const m = timeStr.match(/(\d+)m/);
      const s = timeStr.match(/(\d+)s/);
      if (h) hours += parseInt(h[1]);
      if (m) hours += parseInt(m[1]) / 60;
      if (s) hours += parseInt(s[1]) / 3600;
      return hours || 0;
  };

  const calculateCost = (filamentLen: string, timeStr: string) => {
      if (!selectedFilamentId || !selectedPrinterId) return null;
      const fil = filaments.find(f => f.id === selectedFilamentId);
      const printer = printers.find(p => p.id === selectedPrinterId);
      if (!fil || !printer) return null;

      const lenMm = parseFloat(filamentLen.replace('mm', ''));
      const hours = parseTimeHours(timeStr);

      // Material
      // Vol (cm3) = len(mm) * PI * (r(mm))^2 / 1000
      const radius = fil.diameter / 2;
      const volCm3 = (lenMm * Math.PI * (radius * radius)) / 1000;
      const weightG = volCm3 * fil.density;
      const matCost = weightG * (fil.cost_per_kg / 1000);

      // Power
      const kwh = (printer.power_watts / 1000) * hours;
      const elecCost = kwh * (calcSettings.electricity_cost_kwh || 0.15);

      const net = matCost + elecCost;
      const vat = net * ((calcSettings.vat_rate || 20) / 100);
      const gross = net + vat;

      return {
          material: matCost.toFixed(2),
          electricity: elecCost.toFixed(2),
          net: net.toFixed(2),
          vat: vat.toFixed(2),
          gross: gross.toFixed(2),
          currency: calcSettings.currency_symbol || '$'
      };
  };

  const handleGenerateGCode = async () => {
      setIsGeneratingGCode(true);
      try {
          const token = localStorage.getItem('token');
          const printer = printers.find(p => p.id === selectedPrinterId);
          
          const res = await axios.post('/api/render', {
              fileId: currentFile?.id,
              scadContent: (currentFile?.type && ['stl', 'obj', '3mf'].includes(currentFile.type)) ? null : code,
              isPreview: false,
              type: 'gcode',
              options: {
                  printerConfig: printer?.config_content
              }
          }, { headers: { Authorization: `Bearer ${token}` } });
          
          if (res.data.metadata) {
              const breakdown = calculateCost(res.data.metadata.filament_used, res.data.metadata.estimated_time);
              setPrintStats({ ...res.data.metadata, cost_breakdown: breakdown });
          }
      } catch (e) {
          alert('G-Code generation failed');
          console.error(e);
      } finally {
          setIsGeneratingGCode(false);
      }
  };

  const handleNew = () => {
      setCurrentFile(null);
      setCode('// New Design\n');
      setFileName('New Design');
      setRenderUrl(null);
      setRenderType(null);
      setPrintStats(null);
      if (isMobile) {
          setShowDrawer(false);
          setMobileTab('editor');
      }
  };

  const handleVariableChange = (name: string, val: string | number | boolean) => {
      const newCode = updateScadVariable(code, name, val);
      setCode(newCode);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
          const token = localStorage.getItem('token');
          const res = await axios.post('/api/files/upload', formData, {
              headers: { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
              }
          });
          
          await fetchFiles();
          handleLoad(res.data.id);
      } catch (e) {
          alert('Upload failed');
          console.error(e);
      }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              setBgImage(ev.target?.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // Lighting Actions
  const handleAddLight = (pos: [number, number, number]) => {
      const newLight: LightConfig = {
          id: uuidv4(),
          position: pos,
          color: '#ffffff',
          intensity: 1.0
      };
      setLights([...lights, newLight]);
      setSelectedLightId(newLight.id);
  };

  const handleUpdateLight = (id: string, updates: Partial<LightConfig>) => {
      setLights(lights.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleDeleteLight = (id: string) => {
      setLights(lights.filter(l => l.id !== id));
      if (selectedLightId === id) setSelectedLightId(null);
  };

  const selectedLight = lights.find(l => l.id === selectedLightId);

  const handleShare = async () => {
      if (!currentFile) return;
      try {
          const token = localStorage.getItem('token');
          const res = await axios.post(`/api/files/${currentFile.id}/share`, {}, { headers: { Authorization: `Bearer ${token}` } });
          const shareUrl = `${window.location.origin}/share/${res.data.token}`;
          await navigator.clipboard.writeText(shareUrl);
          alert('Share link copied to clipboard!');
      } catch (e) {
          alert('Failed to generate share link');
      }
  };

  const handleDownload = (format?: string) => {
    if (!renderUrl && !currentFile) return;
    
    let downloadUrl = renderUrl;
    let ext = 'obj';

    if (format === '3mf' && currentFile?.type === '3mf') {
        downloadUrl = `/renders/${currentFile.content}`;
        ext = '3mf';
    } else if (format === 'glb' && currentFile?.type === '3mf') {
        downloadUrl = `/renders/${currentFile.content.replace(/\.3mf$/i, '.glb')}`;
        ext = 'glb';
    } else {
        if (renderType === 'image') ext = 'png';
        else if (renderUrl?.endsWith('.stl')) ext = 'stl';
        else if (renderUrl?.endsWith('.obj')) ext = 'obj';
        else if (renderUrl?.endsWith('.glb')) ext = 'glb';
        else if (renderUrl?.endsWith('.3mf')) ext = '3mf';
    }
    
    if (!downloadUrl) return;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileName.replace(/\s+/g, '_')}_render.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* Header */}
      <header className="glass z-20 px-4 md:px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button onClick={() => setShowDrawer(true)} className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-black/5 rounded-lg transition-colors">
                <Menu size={24} />
            </button>

            <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Box size={24} />
            </div>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight hidden sm:block leading-none">openFFM Cloud</h1>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hidden sm:block">by AHM Labs</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight sm:hidden">openFFM</h1>
        </div>
         <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 bg-gray-200 dark:bg-gray-800 rounded-full px-3 py-1 text-sm">
                 <span className={clsx("w-2 h-2 rounded-full", autoSave ? "bg-green-500" : "bg-red-500")}></span>
                 <button onClick={() => setAutoSave(!autoSave)} className="hover:underline">
                     {autoSave ? 'Auto-Save' : 'Manual'}
                 </button>
             </div>

             <Link to="/settings" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Global Settings">
                 <Sliders size={20}/>
             </Link>

             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                 {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
             </button>
             
             <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-2 hidden sm:block"></div>

             <div className="flex items-center gap-2">
                 <span className="font-medium hidden md:block">{user?.username}</span>
                 <button onClick={logout} className="text-red-500 hover:text-red-600">
                     <LogOut size={20} />
                 </button>
             </div>
        </div>
      </header>
      
      {/* Main Content - Flex Layout */}
      <div className="flex-1 overflow-hidden p-4 gap-4 flex relative">
          
          {/* Left: Files (Drawer on Mobile, Sidebar on Desktop) */}
          
          {/* Mobile Drawer Overlay */}
          {isMobile && showDrawer && (
              <div 
                  className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
                  onClick={() => setShowDrawer(false)}
              />
          )}

          <div className={clsx(
              "glass-panel flex flex-col p-4 flex-shrink-0 transition-transform duration-300 ease-in-out z-40",
              isMobile ? "fixed inset-y-0 left-0 w-3/4 max-w-xs h-full rounded-r-xl rounded-l-none border-r border-white/20 shadow-2xl" : "w-64",
              isMobile && !showDrawer ? "-translate-x-full" : "translate-x-0"
          )}>
             <div className="flex flex-col gap-2 mb-4">
                 <div className="flex gap-2">
                    <button onClick={handleNew} className="btn-primary flex-1 justify-center">
                        <FilePlus size={18}/> <span className="ml-2">New Design</span>
                    </button>
                    {isMobile && (
                        <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:bg-black/10 rounded-lg border border-gray-200 dark:border-gray-700">
                            <X size={20}/>
                        </button>
                    )}
                 </div>
                 <label className="btn-secondary flex-1 justify-center cursor-pointer">
                     <ImageIcon size={18}/> <span className="ml-2">Upload STL/OBJ/3MF</span>
                     <input type="file" className="hidden" accept=".stl,.obj,.3mf" onChange={handleFileUpload} />
                 </label>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2">
                 {files.map(f => (
                     <div key={f.id} onClick={() => handleLoad(f.id)} 
                         className={clsx("p-3 rounded-lg cursor-pointer flex items-center justify-between group transition-all",
                             currentFile?.id === f.id ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 border" : "hover:bg-white/50 dark:hover:bg-gray-700/50"
                         )}>
                         <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0">
                                {f.type && ['stl', 'obj', '3mf'].includes(f.type.toLowerCase()) ? (
                                    <Box size={16} className="text-purple-500"/>
                                ) : (
                                    <FileIcon size={16} className="text-blue-500"/>
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm font-medium">{f.name}</span>
                                {f.type && f.type !== 'scad' && (
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">{f.type}</span>
                                )}
                            </div>
                         </div>
                         <button 
                            onClick={(e) => handleDeleteFile(e, f.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all rounded"
                            title="Delete"
                         >
                             <Trash2 size={14} />
                         </button>
                     </div>
                 ))}
             </div>
          </div>

          {/* Center: Editor - Only show for SCAD or new files */}
          {(!currentFile || !currentFile.type || currentFile.type.toLowerCase() === 'scad') && (
              <div className={clsx(
                  "glass-panel flex flex-col relative group flex-1 transition-all overflow-hidden", 
                  isMobile && mobileTab !== 'editor' ? "hidden" : "flex"
              )}>
                 <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/20">
                     <input value={fileName} onChange={e => setFileName(e.target.value)} className="bg-transparent font-semibold focus:outline-none w-full mr-2" />
                                      <div className="flex gap-1">
                                         {currentFile && (
                                             <button onClick={handleShare} className="text-blue-500 p-1 hover:bg-black/5 rounded" title="Share Model"><Share2 size={18}/></button>
                                         )}
                                         {(!currentFile || currentFile.type === 'scad') && (
                                             <button onClick={() => handleSave(false)} className="text-green-600 p-1 hover:bg-black/5 rounded" title="Save"><Save size={18}/></button>
                                         )}
                                      </div>
                     
                 </div>
                 <div className="flex-1 overflow-hidden">
                     <Editor height="100%" defaultLanguage="java" theme={theme === 'dark' ? 'vs-dark' : 'light'} value={code} onChange={v => setCode(v||"")} options={{ minimap: { enabled: !isMobile } }} />
                 </div>
              </div>
          )}

          {/* Right: Viewer */}
          <div className={clsx(
              "glass-panel flex flex-col transition-all overflow-hidden relative",
              isMobile ? (mobileTab !== 'preview' ? "hidden" : "flex-1") : 
              ((currentFile && currentFile.type && currentFile.type !== 'scad') ? "flex-[2]" : "w-96")
          )}>
              {/* Settings Modal/Panel Overlay */}
              {showCalcSettings && (
                  <CalculatorSettings 
                      onClose={() => setShowCalcSettings(false)} 
                      onSettingsChanged={fetchCalcData} 
                  />
              )}

              {showSettings && (
                  <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur flex flex-col">
                      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Scene Options</h3>
                          <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"><X size={20}/></button>
                      </div>
                      <div className="p-4 overflow-y-auto space-y-6">
                          
                          {/* Visibility */}
                          <div className="space-y-3">
                              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Visibility</h4>
                              <label className="flex items-center justify-between cursor-pointer">
                                  <span className="flex items-center gap-2"><GridIcon size={16}/> Show Grid</span>
                                  <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="toggle-checkbox" />
                              </label>
                              <label className="flex items-center justify-between cursor-pointer">
                                  <span className="flex items-center gap-2"><Move size={16}/> Show Axes</span>
                                  <input type="checkbox" checked={showAxes} onChange={e => setShowAxes(e.target.checked)} className="toggle-checkbox" />
                              </label>
                          </div>

                          {/* Background */}
                          <div className="space-y-3">
                              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Background</h4>
                              <div className="flex gap-2">
                                  <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setBgImage(null); }} className="h-10 w-full rounded cursor-pointer" />
                              </div>
                              <label className="block">
                                  <span className="flex items-center gap-2 mb-2 text-sm"><ImageIcon size={16}/> Upload Image</span>
                                  <input type="file" accept="image/*" onChange={handleBgImageUpload} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"/>
                              </label>
                              {bgImage && <button onClick={() => setBgImage(null)} className="text-xs text-red-500 hover:underline">Remove Image</button>}
                          </div>

                          {/* Interactive Lighting Control */}
                          <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Lighting</h4>
                                  <button 
                                      onClick={() => setIsEditingLights(!isEditingLights)} 
                                      className={clsx("text-xs px-2 py-1 rounded transition-colors", isEditingLights ? "bg-yellow-500 text-black font-bold" : "bg-gray-200 dark:bg-gray-700")}
                                  >
                                      {isEditingLights ? "Done Editing" : "Edit Lights"}
                                  </button>
                              </div>

                              {/* Gizmo Radius Slider */}
                              <div className="space-y-1">
                                   <div className="flex justify-between text-xs text-gray-500">
                                       <span>Light Sphere Radius</span>
                                       <span>{lightGizmoRadius}</span>
                                   </div>
                                   <input type="range" min="50" max="500" step="10" value={lightGizmoRadius} onChange={e => setLightGizmoRadius(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                              </div>

                              {/* Light List */}
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {lights.map(light => (
                                      <div key={light.id}
                                           onClick={() => setSelectedLightId(light.id)}
                                           className={clsx(
                                               "p-2 rounded border flex items-center justify-between cursor-pointer transition-all",
                                               selectedLightId === light.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                           )}
                                      >
                                          <div className="flex items-center gap-2">
                                              <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: light.color }} />
                                              <span className="text-xs font-medium">Light {light.id.slice(0,4)}...</span>
                                          </div>
                                           <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-500">{light.intensity}x</span>
                                              <button onClick={(e) => { e.stopPropagation(); handleDeleteLight(light.id); }} className="text-gray-400 hover:text-red-500 p-1">
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                                  {lights.length === 0 && <div className="text-xs text-gray-500 italic text-center">No lights added</div>}
                              </div>
                              
                              {/* Selected Light Controls */}
                              {selectedLight && (
                                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg space-y-3 animate-fade-in">
                                      <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                          <span>SELECTED LIGHT</span>
                                          <button onClick={() => handleDeleteLight(selectedLight.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                                      </div>
                                      <div className="flex items-center justify-between">
                                          <span className="text-sm">Color</span>
                                          <input type="color" value={selectedLight.color} onChange={e => handleUpdateLight(selectedLight.id, { color: e.target.value })} className="h-8 w-12 rounded cursor-pointer" />
                                      </div>
                                      <div>
                                          <div className="flex justify-between text-sm mb-1">
                                              <span>Intensity</span>
                                              <span>{selectedLight.intensity.toFixed(1)}</span>
                                          </div>
                                          <input type="range" min="0" max="5" step="0.1" value={selectedLight.intensity} onChange={e => handleUpdateLight(selectedLight.id, { intensity: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"/>
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Calculator Configuration Link */}
                          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Calculator Config</h4>
                              <button 
                                  onClick={() => { setShowSettings(false); setShowCalcSettings(true); }}
                                  className="w-full btn-secondary justify-between"
                              >
                                  <span className="flex items-center gap-2"><Calculator size={16}/> Printers & Filaments</span>
                                  <Settings size={14} className="opacity-50"/>
                              </button>
                          </div>

                      </div>
                  </div>
              )}

              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                 <div className="flex flex-1">
                    <button onClick={() => setActiveTab('view')} className={clsx("flex-1 py-3 text-sm font-medium border-b-2", activeTab === 'view' ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500")}>3D View</button>
                    {(!currentFile?.type || currentFile.type.toLowerCase() === 'scad') && (
                        <button onClick={() => setActiveTab('customize')} className={clsx("flex-1 py-3 text-sm font-medium border-b-2", activeTab === 'customize' ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500")}>Customizer</button>
                    )}
                 </div>
                 <div className="flex items-center gap-1 pr-2">
                    {currentFile?.type === '3mf' && (
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-2 scale-75 origin-right">
                            <button 
                                onClick={() => setUseGLB(false)} 
                                className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all", !useGLB ? "bg-white dark:bg-gray-700 shadow-sm text-blue-500" : "text-gray-400")}
                            >
                                3MF
                            </button>
                            <button 
                                onClick={() => setUseGLB(true)} 
                                className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all", useGLB ? "bg-white dark:bg-gray-700 shadow-sm text-blue-500" : "text-gray-400")}
                            >
                                GLB
                            </button>
                        </div>
                    )}
                    {(renderUrl || (currentFile?.type && ['stl', 'obj', '3mf'].includes(currentFile.type))) && (
                        <div className="relative group/dl">
                            <button className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Download Options">
                                <Download size={18} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 hidden group-hover/dl:block min-w-[120px]">
                                {currentFile?.type === '3mf' ? (
                                    <>
                                        <button onClick={() => handleDownload('3mf')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700">Download 3MF</button>
                                        <button onClick={() => handleDownload('glb')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800">Download GLB</button>
                                    </>
                                ) : (
                                    <button onClick={() => handleDownload()} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700">Download {renderType?.toUpperCase()}</button>
                                )}
                            </div>
                        </div>
                    )}
                 </div>
             </div>

             <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                 {activeTab === 'view' ? (
                     <>
                        {/* Calculator / Stats Panel */}
                        <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
                            <div className="bg-white/90 dark:bg-black/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg pointer-events-auto flex flex-wrap gap-2 items-center justify-between">
                                <div className="flex gap-2 items-center flex-1 min-w-[200px]">
                                    <select 
                                        value={selectedPrinterId || ''} 
                                        onChange={e => setSelectedPrinterId(Number(e.target.value))}
                                        className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs w-1/2"
                                    >
                                        <option value="" disabled>Select Printer</option>
                                        {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <select 
                                        value={selectedFilamentId || ''} 
                                        onChange={e => setSelectedFilamentId(Number(e.target.value))}
                                        className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs w-1/2"
                                    >
                                        <option value="" disabled>Select Filament</option>
                                        {filaments.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => setShowCalcSettings(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Calculator Settings">
                                    <Calculator size={16}/>
                                </button>
                            </div>

                            {printStats && (
                                <div className="bg-white/90 dark:bg-black/80 backdrop-blur border border-green-500/30 rounded-lg p-3 shadow-lg pointer-events-auto animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1"><Clock size={10}/> Time</span>
                                                <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">{printStats.estimated_time}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1"><Printer size={10}/> Filament</span>
                                                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{printStats.filament_used}</span>
                                            </div>
                                        </div>
                                        {printStats.cost_breakdown && (
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-slate-800 dark:text-white leading-none">
                                                    {printStats.cost_breakdown.currency}{printStats.cost_breakdown.gross}
                                                </div>
                                                <div className="text-[10px] text-gray-500">Gross Cost</div>
                                            </div>
                                        )}
                                        <button onClick={() => setPrintStats(null)} className="text-gray-400 hover:text-red-500 p-1 -mr-1"><X size={14}/></button>
                                    </div>
                                    
                                    {printStats.cost_breakdown && (
                                        <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600 dark:text-gray-400">
                                            <div>Mat: {printStats.cost_breakdown.currency}{printStats.cost_breakdown.material}</div>
                                            <div>Elec: {printStats.cost_breakdown.currency}{printStats.cost_breakdown.electricity}</div>
                                            <div>VAT: {printStats.cost_breakdown.currency}{printStats.cost_breakdown.vat}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {isRendering && <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center text-white">Rendering...</div>}
                        {isGeneratingGCode && <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center text-white flex-col gap-2"><RefreshCw className="animate-spin" size={32}/><span>Slicing & Calculating...</span></div>}
                        
                        <Viewer3D  
                            url={renderUrl} 
                            type={renderType} 
                            cameraPreset={cameraPreset} 
                            zoom={zoom}
                            lightGizmoRadius={lightGizmoRadius}
                            showGrid={showGrid}
                            showAxes={showAxes}
                            bgColor={bgColor}
                            bgImage={bgImage}
                            lights={lights}
                            isEditingLights={isEditingLights}
                            onAddLight={handleAddLight}
                            onSelectLight={setSelectedLightId}
                            selectedLightId={selectedLightId}
                        />

                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                            <div className="pointer-events-auto bg-black/20 backdrop-blur p-2 rounded-lg flex flex-col gap-2">
                                 <div className="flex flex-col gap-1">
                                     {['ISO', 'Top', 'Front'].map(p => <button key={p} onClick={() => setCameraPreset(p.toLowerCase())} className="text-xs text-white hover:bg-blue-500 rounded px-1">{p}</button>)}
                                 </div>
                                 <input type="range" min="10" max="150" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="h-20 w-1 appearance-none bg-gray-400 rounded cursor-pointer" style={{writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical'}} />
                            </div>
                        </div>
                     </>
                 ) : (
                     <div className="p-4 overflow-y-auto h-full">
                         <Customizer variables={variables} onChange={handleVariableChange} />
                     </div>
                 )}
             </div>

             <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
                  {(!currentFile?.type || currentFile.type.toLowerCase() === 'scad') && (
                      <>
                        <button onClick={() => handleRender(true)} disabled={isRendering || isGeneratingGCode} className="btn-secondary flex-1 justify-center text-xs flex items-center gap-1 min-w-fit px-2">
                            <Play size={14}/> Preview
                        </button>
                        <button onClick={() => handleRender(false)} disabled={isRendering || isGeneratingGCode} className="btn-primary flex-1 justify-center text-xs flex items-center gap-1 min-w-fit px-2">
                            {isRendering ? <RefreshCw className="animate-spin" size={14}/> : <Box size={14}/>} Render
                        </button>
                      </>
                  )}
                  <button onClick={handleGenerateGCode} disabled={isRendering || isGeneratingGCode} className="btn-secondary flex-1 justify-center text-xs flex items-center gap-1 min-w-fit px-2 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20 dark:border-green-800">
                      <Printer size={14}/> Slice
                  </button>
                  <button onClick={() => setShowSettings(!showSettings)} className={clsx("btn-secondary px-2 text-xs", showSettings && "bg-blue-100 dark:bg-blue-900 border-blue-500")} title="Scene Settings"><Settings size={14}/></button>
             </div>
          </div>
      </div>

      {/* Mobile Bottom Toolbar */}
      {isMobile && (
          <div className="glass flex justify-around items-center p-3 pb-6 z-30 border-t border-white/20">
              {(!currentFile?.type || currentFile.type === 'scad') && (
                  <button 
                      onClick={() => setMobileTab('editor')} 
                      className={clsx("flex flex-col items-center gap-1 text-xs font-medium transition-colors", mobileTab === 'editor' ? "text-blue-500" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}
                  >
                      <Code size={20} />
                      <span>Editor</span>
                  </button>
              )}
              <button 
                  onClick={() => setMobileTab('preview')} 
                  className={clsx("flex flex-col items-center gap-1 text-xs font-medium transition-colors", mobileTab === 'preview' ? "text-blue-500" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}
              >
                  <Eye size={20} />
                  <span>Preview</span>
              </button>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
