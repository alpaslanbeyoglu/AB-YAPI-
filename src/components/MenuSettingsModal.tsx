import React, { useState } from 'react';
import { X, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { TabConfig } from '../config/tabs';
import { AppTheme } from '../types';

interface MenuSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: TabConfig[];
  onSave: (tabs: TabConfig[]) => void;
  theme: AppTheme;
}

export const MenuSettingsModal: React.FC<MenuSettingsModalProps> = ({
  isOpen,
  onClose,
  tabs,
  onSave,
  theme,
}) => {
  const [localTabs, setLocalTabs] = useState<TabConfig[]>([...tabs]);
  const isGray = theme === 'gray';

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newTabs = [...localTabs];
    const temp = newTabs[index].order;
    newTabs[index].order = newTabs[index - 1].order;
    newTabs[index - 1].order = temp;
    setLocalTabs(newTabs.sort((a, b) => a.order - b.order));
  };

  const moveDown = (index: number) => {
    if (index === localTabs.length - 1) return;
    const newTabs = [...localTabs];
    const temp = newTabs[index].order;
    newTabs[index].order = newTabs[index + 1].order;
    newTabs[index + 1].order = temp;
    setLocalTabs(newTabs.sort((a, b) => a.order - b.order));
  };

  const toggleVisibility = (index: number) => {
    const newTabs = [...localTabs];
    newTabs[index].visible = !newTabs[index].visible;
    setLocalTabs(newTabs);
  };

  const handleSave = () => {
    onSave(localTabs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh] ${
        isGray ? 'bg-slate-100 text-slate-800' : 'bg-white text-slate-900'
      }`}>
        <div className={`flex items-center justify-between p-4 border-b ${
          isGray ? 'border-slate-300' : 'border-slate-100'
        }`}>
          <h2 className="text-lg font-bold">Menü Ayarları</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {localTabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <div
                key={tab.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  !tab.visible ? 'opacity-50' : ''
                } ${
                  isGray
                    ? 'bg-white border-slate-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">{tab.label.replace(/^\d+\.\s*/, '')}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisibility(index)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                    title={tab.visible ? "Gizle" : "Göster"}
                  >
                    {tab.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === localTabs.length - 1}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 border-t flex justify-end gap-3 ${
          isGray ? 'border-slate-300 bg-slate-200/50' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isGray ? 'hover:bg-slate-300' : 'hover:bg-slate-200'
            }`}
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
