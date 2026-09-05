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
  Building,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  Settings2,
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
import { CompanyProfileTab } from './components/CompanyProfileTab';
import { CostDetailsTab } from './components/CostDetailsTab';
import { OwnersTab } from './components/OwnersTab';
import { CompletedProjectsTab } from './components/CompletedProjectsTab';
import { TabNavigation } from './components/TabNavigation';
import { MenuSettingsModal } from './components/MenuSettingsModal';
import { DEFAULT_TABS, TabConfig, TabId } from './config/tabs';


import { DEFAULT_PARAMS, calculateProject, synchronizeFlats } from './utils/calculatorEngine';
import { DEFAULT_BUILDING_PARAMS } from './utils/buildingModelUtils';
import { calculateFootprint } from './utils/footprintUtils';
import { initAuth, setCachedToken } from './services/auth';
import { saveProjectJsonToDrive, deleteDriveFile } from './services/drive';
import {
  ProjectParams,
  CalculationResult,
  SavedProjectData,
  DriveProjectFile,
  BuildingModelParams,
  AppTheme,
} from './types';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_theme');
      if (saved === 'gray' || saved === 'light') return saved as AppTheme;
    } catch (e) {}
    return 'light';
  });

  useEffect(() => {
    // Remove dark mode class completely - only light and gray
    document.documentElement.classList.remove('dark');
    if (theme === 'gray') {
      document.documentElement.classList.add('theme-gray');
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-gray');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next: AppTheme = theme === 'light' ? 'gray' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('ab_yapi_theme', next);
    } catch (e) {}
  };

  const isLight = theme === 'light';
  const isGray = theme === 'gray';

  const [tabsConfig, setTabsConfig] = useState<TabConfig[]>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_tabs');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TabConfig>[];
        // Restore icon references from DEFAULT_TABS
        return DEFAULT_TABS.map(defaultTab => {
          const savedTab = parsed.find(t => t.id === defaultTab.id);
          return savedTab ? { ...defaultTab, visible: savedTab.visible ?? defaultTab.visible, order: savedTab.order ?? defaultTab.order } : defaultTab;
        });
      }
    } catch (e) {}
    return DEFAULT_TABS;
  });

  const [activeTab, setActiveTab] = useState<TabId>('hesapla');
  const [isMenuSettingsOpen, setIsMenuSettingsOpen] = useState(false);
  const [isDrivePanelOpen, setIsDrivePanelOpen] = useState(false);

  const handleSaveTabs = (newTabs: TabConfig[]) => {
    setTabsConfig(newTabs);
    try {
      localStorage.setItem('ab_yapi_tabs', JSON.stringify(newTabs));
    } catch (e) {}
  };

  const [buildingModelParams, setBuildingModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) {
        return { ...DEFAULT_BUILDING_PARAMS, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return DEFAULT_BUILDING_PARAMS;
  });

  const [params, setParams] = useState<ProjectParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_last_params');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PARAMS,
          ...parsed,
          roofType: parsed.roofType || 'gable',
          basementCount: parsed.basementCount !== undefined ? parsed.basementCount : 1,
        };
      }
    } catch (e) {}
    return DEFAULT_PARAMS;
  });

  // Keep Building Model and Calculator synchronized bidirectionally
  const updateCalculatorParams = (newParams: ProjectParams) => {
    setParams(newParams);
    try {
      localStorage.setItem('ab_yapi_last_params', JSON.stringify(newParams));
    } catch (e) {}

    // Live Sync to Building Model:
    setBuildingModelParams((prevModel) => {
      let newW = newParams.facadeWidth || prevModel.facadeWidth;
      let newD = newParams.facadeDepth || prevModel.facadeDepth;
      
      // If directArea mode and no explicit facadeWidth given, derive proportional W and D
      if (newParams.footprintInputMode === 'directArea' && newParams.baseBuildArea && newParams.baseBuildArea > 0) {
        const ratio = prevModel.facadeWidth / (prevModel.facadeDepth || 1);
        const validRatio = ratio > 0.3 && ratio < 3.0 ? ratio : 14 / 18;
        newD = Math.round(Math.sqrt(newParams.baseBuildArea / validRatio) * 10) / 10;
        newW = Math.round((newParams.baseBuildArea / newD) * 10) / 10;
      }

      const resFloors = newParams.hasGroundFloorShop
        ? Math.max(1, newParams.floorCount - 1)
        : newParams.floorCount;
      const calcFlatsPerFloor = Math.max(
        1,
        Math.min(4, Math.round(newParams.flatCount / Math.max(1, resFloors)))
      );

      const nextModel: BuildingModelParams = {
        ...prevModel,
        footprintInputMode: newParams.footprintInputMode || prevModel.footprintInputMode,
        facadeWidth: newW,
        facadeDepth: newD,
        customFacadeCount: newParams.customFacadeCount || prevModel.customFacadeCount,
        customFacades: newParams.customFacades || prevModel.customFacades,
        lShapeFrontMain: newParams.lShapeFrontMain || prevModel.lShapeFrontMain,
        lShapeDepthMain: newParams.lShapeDepthMain || prevModel.lShapeDepthMain,
        lShapeRecessFront: newParams.lShapeRecessFront || prevModel.lShapeRecessFront,
        lShapeRecessDepth: newParams.lShapeRecessDepth || prevModel.lShapeRecessDepth,
        floorCount: newParams.floorCount,
        flatsPerFloor: newParams.flatsPerFloor || calcFlatsPerFloor,
        hasGroundFloorShop: !!newParams.hasGroundFloorShop,
        shopCount: newParams.shopCount || 1,
        shopHeight: newParams.shopHeight || 3.8,
        contractorFlatIds: newParams.contractorFlatIds,
        showContractorShare3D: newParams.showContractorShare3D,
        contractorShareRate: newParams.contractorShareRate,
        projectModel: newParams.projectModel,
        flatCount: newParams.flatCount,
        roomType: newParams.roomType || prevModel.roomType,
        hasCantilever: newParams.hasCantilever,
        cantileverDepth: newParams.cantileverDepth,
        cantileverDirection: newParams.cantileverDirection,
        roofType: newParams.roofType || prevModel.roofType,
        basementCount: newParams.basementCount !== undefined ? newParams.basementCount : prevModel.basementCount,
        facadeStyle: newParams.facadeStyle || prevModel.facadeStyle,
        balconyDepth: newParams.balconyDepth !== undefined ? newParams.balconyDepth : prevModel.balconyDepth,
        polygonPoints: newParams.polygonPoints || prevModel.polygonPoints,
        facadeConfigs: newParams.facadeConfigs || prevModel.facadeConfigs,
        mainEntranceFacadeIndex: newParams.mainEntranceFacadeIndex !== undefined ? newParams.mainEntranceFacadeIndex : prevModel.mainEntranceFacadeIndex,
      };

      try {
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(nextModel));
      } catch (e) {}
      return nextModel;
    });
  };

  const updateBuildingModelParams = (updates: Partial<BuildingModelParams>) => {
    setBuildingModelParams((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(next));
      } catch (e) {}

      // Live Sync to Calculator:
      setParams((prevCalc) => {
        const footprintResult = calculateFootprint(next.footprintInputMode, next);
        const area = footprintResult.area;
        const resFloors = next.hasGroundFloorShop
          ? Math.max(1, next.floorCount - 1)
          : next.floorCount;
        const totalFlats = resFloors * next.flatsPerFloor;

        const synchronizedFlats = synchronizeFlats(
          prevCalc.flats,
          totalFlats,
          area,
          next.floorCount,
          prevCalc.transformationStatus
        );

        // Keep contractor IDs valid
        const contractorFlatIds = (prevCalc.contractorFlatIds || []).filter(
          (id) => id <= totalFlats
        );

        const nextCalc: ProjectParams = {
          ...prevCalc,
          baseBuildArea: area,
          footprintInputMode: next.footprintInputMode || prevCalc.footprintInputMode,
          floorCount: next.floorCount,
          flatCount: totalFlats,
          flats: synchronizedFlats,
          roomType: next.roomType,
          contractorFlatIds: next.contractorFlatIds !== undefined ? next.contractorFlatIds : contractorFlatIds,
          showContractorShare3D: next.showContractorShare3D !== undefined ? next.showContractorShare3D : prevCalc.showContractorShare3D,
          contractorShareRate: next.contractorShareRate !== undefined ? next.contractorShareRate : prevCalc.contractorShareRate,
          projectModel: next.projectModel !== undefined ? next.projectModel : prevCalc.projectModel,
          hasGroundFloorShop: !!next.hasGroundFloorShop,
          shopCount: next.shopCount || 1,
          shopHeight: next.shopHeight || 3.8,
          hasCantilever: next.hasCantilever !== undefined ? next.hasCantilever : prevCalc.hasCantilever,
          cantileverDepth: next.cantileverDepth !== undefined ? next.cantileverDepth : prevCalc.cantileverDepth,
          cantileverDirection: next.cantileverDirection !== undefined ? next.cantileverDirection : prevCalc.cantileverDirection,
          roofType: next.roofType,
          basementCount: next.basementCount,
          facadeWidth: next.facadeWidth,
          facadeDepth: next.facadeDepth,
          customFacadeCount: next.customFacadeCount || prevCalc.customFacadeCount,
          customFacades: next.customFacades || prevCalc.customFacades,
          lShapeFrontMain: next.lShapeFrontMain || prevCalc.lShapeFrontMain,
          lShapeDepthMain: next.lShapeDepthMain || prevCalc.lShapeDepthMain,
          lShapeRecessFront: next.lShapeRecessFront || prevCalc.lShapeRecessFront,
          lShapeRecessDepth: next.lShapeRecessDepth || prevCalc.lShapeRecessDepth,
          flatsPerFloor: next.flatsPerFloor,
          facadeStyle: next.facadeStyle,
          balconyDepth: next.balconyDepth,
          polygonPoints: next.polygonPoints !== undefined ? next.polygonPoints : prevCalc.polygonPoints,
          facadeConfigs: next.facadeConfigs !== undefined ? next.facadeConfigs : prevCalc.facadeConfigs,
          mainEntranceFacadeIndex: next.mainEntranceFacadeIndex !== undefined ? next.mainEntranceFacadeIndex : prevCalc.mainEntranceFacadeIndex,
        };

        try {
          localStorage.setItem('ab_yapi_last_params', JSON.stringify(nextCalc));
        } catch (e) {}
        return nextCalc;
      });

      return next;
    });
  };

  const handleSyncModelToCalculator = (modelUpdates: Partial<ProjectParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...modelUpdates };
      
      const prevCount = prev.flatCount;
      const nextCount = next.flatCount;
      
      if (nextCount !== prevCount || next.baseBuildArea !== prev.baseBuildArea || next.floorCount !== prev.floorCount) {
        next.flats = synchronizeFlats(
          next.flats || prev.flats,
          nextCount,
          next.baseBuildArea,
          next.floorCount,
          next.transformationStatus
        );
        // Keep contractor IDs valid
        next.contractorFlatIds = (next.contractorFlatIds || prev.contractorFlatIds || []).filter(
          (id) => id <= nextCount
        );
      }

      try {
        localStorage.setItem('ab_yapi_last_params', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showNotification(
      'success',
      '3D Model, Kat Planı ve Hesaplama Paneli ölçüleri anlık olarak senkronize edildi.'
    );
  };

  const results: CalculationResult = useMemo(() => {
    return calculateProject(params);
  }, [params]);

  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [fileToDelete, setFileToDelete] = useState<DriveProjectFile | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const [historyList, setHistoryList] = useState<SavedProjectData[]>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

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

  const handleLoadProject = (savedData: SavedProjectData) => {
    if (savedData && savedData.params) {
      setParams(savedData.params);
      showNotification('success', `"${savedData.projectAddress}" projesi başarıyla yüklendi.`);
      setActiveTab('hesapla');
    }
  };

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

  const handleDeleteHistoryItem = (index: number) => {
    const updated = historyList.filter((_, idx) => idx !== index);
    setHistoryList(updated);
    try {
      localStorage.setItem('ab_yapi_history', JSON.stringify(updated));
    } catch (e) {}
    showNotification('success', 'Seçilen proje kaydı başarıyla silindi.');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500/30 selection:text-indigo-800 ${
        isGray ? 'bg-slate-200/80 text-slate-900' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="sticky top-0 z-30 print:hidden">
        <Header
          user={user}
          hasToken={hasToken}
          isSavingToDrive={isSavingToDrive}
          onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
          onQuickSave={handleQuickSave}
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigateToCompletedProjects={() => setActiveTab('tamamlanan')}
        />
      </div>

      {/* Top Menu Bar (Sticky) */}
      <div className={`sticky top-[64px] z-20 border-b shadow-sm transition-colors print:hidden ${
        isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabsConfig.filter(t => t.visible).sort((a, b) => a.order - b.order).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : isGray
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : ''}`} />
                <span>{tab.shortLabel}</span>
                {tab.id === 'gecmis' && (
                  <span className={`ml-1 text-[9px] px-1.5 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-pink-100 text-pink-800'
                  }`}>
                    {historyList.length}
                  </span>
                )}
              </button>
            )
          })}
          
          <button
            type="button"
            onClick={() => setIsMenuSettingsOpen(true)}
            title="Menü Ayarları"
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              isGray
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ayarlar</span>
          </button>
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 pb-12 print:p-0 print:m-0 print:max-w-none print:w-full print:pb-0 flex flex-col gap-6">
        {/* Tab Views */}
        <div className="flex-1 w-full min-w-0">
          {feedback && (
            <div
              className={`mb-5 p-4 rounded-2xl text-xs flex items-center justify-between border shadow-sm transition-all animate-fade-in print:hidden ${
                feedback.type === 'success'
                  ? isGray
                    ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : isGray
                  ? 'bg-red-100/90 text-red-900 border-red-300'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold text-slate-800">
                  {feedback.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700 text-base leading-none px-1"
              >
                &times;
              </button>
            </div>
          )}

        {/* Tab Views */}
        {activeTab === 'hesapla' && (
          <CalculatorTab
            params={params}
            results={results}
            onChangeParams={updateCalculatorParams}
            onCalculate={handleCalculate}
            onNavigateToModel={() => setActiveTab('model')}
            onNavigateToCostDetails={() => setActiveTab('maliyet')}
            onNavigateToOwners={() => setActiveTab('malikler')}
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

        {activeTab === 'maliyet' && (
          <CostDetailsTab
            params={params}
            results={results}
            theme={theme}
            onChangeParams={updateCalculatorParams}
            onCalculate={handleCalculate}
          />
        )}

        {activeTab === 'malikler' && (
          <OwnersTab
            params={params}
            results={results}
            onChangeParams={updateCalculatorParams}
            onCalculate={handleCalculate}
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

        {activeTab === 'profile' && (
          <CompanyProfileTab
            theme={theme}
          />
        )}

        {activeTab === 'tamamlanan' && (
          <CompletedProjectsTab
            theme={theme}
          />
        )}

        {activeTab === 'gecmis' && (
          <HistoryTab
            historyList={historyList}
            onLoadItem={handleLoadProject}
            onClearHistory={handleClearHistory}
            onDeleteItem={handleDeleteHistoryItem}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            hasDriveToken={hasToken}
            theme={theme}
          />
        )}
        
          <TabNavigation
            activeTab={activeTab}
            tabs={tabsConfig}
            onNavigate={setActiveTab}
            theme={theme}
          />
        </div>
      </main>

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
      <MenuSettingsModal
        isOpen={isMenuSettingsOpen}
        onClose={() => setIsMenuSettingsOpen(false)}
        tabs={tabsConfig}
        onSave={handleSaveTabs}
        theme={theme}
      />

    </div>
  );
}
