import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Save, Upload } from 'lucide-react';

interface Printer {
    id: number;
    name: string;
    power_watts: number;
    config_content?: string;
}

interface Filament {
    id: number;
    name: string;
    density: number;
    cost_per_kg: number;
    diameter: number;
}

interface UserSettings {
    electricity_cost_kwh: number;
    vat_rate: number;
    currency_symbol: string;
}

interface SettingsPanelProps {
    onClose?: () => void;
    onSettingsChanged?: () => void;
    className?: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSettingsChanged, className }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'printers' | 'filaments'>('general');
    const [loading, setLoading] = useState(true);
    
    const [settings, setSettings] = useState<UserSettings>({ electricity_cost_kwh: 0.15, vat_rate: 20, currency_symbol: '$' });
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [filaments, setFilaments] = useState<Filament[]>([]);

    // Form States
    const [newPrinter, setNewPrinter] = useState<Partial<Printer>>({ name: '', power_watts: 300, config_content: '' });
    const [newFilament, setNewFilament] = useState<Partial<Filament>>({ name: 'PLA', density: 1.24, cost_per_kg: 20, diameter: 1.75 });

    useEffect(() => {
        fetchData();
    }, []);

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sRes, pRes, fRes] = await Promise.all([
                axios.get('/api/settings', getAuthHeader()),
                axios.get('/api/printers', getAuthHeader()),
                axios.get('/api/filaments', getAuthHeader())
            ]);
            setSettings(sRes.data);
            setPrinters(pRes.data);
            setFilaments(fRes.data);
        } catch (e) {
            console.error("Failed to load settings", e);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            await axios.post('/api/settings', settings, getAuthHeader());
            alert('Settings saved');
            if (onSettingsChanged) onSettingsChanged();
        } catch (e) { console.error(e); alert('Failed to save'); }
    };

    const addPrinter = async () => {
        if (!newPrinter.name) return;
        try {
            await axios.post('/api/printers', newPrinter, getAuthHeader());
            setNewPrinter({ name: '', power_watts: 300, config_content: '' });
            fetchData();
            if (onSettingsChanged) onSettingsChanged();
        } catch (e) { console.error(e); }
    };

    const deletePrinter = async (id: number) => {
        if (!confirm('Delete printer?')) return;
        try {
            await axios.delete(`/api/printers/${id}`, getAuthHeader());
            fetchData();
            if (onSettingsChanged) onSettingsChanged();
        } catch (e) { console.error(e); }
    };

    const addFilament = async () => {
        if (!newFilament.name) return;
        try {
            await axios.post('/api/filaments', newFilament, getAuthHeader());
            setNewFilament({ name: 'PLA', density: 1.24, cost_per_kg: 20, diameter: 1.75 });
            fetchData();
            if (onSettingsChanged) onSettingsChanged();
        } catch (e) { console.error(e); }
    };

    const deleteFilament = async (id: number) => {
        if (!confirm('Delete filament?')) return;
        try {
            await axios.delete(`/api/filaments/${id}`, getAuthHeader());
            fetchData();
            if (onSettingsChanged) onSettingsChanged();
        } catch (e) { console.error(e); }
    };

    const handleConfigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setNewPrinter(prev => ({ ...prev, config_content: ev.target?.result as string }));
        };
        reader.readAsText(file);
    };

    if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading settings...</div>;

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm w-full flex flex-col overflow-hidden h-full ${className || ''}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold">Settings</h2>
                {onClose && <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20}/></button>}
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {['general', 'printers', 'filaments'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 font-medium capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Electricity Cost (per kWh)</label>
                                <input type="number" step="0.01" value={settings.electricity_cost_kwh} onChange={e => setSettings({...settings, electricity_cost_kwh: Number(e.target.value)})} className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">VAT Rate (%)</label>
                                <input type="number" step="0.1" value={settings.vat_rate} onChange={e => setSettings({...settings, vat_rate: Number(e.target.value)})} className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Currency Symbol</label>
                                <input type="text" value={settings.currency_symbol} onChange={e => setSettings({...settings, currency_symbol: e.target.value})} className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" />
                            </div>
                        </div>
                        <button onClick={saveSettings} className="btn-primary w-full justify-center flex items-center gap-2"><Save size={16}/> Save Settings</button>
                    </div>
                )}

                {activeTab === 'printers' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                            <h3 className="font-semibold text-sm uppercase text-gray-500">Add New Printer</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="Printer Name (e.g. Ender 3)" value={newPrinter.name} onChange={e => setNewPrinter({...newPrinter, name: e.target.value})} className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                                <input type="number" placeholder="Power (Watts)" value={newPrinter.power_watts} onChange={e => setNewPrinter({...newPrinter, power_watts: Number(e.target.value)})} className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Config INI (Optional - overrides default)</label>
                                <div className="flex gap-2">
                                    <label className="flex-1 cursor-pointer bg-white dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded p-2 text-center text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Upload className="inline mr-2" size={14}/> 
                                        {newPrinter.config_content ? 'Config Loaded' : 'Upload .ini file'}
                                        <input type="file" accept=".ini" onChange={handleConfigUpload} className="hidden" />
                                    </label>
                                    {newPrinter.config_content && <button onClick={() => setNewPrinter({...newPrinter, config_content: ''})} className="text-red-500 text-xs hover:underline">Clear</button>}
                                </div>
                            </div>
                            <button onClick={addPrinter} disabled={!newPrinter.name} className="btn-secondary w-full justify-center text-sm disabled:opacity-50"><Plus size={14}/> Add Printer</button>
                        </div>

                        <div className="space-y-2">
                            {printers.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.power_watts}W</div>
                                    </div>
                                    <button onClick={() => deletePrinter(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {printers.length === 0 && <div className="text-center text-gray-500 italic">No printers added</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'filaments' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                            <h3 className="font-semibold text-sm uppercase text-gray-500">Add New Filament</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="Name (e.g. Generic PLA)" value={newFilament.name} onChange={e => setNewFilament({...newFilament, name: e.target.value})} className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                                <input type="number" placeholder="Cost/kg" value={newFilament.cost_per_kg} onChange={e => setNewFilament({...newFilament, cost_per_kg: Number(e.target.value)})} className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                                <input type="number" step="0.01" placeholder="Density (g/cm3)" value={newFilament.density} onChange={e => setNewFilament({...newFilament, density: Number(e.target.value)})} className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                                <input type="number" step="0.01" placeholder="Diameter (mm)" value={newFilament.diameter} onChange={e => setNewFilament({...newFilament, diameter: Number(e.target.value)})} className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <button onClick={addFilament} disabled={!newFilament.name} className="btn-secondary w-full justify-center text-sm disabled:opacity-50"><Plus size={14}/> Add Filament</button>
                        </div>

                        <div className="space-y-2">
                            {filaments.map(f => (
                                <div key={f.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div>
                                        <div className="font-medium">{f.name}</div>
                                        <div className="text-xs text-gray-500">{f.cost_per_kg}/kg • {f.density}g/cm³</div>
                                    </div>
                                    <button onClick={() => deleteFilament(f.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {filaments.length === 0 && <div className="text-center text-gray-500 italic">No filaments added</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPanel;

