import React, { useState } from 'react';
import { ProjectParams, ExistingBuilding, AppTheme } from '../types';
import { Building2, Plus, Trash2, MapPin, Calculator, Users } from 'lucide-react';
import { InteractiveFootprintCanvas } from './InteractiveFootprintCanvas';

interface ProjectSetupTabProps {
  params: ProjectParams;
  onChangeParams: (newParams: ProjectParams) => void;
  theme?: AppTheme;
  onNext: () => void;
}

export const ProjectSetupTab: React.FC<ProjectSetupTabProps> = ({
  params,
  onChangeParams,
  theme = 'light',
  onNext
}) => {
  const [newBuilding, setNewBuilding] = useState<Partial<ExistingBuilding>>({
    name: 'Mevcut Bina',
    floorCount: 3,
    flatCount: 6,
    landShare: 0
  });

  const isGray = theme === 'gray';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';
  const bgCard = isGray ? 'bg-slate-800' : 'bg-white';

  const addExistingBuilding = () => {
    if (!newBuilding.name || !newBuilding.floorCount || !newBuilding.flatCount) return;
    const building: ExistingBuilding = {
      id: Date.now().toString(),
      name: newBuilding.name,
      floorCount: newBuilding.floorCount,
      flatCount: newBuilding.flatCount,
      landShare: newBuilding.landShare || 0
    };
    onChangeParams({
      ...params,
      existingBuildings: [...(params.existingBuildings || []), building]
    });
    setNewBuilding({ name: 'Mevcut Bina ' + ((params.existingBuildings?.length || 0) + 2), floorCount: 3, flatCount: 6, landShare: 0 });
  };

  const removeBuilding = (id: string) => {
    onChangeParams({
      ...params,
      existingBuildings: (params.existingBuildings || []).filter(b => b.id !== id)
    });
  };

  const existing = params.existingBuildings || [];
  const totalExistingFlats = existing.reduce((sum, b) => sum + b.flatCount, 0);

  return (
    <div className="space-y-6">
      {/* 1. Mevcut Yapılar */}
      <div className={`${bgCard} rounded-xl shadow-xs border border-slate-200 overflow-hidden`}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className={`text-lg font-bold ${textTitle}`}>1. Kentsel Dönüşüme Girecek Mevcut Binalar</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-500 mb-4">
            Eğer birden fazla yapı/parsel birleşip tek bir proje olacaksa, tüm mevcut binaları buradan ekleyin.
          </p>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Bina Adı</label>
              <input type="text" value={newBuilding.name} onChange={e => setNewBuilding({ ...newBuilding, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-xs font-medium text-slate-500 mb-1">Kat Sayısı</label>
              <input type="number" value={newBuilding.floorCount} onChange={e => setNewBuilding({ ...newBuilding, floorCount: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-xs font-medium text-slate-500 mb-1">Daire Sayısı</label>
              <input type="number" value={newBuilding.flatCount} onChange={e => setNewBuilding({ ...newBuilding, flatCount: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div className="flex items-end">
              <button onClick={addExistingBuilding} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Ekle
              </button>
            </div>
          </div>
          
          {existing.length > 0 && (
            <div className="border rounded-lg overflow-hidden border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Bina Adı</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Kat</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Bağımsız Bölüm (Daire)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {existing.map(b => (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3">{b.floorCount} Kat</td>
                      <td className="px-4 py-3">{b.flatCount} Daire</td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeBuilding(b.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="px-4 py-3 text-right">TOPLAM MEVCUT:</td>
                    <td className="px-4 py-3 text-indigo-700">{totalExistingFlats} Daire (Hak Sahibi)</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 2. Parsel Alanı & Geometri */}
      <div className={`${bgCard} rounded-xl shadow-xs border border-slate-200 overflow-hidden`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className={`text-lg font-bold ${textTitle}`}>2. Parsel Alanı ve Yapı Geometrisi</h2>
          </div>
        </div>
        <div className="p-4">
          <InteractiveFootprintCanvas
            params={params}
            onUpdateParams={onChangeParams}
            theme={theme}
          />
        </div>
      </div>

      {/* 3. Hak Dağılımı Özeti */}
      <div className={`${bgCard} rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col gap-6`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${textTitle}`}>
              <Users className="w-5 h-5 text-indigo-600" />
              Hak Dağılımı Özeti
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Birleşen mevcut binalardaki pay sahiplerinin (eski yapı) yeni projedeki durum dağılımı.
            </p>
          </div>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all whitespace-nowrap"
          >
            Proje Künyesi ve Hesaba Geç
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-center items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mevcut Hak Sahibi</span>
            <span className="text-3xl font-bold text-slate-700">{totalExistingFlats}</span>
            <span className="text-[10px] text-slate-400 mt-1">Birleşen Bina Daireleri</span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col justify-center items-center">
            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Yeni Planlanan</span>
            <span className="text-3xl font-bold text-indigo-700">{params.flatCount}</span>
            <span className="text-[10px] text-indigo-400 mt-1">Toplam Bağımsız Bölüm</span>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex flex-col justify-center items-center">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Fark (Müteahhit / Satış)</span>
            <span className="text-3xl font-bold text-emerald-700">{Math.max(0, params.flatCount - totalExistingFlats)}</span>
            <span className="text-[10px] text-emerald-500 mt-1">Artan Daire Sayısı</span>
          </div>
        </div>
      </div>
    </div>
  );
};
