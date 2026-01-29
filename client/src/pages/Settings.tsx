import React from 'react';
import SettingsPanel from '../components/CalculatorSettings';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Simple Header for Settings Page */}
            <header className="glass z-20 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-black/5 rounded-lg transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Global Settings</h1>
            </header>

            <div className="flex-1 p-4 md:p-8 overflow-hidden">
                <div className="max-w-4xl mx-auto h-full">
                    <SettingsPanel className="h-full border border-gray-200 dark:border-gray-700 shadow-lg" />
                </div>
            </div>
        </div>
    );
};

export default Settings;
