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
  Smartphone,
  Monitor,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { LiteMobileView } from './components/LiteMobileView';
import { DrivePanel } from './components/DrivePanel';
import { ConfirmModal } from './components/ConfirmModal';
import { CalculatorTab } from './components/CalculatorTab';
import { ProjectSetupTab } from './components/ProjectSetupTab';
import { BuildingModelTab } from './components/BuildingModelTab';
import { FloorPlanTab } from './components/FloorPlanTab';
import { OfferTab } from './components/OfferTab';
import { ConstructionProgressTab } from './components/ConstructionProgressTab';
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
import { DEFAULT_TABS, TabConfig, TabId, TAB_CATEGORIES } from './config/tabs';


import { DEFAULT_PARAMS, calculateProject, synchronizeFlats, calculateFlatCount } from './utils/calculatorEngine';
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

  const [activeTab, setActiveTab] = useState<TabId>('kurulum');
  const [isMenuSettingsOpen, setIsMenuSettingsOpen] = useState(false);
  const [isDrivePanelOpen, setIsDrivePanelOpen] = useState(false);

  // App mode: 'full' (pro desktop) or 'lite' (fast mobile)
  const [appMode, setAppMode] = useState<'full' | 'lite'>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_mode');
      if (saved === 'lite' || saved === 'full') return saved as 'full' | 'lite';
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return 'lite';
      }
    } catch (e) {}
    return 'full';
  });

  const toggleAppMode = () => {
    const next = appMode === 'full' ? 'lite' : 'full';
    setAppMode(next);
    try {
      localStorage.setItem('ab_yapi_mode', next);
    } catch (e) {}
  };

  const handleSaveTabs = (newTabs: TabConfig[]) => {
    setTabsConfig(newTabs);
    try {
      localStorage.setItem('ab_yapi_tabs', JSON.stringify(newTabs));
    } catch (e) {}
  };

  const [params, setParams] = useState<ProjectParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_last_params');
      if (saved) {
        const parsed = JSON.parse(saved);
        const fc = parsed.floorCount || 5;
        const fpf = parsed.flatsPerFloor || 2;
        const hasShop = !!parsed.hasGroundFloorShop;
        const rf = hasShop ? Math.max(1, fc - 1) : fc;
        const normalFlats = rf * fpf;
        let fcCorrected = parsed.flatCount;
        if (!fcCorrected || fcCorrected <= 0 || (fcCorrected === fc && fpf > 1)) {
          fcCorrected = normalFlats;
        }
        return {
          ...DEFAULT_PARAMS,
          ...parsed,
          floorCount: fc,
          flatsPerFloor: fpf,
          flatCount: fcCorrected,
          roofType: parsed.roofType || 'gable',
          basementCount: parsed.basementCount !== undefined ? parsed.basementCount : 1,
        };
      }
    } catch (e) {}
    return DEFAULT_PARAMS;
  });

  const [buildingModelParams, setBuildingModelParams] = useState<BuildingModelParams>(() => {
    try {
      const saved = localStorage.getItem('ab_yapi_building_model');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_BUILDING_PARAMS,
          ...parsed,
          floorCount: params.floorCount,
          floorHeight: params.floorHeight || 2.90,
          flatsPerFloor: params.flatsPerFloor || 2,
          roomType: params.roomType || '3+1',
          roofType: params.roofType || 'gable',
          facadeStyle: params.facadeStyle || 'wood_anthracite',
          facadeWidth: params.facadeWidth || 14.0,
          facadeDepth: params.facadeDepth || 18.0,
          backFacadeLength: params.backFacadeLength !== undefined ? params.backFacadeLength : (params.facadeWidth || 14.0),
          leftFacadeLength: params.leftFacadeLength !== undefined ? params.leftFacadeLength : (params.facadeDepth || 18.0),
          baseBuildArea: params.baseBuildArea,
          basementCount: params.basementCount !== undefined ? params.basementCount : 1,
          elevatorCount: params.elevatorCount !== undefined ? params.elevatorCount : 1,
          balconyDepth: params.balconyDepth !== undefined ? params.balconyDepth : 1.4,
          hasGroundFloorShop: !!params.hasGroundFloorShop,
          shopCount: params.shopCount || 1,
          shopHeight: params.shopHeight || 3.8,
          flatCount: params.flatCount,
          hasCantilever: params.hasCantilever,
          cantileverDepth: params.cantileverDepth,
          cantileverDirection: params.cantileverDirection,
          footprintInputMode: params.footprintInputMode,
          customFacadeCount: params.customFacadeCount,
          customFacades: params.customFacades,
          lShapeFrontMain: params.lShapeFrontMain,
          lShapeDepthMain: params.lShapeDepthMain,
          lShapeRecessFront: params.lShapeRecessFront,
          lShapeRecessDepth: params.lShapeRecessDepth,
          polygonPoints: params.polygonPoints,
          facadeConfigs: params.facadeConfigs,
          mainEntranceFacadeIndex: params.mainEntranceFacadeIndex,
          contractorShareRate: params.contractorShareRate,
          contractorFlatIds: params.contractorFlatIds,
          showContractorShare3D: params.showContractorShare3D,
          projectModel: params.projectModel,
        };
      }
    } catch (e) {}
    return {
      ...DEFAULT_BUILDING_PARAMS,
      floorCount: params.floorCount,
      floorHeight: params.floorHeight || 2.90,
      flatsPerFloor: params.flatsPerFloor || 2,
      roomType: params.roomType || '3+1',
      roofType: params.roofType || 'gable',
      facadeStyle: params.facadeStyle || 'wood_anthracite',
      facadeWidth: params.facadeWidth || 14.0,
      facadeDepth: params.facadeDepth || 18.0,
      backFacadeLength: params.backFacadeLength !== undefined ? params.backFacadeLength : (params.facadeWidth || 14.0),
      leftFacadeLength: params.leftFacadeLength !== undefined ? params.leftFacadeLength : (params.facadeDepth || 18.0),
      baseBuildArea: params.baseBuildArea,
      basementCount: params.basementCount !== undefined ? params.basementCount : 1,
      elevatorCount: params.elevatorCount !== undefined ? params.elevatorCount : 1,
      balconyDepth: params.balconyDepth !== undefined ? params.balconyDepth : 1.4,
      hasGroundFloorShop: !!params.hasGroundFloorShop,
      shopCount: params.shopCount || 1,
      shopHeight: params.shopHeight || 3.8,
      flatCount: params.flatCount,
      hasCantilever: params.hasCantilever,
      cantileverDepth: params.cantileverDepth,
      cantileverDirection: params.cantileverDirection,
      footprintInputMode: params.footprintInputMode,
      customFacadeCount: params.customFacadeCount,
      customFacades: params.customFacades,
      lShapeFrontMain: params.lShapeFrontMain,
      lShapeDepthMain: params.lShapeDepthMain,
      lShapeRecessFront: params.lShapeRecessFront,
      lShapeRecessDepth: params.lShapeRecessDepth,
      polygonPoints: params.polygonPoints,
      facadeConfigs: params.facadeConfigs,
      mainEntranceFacadeIndex: params.mainEntranceFacadeIndex,
      contractorShareRate: params.contractorShareRate,
      contractorFlatIds: params.contractorFlatIds,
      showContractorShare3D: params.showContractorShare3D,
      projectModel: params.projectModel,
    };
  });

  // Keep Building Model and Calculator synchronized LIVE bidirectionally
  const updateCalculatorParams = (newParamsOrUpdates: ProjectParams | Partial<ProjectParams>) => {
    const newParams: ProjectParams = {
      ...params,
      ...newParamsOrUpdates,
    };
    // 1. Determine activeBaseArea: Keep user's explicit manual entry if provided (> 0)
    let activeBaseArea = newParams.baseBuildArea;
    if (!activeBaseArea || activeBaseArea <= 0) {
      const footprintResult = calculateFootprint(newParams.footprintInputMode, newParams);
      activeBaseArea = footprintResult.area;
    }

    const resFloors = newParams.hasGroundFloorShop
      ? Math.max(1, newParams.floorCount - 1)
      : newParams.floorCount;

    const roofType = newParams.roofType || 'gable';
    const isMansard = roofType === 'mansard';
    const isDuplex = roofType === 'duplex';
    const flatsPerFloor = newParams.flatsPerFloor || 2;
    const normalFloorFlats = resFloors * flatsPerFloor;

    // KURAL:
    // 1) Mansart çatı tek seçildiğinde çatı katında ekstra bağımsız bölüm(ler) oluşur ve hesaplara dahil edilir.
    // 2) Mansart çatı + dubleks seçilirse tek bağımsız bölüm olarak kabul edilir (ekstra daire eklenmez).
    const totalFlats = calculateFlatCount(newParams);

    const roofAtticArea = isDuplex
      ? Math.round(activeBaseArea * 0.65 * 100) / 100
      : isMansard
      ? Math.round(activeBaseArea * 0.70 * 100) / 100
      : 0;

    const synchronizedFlats = synchronizeFlats(
      newParams.flats,
      totalFlats,
      activeBaseArea,
      newParams.floorCount,
      newParams.transformationStatus,
      roofType,
      flatsPerFloor,
      newParams.mansardFlatCount,
      roofAtticArea,
      newParams.hasGroundFloorShop,
      newParams.shopCount || 1
    );

    const sanitizedContractorIds = (newParams.contractorFlatIds || []).filter(
      (id) => id <= totalFlats
    );

    const sanitizedParams: ProjectParams = {
      ...newParams,
      baseBuildArea: activeBaseArea,
      flatCount: totalFlats,
      flats: synchronizedFlats,
      contractorFlatIds: sanitizedContractorIds,
    };

    setParams(sanitizedParams);
    try {
      localStorage.setItem('ab_yapi_last_params', JSON.stringify(sanitizedParams));
    } catch (e) {}

    // Live Sync from Proje Künyesi / Hesap to Building Model:
    setBuildingModelParams((prevModel) => {
      let newW = sanitizedParams.facadeWidth || prevModel.facadeWidth;
      let newD = sanitizedParams.facadeDepth || prevModel.facadeDepth;
      let newBackW = sanitizedParams.backFacadeLength !== undefined ? sanitizedParams.backFacadeLength : (prevModel.backFacadeLength ?? newW);
      let newLeftD = sanitizedParams.leftFacadeLength !== undefined ? sanitizedParams.leftFacadeLength : (prevModel.leftFacadeLength ?? newD);

      const nextModel: BuildingModelParams = {
        ...prevModel,
        footprintInputMode: sanitizedParams.footprintInputMode || prevModel.footprintInputMode,
        facadeWidth: newW,
        facadeDepth: newD,
        backFacadeLength: newBackW,
        leftFacadeLength: newLeftD,
        baseBuildArea: sanitizedParams.baseBuildArea,
        customFacadeCount: sanitizedParams.customFacadeCount || prevModel.customFacadeCount,
        customFacades: sanitizedParams.customFacades || prevModel.customFacades,
        lShapeFrontMain: sanitizedParams.lShapeFrontMain || prevModel.lShapeFrontMain,
        lShapeDepthMain: sanitizedParams.lShapeDepthMain || prevModel.lShapeDepthMain,
        lShapeRecessFront: sanitizedParams.lShapeRecessFront || prevModel.lShapeRecessFront,
        lShapeRecessDepth: sanitizedParams.lShapeRecessDepth || prevModel.lShapeRecessDepth,
        floorCount: sanitizedParams.floorCount,
        floorHeight: sanitizedParams.floorHeight || prevModel.floorHeight || 2.90,
        elevatorCount: sanitizedParams.elevatorCount !== undefined ? sanitizedParams.elevatorCount : prevModel.elevatorCount,
        flatsPerFloor: sanitizedParams.flatsPerFloor || Math.max(1, Math.round(totalFlats / Math.max(1, resFloors))),
        hasGroundFloorShop: !!sanitizedParams.hasGroundFloorShop,
        shopCount: sanitizedParams.shopCount || 1,
        shopHeight: sanitizedParams.shopHeight || 3.8,
        contractorFlatIds: sanitizedParams.contractorFlatIds,
        showContractorShare3D: sanitizedParams.showContractorShare3D,
        contractorShareRate: sanitizedParams.contractorShareRate,
        projectModel: sanitizedParams.projectModel,
        flatCount: totalFlats,
        roomType: sanitizedParams.roomType || prevModel.roomType,
        hasCantilever: sanitizedParams.hasCantilever,
        cantileverDepth: sanitizedParams.cantileverDepth,
        cantileverDirection: sanitizedParams.cantileverDirection,
        roofType: sanitizedParams.roofType || prevModel.roofType,
        basementCount: sanitizedParams.basementCount !== undefined ? sanitizedParams.basementCount : prevModel.basementCount,
        facadeStyle: sanitizedParams.facadeStyle || prevModel.facadeStyle,
        balconyDepth: sanitizedParams.balconyDepth !== undefined ? sanitizedParams.balconyDepth : prevModel.balconyDepth,
        polygonPoints: sanitizedParams.polygonPoints || prevModel.polygonPoints,
        facadeConfigs: sanitizedParams.facadeConfigs || prevModel.facadeConfigs,
        mainEntranceFacadeIndex: sanitizedParams.mainEntranceFacadeIndex !== undefined ? sanitizedParams.mainEntranceFacadeIndex : prevModel.mainEntranceFacadeIndex,
      };

      try {
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(nextModel));
      } catch (e) {}
      return nextModel;
    });
  };

  // Live Sync from Building Model to Calculator: Synchronize all shared/matching data instantly
  const updateBuildingModelParams = (updates: Partial<BuildingModelParams>) => {
    // 1. Update 3D Building Model state
    setBuildingModelParams((prevModel) => {
      const nextModel: BuildingModelParams = { ...prevModel, ...updates };
      try {
        localStorage.setItem('ab_yapi_building_model', JSON.stringify(nextModel));
      } catch (e) {}
      return nextModel;
    });

    // 2. Synchronize all matching parameters live to Calculator (ProjectParams)
    setParams((prev) => {
      const mergedForFootprint: ProjectParams = {
        ...prev,
        footprintInputMode: updates.footprintInputMode !== undefined ? updates.footprintInputMode : prev.footprintInputMode,
        facadeWidth: updates.facadeWidth !== undefined ? updates.facadeWidth : prev.facadeWidth,
        facadeDepth: updates.facadeDepth !== undefined ? updates.facadeDepth : prev.facadeDepth,
        backFacadeLength: updates.backFacadeLength !== undefined ? updates.backFacadeLength : prev.backFacadeLength,
        leftFacadeLength: updates.leftFacadeLength !== undefined ? updates.leftFacadeLength : prev.leftFacadeLength,
        customFacadeCount: updates.customFacadeCount !== undefined ? updates.customFacadeCount : prev.customFacadeCount,
        customFacades: updates.customFacades !== undefined ? updates.customFacades : prev.customFacades,
        lShapeFrontMain: updates.lShapeFrontMain !== undefined ? updates.lShapeFrontMain : prev.lShapeFrontMain,
        lShapeDepthMain: updates.lShapeDepthMain !== undefined ? updates.lShapeDepthMain : prev.lShapeDepthMain,
        lShapeRecessFront: updates.lShapeRecessFront !== undefined ? updates.lShapeRecessFront : prev.lShapeRecessFront,
        lShapeRecessDepth: updates.lShapeRecessDepth !== undefined ? updates.lShapeRecessDepth : prev.lShapeRecessDepth,
        polygonPoints: updates.polygonPoints !== undefined ? updates.polygonPoints : prev.polygonPoints,
      };

      let activeBaseArea = prev.baseBuildArea;
      if (updates.baseBuildArea !== undefined && updates.baseBuildArea > 0) {
        activeBaseArea = updates.baseBuildArea;
      } else if (
        updates.facadeWidth !== undefined ||
        updates.facadeDepth !== undefined ||
        updates.customFacades !== undefined ||
        updates.lShapeFrontMain !== undefined ||
        updates.lShapeDepthMain !== undefined ||
        updates.lShapeRecessFront !== undefined ||
        updates.lShapeRecessDepth !== undefined ||
        updates.polygonPoints !== undefined
      ) {
        const footprintResult = calculateFootprint(mergedForFootprint.footprintInputMode, mergedForFootprint);
        activeBaseArea = footprintResult.area;
      }

      const nextFloorCount = updates.floorCount !== undefined ? updates.floorCount : prev.floorCount;
      const nextFlatsPerFloor = updates.flatsPerFloor !== undefined ? updates.flatsPerFloor : (prev.flatsPerFloor || 2);
      const nextHasShop = updates.hasGroundFloorShop !== undefined ? updates.hasGroundFloorShop : (prev.hasGroundFloorShop || false);

      const resFloors = nextHasShop ? Math.max(1, nextFloorCount - 1) : nextFloorCount;

      const roofType = updates.roofType !== undefined ? updates.roofType : (prev.roofType || 'gable');
      const isMansard = roofType === 'mansard';
      const isDuplex = roofType === 'duplex';
      const extraMansardFlats = isMansard
        ? (updates.mansardFlatCount && updates.mansardFlatCount > 0
            ? updates.mansardFlatCount
            : prev.mansardFlatCount && prev.mansardFlatCount > 0
            ? prev.mansardFlatCount
            : Math.max(1, nextFlatsPerFloor))
        : 0;

      let nextFlatCount = Math.max(1, resFloors * nextFlatsPerFloor + extraMansardFlats);
      if (
        updates.flatCount !== undefined &&
        updates.flatCount > 0 &&
        updates.floorCount === undefined &&
        updates.flatsPerFloor === undefined &&
        updates.hasGroundFloorShop === undefined &&
        updates.roofType === undefined &&
        updates.mansardFlatCount === undefined
      ) {
        nextFlatCount = updates.flatCount;
      }

      const roofAtticArea = isDuplex
        ? Math.round(activeBaseArea * 0.65 * 100) / 100
        : isMansard
        ? Math.round(activeBaseArea * 0.70 * 100) / 100
        : 0;

      const synchronizedFlats = synchronizeFlats(
        prev.flats,
        nextFlatCount,
        activeBaseArea,
        nextFloorCount,
        prev.transformationStatus,
        roofType,
        nextFlatsPerFloor,
        updates.mansardFlatCount || prev.mansardFlatCount,
        roofAtticArea
      );

      const sanitizedContractorIds = (updates.contractorFlatIds ?? prev.contractorFlatIds ?? []).filter(
        (id) => id <= nextFlatCount
      );

      const nextParams: ProjectParams = {
        ...prev,
        ...updates,
        baseBuildArea: activeBaseArea,
        floorCount: nextFloorCount,
        flatCount: nextFlatCount,
        flatsPerFloor: nextFlatsPerFloor,
        flats: synchronizedFlats,
        contractorFlatIds: sanitizedContractorIds,
      };

      try {
        localStorage.setItem('ab_yapi_last_params', JSON.stringify(nextParams));
      } catch (e) {}
      return nextParams;
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

  const handleExportJson = () => {
    const data = JSON.stringify({ params, buildingModelParams });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proje_${params.projectAddress?.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Proje başarıyla dışa aktarıldı (JSON).');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.params) {
          setParams(data.params);
          if (data.buildingModelParams) setBuildingModelParams(data.buildingModelParams);
          showNotification('success', 'Proje başarıyla yüklendi.');
          setActiveTab('hesapla');
        } else {
          throw new Error('Geçersiz dosya formatı.');
        }
      } catch (err: any) {
        showNotification('error', 'Dosya okunamadı: ' + err.message);
      }
    };
    reader.readAsText(file);
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

  // Group tabs by category
  const categorizedTabs = TAB_CATEGORIES.map(cat => ({
    ...cat,
    tabs: tabsConfig.filter(t => t.category === cat.id && t.visible).sort((a, b) => a.order - b.order)
  }));

  // If mobile Lite mode is active, render the dedicated LiteMobileView
  if (appMode === 'lite') {
    return (
      <LiteMobileView
        params={params}
        results={results}
        onChangeParams={updateCalculatorParams}
        onSwitchToFull={() => {
          setAppMode('full');
          try {
            localStorage.setItem('ab_yapi_mode', 'full');
          } catch (e) {}
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        onQuickSave={handleQuickSave}
        isSavingToDrive={isSavingToDrive}
      />
    );
  }

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
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigateToCompletedProjects={() => setActiveTab('tamamlanan')}
          appMode={appMode}
          onToggleAppMode={toggleAppMode}
        />
      </div>

      {/* Top Menu Bar (Categorized & Sticky) */}
      <div className={`sticky top-[64px] z-20 border-b shadow-sm transition-colors print:hidden ${
        isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar">
          {categorizedTabs.map((cat, catIdx) => (
            <div key={cat.id} className="flex items-center gap-1 shrink-0">
              {catIdx > 0 && <div className="w-[1px] h-4 bg-slate-300 mx-1" />}
              <div className={`flex flex-col gap-0.5 ${catIdx === 0 ? '' : 'ml-1'}`}>
                <span className="text-[8px] uppercase tracking-tighter font-bold text-slate-400 px-1">{cat.label}</span>
                <div className="flex items-center gap-1.5">
                  {cat.tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                            : isGray
                            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                        <span>{tab.shortLabel}</span>
                        {tab.id === 'gecmis' && (
                          <span className={`ml-0.5 text-[9px] px-1.5 rounded-full font-bold ${
                            isActive ? 'bg-indigo-500 text-white' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {historyList.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Quick Mobile Lite Mode Switch Button */}
          <button
            type="button"
            onClick={toggleAppMode}
            title="Mobil Lite Sürüme Geç"
            className={`self-end mb-0.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border cursor-pointer active:scale-95 ${
              isGray
                ? 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200 shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-xs'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Mobil Lite</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuSettingsOpen(true)}
            title="Menü Ayarları"
            className={`ml-auto self-end mb-0.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              isGray
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Menü</span>
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
        {activeTab === 'kurulum' && (
          <ProjectSetupTab
            params={params}
            onChangeParams={updateCalculatorParams}
            onNext={() => setActiveTab('hesapla')}
            onNavigateToModel={() => setActiveTab('model')}
            onNavigateToOwners={() => setActiveTab('malikler')}
            theme={theme}
          />
        )}

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
            onUpdateParam={(key, val) => updateCalculatorParams({ ...params, [key]: val })}
            onNavigateToSurec={() => setActiveTab('surec')}
            theme={theme}
          />
        )}

        {activeTab === 'surec' && (
          <ConstructionProgressTab
            params={params}
            results={results}
            theme={theme}
            onNavigateToOffer={() => setActiveTab('teklif')}
            onNavigateToContract={() => setActiveTab('sozlesme')}
          />
        )}

        {activeTab === 'sozlesme' && (
          <ContractTab
            params={params}
            results={results}
            hasToken={hasToken}
            onOpenDrivePanel={() => setIsDrivePanelOpen(true)}
            onUpdateParam={(key, val) => updateCalculatorParams({ ...params, [key]: val })}
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
