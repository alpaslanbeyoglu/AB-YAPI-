import React, { useState, useRef } from 'react';
import {
  FileUp,
  FileDown,
  X,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Database,
  FileText
} from 'lucide-react';
import { ProjectParams, BuildingModelParams, AppTheme, SavedProjectData } from '../types';

interface ProjectTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: ProjectParams;
  currentBuildingModelParams?: BuildingModelParams;
  onImportProject: (data: { params: ProjectParams; buildingModelParams?: BuildingModelParams; historyList?: SavedProjectData[] }) => void;
  onExportProject: (includeHistory?: boolean) => void;
  historyList?: SavedProjectData[];
  theme?: AppTheme;
}

export const ProjectTransferModal: React.FC<ProjectTransferModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  currentBuildingModelParams,
  onImportProject,
  onExportProject,
  historyList = [],
  theme = 'light',
}) => {
  if (!isOpen) return null;

  const isGray = theme === 'gray';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'templates'>('import');
  const [jsonText, setJsonText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{
    params: ProjectParams;
    buildingModelParams?: BuildingModelParams;
    historyList?: SavedProjectData[];
    savedAt?: string;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Helper to validate and parse raw JSON text or file content
  const processJsonContent = (rawText: string) => {
    setParseError(null);
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && (parsed.params || parsed.landArea || parsed.projectAddress)) {
        // Normalize if it's direct params or wrapped object
        const paramsObj = parsed.params || parsed;
        const modelParamsObj = parsed.buildingModelParams;
        const history = Array.isArray(parsed.historyList) ? parsed.historyList : undefined;
        
        setPreviewData({
          params: paramsObj,
          buildingModelParams: modelParamsObj,
          historyList: history,
          savedAt: parsed.savedAt || new Date().toISOString(),
        });
      } else {
        setParseError('Geçersiz dosya formatı. Lütfen geçerli bir AB YAPI proje JSON dosyası seçin.');
        setPreviewData(null);
      }
    } catch (err: any) {
      setParseError('JSON format hatası: ' + err.message);
      setPreviewData(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processJsonContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processJsonContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (previewData) {
      onImportProject({
        params: previewData.params,
        buildingModelParams: previewData.buildingModelParams,
        historyList: previewData.historyList,
      });
      onClose();
    }
  };

  const handleCopyClipboard = () => {
    const exportPayload = JSON.stringify(
      {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        params: currentParams,
        buildingModelParams: currentBuildingModelParams,
      },
      null,
      2
    );
    navigator.clipboard.writeText(exportPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sample templates for quick demo loading
  const SAMPLE_TEMPLATES = [
    {
      title: 'Standart Kentsel Dönüşüm Apartmanı',
      location: 'İstanbul, Kadıköy (5 Kat / 10 Daire)',
      badge: 'Sık Kullanılan',
      params: {
        ...currentParams,
        projectName: 'Kadıköy Huzur Apartmanı',
        projectAddress: 'İstanbul, Kadıköy Caferağa Mah. 124 Ada 5 Parsel',
        landArea: 420,
        baseBuildArea: 150,
        floorCount: 5,
        flatsPerFloor: 2,
        flatCount: 10,
        buildingType: 'standard',
        projectModel: 'contractorShare',
        contractorShareRate: 50,
        roofType: 'gable',
      },
    },
    {
      title: 'Zemin Dükkanlı & Çatı Dubleksli Yapı',
      location: 'İstanbul, Fatih (6 Kat / 1 Dükkan / 12 Daire)',
      badge: 'Ticari + Konut',
      params: {
        ...currentParams,
        projectName: 'Fatih Ticari Bloğu',
        projectAddress: 'İstanbul, Fatih Kocamustafapaşa Mah. 1024 Ada 15 Parsel',
        landArea: 380,
        baseBuildArea: 160,
        floorCount: 6,
        flatsPerFloor: 2,
        hasGroundFloorShop: true,
        shopCount: 1,
        roofType: 'duplex',
        buildingType: 'standard',
        projectModel: 'cash',
      },
    },
    {
      title: 'L-Tipi Köşe Parsel Projesi',
      location: 'İstanbul, Beşiktaş (4 Kat / Otoparklı)',
      badge: 'Köşe Parsel',
      params: {
        ...currentParams,
        projectName: 'Beşiktaş L-Tipi Yapı',
        projectAddress: 'İstanbul, Beşiktaş Ihlamurdere Cad. 88 Ada 12 Parsel',
        landArea: 500,
        footprintInputMode: 'lShape',
        lShapeFrontMain: 16,
        lShapeDepthMain: 20,
        lShapeRecessFront: 6,
        lShapeRecessDepth: 8,
        floorCount: 4,
        flatsPerFloor: 3,
        basementCount: 2,
        buildingType: 'luxury',
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isGray ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Proje İçe ve Dışa Aktarma</h3>
              <p className="text-xs text-slate-500">
                Proje verilerini yedekleyin, başka bir cihazdan aktarın veya şablon yükleyin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/80 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-2 bg-slate-100/80 border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileUp className="w-4 h-4 text-indigo-600" />
            <span>Projeyi İçe Aktar (Yükle)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>Projeyi Dışa Aktar (Kaydet)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Hazır Şablonlar</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/80 ring-4 ring-indigo-500/10'
                    : 'border-slate-300 bg-slate-50 hover:bg-indigo-50/40 hover:border-indigo-300'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    JSON Dosyasını Sürükleyip Bırakın veya Seçin
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bilgisayarınızdaki veya mobil cihazınızdaki <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">.json</code> uzantılı proje dosyasını yükleyin
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all pointer-events-none mt-1"
                >
                  Dosya Seç (.json)
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json"
                  className="hidden"
                />
              </div>

              {/* Paste JSON code option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Veya Ham JSON Kodunu Yapıştırın:</span>
                </label>
                <textarea
                  rows={3}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    if (e.target.value.trim()) processJsonContent(e.target.value);
                    else {
                      setPreviewData(null);
                      setParseError(null);
                    }
                  }}
                  placeholder='{"params": {"projectAddress": "...", "landArea": 400 ...}}'
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all"
                />
              </div>

              {/* Error Box */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">İçe Aktarma Hatası</span>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* Preview Card */}
              {previewData && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Okunan Proje Özeti (Onay Bekliyor)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      {new Date(previewData.savedAt || Date.now()).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Proje Adresi</span>
                      <span className="font-bold text-slate-800 truncate block" title={previewData.params.projectAddress}>
                        {previewData.params.projectAddress || 'Belirtilmedi'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Arsa Alanı</span>
                      <span className="font-bold text-slate-800">{previewData.params.landArea || 0} m²</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Kat Sayısı</span>
                      <span className="font-bold text-slate-800">{previewData.params.floorCount || 1} Kat</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Daire / Bölüm</span>
                      <span className="font-bold text-slate-800">{previewData.params.flatCount || 1} Bağımsız</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>Bu Projeyi Çalışma Alanına Yükle ve Çalıştır</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Aktarılacak Mevcut Proje</h4>
                    <p className="text-[11px] text-indigo-700">{currentParams.projectAddress || 'İsimsiz Proje'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">Arsa Alanı</span>
                    <span className="font-black text-slate-800 font-mono">{currentParams.landArea || 0} m²</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">Kat Sayısı</span>
                    <span className="font-black text-slate-800 font-mono">{currentParams.floorCount || 1} Kat</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">Daire Sayısı</span>
                    <span className="font-black text-slate-800 font-mono">{currentParams.flatCount || 1} Adet</span>
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onExportProject(false);
                    onClose();
                  }}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Sadece Bu Projeyi İndir (.json)</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Tüm parsel, mimari ve maliyet ölçülerini dosya olarak indirir.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onExportProject(true);
                    onClose();
                  }}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Geçmiş Kayıtlarla Birlikte İndir</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Mevcut proje + kayıtlı {historyList.length} geçmiş projeyi toplu indirir.
                    </span>
                  </div>
                </button>
              </div>

              {/* Copy JSON Code Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">JSON Kodu Panoya Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Proje JSON Kodunu Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Sıfırdan veri girmek yerine, hazır mimari tipolojiye sahip örnek bir projeyi tek tıkla yükleyebilirsiniz:
              </p>

              <div className="space-y-2.5">
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{tmpl.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 shrink-0">
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{tmpl.location}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onImportProject({ params: tmpl.params as ProjectParams });
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>Yükle</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            AB YAPI v2.0 • %100 Yerel Veri Güvenliği
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
