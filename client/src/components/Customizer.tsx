import React from 'react';
import type { ScadVariable } from '../utils/scadParser';

interface CustomizerProps {
  variables: ScadVariable[];
  onChange: (name: string, value: string | number | boolean) => void;
}

const Customizer: React.FC<CustomizerProps> = ({ variables, onChange }) => {
  if (variables.length === 0) {
      return <div className="text-gray-500 text-sm text-center italic">No customizable variables found</div>;
  }

  return (
    <div className="space-y-4">
      {variables.map((v) => (
        <div key={v.name} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between">
              <span>{v.name}</span>
              <span className="text-xs text-gray-500">{String(v.value)}</span>
          </label>
          
          {v.type === 'boolean' ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={v.value as boolean} 
                    onChange={(e) => onChange(v.name, e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
          ) : v.type === 'number' ? (
             v.min !== undefined && v.max !== undefined ? (
                 <input 
                    type="range"
                    min={v.min}
                    max={v.max}
                    step={v.step || 1}
                    value={v.value as number}
                    onChange={(e) => onChange(v.name, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                 />
             ) : (
                <input 
                    type="number"
                    value={v.value as number}
                    onChange={(e) => onChange(v.name, parseFloat(e.target.value))}
                    className="input-field"
                 />
             )
          ) : (
              <input 
                type="text" 
                value={v.value as string}
                onChange={(e) => onChange(v.name, e.target.value)}
                className="input-field"
              />
          )}
        </div>
      ))}
    </div>
  );
};

export default Customizer;
