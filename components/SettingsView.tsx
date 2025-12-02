
import React, { useState } from 'react';
import { UserSettings } from '../types';
import { AVAILABLE_MODELS } from '../constants/models';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

type SettingsTab = 'general' | 'models';

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  onSaveSettings 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showKey, setShowKey] = useState(false);

  // State for adding new model
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  // Helper to update settings immediately (VS Code style auto-save behavior)
  const updateSetting = (updates: Partial<UserSettings>) => {
    onSaveSettings({ ...settings, ...updates });
  };

  const toggleModel = (modelId: string) => {
    const isEnabled = settings.enabledModels.includes(modelId);
    let newModels;
    if (isEnabled) {
        newModels = settings.enabledModels.filter(id => id !== modelId);
    } else {
        newModels = [...settings.enabledModels, modelId];
    }
    updateSetting({ enabledModels: newModels });
  };

  const handleAddCustomModel = () => {
      if (!newModelId.trim()) return;
      
      const customModels = settings.customModels || [];
      // Prevent duplicates
      if (AVAILABLE_MODELS.some(m => m.id === newModelId) || customModels.some(m => m.id === newModelId)) {
          alert("Model ID already exists.");
          return;
      }

      const newModel = { 
          id: newModelId.trim(), 
          name: newModelName.trim() || newModelId.trim() 
      };

      updateSetting({ 
          customModels: [...customModels, newModel],
          enabledModels: [...settings.enabledModels, newModel.id] // Auto-enable
      });

      setNewModelId('');
      setNewModelName('');
  };

  const handleDeleteCustomModel = (modelId: string) => {
      updateSetting({
          customModels: (settings.customModels || []).filter(m => m.id !== modelId),
          enabledModels: settings.enabledModels.filter(id => id !== modelId)
      });
  };

  return (
    <div className="flex h-full w-full bg-md-sys-background">
        
        {/* Sidebar */}
        <div className="w-[240px] border-r border-md-sys-outline/10 flex flex-col pt-6 pb-4 bg-md-sys-surface">
            <div className="px-6 mb-6">
                <h2 className="text-xs font-bold text-md-sys-secondary uppercase tracking-widest">Settings</h2>
            </div>
            
            <nav className="flex-1 flex flex-col gap-0.5 px-3">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'general' ? 'bg-md-sys-primary/10 text-md-sys-primary' : 'text-md-sys-secondary hover:text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-[20px]">settings</span>
                        General
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('models')}
                    className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'models' ? 'bg-md-sys-primary/10 text-md-sys-primary' : 'text-md-sys-secondary hover:text-md-sys-onSurface hover:bg-md-sys-surfaceVariant/50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-[20px]">model_training</span>
                        Models
                    </div>
                </button>
            </nav>

            <div className="px-6 mt-auto">
                <p className="text-[10px] text-md-sys-outline">Resonote v2.1.0</p>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-md-sys-background">
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar max-w-4xl">
                <h1 className="text-2xl font-bold text-md-sys-onSurface mb-8 capitalize">{activeTab} Settings</h1>
                
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        <div className="flex flex-col gap-4 p-6 bg-md-sys-surface rounded-xl border border-md-sys-outline/10">
                            <div>
                                <label className="text-base font-semibold text-md-sys-onSurface">Google AI Studio API Key</label>
                                <p className="text-sm text-md-sys-secondary mt-1">
                                    Leave blank to use the default key provided by the deployment environment. 
                                    Providing your own key allows for higher rate limits.
                                </p>
                            </div>
                            <div className="relative max-w-xl">
                                <input 
                                    type={showKey ? "text" : "password"}
                                    value={settings.apiKey}
                                    onChange={(e) => updateSetting({ apiKey: e.target.value })}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-md-sys-surfaceVariant/30 border border-md-sys-outline/20 rounded-lg px-4 py-3 text-sm text-md-sys-onSurface focus:outline-none focus:border-md-sys-primary focus:ring-1 focus:ring-md-sys-primary transition-all placeholder:text-md-sys-outline"
                                />
                                <button 
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-md-sys-secondary hover:text-md-sys-onSurface transition-colors"
                                >
                                    <span className="material-symbols-rounded text-lg">{showKey ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Theme Preference */}
                        <div className="flex flex-col gap-4 p-6 bg-md-sys-surface rounded-xl border border-md-sys-outline/10">
                            <div>
                                <label className="text-base font-semibold text-md-sys-onSurface">Appearance</label>
                                <p className="text-sm text-md-sys-secondary mt-1">
                                    Choose your preferred theme interface.
                                </p>
                            </div>
                             <div className="flex gap-4">
                                <button 
                                    onClick={() => updateSetting({ theme: 'dark' })}
                                    className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.theme === 'dark' ? 'bg-md-sys-primary/10 border-md-sys-primary text-md-sys-primary' : 'bg-md-sys-surfaceVariant/30 border-md-sys-outline/20 text-md-sys-secondary hover:bg-md-sys-surfaceVariant/50'}`}
                                >
                                    <span className="material-symbols-rounded">dark_mode</span>
                                    <span className="text-sm font-medium">Dark Mode</span>
                                </button>
                                <button 
                                    onClick={() => updateSetting({ theme: 'light' })}
                                    className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.theme === 'light' ? 'bg-md-sys-primary/10 border-md-sys-primary text-md-sys-primary' : 'bg-md-sys-surfaceVariant/30 border-md-sys-outline/20 text-md-sys-secondary hover:bg-md-sys-surfaceVariant/50'}`}
                                >
                                    <span className="material-symbols-rounded">light_mode</span>
                                    <span className="text-sm font-medium">Light Mode</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'models' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-md-sys-surface rounded-xl border border-md-sys-outline/10">
                            <p className="text-sm text-md-sys-secondary mb-6">
                                Select which models appear in the dropdown menu. You can disable older models to keep your workspace clean.
                            </p>
                            
                            <div className="space-y-1">
                                {AVAILABLE_MODELS.map(model => {
                                    const isEnabled = settings.enabledModels.includes(model.id);
                                    return (
                                        <div 
                                            key={model.id} 
                                            className="flex items-center justify-between p-4 rounded-lg hover:bg-md-sys-surfaceVariant/30 transition-colors border border-transparent hover:border-md-sys-outline/10 group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-md-sys-onSurface">{model.name}</span>
                                                <span className="text-xs font-mono text-md-sys-secondary mt-0.5">{model.id}</span>
                                            </div>
                                            
                                            {/* Toggle Switch */}
                                            <button 
                                                onClick={() => toggleModel(model.id)}
                                                className={`
                                                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                                                    ${isEnabled ? 'bg-md-sys-primary' : 'bg-md-sys-surfaceVariant'}
                                                `}
                                            >
                                                <span 
                                                    className={`
                                                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                                        ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                                                    `}
                                                />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Custom Models Section */}
                            <div className="mt-8 border-t border-md-sys-outline/10 pt-6">
                                <h3 className="text-sm font-bold text-md-sys-onSurface mb-4">Custom Models</h3>
                                
                                {settings.customModels && settings.customModels.length > 0 && (
                                    <div className="space-y-1 mb-6">
                                        {settings.customModels.map(model => {
                                            const isEnabled = settings.enabledModels.includes(model.id);
                                            return (
                                                <div 
                                                    key={model.id} 
                                                    className="flex items-center justify-between p-4 rounded-lg bg-md-sys-surfaceVariant/10 hover:bg-md-sys-surfaceVariant/30 transition-colors border border-md-sys-outline/10 group"
                                                >
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-md-sys-onSurface">{model.name}</span>
                                                            <span className="text-[10px] bg-md-sys-primary/10 text-md-sys-primary px-1.5 py-0.5 rounded border border-md-sys-primary/20">Custom</span>
                                                        </div>
                                                        <span className="text-xs font-mono text-md-sys-secondary mt-0.5">{model.id}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                         {/* Toggle Switch */}
                                                        <button 
                                                            onClick={() => toggleModel(model.id)}
                                                            className={`
                                                                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                                                                ${isEnabled ? 'bg-md-sys-primary' : 'bg-md-sys-surfaceVariant'}
                                                            `}
                                                        >
                                                            <span 
                                                                className={`
                                                                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                                                    ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                                                                `}
                                                            />
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button 
                                                            onClick={() => handleDeleteCustomModel(model.id)}
                                                            className="p-2 rounded-full hover:bg-md-sys-error/10 text-md-sys-secondary hover:text-md-sys-error transition-colors"
                                                            title="Delete Custom Model"
                                                        >
                                                            <span className="material-symbols-rounded text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add Model Form */}
                                <div className="bg-md-sys-surfaceVariant/20 rounded-lg p-4 border border-md-sys-outline/10">
                                    <p className="text-xs font-bold text-md-sys-secondary uppercase tracking-wider mb-3">Add New Model</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <input 
                                                type="text" 
                                                value={newModelId}
                                                onChange={(e) => setNewModelId(e.target.value)}
                                                placeholder="Model ID (e.g., gemini-1.5-pro)"
                                                className="w-full bg-md-sys-surfaceVariant/50 border border-md-sys-outline/20 rounded-lg px-3 py-2 text-sm text-md-sys-onSurface focus:outline-none focus:border-md-sys-primary focus:ring-1 focus:ring-md-sys-primary transition-all placeholder:text-md-sys-outline"
                                            />
                                        </div>
                                        <div>
                                            <input 
                                                type="text" 
                                                value={newModelName}
                                                onChange={(e) => setNewModelName(e.target.value)}
                                                placeholder="Display Name (Optional)"
                                                className="w-full bg-md-sys-surfaceVariant/50 border border-md-sys-outline/20 rounded-lg px-3 py-2 text-sm text-md-sys-onSurface focus:outline-none focus:border-md-sys-primary focus:ring-1 focus:ring-md-sys-primary transition-all placeholder:text-md-sys-outline"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleAddCustomModel}
                                            disabled={!newModelId.trim()}
                                            className="px-4 py-2 bg-md-sys-onSurface text-md-sys-surface rounded-md text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-[16px]">add</span>
                                            Add Model
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};