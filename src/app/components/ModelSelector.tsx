"use client";

import { useState } from "react";
import { ChevronDown, Bot, Zap, Brain } from "lucide-react";
import { ModelProvider, ModelService } from "@/lib/model-service";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface ModelSelectorProps {
  currentConfig: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
}

export default function ModelSelector({ currentConfig, onConfigChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const providers: { provider: ModelProvider; icon: React.ReactNode; color: string }[] = [
    { provider: 'openai', icon: <Bot className="w-4 h-4" />, color: 'text-green-600' },
    { provider: 'anthropic', icon: <Brain className="w-4 h-4" />, color: 'text-orange-600' },
    { provider: 'gemini', icon: <Zap className="w-4 h-4" />, color: 'text-blue-600' },
  ];

  const handleProviderChange = (provider: ModelProvider) => {
    const availableModels = ModelService.getAvailableModels(provider);
    const defaultModel = availableModels[0];
    
    onConfigChange({
      ...currentConfig,
      provider,
      model: defaultModel,
    });
  };

  const handleModelChange = (model: string) => {
    onConfigChange({
      ...currentConfig,
      model,
    });
  };

  const currentProvider = providers.find(p => p.provider === currentConfig.provider);
  const availableModels = ModelService.getAvailableModels(currentConfig.provider);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        {currentProvider?.icon}
        <span className={currentProvider?.color}>
          {ModelService.getProviderDisplayName(currentConfig.provider)}
        </span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-700">
          {ModelService.getModelDisplayName(currentConfig.provider, currentConfig.model)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Provider
            </div>
            <div className="grid grid-cols-3 gap-1 mb-4">
              {providers.map(({ provider, icon, color }) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors ${
                    currentConfig.provider === provider
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className={color}>{icon}</span>
                  <span className="font-medium">
                    {ModelService.getProviderDisplayName(provider)}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Model
            </div>
            <div className="space-y-1">
              {availableModels.map(model => (
                <button
                  key={model}
                  onClick={() => {
                    handleModelChange(model);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    currentConfig.model === model
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {ModelService.getModelDisplayName(currentConfig.provider, model)}
                  {currentConfig.provider !== 'openai' && (
                    <span className="text-xs text-orange-500 ml-2">(Fallback: OpenAI)</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Advanced Settings</span>
              </div>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Temperature: {currentConfig.temperature || 0.7}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentConfig.temperature || 0.7}
                    onChange={(e) => onConfigChange({
                      ...currentConfig,
                      temperature: parseFloat(e.target.value)
                    })}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Max Tokens: {currentConfig.maxTokens || 2000}
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="4000"
                    step="100"
                    value={currentConfig.maxTokens || 2000}
                    onChange={(e) => onConfigChange({
                      ...currentConfig,
                      maxTokens: parseInt(e.target.value)
                    })}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}