import React, { useState } from 'react';
import { 
  Sparkles, 
  Building2, 
  Calculator, 
  Users, 
  Scale, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  X, 
  MapPin, 
  Ruler, 
  Layers, 
  DollarSign, 
  ShieldCheck,
  Building,
  Globe,
  Search,
  Navigation
} from 'lucide-react';
import { ProjectParams, AppTheme } from '../types';
import { calculateProject } from '../utils/calculatorEngine';

interface GuidedWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: ProjectParams;
  onChangeParams: (newParams: ProjectParams) => void;
  theme?: AppTheme;
}

export const GuidedWizardModal: React.FC<GuidedWizardModalProps> = ({
  isOpen,
  onClose,
  params,
  onChangeParams,
  theme = 'light',
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<ProjectParams>({ ...params });

  // TKGM Parsel Sorgu Modal State
  const [showTkgmModal, setShowTkgmModal] = useState<boolean>(false);
  const [tkgmCity, setTkgmCity] = useState<string>('İstanbul');
  const [tkgmDistrict, setTkgmDistrict] = useState<string>('Kadıköy');
  const [tkgmNeighborhood, setTkgmNeighborhood] = useState<string>('Moda Mah.');
  const [tkgmAda, setTkgmAda] = useState<string>('120');
  const [tkgmParsel, setTkgmParsel] = useState<string>('5');
  const [tkgmLoading, setTkgmLoading] = useState<boolean>(false);
  const [tkgmFetchedData, setTkgmFetchedData] = useState<any>(null);

  const previewResults = calculateProject(formData);

  const handleFieldChange = (field: keyof ProjectParams, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      onChangeParams(formData);
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleQueryTkgm = () => {
    setTkgmLoading(true);
    setTimeout(() => {
      setTkgmLoading(false);
      const adaNum = parseInt(tkgmAda) || 120;
      const parselNum = parseInt(tkgmParsel) || 5;
      const calculatedArea = Math.round(350 + (adaNum * 37 + parselNum * 23) % 450);
      
      const result = {
        city: tkgmCity,
        district: tkgmDistrict,
        neighborhood: tkgmNeighborhood,
        ada: tkgmAda,
        parsel: tkgmParsel,
        area: calculatedArea,
        nitelik: 'Arsa (Kentsel Dönüşüm Alanı)',
        pafta: '21-C-IV',
        coordinates: { lat: 40.985 + (parselNum * 0.001), lng: 29.028 + (adaNum * 0.001) },
        address: `${tkgmCity}, ${tkgmDistrict}, ${tkgmNeighborhood} ${tkgmAda} Ada ${tkgmParsel} Parsel`
      };
      setTkgmFetchedData(result);
    }, 800);
  };

  const handleApplyTkgm = () => {
    if (!tkgmFetchedData) return;
    setFormData(prev => ({
      ...prev,
      projectAddress: tkgmFetchedData.address,
      landArea: tkgmFetchedData.area,
      projectName: `${tkgmDistrict} ${tkgmAda} Ada ${tkgmParsel} Parsel Projesi`,
    }));
    setShowTkgmModal(false);
  };

  const steps = [
    { id: 1, title: 'Arsa & Konum', icon: MapPin, desc: 'Proje adı, adres ve arsa yüzölçümü' },
    { id: 2, title: 'Mimari Kütle', icon: Building2, desc: 'Kat adresi, çatı ve kat planı' },
    { id: 3, title: 'Maliyet & Finans', icon: DollarSign, desc: 'İnşaat birim maliyeti ve yapı sınıfı' },
    { id: 4, title: 'Malikler & Sözleşme', icon: Scale, desc: '6306 Kanun ve paylaşım oranları' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Proje Kurulum ve Fizibilite Asistanı (4 Adımlı Akıllı Rehber)
              </h3>
              <p className="text-[11px] text-slate-500">
                Karmaşık tablolarla uğraşmadan projenizi adım adım kolayca yapılandırın.
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

        {/* Step Progress Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center gap-2 flex-1 last:flex-initial">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${
                  isCurrent 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 font-extrabold'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-white text-slate-500 border-slate-200 font-medium'
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline text-xs">{step.title}</span>
                  <span className="sm:hidden text-xs">{step.id}</span>
                </div>
                {step.id < 4 && <div className="hidden md:block h-0.5 flex-1 bg-slate-200 mx-2" />}
              </div>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Adım 1: Arsa, Konum ve Tapu Bilgileri</h4>
                  <p className="text-slate-500 text-[11px]">Projenin yapılacağı sahanın resmi adresini ve arsa alanını girin.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTkgmModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Haritadan Seç & TKGM Parsel Sorgu ile Otomatik Doldur"
                >
                  <Globe className="w-4 h-4 text-amber-300" />
                  <span>🗺️ Haritadan Seç & TKGM Parsel Sorgula</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Proje Adı / Başlığı:</label>
                  <input
                    type="text"
                    value={formData.projectName || ''}
                    onChange={(e) => handleFieldChange('projectName', e.target.value)}
                    placeholder="Örn: Kadıköy Bağdat Apt. Kentsel Dönüşüm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Proje Adresi / Ada-Parsel:</label>
                  <input
                    type="text"
                    value={formData.projectAddress || ''}
                    onChange={(e) => handleFieldChange('projectAddress', e.target.value)}
                    placeholder="Örn: İstanbul, Kadıköy, 120 Ada, 5 Parsel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Arsa Yüzölçümü (m²):</label>
                  <input
                    type="number"
                    min="50"
                    value={formData.landArea || 400}
                    onChange={(e) => handleFieldChange('landArea', parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tapu kaydındaki net arsa metrekaresi.</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mevcut Durum / Dönüşüm Tipi:</label>
                  <select
                    value={formData.transformationStatus || 'riskli_yapi'}
                    onChange={(e) => handleFieldChange('transformationStatus', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                  >
                    <option value="riskli_yapi">6306 Sayılı Kanun (Riskli Yapı Raporlu)</option>
                    <option value="kentsel_donusum">Genel Kentsel Dönüşüm / Yıkım</option>
                    <option value="kat_karsiligi">Klasik Kat Karşılığı Sözleşme</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Adım 2: Mimari Kütle & Yapı Modeli</h4>
                <p className="text-slate-500 text-[11px]">Bina kat adresi, kat başı daire sayısı, çatı ve zemin dükkan durumunu belirleyin.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kat Sayısı (Zemin + Normal):</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.floorCount || 5}
                    onChange={(e) => handleFieldChange('floorCount', parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Normal Katta Daire Sayısı:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.flatsPerFloor || 2}
                    onChange={(e) => handleFieldChange('flatsPerFloor', parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Çatı Mimarisi:</label>
                  <select
                    value={formData.roofType || 'gable'}
                    onChange={(e) => handleFieldChange('roofType', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                  >
                    <option value="gable">Beşik Çatı (Standart)</option>
                    <option value="mansard">Mansart Çatı (Ek Daireli)</option>
                    <option value="duplex">Çatı Dubleks</option>
                    <option value="flat">Teras / Düz Çatı</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Zemin katta dükkan / mağaza var mı?</span>
                    <span className="text-[10px] text-slate-500">Zemin kat ticari dükkan olarak tasarlanır.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!formData.hasGroundFloorShop}
                    onChange={(e) => handleFieldChange('hasGroundFloorShop', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bodrum Kat Sayısı:</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={formData.basementCount !== undefined ? formData.basementCount : 1}
                    onChange={(e) => handleFieldChange('basementCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Adım 3: Maliyet & Yapı Kalitesi Sınıfı</h4>
                <p className="text-slate-500 text-[11px]">Özel inşaat birim maliyeti ve yapı standardını ayarlayın.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Manuel Daire Birim Maliyet (₺/m², İsteğe Bağlı):</label>
                  <input
                    type="number"
                    step="500"
                    value={formData.manualFlatUnitPrice || ''}
                    onChange={(e) => handleFieldChange('manualFlatUnitPrice', parseFloat(e.target.value) || undefined)}
                    placeholder="Boş bırakılırsa otomatik hesaplanır"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Boş bırakıldığında güncel demir/beton fiyatlarıyla hesaplanır.</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Yapı Kalitesi Sınıfı:</label>
                  <select
                    value={formData.buildingType || 'standard'}
                    onChange={(e) => handleFieldChange('buildingType', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                  >
                    <option value="standard">Standart Kalite (A Sınıfı Malzeme)</option>
                    <option value="luxury">Lüks / Premium Sınıf</option>
                    <option value="commercial">Ticari / İş Merkezi Standardı</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Müteahhit Payı Oranı (%):</label>
                  <input
                    type="number"
                    min="10"
                    max="70"
                    value={formData.contractorShareRate || 50}
                    onChange={(e) => handleFieldChange('contractorShareRate', parseFloat(e.target.value) || 50)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hedef Tamamlama Süresi (Ay):</label>
                  <input
                    type="number"
                    min="6"
                    max="48"
                    value={formData.manualMonths || 15}
                    onChange={(e) => handleFieldChange('manualMonths', parseInt(e.target.value) || 15)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Adım 4: Malik Paylaşımı & Hukuki Sözleşme</h4>
                <p className="text-slate-500 text-[11px]">6306 Sayılı Kanun kapsamında hak sahibi dağılımı ve resmi sözleşme hazırlığı.</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-emerald-900 text-xs">6306 Kentsel Dönüşüm Kanunu Güvencesi</h5>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Bu proje 6306 sayılı kanun kapsamında KDV, tapu harcı ve noter harcı muafiyetleriyle hesaplanmaktadır.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Toplam Bağımsız Bölüm</span>
                  <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">{previewResults.flatCount} Adet</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Toplam İnşaat Alanı</span>
                  <span className="text-base font-black text-indigo-600 font-mono mt-0.5 block">{previewResults.totalArea?.toLocaleString('tr-TR')} m²</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Maliyet</span>
                  <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">{((previewResults.grandTotal || 0) / 1_000_000).toFixed(2)}M ₺</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tahmini Süre</span>
                  <span className="text-base font-black text-emerald-600 font-mono mt-0.5 block">{previewResults.finalMonths || 15} Ay</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Summary Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-slate-300 font-bold">Anlık Simülasyon Özeti:</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <span>{previewResults.flatCount} Daire</span>
              <span className="text-amber-400">~{((previewResults.grandTotal || 0)/1_000_000).toFixed(2)}M ₺</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Geri</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{currentStep === 4 ? 'Tamamla & Projeyi Başlat' : 'İleri'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TKGM PARSEL SORGU & HARİTADAN SEÇİM MODALI */}
      {showTkgmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-indigo-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    TKGM Parsel Sorgu & Harita Entegrasyonu
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tapu ve Kadastro Genel Müdürlüğü (Parsel Sorgulama) resmi veri tabanı simülatörü.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTkgmModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">İl:</label>
                  <input
                    type="text"
                    value={tkgmCity}
                    onChange={(e) => setTkgmCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">İlçe:</label>
                  <input
                    type="text"
                    value={tkgmDistrict}
                    onChange={(e) => setTkgmDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mahalle / Köy:</label>
                  <input
                    type="text"
                    value={tkgmNeighborhood}
                    onChange={(e) => setTkgmNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ada Numarası:</label>
                  <input
                    type="text"
                    value={tkgmAda}
                    onChange={(e) => setTkgmAda(e.target.value)}
                    placeholder="Örn: 120"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Parsel Numarası:</label>
                  <input
                    type="text"
                    value={tkgmParsel}
                    onChange={(e) => setTkgmParsel(e.target.value)}
                    placeholder="Örn: 5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleQueryTkgm}
                disabled={tkgmLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Search className={`w-4 h-4 ${tkgmLoading ? 'animate-spin' : ''}`} />
                <span>{tkgmLoading ? 'TKGM Parsel Sorgulanıyor...' : '🔍 TKGM Parsel Sorgula'}</span>
              </button>

              {tkgmFetchedData && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold pb-2 border-b border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>TKGM Resmi Parsel Kaydı Bulundu</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono text-[11px]">
                    <div><strong>İl / İlçe:</strong> {tkgmFetchedData.city} / {tkgmFetchedData.district}</div>
                    <div><strong>Mahalle:</strong> {tkgmFetchedData.neighborhood}</div>
                    <div><strong>Ada / Parsel:</strong> {tkgmFetchedData.ada} Ada / {tkgmFetchedData.parsel} Parsel</div>
                    <div><strong>Arsa Yüzölçümü:</strong> <span className="text-emerald-700 font-black">{tkgmFetchedData.area} m²</span></div>
                    <div><strong>Tapu Niteliği:</strong> {tkgmFetchedData.nitelik}</div>
                    <div><strong>Pafta:</strong> {tkgmFetchedData.pafta}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setShowTkgmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleApplyTkgm}
                disabled={!tkgmFetchedData}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Resmi Bilgileri Projeye Aktar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
