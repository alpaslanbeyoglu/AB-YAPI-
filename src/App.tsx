import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  FileText,
  FileSpreadsheet,
  ScrollText,
  BarChart3,
  History,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Share2,
  Box,
  Compass,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { DrivePanel } from './components/DrivePanel';
import { ConfirmModal } from './components/ConfirmModal';
import { CalculatorTab } from './components/CalculatorTab';
import { BuildingModelTab } from './components/BuildingModelTab';
import { FloorPlanTab } from './components/FloorPlanTab';
import { OfferTab } from './components/OfferTab';
import { ContractTab } from './components/ContractTab';
import { SpecificationTab } from './components/SpecificationTab';
import { AdminReportTab } from './components/AdminReportTab';
import { HistoryTab } from './components/HistoryTab';

import { DEFAULT_PARAMS, calculateProject } from './utils/calculatorEngine';
import { DEFAULT_BUILDING_PARAMS } from './utils/buildingModelUtils';
import { initAuth, setCachedToken } from './services/auth';
import { saveProjectJsonToDrive, deleteDriveFile } from './services/drive';
import {
  ProjectParams,
  CalculationResult,
  SavedProjectData,
  DriveProjectFile,
  BuildingModelParams,
} from './types';

export default function App() {
  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('ab_yapi_theme') as 'light' | 'dark') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  // Sync theme to root html element for clean Tailwind CSS light/dark modes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('ab_yapi_theme', next);
    } catch (e) {}
  };

  const isLight = theme === 'light';

  // Navigation
  const [activeTab, setActiveTab] = useState<
    'hesapla' | 'model' | 'katplani' | 'teklif' | 'sozlesme' | 'sartname' | 'raporlar' | 'gecmis'
  >('hesapla');
  const [isDrivePanelOpen, setIsDrivePanelOpen] = useState(false);

  // Project state
  const [params, setParams] = useState<ProjectParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_last_params');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PARAMS;
  });

  // Shared 3D & 2D Building Model Parameters
  const [buildingModelParams, setBuildingModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BUILDING_PARAMS;
  });

  const updateBuildingModelParams = (updates: Partial<BuildingModelParams>) => {
    setBuildingModelParams((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Sync 3D & 2D model metrics into main calculation engine
  const handleSyncModelToCalculator = (modelUpdates: Partial<ProjectParams>) => {
    setParams((prev) => ({
      ...prev,
      ...modelUpdates,
    }));
    showNotification(
      'success',
      '3D Model ve Kat Planı ölçüleri ana maliyet hesaplayıcısına başarıyla senkronize edildi.'
    );
  };

  // Calculation Results
  const results: CalculationResult = useMemo(() => {
    return calculateProject(params);
  }, [params]);

  // Auth & Drive
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete confirmation modal state
  const [fileToDelete, setFileToDelete] = useState<DriveProjectFile | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Local calculation history
  const [historyList, setHistoryList] = useState<SavedProjectData[]>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setHasToken(!!token);
      },
      () => {
        setUser(null);
        setHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save current params to local storage on changes
  useEffect(() => {
    try {
      localStorage.setItem('ab_yapi_last_params', JSON.stringify(params));
    } catch (e) {}
  }, [params]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Perform calculation and save snapshot to history
  const handleCalculate = () => {
    const newSnapshot: SavedProjectData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      projectAddress: params.projectAddress,
      params,
      results,
    };
    const updatedHistory = [newSnapshot, ...historyList.slice(0, 19)];
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updatedHistory));
    } catch (e) {}
    showNotification('success', 'Hesaplama tamamlandı ve tüm tablolar güncellendi!');
  };

  // Quick save to Google Drive from header button
  const handleQuickSave = async () => {
    if (!hasToken || !user) {
      setIsDrivePanelOpen(true);
      showNotification('error', 'Lütfen önce Google Drive hesabınızı bağlayın.');
      return;
    }

    setIsSavingToDrive(true);
    try {
      const payload: SavedProjectData = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        projectAddress: params.projectAddress,
        params,
        results,
      };
      const res = await saveProjectJsonToDrive(payload);
      showNotification('success', `"${res.name}" Google Drive'a başarıyla kaydedildi!`);
    } catch (err: any) {
      showNotification('error', err.message || 'Google Drive kaydı başarısız oldu.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Load project from history or Drive
  const handleLoadProject = (savedData: SavedProjectData) => {
    if (savedData && savedData.params) {
      setParams(savedData.params);
      showNotification('success', `"${savedData.projectAddress}" projesi başarıyla yüklendi.`);
      setActiveTab('hesapla');
    }
  };

  // Handle destructive file deletion in Google Drive with confirmation dialog
  const handleConfirmDeleteDriveFile = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      showNotification('success', `"${fileToDelete.name}" Google Drive'dan kalıcı olarak silindi.`);
      setFileToDelete(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Dosya silinemedi.');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleClearHistory = () => {
    setHistoryList([]);
    try {
      localStorage.removeItem('ab_yapi_history');
    } catch (e) {}
    showNotification('success', 'Hesaplama geçmişi temizlendi.');
  };

  return (
    <div
      className={`min-h-screen h-auto overflow-y-auto print:h-auto print:overflow-visible flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500/30 selection:text-indigo-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#09090b] text-[#fafafa]'
      }`}
    >
      {/* Top Header - print:hidden eklendi */}
      <div className="print:hidden">
        <Header
          user={user}
          hasToken={hasToken}
          isSavingToDrive={isSavingToDrive}
          onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
          onQuickSave={handleQuickSave}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Main Container - Kaydırma çubukları serbest bırakıldı ve yazdırma için p-0 m-0 verildi */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 print:p-0 print:m-0 print:max-w-none print:w-full print:pb-0 print:h-auto print:overflow-visible">
        {/* Toast Feedback */}
        {feedback && (
          <div
            className={`mb-5 p-4 rounded-2xl text-xs flex items-center justify-between border shadow-lg transition-all animate-fade-in print:hidden ${
              feedback.type === 'success'
                ? isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-[#121214] text-emerald-300 border-emerald-500/30'
                : isLight
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-[#121214] text-red-300 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                {feedback.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-base leading-none px-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Primary Desktop/Tablet Navigation Tabs */}
        <div
          className={`flex items-center gap-1.5 overflow-x-auto p-1.5 mb-6 rounded-2xl print:hidden scrollbar-none border shadow-sm transition-colors ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-100 text-slate-700'
              : 'bg-[#121214] border-zinc-800/80 shadow-black/20'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('hesapla')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'hesapla'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>1. Hesaplama Paneli</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('model')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'model'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. 3D Model 🏢</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('katplani')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'katplani'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. 2D Kat Planı 📐</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teklif')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'teklif'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>4. Teklif Çıktısı 📄</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sozlesme')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'sozlesme'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 text-blue-400" />
            <span>5. Resmi Sözleşme 📜</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sartname')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'sartname'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>6. Teknik Şartname 🏗️</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('raporlar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'raporlar'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            <span>7. Müteahhit Raporu 📊</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gecmis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'gecmis'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5 text-pink-400" />
            <span>8. Kayıtlar ({historyList.length})</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'hesapla' && (
          <CalculatorTab
            params={params}
            results={results}
            onChangeParams={setParams}
            onCalculate={handleCalculate}
            onNavigateToModel={() => setActiveTab('model')}
            theme={theme}
          />
        )}

        {activeTab === 'model' && (
          <BuildingModelTab
            params={buildingModelParams}
            onUpdateParams={updateBuildingModelParams}
            onSyncWithCalculator={handleSyncModelToCalculator}
            onNavigateToCalculator={() => setActiveTab('hesapla')}
            onNavigateToFloorPlan={() => setActiveTab('katplani')}
            theme={theme}
          />
        )}

        {activeTab === 'katplani' && (
          <FloorPlanTab
            params={buildingModelParams}
            onUpdateParams={updateBuildingModelParams}
            onSyncWithCalculator={handleSyncModelToCalculator}
            onNavigateToCalculator={() => setActiveTab('hesapla')}
            onNavigateToModel={() => setActiveTab('model')}
            theme={theme}
          />
        )}

        {activeTab === 'teklif' && (
          <OfferTab
            params={params}
            results={results}
            hasToken={hasToken}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            theme={theme}
          />
        )}

        {activeTab === 'sozlesme' && (
          <ContractTab
            params={params}
            results={results}
            hasToken={hasToken}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            theme={theme}
          />
        )}

        {activeTab === 'sartname' && (
          <SpecificationTab
            params={params}
            results={results}
            hasToken={hasToken}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            theme={theme}
          />
        )}

        {activeTab === 'raporlar' && (
          <AdminReportTab
            params={params}
            results={results}
            hasToken={hasToken}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            theme={theme}
          />
        )}

        {activeTab === 'gecmis' && (
          <HistoryTab
            historyList={historyList}
            onLoadItem={handleLoadProject}
            onClearHistory={handleClearHistory}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            hasDriveToken={hasToken}
            theme={theme}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-30 backdrop-blur-md border-t shadow-xl print:hidden transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200'
            : 'bg-[#09090b]/95 border-zinc-800/80 text-zinc-300'
        }`}
      >
        <div className="grid grid-cols-6 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('hesapla')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'hesapla'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span className="text-[9px] mt-1">Hesap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('model')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'model'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Box className="w-4 h-4" />
            <span className="text-[9px] mt-1">3D Model</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('katplani')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'katplani'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-[9px] mt-1">Kat Planı</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teklif')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'teklif'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[9px] mt-1">Teklif</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sozlesme')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'sozlesme'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span className="text-[9px] mt-1">Sözleşme</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDrivePanelOpen(true)}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              isLight
                ? 'text-slate-400 hover:text-indigo-600'
                : 'text-zinc-400 hover:text-indigo-400'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span className="text-[9px] mt-1 font-medium">Drive</span>
          </button>
        </div>
      </nav>

      {/* Google Drive Management Modal */}
      <DrivePanel
        isOpen={isDrivePanelOpen}
        onClose={() => setIsDrivePanelOpen(false)}
        user={user}
        hasToken={hasToken}
        params={params}
        results={results}
        onLoadProject={handleLoadProject}
        onRequestDeleteConfirm={(file) => setFileToDelete(file)}
        onAuthSuccess={(u, token) => {
          setUser(u);
          setHasToken(true);
          setCachedToken(token);
        }}
      />

      {/* Destructive Action Confirmation Modal for Drive Deletions */}
      <ConfirmModal
        isOpen={!!fileToDelete}
        title="Google Drive Dosyasını Sil"
        message={`"${fileToDelete?.name}" adlı dosya Google Drive'dan kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`}
        confirmLabel={isDeletingFile ? 'Siliniyor...' : 'Evet, Dosyayı Sil'}
        cancelLabel="Vazgeç"
        isDestructive={true}
        onConfirm={handleConfirmDeleteDriveFile}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  );
}
