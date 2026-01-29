import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Sliders, Globe } from 'lucide-react';
import Viewer3D, { type LightConfig } from '../components/Viewer3D';
import Customizer from '../components/Customizer';
import { parseScadVariables } from '../utils/scadParser';
import type { ScadVariable } from '../utils/scadParser';
import clsx from 'clsx';

const PublicViewer: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [file, setFile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<'view' | 'customize'>('view');
    const [variables, setVariables] = useState<ScadVariable[]>([]);
    const [renderUrl, setRenderUrl] = useState<string | null>(null);
    const [renderType, setRenderType] = useState<'image' | 'stl' | 'obj' | '3mf' | null>(null);
    
    const [lights] = useState<LightConfig[]>([
        { id: '1', position: [50, 50, 50], color: '#ffffff', intensity: 1.0 },
        { id: '2', position: [-50, 50, -50], color: '#ffffff', intensity: 0.5 }
    ]);

    useEffect(() => {
        const fetchShared = async () => {
            try {
                const res = await axios.get(`/api/share/${token}`);
                setFile(res.data);
                
                if (res.data.type === 'scad') {
                    setVariables(parseScadVariables(res.data.content));
                } else {
                    const type = res.data.type?.toLowerCase();
                    setRenderUrl(`/renders/${res.data.content}`);
                    setRenderType(type as any);
                    setActiveTab('view');
                }
            } catch (e) {
                setError('Shared file not found or link expired.');
            } finally {
                setLoading(false);
            }
        };
        fetchShared();
    }, [token]);

    const handlePreview = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/render', {
                scadContent: file.content,
                isPreview: true,
                params: variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {})
            });
            setRenderUrl(res.data.url);
            setRenderType('image');
        } catch (e) {
            alert('Preview failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !file) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
    if (error) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">{error}</div>;

    return (
        <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-600 rounded text-white"><Globe size={18}/></div>
                    <h1 className="font-bold tracking-tight">{file?.name} <span className="text-xs font-normal text-gray-500 ml-2">Shared View</span></h1>
                </div>
                <div className="flex items-center gap-2">
                    {file?.type === 'scad' && (
                         <button onClick={handlePreview} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2">
                             <Sliders size={14}/> Render Preview
                         </button>
                    )}
                    {renderUrl && (
                        <a href={renderUrl} download className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2">
                            <Download size={14}/> Download
                        </a>
                    )}
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative flex flex-col">
                    <div className="flex border-b border-white/5 bg-gray-900/30">
                        <button onClick={() => setActiveTab('view')} className={clsx("px-6 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'view' ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500 hover:text-gray-300")}>3D View</button>
                        {file?.type === 'scad' && (
                            <button onClick={() => setActiveTab('customize')} className={clsx("px-6 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'customize' ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500 hover:text-gray-300")}>Parameters</button>
                        )}
                    </div>

                    <div className="flex-1 relative">
                        {activeTab === 'view' ? (
                            <Viewer3D 
                                url={renderUrl} 
                                type={renderType} 
                                lights={lights}
                                showGrid
                                showAxes
                                bgColor="#0a0a0a"
                            />
                        ) : (
                            <div className="p-6 overflow-y-auto h-full">
                                <div className="max-w-2xl mx-auto">
                                    <Customizer 
                                        variables={variables} 
                                        onChange={(name, val) => setVariables(prev => prev.map(v => v.name === name ? { ...v, value: val } : v))} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicViewer;
