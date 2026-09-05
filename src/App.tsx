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

import { DEFAULT_PARAMS, calculateProject, synchronizeFlats } from './utils/calculatorEngine';
import { DEFAULT_BUILDING_PARAMS } from './utils/buildingModelUtils';
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

  const [activeTab, setActiveTab] = useState<
    'hesapla' | 'model' | 'katplani' | 'maliyet' | 'malikler' | 'teklif' | 'sozlesme' | 'sartname' | 'raporlar' | 'gecmis' | 'profile' | 'tamamlanan'
  >('hesapla');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrivePanelOpen, setIsDrivePanelOpen] = useState(false);

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
        facadeWidth: newParams.facadeWidth || newW,
        facadeDepth: newParams.facadeDepth || newD,
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
        const area = Math.round(next.facadeWidth * next.facadeDepth * 10) / 10;
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
      <div className="print:hidden">
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

      {/* pb-36 eklendi: Alt taraftaki kartlar sabit menünün arkasında kalmayıp tam kayacak */}
      <main className="flex-1 w-full mx-auto p-4 sm:p-6 pb-36 print:p-0 print:m-0 print:max-w-none print:w-full print:pb-0 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className={`w-full ${isSidebarOpen ? 'md:w-64' : 'md:w-20'} flex-shrink-0 print:hidden transition-all duration-300 ease-in-out`}>
          <div
            className={`flex flex-col gap-1.5 p-3 rounded-2xl border shadow-sm transition-colors ${
              isGray
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Collapse Toggle Header */}
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} px-1 mb-2 border-b pb-2 ${isGray ? 'border-slate-200' : 'border-slate-100'}`}>
              {isSidebarOpen && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Menü</span>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors text-slate-500 flex items-center justify-center`}
                title={isSidebarOpen ? "Menüyü Daralt" : "Menüyü Genişlet"}
              >
                {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('hesapla')}
              title="1. Hesaplama Paneli"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'hesapla'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span>1. Hesaplama Paneli</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('model')}
              title="2. 3D Model"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'model'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Box className="w-4 h-4 text-indigo-500 shrink-0" />
              {isSidebarOpen && <span>2. 3D Model 🏢</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('katplani')}
              title="3. 2D Kat Planı"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'katplani'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
              {isSidebarOpen && <span>3. 2D Kat Planı 📐</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('maliyet')}
              title="4. Maliyet Detayları"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'maliyet'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
              {isSidebarOpen && <span>4. Maliyet Detayları 📊</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('malikler')}
              title="5. Kat Malikleri & Ödemeler"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'malikler'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-500 shrink-0" />
              {isSidebarOpen && <span>5. Kat Malikleri & Ödemeler 👥</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teklif')}
              title="6. Teklif Çıktısı"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'teklif'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
              {isSidebarOpen && <span>6. Teklif Çıktısı 📄</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sozlesme')}
              title="7. Resmi Sözleşme"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'sozlesme'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ScrollText className="w-4 h-4 text-blue-600 shrink-0" />
              {isSidebarOpen && <span>7. Resmi Sözleşme 📜</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sartname')}
              title="8. Teknik Şartname"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'sartname'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
              {isSidebarOpen && <span>8. Teknik Şartname 🏗️</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('raporlar')}
              title="9. Müteahhit Raporu"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'raporlar'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-600 shrink-0" />
              {isSidebarOpen && <span>9. Müteahhit Raporu 📈</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              title="10. Firma Profili"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building className="w-4 h-4 text-indigo-600 shrink-0" />
              {isSidebarOpen && <span>10. Firma Profili 🏢</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tamamlanan')}
              title="11. Tamamlanan Projeler"
              className={`flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'tamamlanan'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {isSidebarOpen && <span>11. Tamamlanan Projeler 🏆</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gecmis')}
              title={`12. Kayıtlar (${historyList.length})`}
              className={`relative flex items-center ${isSidebarOpen ? 'gap-2 px-3.5' : 'justify-center p-2'} py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'gecmis'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isGray
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4 text-pink-600 shrink-0" />
              {isSidebarOpen ? (
                <span>12. Kayıtlar ({historyList.length})</span>
              ) : (
                <span className="absolute top-1 right-1 bg-pink-100 text-pink-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {historyList.length}
                </span>
              )}
            </button>
          </div>
        </div>

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
        </div>
      </main>

      {/* Sadece Mobilde Görünmesini Sağlamak İçin md:hidden Eklendi */}
      <nav
        className={`fixed bottom-0 inset-x-0 z-30 backdrop-blur-md border-t shadow-xl print:hidden transition-colors md:hidden ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200'
            : 'bg-[#09090b]/95 border-zinc-800/80 text-zinc-300'
        }`}
      >
        <div className="grid grid-cols-8 max-w-xl mx-auto">
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
            onClick={() => setActiveTab('maliyet')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'maliyet'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] mt-1">Maliyet</span>
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
            onClick={() => setActiveTab('malikler')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'malikler'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[9px] mt-1">Malikler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tamamlanan')}
            className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
              activeTab === 'tamamlanan'
                ? isLight
                  ? 'text-indigo-600 font-semibold'
                  : 'text-indigo-400 font-semibold'
                : isLight
                ? 'text-slate-400 hover:text-slate-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-[9px] mt-1">Projeler</span>
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
    </div>
  );
}
