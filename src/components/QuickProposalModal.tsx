import React, { useState } from 'react';
import { Sparkles, Calculator, X, ArrowRight, Building, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { ProjectParams, AppTheme } from '../types';
import { calculateProject } from '../utils/calculatorEngine';

interface QuickProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProposal: (newParams: Partial<ProjectParams>) => void;
  theme?: AppTheme;
}

export const QuickProposalModal: React.FC<QuickProposalModalProps> = ({
  isOpen,
  onClose,
  onApplyProposal,
  theme = 'light',
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState('');
  const [projectAddress, setProjectAddress] = useState('İstanbul, Kadıköy, 120 Ada 5 Parsel');
  const [landArea, setLandArea] = useState<number>(450);
  const [floorCount, setFloorCount] = useState<number>(5);
  const [flatsPerFloor, setFlatsPerFloor] = useState<number>(2);
  const [hasShop, setHasShop] = useState<boolean>(false);
  const [shopCount, setShopCount] = useState<number>(1);
  const [contractorModel, setContractorModel] = useState<'urbanTransformation' | 'contractorShare' | 'contractorService'>('urbanTransformation');
  const [contractorShareRate, setContractorShareRate] = useState<number>(50);

  // Otomatik hesaplanan taban alanı (TAKS %40 ortalama)
  const baseBuildArea = Math.round(landArea * 0.40);
  const totalFlats = (hasShop ? Math.max(1, floorCount - 1) : floorCount) * flatsPerFloor;

  // Hızlı simülasyon parametreleri
  const quickParams: any = {
    projectName: customerName || 'Potansiyel Müşteri Teklifi',
    projectAddress: projectAddress,
    landArea: landArea,
    baseBuildArea: baseBuildArea,
    floorCount: floorCount,
    flatsPerFloor: flatsPerFloor,
    flatCount: totalFlats,
    hasGroundFloorShop: hasShop,
    shopCount: hasShop ? shopCount : 0,
    projectModel: contractorModel,
    contractorShareRate: contractorShareRate,
    durationOption: 'manual',
    manualMonths: 15,
  };

  const previewResults = calculateProject(quickParams);

  const handleApply = () => {
    onApplyProposal({
      projectName: customerName || 'Hızlı Teklif',
      projectAddress: projectAddress,
      landArea: landArea,
      baseBuildArea: baseBuildArea,
      floorCount: floorCount,
      flatsPerFloor: flatsPerFloor,
      flatCount: totalFlats,
      hasGroundFloorShop: hasShop,
      shopCount: hasShop ? shopCount : 0,
      projectModel: contractorModel,
      contractorShareRate: contractorShareRate,
      manualMonths: previewResults.finalMonths || 15,
      durationOption: 'manual',
      proposalStatus: 'presented',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                2 Dakikada Hızlı Teklif Oluşturma Sihirbazı
              </h3>
              <p className="text-[11px] text-slate-500">
                Şirketinize başvuran potansiyel müşteriye anında kaba maliyet ve fizibilite çıkarın.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Müşteri / Malik Adı:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Mehmet Bey (Bina Temsilcisi)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Proje Yeri / Ada-Parsel:</label>
              <input
                type="text"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="Örn: Kadıköy Moda Mah."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Arsa Alanı (m²):</label>
              <input
                type="number"
                min="50"
                value={landArea}
                onChange={(e) => setLandArea(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Taban: ~{baseBuildArea} m²</span>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Kat Sayısı:</label>
              <input
                type="number"
                min="1"
                max="30"
                value={floorCount}
                onChange={(e) => setFloorCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Z+{(floorCount - 1)} Kat</span>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Katta Daire:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={flatsPerFloor}
                onChange={(e) => setFlatsPerFloor(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Toplam {totalFlats} Daire</span>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Zemin Dükkan:</label>
              <select
                value={hasShop ? 'yes' : 'no'}
                onChange={(e) => setHasShop(e.target.value === 'yes')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs"
              >
                <option value="no">Yok (Konut)</option>
                <option value="yes">Var (Ticari)</option>
              </select>
              {hasShop && (
                <span className="text-[10px] text-indigo-600 mt-0.5 block font-bold">{shopCount} Adet Dükkan</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-700 font-bold">Yapım ve Sözleşme Modeli:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'urbanTransformation', label: '🏢 Kentsel Dönüşüm', desc: 'Devlet destekli / Hakedişli' },
                { id: 'contractorShare', label: '🤝 Kat Karşılığı', desc: `Müteahhit Payı: %${contractorShareRate}` },
                { id: 'contractorService', label: '🔨 Müteahhitlik Hizmeti', desc: 'Tüm maliyeti malikler karşılar' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setContractorModel(m.id as any)}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    contractorModel === m.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-500/10'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Anlık Kaba Teklif Hesap Özeti */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold border-b border-indigo-800/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Anlık Otomatik Hesaplanan Kaba Teklif</span>
              </span>
              <span className="text-amber-300 font-mono">
                {previewResults.finalMonths || 15} Ay Teslim
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Toplam İnşaat</span>
                <span className="text-base font-black font-mono mt-0.5 block">{previewResults.totalArea?.toLocaleString('tr-TR')} m²</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Birim Fiyat</span>
                <span className="text-base font-black font-mono mt-0.5 block">{previewResults.grossCostPerSqM?.toLocaleString('tr-TR')} ₺/m²</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Daire Başına</span>
                <span className="text-base font-black font-mono mt-0.5 block text-amber-300">
                  ~{Math.round((previewResults.grandTotal || 0) / (previewResults.flatCount || 1)).toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                <span className="text-[10px] uppercase font-bold block">Genel Teklif Tutarı</span>
                <span className="text-base font-black font-mono mt-0.5 block">
                  {((previewResults.grandTotal || 0) / 1_000_000).toFixed(2)}M ₺
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Bu Teklifi Çalışma Alanına Yükle & Başlat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
