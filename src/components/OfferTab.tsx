import React, { useState, useRef } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Cloud, 
  Award, 
  Scale, 
  Phone, 
  Mail, 
  MapPin, 
  Hash, 
  UserCheck, 
  Briefcase, 
  FileSignature, 
  Check, 
  Layers, 
  Sparkles,
  HelpCircle,
  Landmark,
  BadgePercent,
  TrendingUp,
  Receipt,
  Upload,
  Trash2,
  Image,
  Plus,
  Heart,
  Home,
  Leaf,
  Info,
  Car,
  Flame,
  Droplets,
  Wind,
  Bath,
  Sliders,
  Settings2,
  Fan,
  ChefHat,
  Lock,
  Calculator,
  DollarSign,
  ArrowRight,
  Coins,
  Percent,
  ChevronRight,
  Minus,
  Store,
  X,
} from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { getAcOptionById } from '../utils/acOptions';
import { generateOfferHtml } from '../utils/offerReportExport';
import { getCompletedProjectsText } from '../utils/completedProjectsData';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { ReconciliationDiagnosticModal } from './ReconciliationDiagnosticModal';
import { IstanbulRealEstateValuationModal } from './IstanbulRealEstateValuationModal';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { getRoofTypeShortTitle } from '../utils/roofUtils';
import { computeDualOffer, DUAL_OFFER_NAMING_PRESETS, DualOfferNamingPresetItem } from '../utils/dualOfferUtils';

interface OfferTabProps {
  params: ProjectParams;
  results: CalculationResult;
  onUpdateParam?: (key: keyof ProjectParams, val: any) => void;
  onUpdateAllParams?: (newParams: Partial<ProjectParams>) => void;
  onNavigateToSurec?: () => void;
  theme?: AppTheme;
}

export const OfferTab: React.FC<OfferTabProps> = ({
  params,
  results,
  onUpdateParam,
  onUpdateAllParams,
  onNavigateToSurec,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const offerDocRef = useRef<HTMLDivElement>(null);

  // AI Proposal Generator State
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedSummary, setAiGeneratedSummary] = useState<{
    projectName: string;
    clauseCount: number;
    intro: string;
    features: string[];
    months: number;
  } | null>(null);

  // Diagnostic Reconciliation Modal State
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState<boolean>(false);

  // Istanbul Real Estate Valuation Modal State
  const [isValuationModalOpen, setIsValuationModalOpen] = useState<boolean>(false);

  // Live Control Panel State
  const [activeControlTab, setActiveControlTab] = useState<'inflation' | 'pricing' | 'payment' | 'features'>('inflation');
  const [isLiveControlPanelExpanded, setIsLiveControlPanelExpanded] = useState<boolean>(true);

  // Unit & Floor Configurator Modal State
  const [isUnitConfigOpen, setIsUnitConfigOpen] = useState(false);
  const [tempFloorCount, setTempFloorCount] = useState<number>(params.floorCount || 5);
  const [tempFlatsPerFloor, setTempFlatsPerFloor] = useState<number>(params.flatsPerFloor || 2);
  const [tempHasShop, setTempHasShop] = useState<boolean>(!!params.hasGroundFloorShop);
  const [tempShopCount, setTempShopCount] = useState<number>(params.shopCount || 1);
  const [tempBasementCount, setTempBasementCount] = useState<number>(params.basementCount !== undefined ? params.basementCount : 1);
  const [tempBasementPurpose, setTempBasementPurpose] = useState<string>(params.basementPurpose || 'shelter_depot');
  const [tempBasementShopCount, setTempBasementShopCount] = useState<number>(params.basementShopCount || 1);

  const handleOpenUnitConfig = () => {
    setTempFloorCount(params.floorCount || 5);
    setTempFlatsPerFloor(params.flatsPerFloor || 2);
    setTempHasShop(!!params.hasGroundFloorShop);
    setTempShopCount(params.shopCount || 1);
    setTempBasementCount(params.basementCount !== undefined ? params.basementCount : 1);
    setTempBasementPurpose(params.basementPurpose || 'shelter_depot');
    setTempBasementShopCount(params.basementShopCount || 1);
    setIsUnitConfigOpen(true);
  };

  const handleApplyUnitConfig = (overrides?: Partial<ProjectParams>) => {
    const fc = overrides?.floorCount ?? tempFloorCount;
    const fpf = overrides?.flatsPerFloor ?? tempFlatsPerFloor;
    const hasShop = overrides?.hasGroundFloorShop ?? tempHasShop;
    const sc = overrides?.shopCount ?? (hasShop ? tempShopCount : 0);
    const bc = overrides?.basementCount ?? tempBasementCount;
    const bp = overrides?.basementPurpose ?? tempBasementPurpose;
    const bsc = overrides?.basementShopCount ?? tempBasementShopCount;

    if (onUpdateAllParams) {
      onUpdateAllParams({
        floorCount: fc,
        flatsPerFloor: fpf,
        hasGroundFloorShop: hasShop,
        shopCount: sc,
        basementCount: bc,
        basementPurpose: bp,
        basementShopCount: bsc,
      });
    } else if (onUpdateParam) {
      onUpdateParam('floorCount', fc);
      onUpdateParam('flatsPerFloor', fpf);
      onUpdateParam('hasGroundFloorShop', hasShop);
      onUpdateParam('shopCount', sc);
      onUpdateParam('basementCount', bc);
      onUpdateParam('basementPurpose', bp);
      onUpdateParam('basementShopCount', bsc);
    }
    setIsUnitConfigOpen(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPromptText.trim()) {
      setAiError('Lütfen proje detaylarını içeren bir metin giriniz.');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai-generate-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiPromptText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Yapay zeka teklif oluşturma başarısız oldu.');
      }

      const p = data.data;
      if (onUpdateAllParams) {
        onUpdateAllParams({
          ...(p.projectName ? { projectName: p.projectName } : {}),
          ...(p.projectAddress ? { projectAddress: p.projectAddress } : {}),
          ...(p.landArea ? { landArea: Number(p.landArea) } : {}),
          ...(p.baseBuildArea ? { baseBuildArea: Number(p.baseBuildArea) } : {}),
          ...(p.floorCount ? { floorCount: Number(p.floorCount) } : {}),
          ...(p.flatsPerFloor ? { flatsPerFloor: Number(p.flatsPerFloor) } : {}),
          ...(p.hasGroundFloorShop !== undefined ? { hasGroundFloorShop: !!p.hasGroundFloorShop } : {}),
          ...(p.shopCount !== undefined ? { shopCount: Number(p.shopCount) } : {}),
          ...(p.basementCount !== undefined ? { basementCount: Number(p.basementCount) } : {}),
          ...(p.basementPurpose ? { basementPurpose: p.basementPurpose } : {}),
          ...(p.basementShopCount !== undefined ? { basementShopCount: Number(p.basementShopCount) } : {}),
          ...(p.buildingType ? { buildingType: p.buildingType } : {}),
          ...(p.quality ? { quality: p.quality } : {}),
          ...(p.projectModel ? { projectModel: p.projectModel } : {}),
          ...(p.contractorShareRate ? { contractorShareRate: Number(p.contractorShareRate) } : {}),
          ...(p.transformationStatus ? { transformationStatus: p.transformationStatus } : {}),
          ...(p.manualMonths ? { manualMonths: Number(p.manualMonths), durationOption: 'manual' } : {}),
          ...(p.introExplanation ? { introExplanation: p.introExplanation, showIntroPresentation: true } : {}),
          ...(p.customContractNotes ? { customContractNotes: p.customContractNotes } : {}),
          ...(p.hasUnderfloorHeating !== undefined ? { hasUnderfloorHeating: !!p.hasUnderfloorHeating } : {}),
          ...(p.hasWaterFiltration !== undefined ? { hasWaterFiltration: !!p.hasWaterFiltration } : {}),
          ...(p.hasLinearShowerDrain !== undefined ? { hasLinearShowerDrain: !!p.hasLinearShowerDrain } : {}),
          ...(p.hasSmartDoorLock !== undefined ? { hasSmartDoorLock: !!p.hasSmartDoorLock } : {}),
          ...(p.hasAcOption !== undefined ? { hasAcOption: !!p.hasAcOption } : {}),
          ...(p.additionalOfferClauses && Array.isArray(p.additionalOfferClauses) ? { additionalOfferClauses: p.additionalOfferClauses } : {}),
        });
      }

      const detectedFeatures: string[] = [];
      if (p.hasUnderfloorHeating) detectedFeatures.push("Yerden Isıtma");
      if (p.hasWaterFiltration) detectedFeatures.push("Su Arıtma");
      if (p.hasLinearShowerDrain) detectedFeatures.push("Lineer Duş Süzgeci");
      if (p.hasSmartDoorLock) detectedFeatures.push("Akıllı Kapı Kilidi");
      if (p.hasAcOption) detectedFeatures.push("Klima Altyapısı");
      if (p.hasGroundFloorShop) detectedFeatures.push(`${p.shopCount || 1} Adet Zemin Dükkan`);
      if (p.basementPurpose === 'parking') detectedFeatures.push("Kapalı Otopark");

      setAiGeneratedSummary({
        projectName: p.projectName || 'Kentsel Dönüşüm ve İnşaat Teklifi',
        clauseCount: p.additionalOfferClauses?.length || 0,
        intro: p.introExplanation || '',
        features: detectedFeatures,
        months: p.manualMonths || 15
      });
      setAiPromptText('');
    } catch (err: any) {
      setAiError(err.message || 'Bir hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Image & Document Upload State and Handlers
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string; name: string; caption: string }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList) => {
    // Math & boundary check: maximum 6 images allowed
    if (uploadedImages.length >= 6) {
      alert("En fazla 6 adet görsel veya resmi evrak ekleyebilirsiniz.");
      return;
    }

    const remainingSlots = 6 - uploadedImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" desteklenen bir görsel formatı değil. Lütfen yalnızca JPG, PNG veya WEBP yükleyin.`);
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        alert(`"${file.name}" boyutu 4MB limitini aşıyor. Lütfen optimize edilmiş daha küçük bir dosya seçin.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result;
        if (typeof resultUrl === 'string') {
          // Default caption from filename (remove extension)
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setUploadedImages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              url: resultUrl,
              name: file.name,
              caption: baseName.charAt(0).toUpperCase() + baseName.slice(1),
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    setUploadedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, caption } : img))
    );
  };

  const compName = profile?.companyName || 'AB YAPI';
  const compLegal = profile?.legalName || 'AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ.';
  const compSlogan = profile?.slogan || 'Depreme Dayanıklı, Güvenli ve Modern Yaşam Alanları';
  const compAddress = profile?.address || 'Kocamustafapaşa Mah. Org. Abdurrahman Nafiz Gürman Cad. No:45 Fatih / İstanbul';
  const compPhone = profile?.phone || '+90 (212) 588 00 00';
  const compEmail = profile?.email || 'info@abyapi.com.tr';
  const compTax = profile?.taxOffice && profile?.taxNumber ? `${profile.taxOffice} V.D. / V.No: ${profile.taxNumber}` : 'Fatih V.D. / V.No: 1234567890';
  const compAuth = profile?.authorizedPerson || 'Müh. Alpaslan Beyoğlu';
  const compAuthTitle = profile?.authorizedTitle || 'Genel Müdür / İnşaat Mühendisi';

  // Math safety & dimension boundaries
  const residentialFloors = params.hasGroundFloorShop ? Math.max(1, (params.floorCount || 5) - 1) : Math.max(1, params.floorCount || 5);
  const flatsPerFloor = params.flatsPerFloor || Math.max(1, Math.round((results.flatCount || 10) / residentialFloors));
  
  const upperFloorArea = results.upperFloorArea || params.baseBuildArea || 120;
  const residentialFlats = results.flatResults.filter(f => f.flatType !== 'shop' && f.flatType !== 'basement_shop');
  const shopCount = results.flatResults.filter(f => f.flatType === 'shop' || f.flatType === 'basement_shop').length;
  const residentialCount = residentialFlats.length;
  const totalUnits = results.flatResults.length;
  const contractorCount = results.flatResults.filter(f => f.isContractorShare).length;
  const ownerCount = totalUnits - contractorCount;
  const contractorFlats = results.flatResults.filter(f => f.isContractorShare);
  const contractorMansardCount = contractorFlats.filter(f => f.flatType === 'mansard' || f.flatType === 'duplex').length;
  const contractorNormalCount = contractorFlats.filter(f => f.flatType !== 'mansard' && f.flatType !== 'duplex' && f.flatType !== 'shop' && f.flatType !== 'basement_shop').length;

  const physicalGrossArea = residentialFlats.length > 0
    ? Math.round((residentialFlats.reduce((s, f) => s + f.area, 0) / residentialFlats.length) * 10) / 10
    : Math.max(20, Math.round((upperFloorArea / flatsPerFloor) * 10) / 10);
  const physicalNetArea = residentialFlats.length > 0
    ? Math.round((residentialFlats.reduce((s, f) => s + (f.netArea || f.area * 0.8), 0) / residentialFlats.length) * 10) / 10
    : Math.max(15, Math.round((physicalGrossArea * 0.8) * 10) / 10);
  const estimatedLandArea = params.landArea && params.landArea > 0 ? params.landArea : Math.round((params.baseBuildArea || 150) / 0.4);

  const isContractorShareModel = params.projectModel === 'contractorShare';

  const shopUnits = results.flatResults.filter(f => f.flatType === 'shop' || f.flatType === 'basement_shop');
  const normalUnits = results.flatResults.filter(f => f.flatType !== 'shop' && f.flatType !== 'basement_shop' && f.flatType !== 'mansard' && f.flatType !== 'duplex');
  const mansardUnits = results.flatResults.filter(f => f.flatType === 'mansard' || f.flatType === 'duplex');

  const avgShopArea = shopUnits.length > 0 ? Math.round(shopUnits.reduce((s, f) => s + f.area, 0) / shopUnits.length) : 0;
  const avgNormalArea = normalUnits.length > 0 ? Math.round(normalUnits.reduce((s, f) => s + f.area, 0) / normalUnits.length) : 0;
  const avgMansardArea = mansardUnits.length > 0 ? Math.round(mansardUnits.reduce((s, f) => s + f.area, 0) / mansardUnits.length) : 0;

  const clauses = params.additionalOfferClauses || [];

  const handleAddClause = () => {
    if (onUpdateParam) {
      onUpdateParam('additionalOfferClauses', [...clauses, 'Yeni özel hüküm veya teklif maddesini buraya giriniz.']);
    }
  };

  const handleUpdateClause = (index: number, val: string) => {
    if (onUpdateParam) {
      const updated = [...clauses];
      updated[index] = val;
      onUpdateParam('additionalOfferClauses', updated);
    }
  };

  const handleRemoveClause = (index: number) => {
    if (onUpdateParam) {
      const updated = clauses.filter((_, i) => i !== index);
      onUpdateParam('additionalOfferClauses', updated);
    }
  };

  const supportModelTitle =
    params.transformationStatus === 'currentSupport'
      ? 'Yarısı Bizden (875 Bin TL Hibe + 875 Bin TL Kredi Desteği)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Kentsel Dönüşüm Kredi Modeli (3 Milyon TL / 180 Ay Vade)'
      : 'Öz Kaynaklı / Desteksiz Yapım Modeli';

  const isDualOffer = params.offerPresentationMode === 'dual';
  const dualData = computeDualOffer(params);

  const [deltaNotification, setDeltaNotification] = useState<string | null>(null);

  const handleApplyDelta = (deltaValue: number | undefined, label: string) => {
    if (onUpdateAllParams) {
      onUpdateAllParams({ plusOfferCustomFlatDelta: deltaValue });
    } else if (onUpdateParam) {
      onUpdateParam('plusOfferCustomFlatDelta', deltaValue);
    }
    const formatted = deltaValue !== undefined
      ? `${deltaValue.toLocaleString('tr-TR')} ₺ / Daire`
      : `Şantiye Maliyetine (${dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺ / Daire)`;
    const msg = `✓ Daire Başı Plus Farkı: ${formatted} olarak güncellendi (${label})`;
    setDeltaNotification(msg);
    setTimeout(() => {
      setDeltaNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleStepDelta = (amount: number) => {
    const current = params.plusOfferCustomFlatDelta ?? dualData.calculatedAvgCostPerFlatDiff;
    const newVal = Math.max(0, Math.round(current + amount));
    handleApplyDelta(newVal, amount > 0 ? `+${amount.toLocaleString('tr-TR')} ₺` : `${amount.toLocaleString('tr-TR')} ₺`);
  };

  const deltaPresets = [
    {
      id: 'cost',
      label: 'Maliyetine (%0)',
      percentBadge: '%0',
      value: undefined,
      displayVal: dualData.calculatedAvgCostPerFlatDiff,
      isActive: params.plusOfferCustomFlatDelta === undefined || params.plusOfferCustomFlatDelta === 0 || params.plusOfferCustomFlatDelta === dualData.calculatedAvgCostPerFlatDiff,
    },
    {
      id: 'p10',
      label: '+%10 Kâr',
      percentBadge: '+%10',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.10),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.10),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.10),
    },
    {
      id: 'p15',
      label: '+%15 Kâr',
      percentBadge: '+%15',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.15),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.15),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.15),
    },
    {
      id: 'p20',
      label: '+%20 Kâr',
      percentBadge: '+%20',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.20),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.20),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.20),
    },
    {
      id: 'p25',
      label: '+%25 Kâr',
      percentBadge: '+%25',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.25),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.25),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.25),
    },
    {
      id: 'p30',
      label: '+%30 Kâr',
      percentBadge: '+%30',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.30),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.30),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.30),
    },
    {
      id: 'p35',
      label: '+%35 Kâr',
      percentBadge: '+%35',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.35),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.35),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.35),
    },
    {
      id: 'p50',
      label: '+%50 Kâr',
      percentBadge: '+%50',
      value: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.50),
      displayVal: Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.50),
      isActive: params.plusOfferCustomFlatDelta === Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.50),
    },
    {
      id: 'round',
      label: '5.000 ₺ Tamamla',
      percentBadge: 'Yuvarlak',
      value: Math.ceil((dualData.calculatedAvgCostPerFlatDiff * 1.20) / 5000) * 5000,
      displayVal: Math.ceil((dualData.calculatedAvgCostPerFlatDiff * 1.20) / 5000) * 5000,
      isActive: params.plusOfferCustomFlatDelta === Math.ceil((dualData.calculatedAvgCostPerFlatDiff * 1.20) / 5000) * 5000 && params.plusOfferCustomFlatDelta !== Math.round(dualData.calculatedAvgCostPerFlatDiff * 1.20),
    },
  ];

  const handleTogglePresentationMode = (mode: 'single' | 'dual') => {
    if (onUpdateParam) {
      onUpdateParam('offerPresentationMode', mode);
    }
  };

  const handleSelectNamingPreset = (presetId: 'standard_prestij' | 'klasik_konfor' | 'gumus_altin' | 'temel_akilli' | 'custom') => {
    if (onUpdateParam) {
      const preset = DUAL_OFFER_NAMING_PRESETS.find(p => p.id === presetId);
      onUpdateParam('offerNamingPreset', presetId);
      if (presetId !== 'custom' && preset) {
        onUpdateParam('baseOfferTitle', preset.baseTitle);
        onUpdateParam('plusOfferTitle', preset.plusTitle);
      }
    }
  };

  const handleTogglePlusFeature = (featKey: 'underfloorHeating' | 'waterFiltration' | 'acOption' | 'thermostaticShowerMixer' | 'linearShowerDrain' | 'bathroomHumidityFan' | 'touchlessKitchenFaucet' | 'smartHome') => {
    if (onUpdateParam) {
      const currentFeatures = params.plusOfferFeatures || {
        underfloorHeating: true,
        waterFiltration: true,
        acOption: true,
        thermostaticShowerMixer: true,
        linearShowerDrain: true,
        bathroomHumidityFan: true,
        touchlessKitchenFaucet: true,
        smartHome: true,
      };
      onUpdateParam('plusOfferFeatures', {
        ...currentFeatures,
        [featKey]: currentFeatures[featKey] === false ? true : false,
      });
    }
  };

  const proposalNumber = `${compName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(results.flatCount || 10).padStart(3, '0')}`;
  const proposalDate = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const handleExportPdf = async () => {
    if (!offerDocRef.current) return;
    const safeAddr = (params.projectAddress || 'Proje').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const safeName = compName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const fileName = `${safeName}_Resmi_Musteri_Teklifi_${safeAddr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(offerDocRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateOfferHtml(params, results, false, profile, uploadedImages);
    const safeName = compName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    printHtmlContent(html, `${safeName}_Teklif_${params.projectAddress || 'Proje'}`);
  };

  // Copy protection side effects and handlers
  React.useEffect(() => {
    const blockShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockShortcuts);
    return () => window.removeEventListener('keydown', blockShortcuts);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <FileSignature className="w-3.5 h-3.5" />
              Kurumsal Resmî Teklifname
            </span>
            <span className="text-xs text-slate-400 font-mono">Ref: {proposalNumber}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kat maliklerine, genel kurula ve bina yönetimine sunulmak üzere hazırlanmış resmî maliyet, imalat ve ödeme protokolü
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (params.offerPresentationMode !== 'dual' && onUpdateParam) {
                onUpdateParam('offerPresentationMode', 'dual');
              }
              setTimeout(() => {
                const el = document.getElementById('contractor-financial-reflection-panel');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 60);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-slate-800 hover:to-indigo-900 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold shadow-md shadow-slate-900/30 transition-all active:scale-95 cursor-pointer"
            title="Plus paketin müteahhite (size) yansıyan maliyet, kâr ve hak ediş farkını inceleyin"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>🔒 Bana (Müteahhite) Yansıyan Fark</span>
          </button>
          {onNavigateToSurec && (
            <button
              type="button"
              onClick={() => {
                if (onUpdateParam) {
                  onUpdateParam('isOfferAccepted', true);
                }
                const safeAddr = (params.projectAddress || 'default_project').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                try {
                  localStorage.setItem('ab_yapi_progress_' + safeAddr + '_offer_accepted', 'true');
                } catch (e) {}
                onNavigateToSurec();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Teklif Kabul Edildi ➔ Süreç Takibini Başlat</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsValuationModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="İstanbul Emlak Piyasası İlçe, Kat, Cadde ve Cepheye Göre Satış Fiyatlama Uzmanı"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-200" />
            <span>🏢 İstanbul Emlak Değerleme</span>
          </button>

          <PrintAndPdfButtons
            onExportPdf={handleExportPdf}
            onPrint={handlePrint}
            getHtmlContent={() => generateOfferHtml(params, results, false, profile, uploadedImages)}
            documentTitle={`${compName} - Resmî Teklifname`}
            theme={theme}
          />
        </div>
      </div>

      {/* ========================================================
          ÇIKTI ÖNCESİ CANLI TEKLİF & RİSK KONTROL PANELİ
         ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-5 print:hidden text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-md text-slate-950 font-black shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  Çıktı Öncesi Canlı Fiyatlandırma, TEFE/TÜFE Risk ve Ödeme Paneli
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                  ● Anında Canlı Güncelleme
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Çıktı almadan veya PDF indirmeden önce TEFE/TÜFE enflasyon risk oranlarını, müteahhit kâr marjını, m² birim fiyatlarını ve vade takvimini canlı güncelleyin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLiveControlPanelExpanded(!isLiveControlPanelExpanded)}
            className="px-3 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-amber-300 border border-indigo-700/60 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            {isLiveControlPanelExpanded ? '▲ Paneli Daralt' : '▼ Paneli Genişlet'}
          </button>
        </div>

        {isLiveControlPanelExpanded && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Control Panel Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-indigo-800/50">
              <button
                type="button"
                onClick={() => setActiveControlTab('inflation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeControlTab === 'inflation'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>1. Enflasyon & TEFE/TÜFE Risk Payı</span>
                {params.hasInflationBuffer && (
                  <span className="px-1.5 py-0.2 bg-slate-950/20 text-slate-950 rounded text-[9px] font-black">
                    %{params.inflationBufferRate ?? 15}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveControlTab('pricing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeControlTab === 'pricing'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60'
                }`}
              >
                <BadgePercent className="w-3.5 h-3.5" />
                <span>2. Birim Fiyatlar & Müteahhit Kârı</span>
                {params.profitRate ? (
                  <span className="px-1.5 py-0.2 bg-slate-950/20 text-slate-950 rounded text-[9px] font-black">
                    %{params.profitRate}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveControlTab('payment')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeControlTab === 'payment'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>3. Ödeme Modeli & Vade Takvimi</span>
                <span className="px-1.5 py-0.2 bg-slate-950/20 text-slate-950 rounded text-[9px] font-black">
                  {params.installmentCount || 12} Ay
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveControlTab('features')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeControlTab === 'features'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>4. Sunum Modu & Paket Seçenekleri</span>
                <span className="px-1.5 py-0.2 bg-slate-950/20 text-slate-950 rounded text-[9px] font-black">
                  {params.offerPresentationMode === 'dual' ? 'Çift Paket' : 'Tek Paket'}
                </span>
              </button>
            </div>

            {/* TAB 1: ENFLASYON & TEFE/TÜFE RISK PAYI */}
            {activeControlTab === 'inflation' && (
              <div className="p-5 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-indigo-800/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        🛡️ TEFE/TÜFE & Yİ-ÜFE Enflasyon Risk Sigortası
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200">
                      Teklif hazırlama ile şantiye başlangıcı/tamamlanması arasında oluşabilecek TEFE/TÜFE malzeme ve işçilik artış riskini teklife yansıtın.
                    </p>
                  </div>

                  {/* Toggle Button */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!params.hasInflationBuffer}
                      onChange={(e) => onUpdateParam && onUpdateParam('hasInflationBuffer', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-indigo-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    <span className="ml-2.5 text-xs font-bold text-white">
                      {params.hasInflationBuffer ? '✅ Risk Payı Aktif' : '❌ Risk Payı Kapalı'}
                    </span>
                  </label>
                </div>

                {params.hasInflationBuffer ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Slider and Input */}
                      <div className="space-y-2 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-amber-200">Enflasyon & Risk Oranı (%):</label>
                          <span className="font-mono font-black text-amber-400 text-sm">
                            %{params.inflationBufferRate ?? 15}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={params.inflationBufferRate ?? 15}
                          onChange={(e) => onUpdateParam && onUpdateParam('inflationBufferRate', Number(e.target.value))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-indigo-300 font-mono">
                          <span>%0 (Risksiz)</span>
                          <span>%15 (Varsayılan)</span>
                          <span>%40 (Maks Risk)</span>
                        </div>
                      </div>

                      {/* Fast Presets */}
                      <div className="space-y-2 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                        <label className="block text-xs font-bold text-amber-200">Hızlı Oran Seçenekleri:</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { rate: 5, label: '%5 Düşük' },
                            { rate: 10, label: '%10 Makul' },
                            { rate: 15, label: '%15 Standart TEFE' },
                            { rate: 20, label: '%20 Yüksek TÜFE' },
                            { rate: 25, label: '%25 Maksimum Risk' },
                          ].map((item) => (
                            <button
                              key={item.rate}
                              type="button"
                              onClick={() => onUpdateParam && onUpdateParam('inflationBufferRate', item.rate)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                (params.inflationBufferRate ?? 15) === item.rate
                                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                                  : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Calculated Effect Badge */}
                    <div className="p-3 bg-indigo-900/90 border border-emerald-500/50 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 text-emerald-200">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>Proje Risk Teminat Hacmi:</strong>{' '}
                          {(results.inflationBufferAmount || Math.round((results.totalGrossCost || 0) * ((params.inflationBufferRate || 15) / 100))).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-200 font-mono">
                        (Daire Başı Ort.: ~{Math.round((results.inflationBufferAmount || Math.round((results.totalGrossCost || 0) * ((params.inflationBufferRate || 15) / 100))) / (results.flatCount || 1)).toLocaleString('tr-TR')} ₺)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Enflasyon risk payı kapalıdır. Teklif fiyatlarında herhangi bir TEFE/TÜFE veya fiyat artış risk payı eklenmemektedir.</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BİRİM FİYATLAR & MÜTEAHHİT KÂRI */}
            {activeControlTab === 'pricing' && (
              <div className="p-5 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profit Rate Control */}
                  <div className="space-y-3 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-amber-200">Müteahhit Kâr Oranı (%):</label>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        %{params.profitRate || 0}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      step="1"
                      value={params.profitRate || 0}
                      onChange={(e) => onUpdateParam && onUpdateParam('profitRate', Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 10, 15, 20, 25].map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('profitRate', pr)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            (params.profitRate || 0) === pr
                              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                              : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                          }`}
                        >
                          %{pr} {pr === 0 ? '(Maliyetine)' : ''}
                        </button>
                      ))}
                    </div>

                    {/* Include profit in owner share toggle */}
                    <div className="pt-2 border-t border-indigo-800/60 space-y-1.5">
                      <label className="block text-[11px] font-bold text-indigo-200">
                        Kâr Oranı Kat Malikleri Borçlanmasına Yansısın mı?
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('includeProfitOwner', 'yes')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            params.includeProfitOwner !== 'no'
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/50'
                          }`}
                        >
                          ✓ Evet (Malik Borcuna Ekle)
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('includeProfitOwner', 'no')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            params.includeProfitOwner === 'no'
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/50'
                          }`}
                        >
                          ✕ Hayır (Sırf İmalat Maliyeti)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Manual Unit Price Overrides */}
                  <div className="space-y-3 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2">
                      <label className="text-xs font-bold text-amber-200">Konut m² Birim Fiyatı (TL/m²):</label>
                      {params.manualFlatUnitPrice && (
                        <button
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('manualFlatUnitPrice', undefined)}
                          className="text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
                        >
                          Sistem Hesabına Dön
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={params.manualFlatUnitPrice ?? ''}
                        onChange={(e) => onUpdateParam && onUpdateParam('manualFlatUnitPrice', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={`Sistem Hesabı: ${results.grossCostPerSqM?.toLocaleString('tr-TR')} ₺/m²`}
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-indigo-950 text-white placeholder-indigo-300/50 border border-indigo-700 focus:outline-none focus:border-amber-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-indigo-300 font-bold">TL/m²</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2 pt-2">
                      <label className="text-xs font-bold text-amber-200">Dükkan m² Birim Fiyatı (TL/m²):</label>
                      {params.manualShopUnitPrice && (
                        <button
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('manualShopUnitPrice', undefined)}
                          className="text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
                        >
                          Sistem Hesabına Dön
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={params.manualShopUnitPrice ?? ''}
                        onChange={(e) => onUpdateParam && onUpdateParam('manualShopUnitPrice', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={`Sistem Hesabı: ${(params.manualFlatUnitPrice || results.grossCostPerSqM)?.toLocaleString('tr-TR')} ₺/m²`}
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-indigo-950 text-white placeholder-indigo-300/50 border border-indigo-700 focus:outline-none focus:border-amber-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-indigo-300 font-bold">TL/m²</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ÖDEME MODELİ & VADE TAKVİMİ */}
            {activeControlTab === 'payment' && (
              <div className="p-5 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Payment Plan Type */}
                  <div className="space-y-2 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <label className="block text-xs font-bold text-amber-200">Ödeme Planı Tipi:</label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'installments', label: '1. Aylık Eşit Taksitli Ödeme' },
                        { id: 'hybrid', label: '2. Karma (Peşinat + Ara Ödeme + Taksit)' },
                        { id: 'stages', label: '3. 5 Aşamalı İlerleme Hakedişi' },
                      ].map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('paymentPlanType', plan.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            (params.paymentPlanType || 'installments') === plan.id
                              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                              : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                          }`}
                        >
                          {plan.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Installment Count */}
                  <div className="space-y-2 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <label className="block text-xs font-bold text-amber-200">Vade / Taksit Sayısı (Ay):</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[6, 12, 18, 24, 36, 48].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('installmentCount', count)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            (params.installmentCount || 12) === count
                              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                              : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                          }`}
                        >
                          {count} Ay
                        </button>
                      ))}
                    </div>
                    <div className="pt-1">
                      <input
                        type="number"
                        value={params.installmentCount || 12}
                        onChange={(e) => onUpdateParam && onUpdateParam('installmentCount', Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-950 text-white border border-indigo-700 focus:outline-none focus:border-amber-400"
                        placeholder="Özel Ay Sayısı..."
                      />
                    </div>
                  </div>

                  {/* Transformation Support Model */}
                  <div className="space-y-2 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <label className="block text-xs font-bold text-amber-200">Kentsel Dönüşüm Destek Modeli:</label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'currentSupport', label: 'Yarısı Bizden (875k Hibe + 875k Kredi)' },
                        { id: 'futureSupport2027', label: '2027 Kredi Modeli (3 Milyon TL)' },
                        { id: 'custom', label: 'Öz Kaynaklı / Desteksiz Model' },
                      ].map((sup) => (
                        <button
                          key={sup.id}
                          type="button"
                          onClick={() => onUpdateParam && onUpdateParam('transformationStatus', sup.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            params.transformationStatus === sup.id
                              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                              : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                          }`}
                        >
                          {sup.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SUNUM MODU & PAKET SEÇENEKLERİ */}
            {activeControlTab === 'features' && (
              <div className="p-5 rounded-2xl bg-indigo-950/80 border border-indigo-700/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Presentation Mode & Presets */}
                  <div className="space-y-3 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <label className="block text-xs font-bold text-amber-200">Teklif Sunum Modu:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateParam && onUpdateParam('offerPresentationMode', 'dual')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          params.offerPresentationMode === 'dual'
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                            : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                        }`}
                      >
                        ⚡ İkili Karşılaştırmalı (Çift Paket)
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateParam && onUpdateParam('offerPresentationMode', 'single')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          params.offerPresentationMode !== 'dual'
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                            : 'bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50'
                        }`}
                      >
                        📄 Tek Paket Standart
                      </button>
                    </div>

                    {params.offerPresentationMode === 'dual' && (
                      <div className="pt-2 border-t border-indigo-800/60 space-y-2">
                        <label className="block text-xs font-bold text-amber-200">Çift Paket İsim Şablonu:</label>
                        <select
                          value={params.offerNamingPreset || 'standard_plus'}
                          onChange={(e) => handleSelectPreset(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-indigo-950 text-white border border-indigo-700 focus:outline-none focus:border-amber-400"
                        >
                          {DUAL_OFFER_NAMING_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} ({p.baseTitle} / {p.plusTitle})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Plus Package Equipment Toggles */}
                  <div className="space-y-3 bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50">
                    <label className="block text-xs font-bold text-amber-200">
                      Plus Paket Konfor Donanımları (Tıkla-Aç/Kapat):
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'underfloorHeating', label: '♨️ Yerden Isıtma' },
                        { key: 'acOption', label: '❄️ Klima Altyapısı' },
                        { key: 'smartHome', label: '🔑 Akıllı Kilit/Sistem' },
                        { key: 'waterFiltration', label: '💧 Su Arıtma Cihazı' },
                        { key: 'thermostaticShowerMixer', label: '🚿 Termostatik Batarya' },
                        { key: 'linearShowerDrain', label: '📐 Lineer Süzgeç' },
                        { key: 'bathroomHumidityFan', label: '🌀 Nem Sensörlü Fan' },
                        { key: 'touchlessKitchenFaucet', label: '🍳 Dokunmatik Mutfak' },
                      ].map((item) => {
                        const feats = params.plusOfferFeatures || {
                          underfloorHeating: true,
                          waterFiltration: true,
                          acOption: true,
                          thermostaticShowerMixer: true,
                          linearShowerDrain: true,
                          bathroomHumidityFan: true,
                          touchlessKitchenFaucet: true,
                          smartHome: true,
                        };
                        const isActive = feats[item.key as keyof typeof feats] !== false;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleTogglePlusFeature(item.key as any)}
                            className={`p-2 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer border ${
                              isActive
                                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50'
                                : 'bg-indigo-950/50 text-indigo-400 border-indigo-800/40 line-through opacity-60'
                            }`}
                          >
                            {isActive ? '✓ ' : '✕ '} {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          AI PROPOSAL GENERATOR FROM TEXT INPUT (YAPAY ZEKA İLE TEKLİF OLUŞTURUCU)
         ======================================================== */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4 print:hidden border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-700/50">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Yapay Zeka ile Doğal Dilden Teklif Oluşturucu</span>
            </h3>
            <p className="text-xs text-indigo-200 mt-1">
              Proje detaylarını, kat sayısını, daire/dükkan bilgilerini ve özel istekleri serbest metin olarak yazın; yapay zeka resmi teklif parametrelerini anında oluştursun.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-800/80 text-amber-300 rounded-full text-[10px] font-bold border border-indigo-600">
              ⚡ Gemini 3.8 Flash
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={aiPromptText}
            onChange={(e) => setAiPromptText(e.target.value)}
            placeholder="Örn: Kadıköy Bağdat Caddesi üzerinde 550 m2 arsa üzerine zemin üstü 6 katlı, taban alanı 180 m2 olan kentsel dönüşüm projesi. Her katta 2 daire ve zemin katta 2 adet dükkan olsun. %50 kat karşılığı oranı ve bodrum katta sığınak planlansın."
            className="w-full text-xs font-medium p-3 rounded-2xl bg-indigo-950/80 text-white placeholder-indigo-300/60 border border-indigo-700/60 focus:outline-none focus:border-amber-400 transition-all resize-y"
          />

          {aiError && (
            <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-indigo-300 font-bold">Hızlı Örnekler:</span>
              <button
                type="button"
                onClick={() => setAiPromptText("Kadıköy'de 500 m2 arsa üzerine taban oturumu 150 m2, zemin üstü 5 katlı, her katta 2 daire ve zemin katta 1 dükkan bulunan kentsel dönüşüm projesi. %50 kat karşılığı, sığınaklı bodrum kat.")}
                className="px-2 py-1 bg-indigo-800/60 hover:bg-indigo-700 text-indigo-100 rounded-lg text-[10px] font-medium transition-all border border-indigo-600/40 cursor-pointer"
              >
                1. Kadıköy Dükkanlı Proje
              </button>
              <button
                type="button"
                onClick={() => setAiPromptText("Fatih'te 400 m2 arsa üzerinde 120 m2 taban, 4 katlı, her katta 3 daire, tamamen konut, Yarısı Bizden kentsel dönüşüm destekli proje.")}
                className="px-2 py-1 bg-indigo-800/60 hover:bg-indigo-700 text-indigo-100 rounded-lg text-[10px] font-medium transition-all border border-indigo-600/40 cursor-pointer"
              >
                2. Fatih Destekli Proje
              </button>
              <button
                type="button"
                onClick={() => setAiPromptText("Bağdat Caddesi üzerinde 600 m2 arsa, 200 m2 tabanlı 6 katlı lüks rezidans, katta 2 daire, zemin 2 dükkan, yerden ısıtma, kapalı otopark ve akıllı kilit sistemi.")}
                className="px-2 py-1 bg-indigo-800/60 hover:bg-indigo-700 text-indigo-100 rounded-lg text-[10px] font-medium transition-all border border-indigo-600/40 cursor-pointer"
              >
                3. Lüks Rezidans
              </button>
            </div>

            <button
              type="button"
              disabled={isAiLoading}
              onClick={handleAiGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer ml-auto"
            >
              {isAiLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Yapay Zeka Analiz Ediyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Yapay Zeka ile Teklif ve Parametreleri Üret</span>
                </>
              )}
            </button>
          </div>

          {/* AI Result Feedback and Executive Summary Preview */}
          {aiGeneratedSummary && (
            <div className="mt-4 p-4 rounded-2xl bg-indigo-900/90 border border-emerald-500/50 text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wide">
                    ✨ Mühendislik & Hukuki Şartname Başarıyla Hazırlandı
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiGeneratedSummary(null)}
                  className="text-xs text-indigo-300 hover:text-white px-2 py-0.5 rounded-md hover:bg-indigo-800 transition-colors cursor-pointer"
                >
                  ✕ Kapat
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-indigo-950/70 p-3 rounded-xl border border-indigo-700/50">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase">Proje & Teslim</div>
                  <div className="text-white font-bold mt-0.5 truncate">{aiGeneratedSummary.projectName}</div>
                  <div className="text-[11px] text-indigo-200 mt-1">Anahtar Teslim: <strong>{aiGeneratedSummary.months} Ay</strong></div>
                </div>

                <div className="bg-indigo-950/70 p-3 rounded-xl border border-indigo-700/50">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase">Şartname Maddeleri</div>
                  <div className="text-amber-300 font-bold mt-0.5">
                    {aiGeneratedSummary.clauseCount} Adet Resmi Madde Üretildi
                  </div>
                  <div className="text-[11px] text-indigo-200 mt-1">Deprem, statik, mekanik, ceza ve garanti taahhütleri.</div>
                </div>

                <div className="bg-indigo-950/70 p-3 rounded-xl border border-indigo-700/50">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase">Aktif Donanımlar</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {aiGeneratedSummary.features.length > 0 ? (
                      aiGeneratedSummary.features.map((f, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 text-[10px] rounded-md font-medium">
                          ✓ {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-indigo-300">Standart Deprem ve Yapı Paketi</span>
                    )}
                  </div>
                </div>
              </div>

              {aiGeneratedSummary.intro && (
                <div className="p-3 bg-indigo-950/80 rounded-xl border border-indigo-700/50 text-xs text-indigo-100 italic border-l-4 border-l-amber-400">
                  <div className="text-[10px] text-amber-300 font-bold not-italic mb-1">
                    📋 Maliklere Özel Sunum Metni & Yönetici Özeti:
                  </div>
                  "{aiGeneratedSummary.intro.slice(0, 260)}..."
                </div>
              )}

              <div className="text-[11px] text-indigo-200 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-800/60">
                <span>💡 Resmi teklif evrakı, 3D model ve birim hesaplamalar bu verilere göre güncellendi.</span>
                <a
                  href="#ek-maddeler"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('ek-maddeler')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Maddeleri Aşağıda İncele / Düzenle</span>
                  <span>↓</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          INTERACTIVE IMAGE & ATTACHMENTS UPLOAD PANEL (GÖRSEL VE EVRAK UPLOAD)
         ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Teklife Görsel ve Belge Ekleme Paneli</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Kat planları, vaziyet planları veya resmi kentsel dönüşüm evraklarını ekleyerek teklifinizi zenginleştirin (Maksimum 6 adet, her biri en fazla 4MB).
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-full text-xs font-mono border border-slate-200">
              Yüklenen: <strong className="text-indigo-600 font-bold">{uploadedImages.length} / 6</strong>
            </span>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        {uploadedImages.length < 6 ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
              dragActive 
                ? 'border-indigo-600 bg-indigo-50/50' 
                : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">Görseli sürükleyip bırakın veya seçmek için tıklayın</p>
              <p className="text-[11px] text-slate-400 font-mono">Desteklenen: PNG, JPG, JPEG, WEBP (Maks: 4MB)</p>
            </div>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50/50 text-amber-900 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Maksimum yükleme limitine (6 adet) ulaştınız. Yeni bir görsel eklemek için lütfen mevcut olanlardan birini silin.</span>
          </div>
        )}

        {/* Thumbnail Preview Area */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {uploadedImages.map((img, idx) => (
              <div
                key={img.id}
                className="group relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col shadow-xs"
              >
                {/* Image Wrap */}
                <div className="relative aspect-[4/3] bg-white border-b border-slate-100 flex items-center justify-center p-2">
                  <img
                    src={img.url}
                    alt={img.caption}
                    className="max-h-full max-w-full object-contain rounded-md"
                  />
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all scale-90 opacity-90 hover:scale-100 hover:opacity-100 cursor-pointer"
                    title="Görseli Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Caption / Title input */}
                <div className="p-3 space-y-1 bg-white">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">GÖRSEL AÇIKLAMASI (EK {idx + 1})</label>
                  <input
                    type="text"
                    value={img.caption}
                    onChange={(e) => updateCaption(img.id, e.target.value)}
                    placeholder="Örn: Tip Kat Planı, Vaziyet Planı..."
                    className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          TEKLİF RAPORU KART SEÇİMİ VE GÖRÜNÜRLÜK AYARLARI (OFFER ENGINE SECTION SELECTION)
         ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <Settings2 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900">Teklif Raporu Kart Seçimi ve Görünürlük Ayarları</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Resmî teklif raporunda (PDF) hangi bölümlerin yer alacağını buradan özelleştirebilirsiniz. İhtiyaca göre kartları açıp kapatarak raporu sadeleştirebilir veya detaylandırabilirsiniz.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const cardKeys = [
                  'showProposalHeader', 'showVisionCards', 'showTechnicalSummary', 
                  'showQualityStandards', 'showInnovativeOptions', 'showDualOfferMatrix', 
                  'showFinancialSummary', 'showPaymentTimeline', 'showLegalTaahhut', 'showContractorSignature'
                ] as const;
                const updates: Partial<ProjectParams> = {};
                cardKeys.forEach(k => { (updates as any)[k] = true; });
                if (onUpdateAllParams) {
                  onUpdateAllParams(updates);
                } else if (onUpdateParam) {
                  cardKeys.forEach(k => onUpdateParam(k as any, true));
                }
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer border border-indigo-200 shadow-2xs active:scale-95"
            >
              ✓ Tümünü Seç
            </button>
            <button
              type="button"
              onClick={() => {
                const cardKeys = [
                  'showProposalHeader', 'showVisionCards', 'showTechnicalSummary', 
                  'showQualityStandards', 'showInnovativeOptions', 'showDualOfferMatrix', 
                  'showFinancialSummary', 'showPaymentTimeline', 'showLegalTaahhut', 'showContractorSignature'
                ] as const;
                const updates: Partial<ProjectParams> = {};
                cardKeys.forEach(k => { (updates as any)[k] = false; });
                if (onUpdateAllParams) {
                  onUpdateAllParams(updates);
                } else if (onUpdateParam) {
                  cardKeys.forEach(k => onUpdateParam(k as any, false));
                }
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              ✕ Tümünü Kaldır
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: 'showProposalHeader', label: 'Teklif Başlığı & Künye', desc: 'Raporun üst kısmındaki proje adı ve numarasını gösterir.', icon: '📑' },
            { key: 'showVisionCards', label: 'Proje Vizyon Kartları', desc: 'Yaşam odaklı tasarım, güvenlik ve şeffaflık kartlarını ekler.', icon: '✨' },
            { key: 'showTechnicalSummary', label: 'I. Teknik Künye', desc: 'Kat yapısı, birim adedi ve imalat bedeli özetlerini gösterir.', icon: '📐' },
            { key: 'showQualityStandards', label: 'III. Kalite Standartları', desc: 'Deprem güvenliği ve enerji verimliliği detaylarını ekler.', icon: '🏗️' },
            { key: 'showInnovativeOptions', label: 'İnovatif Seçenekler', desc: 'Teklif tekli paket ise ekstra konfor donanımlarını gösterir.', icon: '🌀' },
            { key: 'showDualOfferMatrix', label: 'İkili Karşılaştırma Matrisi', desc: 'İkili teklif sunumunda paket farklarını tablo olarak gösterir.', icon: '📊' },
            { key: 'showFinancialSummary', label: 'II. Finansal Çerçeve', desc: 'Yatırım tutarı ve finansman modeli özetini ekler.', icon: '💰' },
            { key: 'showPaymentTimeline', label: 'IV. Ödeme Takvimi', desc: 'İnşaat süresi ve taksitlendirme detaylarını gösterir.', icon: '💳' },
            { key: 'showLegalTaahhut', label: '6. Hukuki Protokol', desc: 'Yasal garantiler, kira desteği ve noter süreci bilgilerini ekler.', icon: '⚖️' },
            { key: 'showContractorSignature', label: 'Yetkili İmza & Kaşe', desc: 'Teklifin sonundaki imza ve onay alanlarını gösterir.', icon: '🖋️' },
          ].map((section) => (
            <label key={section.key} className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-2xl cursor-pointer transition-all select-none group">
              <input
                type="checkbox"
                checked={params[section.key as keyof ProjectParams] !== false}
                onChange={(e) => onUpdateParam && onUpdateParam(section.key as any, e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-1 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 text-[11px] block group-hover:text-indigo-700">
                  {section.icon} {section.label}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">{section.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ========================================================
          ADDITIONAL CLAUSES / SPECIAL PROVISIONS EDITOR
         ======================================================== */}
      <div id="ek-maddeler" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:hidden scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-indigo-600" />
              <span>Teklife Özel Hüküm ve Ek Maddeler Ekleme Paneli</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Teklifinizin sonuna eklenecek yasal taahhüt, ticari şartlar, vergi muafiyeti veya diğer özel maddeleri buradan dilediğiniz gibi ekleyebilir, silebilir ve düzenleyebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddClause}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Ek Madde</span>
          </button>
        </div>

        {clauses.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs">
            Henüz ek bir madde tanımlanmadı. Sağ üstteki butonu kullanarak yeni bir madde ekleyebilirsiniz.
          </div>
        ) : (
          <div className="space-y-3">
            {clauses.map((clause, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <span className="font-mono text-xs font-bold text-slate-400 mt-2 shrink-0 select-none">
                  Madde {idx + 1}:
                </span>
                <textarea
                  value={clause}
                  onChange={(e) => handleUpdateClause(idx, e.target.value)}
                  rows={2}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white transition-all text-slate-800"
                  placeholder="Madde metnini giriniz..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveClause(idx)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all mt-1 shrink-0 cursor-pointer"
                  title="Maddeyi Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          TEKLİF ÖNCESİ SUNUM VE FİRMA GEÇMİŞİ PANELİ (PRE-OFFER PRESENTATION EDITOR)
         ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                <Award className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900">Teklif Öncesi Sunum & Firma Geçmişi Paneli</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Teklif belgenizin başına; neleri neden yaptığınızı anlatan bir önsöz sunumu ve firma geçmişi, tamamlanan projeler ile misyon/vizyon sayfaları ekleyebilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sol Kolon: Sunum Önsöz Ayarları */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-2xl cursor-pointer transition-all select-none">
              <input
                type="checkbox"
                checked={!!params.showIntroPresentation}
                onChange={(e) => onUpdateParam && onUpdateParam('showIntroPresentation', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 text-xs block">📖 Giriş Sunum (Önsöz) Sayfası Ekle</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Teklifin en başına "Neleri, Neden ve Nasıl Yaptığımızı" anlatan profesyonel bir giriş/önsöz sayfası ekler.</span>
              </div>
            </label>

            {params.showIntroPresentation && (
              <div className="space-y-2 animate-fade-in pl-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">SUNUM VE ÖNSÖZ METNİ (KULLANICI TANIMLI):</label>
                <textarea
                  value={params.introExplanation ?? "1960'lardan bugüne uzanan köklü inşaat tecrübemiz ve üçüncü nesil dinamizmimizle, kentsel dönüşüm projelerimizde hem güvenliği hem de modern konfor standartlarını en üst düzeyde buluşturuyoruz. Sektördeki yarım asrı aşan birikimimizle tasarladığımız bu projede, bütçe dostu akılcı maliyet çözümleri sunarken, en güncel deprem yönetmeliklerine ve güvenlik standartlarına tavizsiz şekilde uyuyoruz. Depreme tam dayanıklı mühendislik anlayışımızı, yaşamı kolaylaştıran modern mimari detaylarla harmanlayarak sizler için uzun ömürlü, değerli ve huzurlu yaşam alanları inşa ediyoruz."}
                  onChange={(e) => onUpdateParam && onUpdateParam('introExplanation', e.target.value)}
                  rows={4}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-slate-800"
                  placeholder="Neleri neden yaptığımızı anlatan detaylı açıklama..."
                />
                <span className="text-[9px] text-slate-400">Not: Bu metin teklif belgenizin ilk sayfasındaki önsöz bölümünü oluşturur.</span>
              </div>
            )}
          </div>

          {/* Sağ Kolon: Firma Geçmişi Ayarları */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-2xl cursor-pointer transition-all select-none">
              <input
                type="checkbox"
                checked={!!params.showCompanyHistory}
                onChange={(e) => onUpdateParam && onUpdateParam('showCompanyHistory', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 text-xs block">🏢 Firma Geçmişi & Kurumsal Profil Ekle</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Teklif belgesine firma kuruluşu, tamamlanan referans projeler, misyon ve vizyon alanlarını ekler.</span>
              </div>
            </label>

            {params.showCompanyHistory && (
              <div className="space-y-3 animate-fade-in pl-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">FİRMA GEÇMİŞİ VE HİKAYESİ:</label>
                  <textarea
                    value={params.companyHistoryText ?? "1960’lı yıllarda kurucumuz Emin Ahmetbeyoğlu’nun vizyonuyla temelleri atılan inşaat serüvenimiz, yarım asrı aşan tecrübesiyle sektördeki köklü yürüyüşünü sürdürmektedir. İkinci kuşak temsilcilerimiz Faruk Ahmetbeyoğlu ve aile büyüklerimizin öncülüğünde; Laleli, Fatih, Kocamustafapaşa, Silivrikapı, Samatya ve Yedikule gibi İstanbul’un tarihi suriçi bölgelerinde onlarca nitelikli projeye imza atarak şehrin dokusuna kalıcı değerler kattık.\n\n2010’lu yıllarda piyasa dinamiklerindeki değişimleri doğru okuyarak kurumsal yatırımlarımızı sağlık ve tarım gibi stratejik sektörlere de yönlendirdik ve vizyonumuzu daha da genişlettik. Bugün ise edindiğimiz bu çok yönlü kurumsal tecrübe ve artan sektörel talepler doğrultusunda, üçüncü nesil olarak inşaat markamızı çağın gereksinimlerine uygun, dinamik ve yenilikçi bir altyapıyla yeniden yapılandırıyoruz.\n\nGeçmişten aldığımız güven mirasını, geleceğin teknolojileriyle harmanlayarak kaldığımız yerden, daha güçlü bir şekilde üretmeye devam ediyoruz."}
                    onChange={(e) => onUpdateParam && onUpdateParam('companyHistoryText', e.target.value)}
                    rows={3}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-slate-800"
                    placeholder="Firma geçmişi ve hikayesi..."
                  />
                </div>

                <div className="space-y-1.5 col-span-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-amber-500">🏆</span> TAMAMLANAN PROJE ADRESLERİ (REFERANSLAR SAYFASINDAN):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const refreshed = getCompletedProjectsText();
                          if (onUpdateParam) {
                            onUpdateParam('companyCompletedProjects', refreshed);
                          }
                        }}
                        className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Referanslar sayfasındaki güncel projeleri tekrar yükler"
                      >
                        🔄 Referanslar Sayfasındaki Tüm Adresleri Yükle
                      </button>
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                        Yatay 3-4 Sütun
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={params.companyCompletedProjects ?? getCompletedProjectsText()}
                    onChange={(e) => onUpdateParam && onUpdateParam('companyCompletedProjects', e.target.value)}
                    rows={5}
                    className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-slate-800 font-mono shadow-2xs leading-relaxed"
                    placeholder="1. Çınar Sk. No: 2, Cerrahpaşa Mah., Fatih / İstanbul&#10;2. Çınar Sk. No: 14, Cerrahpaşa Mah., Fatih / İstanbul"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">MİSYON:</label>
                    <textarea
                      value={params.companyMission ?? "Köklerimizden aldığımız tecrübeyi modern mühendislik çözümlermiyle birleştirerek; insan odaklı, yapısal güvenliği merkeze alan ve yaşam standartlarını daima yukarı taşıyan projeler üretmektir."}
                      onChange={(e) => onUpdateParam && onUpdateParam('companyMission', e.target.value)}
                      rows={3}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-slate-800"
                      placeholder="Misyonumuz..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">VİZYON:</label>
                    <textarea
                      value={params.companyVision ?? "Geleneksel inşaat kültürümüzü modern mimari trendlerle zenginleştirerek, müşterilerimiz için hem yüksek kaliteli hem de bütçe dostu, ulaşılabilir ve akılcı yaşam alanları inşa eden öncü bir marka olmaktır."}
                      onChange={(e) => onUpdateParam && onUpdateParam('companyVision', e.target.value)}
                      rows={3}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-slate-800"
                      placeholder="Vizyonumuz..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          DUAL OFFER PRESENTATION MODE & CUSTOMIZATION PANEL
         ======================================================== */}
      <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-sm space-y-5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <Sliders className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900">Teklif Sunum Modu & Paket Seçenekleri</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kat maliklerine tek bir standart teklif sunabilir veya alternatifli <strong>2 Seçenekli (Baz vs. Plus)</strong> karşılaştırmalı teklif sunumu oluşturabilirsiniz.
            </p>
          </div>

          {/* Mode Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleTogglePresentationMode('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isDualOffer
                  ? 'bg-white text-indigo-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tek Paket Teklifi</span>
            </button>
            <button
              type="button"
              onClick={() => handleTogglePresentationMode('dual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isDualOffer
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>2 Seçenekli Teklif (Baz + Plus)</span>
            </button>
          </div>
        </div>

        {/* Dual Offer Configuration Controls (Visible when Dual Mode is Active) */}
        {isDualOffer && (
          <div className="space-y-5 animate-fade-in">
            {/* 1. Naming Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Paket İsimlendirme Şablonu (Türkçe İsimler):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {DUAL_OFFER_NAMING_PRESETS.map((preset) => {
                  const isSelected = (params.offerNamingPreset || 'standard_prestij') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectNamingPreset(preset.id)}
                      className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[11px] text-slate-900">{preset.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>1: {preset.baseTitle}</span>
                        <span>•</span>
                        <span className="text-indigo-700 font-semibold">2: {preset.plusTitle}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Custom Title Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">1. Seçenek (Baz Teklif) Başlığı:</label>
                <input
                  type="text"
                  value={params.baseOfferTitle || dualData.baseTitle}
                  onChange={(e) => {
                    if (onUpdateParam) {
                      onUpdateParam('baseOfferTitle', e.target.value);
                      onUpdateParam('offerNamingPreset', 'custom');
                    }
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition-all text-slate-900"
                  placeholder="Örn: Standart (Baz) Paket"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-900">2. Seçenek (Plus Teklif) Başlığı:</label>
                <input
                  type="text"
                  value={params.plusOfferTitle || dualData.plusTitle}
                  onChange={(e) => {
                    if (onUpdateParam) {
                      onUpdateParam('plusOfferTitle', e.target.value);
                      onUpdateParam('offerNamingPreset', 'custom');
                    }
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 border border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none bg-purple-50/40 focus:bg-white transition-all text-purple-950 font-bold"
                  placeholder="Örn: Prestij Plus Paket"
                />
              </div>
            </div>

            {/* 3. Plus Offer Feature Selection (Dilediğim özellikleri ekleyebileceğim Plus Teklif) */}
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Plus Teklifte Yer Alacak İlave Konfor Özellikleri:
                  </h4>
                  <p className="text-[10px] text-purple-700 mt-0.5">
                    İşaretlediğiniz özellikler 2. Teklife dahil edilecek ve 1. Teklif (Baz) ile aradaki maliyet farkı otomatik hesaplanacaktır.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {/* Underfloor Heating */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.underfloorHeating !== false}
                    onChange={() => handleTogglePlusFeature('underfloorHeating')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">🔥 Sulu Yerden Isıtma</span>
                    <span className="text-[10px] text-slate-500">Peteksiz, homojen & tasarruflu</span>
                  </div>
                </label>

                {/* Water Filtration */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.waterFiltration !== false}
                    onChange={() => handleTogglePlusFeature('waterFiltration')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">💧 Merkezi Su Arıtma</span>
                    <span className="text-[10px] text-slate-500">Tüm binada klor & kireçsiz su</span>
                  </div>
                </label>

                {/* AC */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.acOption !== false}
                    onChange={() => handleTogglePlusFeature('acOption')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">❄️ A++ Inverter Klima</span>
                    <span className="text-[10px] text-slate-500">{getAcOptionById(params.acType || '18k_btu').shortTitle}</span>
                  </div>
                </label>

                {/* Thermostatic Mixer */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.thermostaticShowerMixer !== false}
                    onChange={() => handleTogglePlusFeature('thermostaticShowerMixer')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">🚿 Termostatik Duş Bataryası</span>
                    <span className="text-[10px] text-slate-500">38°C emniyet (Konutlar)</span>
                  </div>
                </label>

                {/* Linear Shower Drain */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.linearShowerDrain !== false}
                    onChange={() => handleTogglePlusFeature('linearShowerDrain')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">✨ Lineer Duş Süzgeci</span>
                    <span className="text-[10px] text-slate-500">304 Paslanmaz & koku çekvalfli</span>
                  </div>
                </label>

                {/* Bathroom Humidity Fan */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.bathroomHumidityFan !== false}
                    onChange={() => handleTogglePlusFeature('bathroomHumidityFan')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">🌀 Nem Sensörlü Banyo Fanı</span>
                    <span className="text-[10px] text-slate-500">25 dB sessiz & buhar önleyici</span>
                  </div>
                </label>

                {/* Touchless Kitchen Faucet */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.touchlessKitchenFaucet !== false}
                    onChange={() => handleTogglePlusFeature('touchlessKitchenFaucet')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">🫧 Fotoselli Mutfak & Banyo Bataryaları</span>
                    <span className="text-[10px] text-slate-500">Mutfak ve banyoda hayatı kolaylaştıran</span>
                  </div>
                </label>

                {/* Smart Home */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.plusOfferFeatures?.smartHome !== false}
                    onChange={() => handleTogglePlusFeature('smartHome')}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">🏡 Akıllı Ev Modülü</span>
                    <span className="text-[10px] text-slate-500">Aydınlatma & ana vana kontrolü</span>
                  </div>
                </label>
              </div>

              {/* MÜŞTERİYE SUNULACAK DAİRE BAŞI PLUS FARKI HIZLI SEÇİCİ */}
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 via-amber-50/50 to-purple-50 rounded-2xl border-2 border-purple-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-sm">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                        Müşteriye Sunulacak Daire Başı Plus Farkı:
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Aşağıdaki butonlara tıklayarak teklifte müşterinin göreceği daire başı farkı tek tıkla belirleyin.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deltaNotification && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white shadow-sm animate-pulse">
                        {deltaNotification}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-600 text-white shadow-sm shrink-0">
                      Resmî Teklife Yansır
                    </span>
                  </div>
                </div>

                {/* Percentage Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {deltaPresets.map((preset) => (
                    <button
                      key={`top-${preset.id}`}
                      type="button"
                      onClick={() => handleApplyDelta(preset.value, preset.label)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        preset.isActive
                          ? 'bg-purple-700 text-white shadow-md shadow-purple-700/30 ring-2 ring-purple-400 scale-[1.02]'
                          : 'bg-white hover:bg-purple-50 text-slate-700 border border-purple-200 hover:border-purple-300 shadow-sm'
                      }`}
                      title={`${preset.label} - Daire Başı ${preset.displayVal.toLocaleString('tr-TR')} ₺`}
                    >
                      {preset.isActive ? (
                        <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-mono font-bold">
                          {preset.percentBadge}
                        </span>
                      )}
                      <span>{preset.label}</span>
                      <span className={`font-mono text-[11px] font-bold ${preset.isActive ? 'text-amber-300' : 'text-purple-700'}`}>
                        ({preset.displayVal.toLocaleString('tr-TR')} ₺)
                      </span>
                    </button>
                  ))}
                </div>

                {/* Live Cost & Profit Preview Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-purple-200/60 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-500 block">Şantiye Maliyeti:</span>
                    <strong className="text-slate-800 font-mono">{dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                  <div className="p-2 bg-purple-100/60 rounded-xl border border-purple-200">
                    <span className="text-[10px] text-purple-700 font-bold block">Teklif Farkı (Müşteri):</span>
                    <strong className="text-purple-900 font-mono font-black">+{dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 font-bold block">Daire Başı Ek Kârınız:</span>
                    <strong className="text-emerald-800 font-mono font-black">+{dualData.contractorNetMarginPerFlat.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-bold block">Şirket Toplam Ek Kârı:</span>
                    <strong className="text-amber-900 font-mono font-black">+{dualData.contractorNetTotalProfit.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CONTRACTOR PRIVATE FINANCIAL CONTROL PANEL (Yalnızca Müteahhit Görür - Teklifte/PDF'te Kesinlikle Görünmez) */}
            <div 
              id="contractor-financial-reflection-panel"
              className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border-2 border-amber-500/40 shadow-2xl space-y-6 scroll-mt-6"
            >
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        Yüklenici Finansal Tablosu: Plus Paketin Müteahhite (Bana) Yansıyan Farkı
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        🔒 Gizli (Müşteri Teklifinde ve PDF'te Görünmez)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Plus paketin şantiye imalat maliyetinize, müşterilerden toplanacak nakit akışına, daire başı net kârınıza ve toplam şirket kazancınıza yansıyan tüm finansal farkları inceleyin.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center">
                  <span className="text-[11px] text-slate-400 font-mono bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                    Proje Birim Adedi: <strong className="text-white">{results.flatCount || 1}</strong>
                  </span>
                </div>
              </div>

              {/* 1. DÖRT TEMEL FİNANSAL YANSIMA KARTI (EXECUTIVE OVERVIEW) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KART 1: Şantiyeye / Bana Ekstra Maliyet */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-rose-500/30 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-rose-400" />
                        1. Bana (Şantiyeye) Yansıyan Maliyet
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">Çıkan Para</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-white mt-1">
                      {dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺
                      <span className="text-xs font-normal text-slate-400 block mt-0.5">Daire Başı Net İmalat</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">Toplam Ek Maliyet:</span>
                    <strong className="font-mono text-rose-300 font-bold">{dualData.calculatedTotalCostDiff.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                </div>

                {/* KART 2: Müşteriden Toplanacak Tutar */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-sky-500/30 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                        2. Müşteriden Alınacak Hasılat
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">Giren Para</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-sky-300 mt-1">
                      {dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺
                      <span className="text-xs font-normal text-slate-400 block mt-0.5">Daire Başı Teklif Farkı</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">Toplam Tahsilat:</span>
                    <strong className="font-mono text-white font-bold">{dualData.customerTotalCostDiff.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                </div>

                {/* KART 3: Müteahhide (Bana) Kalan Net İlave Kâr */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-emerald-500/40 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        3. Bana Kalan Net Ekstra Kâr
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Cepte Kalan</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                      {dualData.contractorNetExtraMargin >= 0 ? '+' : ''}{dualData.contractorNetExtraMargin.toLocaleString('tr-TR')} ₺
                      <span className="text-xs font-normal text-slate-400 block mt-0.5">
                        Daire Başı: {dualData.unitProfitPerFlat >= 0 ? '+' : ''}{dualData.unitProfitPerFlat.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">İlave Kâr Marjı:</span>
                    <strong className="font-mono text-emerald-300 font-bold">+{dualData.contractorMarginPercent}%</strong>
                  </div>
                </div>

                {/* KART 4: Toplam Şirket Kârı Değişimi */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-amber-500/40 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        4. Toplam Proje Kârı Büyümesi
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Genel Kâr</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-300 mt-1">
                      {dualData.plusProfitAmount.toLocaleString('tr-TR')} ₺
                      <span className="text-xs font-normal text-slate-400 block mt-0.5">
                        Baz Kâr: {dualData.baseProfitAmount.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">Net Kâr Artışınız:</span>
                    <strong className="font-mono text-emerald-400 font-bold">
                      +{dualData.profitDiffAmount.toLocaleString('tr-TR')} ₺ ({dualData.profitDiffPercent > 0 ? `+${dualData.profitDiffPercent}%` : 'Aynı'})
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. KAT KARŞILIĞI VE MÜTEAHHİT MÜLKİYETİNDEKİ DAİRELERİN ANALİZİ (Varsa) */}
              {dualData.contractorFlatsCount > 0 && (
                <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      Kat Karşılığı Analizi: Müteahhidin (Sizin) Dairelerine Yansıyan Finansal Bakiye
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                      {dualData.contractorFlatsCount} Daire Sizin / {dualData.ownerFlatsCount} Daire Kat Maliklerinin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Sizin Dairelerinizin Plus Maliyeti:</span>
                      <strong className="font-mono text-base text-rose-300 block mt-0.5">
                        {dualData.contractorOwnFlatsCost.toLocaleString('tr-TR')} ₺
                      </strong>
                      <span className="text-[9px] text-slate-400">{dualData.contractorFlatsCount} daire × {dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺</span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Kat Maliklerinden Toplanan Tutar:</span>
                      <strong className="font-mono text-base text-sky-300 block mt-0.5">
                        {dualData.collectedFromOwners.toLocaleString('tr-TR')} ₺
                      </strong>
                      <span className="text-[9px] text-slate-400">{dualData.ownerFlatsCount} daire × {dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺</span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Nakit Finansman Dengesi:</span>
                      <strong className={`font-mono text-base block mt-0.5 ${dualData.netContractorBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {dualData.netContractorBalance >= 0 ? '+' : ''}{dualData.netContractorBalance.toLocaleString('tr-TR')} ₺
                      </strong>
                      <span className="text-[9px] text-slate-400">
                        {dualData.netContractorBalance >= 0 ? 'Malik payları kendi maliyetinizi de karşılıyor' : 'Kendi dairelerinize kalan net yatırım'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-indigo-200/90 leading-relaxed pt-1">
                    💡 <strong>Satış Primi Avantajı:</strong> Mülkiyetinizdeki {dualData.contractorFlatsCount} adet bağımsız bölüme uygulanan Plus donanımlar (yerden ısıtma, klima, merkezi su arıtma, akıllı banyo ve mutfak), dairelerinizin piyasa satış değerini ortalama <strong>+%15-25 artıracak</strong> ve satış hızını katlayacaktır.
                  </p>
                </div>
              )}

              {/* 3. KALEM KALEM ŞANTİYE VE TAŞERON MALİYETLERİ TABLOSU */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    Bana Yansıyan Plus Kalemleri Maliyet ve Kâr Tablosu
                  </span>
                  <span className="text-[10px] text-slate-400">Şantiye Taşeron & Malzeme Birim Fiyatları</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/90 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Plus Donanım Kalemi</th>
                        <th className="py-2.5 px-3">Uygulama Kapsamı</th>
                        <th className="py-2.5 px-3 text-right">Şantiye Maliyeti (₺/Daire)</th>
                        <th className="py-2.5 px-3 text-right">Toplam Ek İmalat (₺)</th>
                        <th className="py-2.5 px-3 text-right">Müşteriye Sunulan (₺/Daire)</th>
                        <th className="py-2.5 px-3 text-right">Birim Net Kâr (₺)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {dualData.itemizedContractorCosts.map((item) => {
                        const itemShareOfCustomer = dualData.calculatedAvgCostPerFlatDiff > 0
                          ? Math.round(dualData.customerFlatDelta * (item.unitCost / dualData.calculatedAvgCostPerFlatDiff))
                          : item.unitCost;
                        const itemUnitProfit = itemShareOfCustomer - item.unitCost;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-white font-semibold flex items-center gap-2">
                              <span>{item.icon}</span>
                              <span>{item.name}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[9.5px]">
                                {item.scope}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">
                              {item.unitCost.toLocaleString('tr-TR')} ₺
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-indigo-300 font-bold">
                              {item.totalCost.toLocaleString('tr-TR')} ₺
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sky-300">
                              {itemShareOfCustomer.toLocaleString('tr-TR')} ₺
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              <span className={itemUnitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {itemUnitProfit >= 0 ? '+' : ''}{itemUnitProfit.toLocaleString('tr-TR')} ₺
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Toplam Satırı */}
                      <tr className="bg-slate-900 border-t-2 border-slate-700 text-white font-bold">
                        <td className="py-2.5 px-3" colSpan={2}>
                          GENEL PLUS PAKET TOPLAMI
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-300">
                          {dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-300">
                          {dualData.calculatedTotalCostDiff.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sky-300">
                          {dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                          {dualData.unitProfitPerFlat >= 0 ? '+' : ''}{dualData.unitProfitPerFlat.toLocaleString('tr-TR')} ₺
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. MÜŞTERİYE SUNULACAK DAİRE BAŞI FARK GİRİŞİ & HIZLI KÂR SİMÜLATÖRÜ */}
              <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border-2 border-amber-400/60 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      Müşteriye Sunulacak Daire Başı Plus Farkını Belirleyin
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Yüzdelik kâr butonlarına basarak veya özel tutar girerek teklif mektubunda müşterinin göreceği daire başı Plus bedelini belirleyin.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {deltaNotification && (
                      <span className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                        {deltaNotification}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-400 text-slate-950 shrink-0">
                      Teklif Belgesine Yansır
                    </span>
                  </div>
                </div>

                {/* Quick Percentage Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-400" />
                      Hızlı Kâr Marjı ve Yuvarlama Butonları:
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Net Şantiye Maliyeti: <strong className="text-amber-300">{dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺/daire</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {deltaPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyDelta(preset.value, preset.label)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          preset.isActive
                            ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30 ring-2 ring-amber-300 scale-[1.03]'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
                        }`}
                        title={`${preset.label} - Daire Başı ${preset.displayVal.toLocaleString('tr-TR')} ₺`}
                      >
                        {preset.isActive ? (
                          <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-700/80 text-slate-300 font-mono">
                            {preset.percentBadge}
                          </span>
                        )}
                        <span>{preset.label}</span>
                        <span className={`font-mono text-[11px] ${preset.isActive ? 'text-slate-950 font-black' : 'text-amber-400'}`}>
                          ({preset.displayVal.toLocaleString('tr-TR')} ₺)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fine-Tuning & Custom Input Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-800">
                  <div className="lg:col-span-6 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStepDelta(-5000)}
                      className="px-2.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
                      title="5.000 ₺ Azalt"
                    >
                      <Minus className="w-3.5 h-3.5 text-amber-400" />
                      <span>-5.000 ₺</span>
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={params.plusOfferCustomFlatDelta ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined;
                          handleApplyDelta(val, 'Özel Tutar');
                        }}
                        placeholder={`Maliyet: ${dualData.calculatedAvgCostPerFlatDiff.toLocaleString('tr-TR')} ₺`}
                        className="w-full text-base font-black font-mono px-4 py-2.5 rounded-xl border-2 border-amber-400 bg-slate-950 text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                      />
                      <span className="absolute right-3 top-[11px] text-xs font-black text-amber-400 pointer-events-none">
                        ₺ / Daire
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStepDelta(5000)}
                      className="px-2.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
                      title="5.000 ₺ Arttır"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+5.000 ₺</span>
                    </button>
                  </div>

                  <div className="lg:col-span-6 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Daire Başı Net İlave Kâr:</span>
                      <span className={`font-mono text-sm font-black ${dualData.contractorNetMarginPerFlat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {dualData.contractorNetMarginPerFlat >= 0 ? '+' : ''}{dualData.contractorNetMarginPerFlat.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Toplam Şirket Ek Kârı:</span>
                      <span className={`font-mono text-sm font-black ${dualData.contractorNetTotalProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {dualData.contractorNetTotalProfit >= 0 ? '+' : ''}{dualData.contractorNetTotalProfit.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyDelta(undefined, 'Maliyetine Sıfırla')}
                      className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                      title="Sıfırla ve teknik maliyete dön"
                    >
                      Sıfırla (%0)
                    </button>
                  </div>
                </div>
              </div>

              {/* Güvenlik & Gizlilik Bildirimi */}
              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Gizlilik Garantisi:</strong> Yukarıdaki maliyet farkı, şantiye taşeron bedelleri ve yüklenici net kâr rakamları yalnızca sizin ekranınızda görünür. Müşteriye sunulan resmi teklif özetinde, mukavele ekinde ve PDF çıktısında sadece müşteriye sunduğunuz nihai Plus Paket tutarı yer alır.
                </span>
              </div>
            </div>

            {/* 5. Live Dual Financial KPI Preview Bar (Customer Presentation Preview) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">1. Seçenek ({dualData.baseTitle}):</span>
                <div className="text-base font-extrabold text-white font-mono mt-0.5">
                  {dualData.customerBaseGrandTotal.toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-[11px] text-slate-300 font-medium">
                  🏠 Daire Başı: <strong className="font-mono text-white">{dualData.baseFlatShare.toLocaleString('tr-TR')} ₺</strong>
                </div>
                {dualData.hasShops && (
                  <div className="text-[11px] text-indigo-300 font-medium">
                    🏪 Dükkan Başı: <strong className="font-mono text-indigo-200">{dualData.baseShopShare.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-purple-300 font-bold uppercase block">2. Seçenek ({dualData.plusTitle}):</span>
                  {dualData.isCustomDeltaApplied && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">Özel Fiyatlı</span>
                  )}
                </div>
                <div className="text-base font-extrabold text-purple-300 font-mono mt-0.5">
                  {dualData.customerPlusGrandTotal.toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-[11px] text-purple-200 font-medium">
                  🏠 Daire Başı: <strong className="font-mono text-purple-100">{dualData.plusFlatShare.toLocaleString('tr-TR')} ₺</strong>
                </div>
                {dualData.hasShops && (
                  <div className="text-[11px] text-indigo-200 font-medium">
                    🏪 Dükkan Başı: <strong className="font-mono text-indigo-100">{dualData.plusShopShare.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                )}
              </div>

              <div className="sm:border-l sm:border-slate-800 sm:pl-4 flex flex-col justify-center">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">Müşteriye Sunulan Plus Farkı:</span>
                <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                  +{dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺ / Daire
                </div>
                <div className="text-[10px] text-slate-400">
                  Toplam Proje Farkı: +{dualData.customerTotalCostDiff.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Corporate Proposal Sheet */}
      <div
        ref={offerDocRef}
        onCopy={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        className="relative overflow-hidden select-none copy-protected bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-slate-800 print:border-none print:shadow-none print:p-0 print:text-black"
      >
        {/* Subtle Watermark */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.02] flex flex-wrap gap-20 justify-center items-center rotate-12 z-0">
          {Array.from({ length: 36 }).map((_, i) => (
            <span key={i} className="text-slate-900 font-extrabold text-xs tracking-widest whitespace-nowrap">
              {compName} PROJE VİZYON VE ÖN TEKLİF BELGESİ
            </span>
          ))}
        </div>

        {/* ========================================================
            0.1. PRE-OFFER INTRO PRESENTATION PAGE (REACT PREVIEW)
           ======================================================== */}
        {params.showIntroPresentation && (
          <div className="relative z-10 border-b border-purple-100 pb-10 mb-12 print:break-after-page break-after-page">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b-2 border-purple-600 pb-4 mb-8">
              <div className="flex items-center gap-3">
                <Logo size="md" variant="full" theme={theme} />
                <div>
                  <span className="font-extrabold text-sm text-purple-950 block">{compName}</span>
                  <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">Proje Önsözü & Değer Sunumu</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full">Özel Sunum</span>
            </div>

            {/* Main Visual Banner */}
            <div className="text-center py-10 px-6 mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white shadow-xs">
              <h2 className="text-xl font-black mb-2">Geleceği Güvenle İnşa Ediyoruz</h2>
              <p className="text-xs opacity-95 max-w-xl mx-auto font-medium">
                {params.projectAddress || 'Belirtilen Adres'} Kentsel Dönüşüm ve Yaşam Projesi Değer Teklifi
              </p>
            </div>

            {/* Intro Text Card */}
            <div className="bg-purple-50/40 border border-purple-100 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider mb-3 pb-2 border-b border-purple-100">
                Neleri, Neden ve Nasıl Yapıyoruz?
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed text-justify whitespace-pre-wrap font-medium">
                {params.introExplanation || "1960'lardan bugüne uzanan köklü inşaat tecrübemiz ve üçüncü nesil dinamizmimizle, kentsel dönüşüm projelerimizde hem güvenliği hem de modern konfor standartlarını en üst düzeyde buluşturuyoruz. Sektördeki yarım asrı aşan birikimimizle tasarladığımız bu projede, bütçe dostu akılcı maliyet çözümleri sunarken, en güncel deprem yönetmeliklerine ve güvenlik standartlarına tavizsiz şekilde uyuyoruz. Depreme tam dayanıklı mühendislik anlayışımızı, yaşamı kolaylaştıran modern mimari detaylarla harmanlayarak sizler için uzun ömürlü, değerli ve huzurlu yaşam alanları inşa ediyoruz."}
              </p>
            </div>

            {/* Value Proposition Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="bg-white border border-slate-150 p-4 rounded-xl">
                <strong className="text-purple-900 font-extrabold text-xs block mb-1">🛡️ Deprem Güvenliği Odaklılık</strong>
                <span className="text-[11px] text-slate-500 leading-normal block">
                  Tüm taşıyıcı sistemlerimizi güncel deprem yönetmeliklerinin de ötesinde, en yüksek sınıf hazır beton ve sismik çelik donatı standartlarıyla tasarlıyoruz.
                </span>
              </div>
              <div className="bg-white border border-slate-150 p-4 rounded-xl">
                <strong className="text-purple-900 font-extrabold text-xs block mb-1">🌱 Sürdürülebilirlik & Enerji Verimliliği</strong>
                <span className="text-[11px] text-slate-500 leading-normal block">
                  Yerden ısıtma, yüksek yalıtımlı cephe sistemleri ve akıllı su tasarrufu çözümleriyle çevre dostu, işletme maliyeti düşük binalar üretiyoruz.
                </span>
              </div>
            </div>

            {/* Page Footer */}
            <div className="mt-12 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium font-mono">
              <span>{compLegal}</span>
              <span>Sayfa I</span>
            </div>
          </div>
        )}

        {/* ========================================================
            0.2. COMPANY HISTORY & PROFILE PAGE (REACT PREVIEW)
           ======================================================== */}
        {params.showCompanyHistory && (
          <div className="relative z-10 border-b border-purple-100 pb-10 mb-12 print:break-after-page break-after-page">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b-2 border-purple-600 pb-4 mb-8">
              <div className="flex items-center gap-3">
                <Logo size="md" variant="full" theme={theme} />
                <div>
                  <span className="font-extrabold text-sm text-purple-950 block">{compName}</span>
                  <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">Kurumsal Profil & Firma Geçmişi</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full">Kurumsal Profil</span>
            </div>

            {/* Top Grid: History & Mission/Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Left Column: History */}
              <div className="bg-purple-50/40 border border-purple-100 p-4.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider mb-2 pb-1.5 border-b border-purple-100">
                    🏢 Biz Kimiz? Şirket Tarihçemiz
                  </h3>
                  <p className="text-[10.5px] text-slate-700 leading-relaxed text-justify whitespace-pre-wrap font-medium">
                    {params.companyHistoryText || "1960’lı yıllarda kurucumuz Emin Ahmetbeyoğlu’nun vizyonuyla temelleri atılan inşaat serüvenimiz, yarım asrı aşan tecrübesiyle sektördeki köklü yürüyüşünü sürdürmektedir. İkinci kuşak temsilcilerimiz Faruk Ahmetbeyoğlu ve aile büyüklerimizin öncülüğünde; Laleli, Fatih, Kocamustafapaşa, Silivrikapı, Samatya ve Yedikule gibi İstanbul’un tarihi suriçi bölgelerinde onlarca nitelikli projeye imza atarak şehrin dokusuna kalıcı değerler kattık.\n\n2010’lu yıllarda piyasa dinamiklerindeki değişimleri doğru okuyarak kurumsal yatırımlarımızı sağlık ve tarım gibi stratejik sektörlere de yönlendirdik ve vizyonumuzu daha da genişlettik. Bugün ise edindiğimiz bu çok yönlü kurumsal tecrübe ve artan sektörel talepler doğrultusunda, üçüncü nesil olarak inşaat markamızı çağın gereksinimlerine uygun, dinamik ve yenilikçi bir altyapıyla yeniden yapılandırıyoruz.\n\nGeçmişten aldığımız güven mirasını, geleceğin teknolojileriyle harmanlayarak kaldığımız yerden, daha güçlü bir şekilde üretmeye devam ediyoruz."}
                  </p>
                </div>
              </div>

              {/* Right Column: Mission, Vision & Assurance */}
              <div className="space-y-3.5 flex flex-col justify-between">
                <div className="bg-white border-l-4 border-purple-600 p-3.5 rounded-r-xl border border-y-slate-150 border-r-slate-150 shadow-2xs">
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider mb-1">
                    🎯 Misyonumuz
                  </h3>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed text-justify whitespace-pre-wrap">
                    {params.companyMission || "Köklerimizden aldığımız tecrübeyi modern mühendislik çözümlermiyle birleştirerek; insan odaklı, yapısal güvenliği merkeze alan ve yaşam standartlarını daima yukarı taşıyan projeler üretmektir."}
                  </p>
                </div>

                <div className="bg-white border-l-4 border-indigo-600 p-3.5 rounded-r-xl border border-y-slate-150 border-r-slate-150 shadow-2xs">
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-1">
                    🚀 Vizyonumuz
                  </h3>
                  <p className="text-[10.5px] text-slate-600 leading-relaxed text-justify whitespace-pre-wrap">
                    {params.companyVision || "Geleneksel inşaat kültürümüzü modern mimari trendlerle zenginleştirerek, müşterilerimiz için hem yüksek kaliteli hem de bütçe dostu, ulaşılabilir ve akılcı yaşam alanları inşa eden öncü bir marka olmaktır."}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-slate-50 via-purple-50/30 to-indigo-50/20 p-2.5 rounded-xl flex items-center gap-3 border border-slate-200">
                  <span className="text-xl shrink-0">⭐</span>
                  <div>
                    <strong className="text-slate-800 text-[10.5px] block font-bold">Yüksek Mühendislik & Kalite Güvencesi</strong>
                    <span className="text-[9.5px] text-slate-500 leading-tight block">
                      Projelerimiz, İMO üyesi yetkin statikerler ve uzman mimarlar gözetiminde 1. sınıf standartlarda inşa edilir.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Horizontal Spread: Tamamlanan Referans Projeler */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
              <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-amber-500">🏆</span> Tamamlanan Referans Projeler
                </h3>
                <span className="text-[9.5px] text-purple-700 bg-purple-50 font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
                  İstanbul Geneli Yarım Asırlık Miras
                </span>
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(params.companyCompletedProjects || getCompletedProjectsText())
                  .split('\n')
                  .filter(p => p.trim().length > 0)
                  .map((p, idx) => (
                    <li key={idx} className="text-[9px] text-slate-700 bg-slate-50 border border-slate-150 hover:border-purple-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 transition-colors">
                      <span className="text-purple-600 font-extrabold shrink-0 text-[10px]">📍</span>
                      <span className="truncate font-medium">{p.replace(/^\d+[\.\)]\s*/, '')}</span>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Page Footer */}
            <div className="mt-12 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium font-mono">
              <span>{compLegal}</span>
              <span>Sayfa II</span>
            </div>
          </div>
        )}

        {/* ========================================================
            1. CORPORATE HEADER & PROPOSAL METADATA
           ======================================================== */}
        <div className="relative z-10 border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Brand / Logo / Legal */}
            <div className="flex items-start gap-4">
              <Logo size="lg" variant="full" theme={theme} />
              <div className="space-y-0.5">
                <h1 className="text-lg font-bold text-slate-950 tracking-tight leading-tight">
                  {compLegal}
                </h1>
                <p className="text-xs text-indigo-700 font-medium">{compSlogan}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1 font-mono">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {compAddress}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {compPhone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {compEmail}</span>
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-slate-400" /> {compTax}</span>
                </div>
              </div>
            </div>

            {/* Right: Proposal Document Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 min-w-[220px] text-right font-mono text-xs space-y-1 self-start md:self-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">RESMÎ BELGE KÜNYESİ</div>
              <div className="text-slate-900 font-bold text-sm text-indigo-900">{proposalNumber}</div>
              <div className="text-slate-600 text-[11px]">Tarih: <span className="font-semibold text-slate-900">{proposalDate}</span></div>
              <div className="text-slate-600 text-[11px]">Geçerlilik: <span className="font-semibold text-emerald-700">{validityDate} (30 Gün)</span></div>
              <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-200">Yetkili: {compAuth}</div>
            </div>
          </div>

          {/* Centered Document Title Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                BİNA YAPIM VE KENTSEL DÖNÜŞÜM TEKLİFİ
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {isContractorShareModel 
                  ? 'Kat Karşılığı İnşaat ve Bağımsız Bölüm Paylaşım Teklifi' 
                  : 'Anahtar Teslim Bina Yapım ve Hakedişli Finansman Teklifi'}
              </h2>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-slate-500 block">Yapım Modeli</span>
              <span className="text-xs font-bold text-slate-800">
                {isContractorShareModel ? '🤝 Arsa Payı Kat Karşılığı' : '🏗️ Hak Sahipleri Öz Finansmanlı / Hakedişli'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. PROJECT VISION & VALUES (VIZYON VE DEĞERLER)
           ======================================================== */}
        <div className="relative z-10 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-6 bg-rose-50/50 rounded-3xl border border-rose-100">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mb-4 text-rose-600">
                <Home className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Yaşam Odaklı Tasarım</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Her metrekaresi huzurunuz için tasarlandı. Sadece bir yapı değil, nesiller boyu güvenle yaşayacağınız modern bir yuva inşa ediyoruz.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Maksimum Güvenlik</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                En güncel deprem yönetmeliklerine uygun, ileri mühendislik teknikleri ve C35/40 sınıfı beton kalitesiyle sarsılmaz bir temel atıyoruz.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Şeffaf ve Adil Süreç</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tüm maliyetleri ve planlamayı en başından paylaşıyor, her aşamada tam şeffaflıkla haklarınızı ve geleceğinizi koruyoruz.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            3. PROJECT & LAND SPECIFICATION MATRIX (PROJE KÜNYESİ)
           ======================================================== */}
        <div className="relative z-10 mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-1 h-4 bg-indigo-600 rounded-full" />
              <span>I. MİMARİ VE TEKNİK KÜNYE</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              <MapPin className="w-3 h-3" />
              <span>{params.projectAddress || 'Proje Uygulama Sahası'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={handleOpenUnitConfig}
              className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative"
              title="Kat yapısı ve daire sayısını düzenlemek için tıklayın"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kat Yapısı</span>
                <span className="text-[9px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded">
                  <Sliders className="w-2.5 h-2.5" /> Düzenle
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {results.floorStructure?.shortLabel || `Z+${(params.floorCount || 5) - 1} Kat`}
              </div>
              <span className="text-[10px] text-slate-500">
                {results.floorStructure?.detailedLabel || `${params.floorCount || 5} Katlı Yapı`}
              </span>
            </div>

            <div 
              onClick={handleOpenUnitConfig}
              className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative"
              title="Daire ve dükkan dağılımını düzenlemek için tıklayın"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bağımsız Bölüm</span>
                <span className="text-[9px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded">
                  <Sliders className="w-2.5 h-2.5" /> Düzenle
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {results.unitBreakdown?.shortLabel || `${residentialCount} Daire ${shopCount > 0 ? `+ ${shopCount} Dükkan` : ''}`}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {results.unitBreakdown?.detailedLabel || `${residentialCount + shopCount} Bağımsız Bölüm`}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">İmalat Birim Fiyatları</span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <span>🏠</span> Konut:
                  </span>
                  <div className="text-right">
                    <span className="text-emerald-700 font-mono">~{dualData.baseFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²</span>
                    <span className="text-[9px] text-slate-400 block font-normal">Ort. {dualData.baseFlatShare.toLocaleString('tr-TR')} ₺/daire</span>
                  </div>
                </div>
                {params.hasGroundFloorShop && (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                    <span className="text-[10px] text-indigo-700 font-medium flex items-center gap-1">
                      <span>🏪</span> Dükkan:
                    </span>
                    <div className="text-right">
                      <span className="text-indigo-700 font-mono">~{dualData.baseShopUnitPrice.toLocaleString('tr-TR')} ₺/m²</span>
                      <span className="text-[9px] text-indigo-400 block font-normal">Ort. {dualData.baseShopShare.toLocaleString('tr-TR')} ₺/dükkan</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Teslim Süresi</span>
              <div className="text-sm font-bold text-indigo-600">
                {results.finalMonths} Ay
              </div>
              <span className="text-[10px] text-slate-500">Anahtar Teslim</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            4. TECHNICAL SPECIFICATIONS & QUALITY (TEKNİK STANDARTLAR)
           ======================================================== */}
        <div className="relative z-10 mb-10">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-1 h-4 bg-indigo-600 rounded-full" />
              <span>III. YAPISAL KALİTE VE TEKNİK STANDARTLAR</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-slate-100 text-indigo-600">🏗️</div>
              <div>
                <h5 className="font-bold text-slate-900 mb-1">Deprem Güvenliği ve Altyapı</h5>
                <p className="text-[10px] text-slate-600">C35/40 sınıfı yüksek mukavemetli beton ve radye temel sistemi ile depreme karşı tam koruma. Çift kat membranlı temel yalıtımı ile ömür boyu rutubetsiz bir yapı.</p>
              </div>
            </div>

            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-slate-100 text-indigo-600">🏠</div>
              <div>
                <h5 className="font-bold text-slate-900 mb-1">Enerji Verimliliği ve Konfor</h5>
                <p className="text-[10px] text-slate-600">Taşyünü dış cephe yalıtımı ve Isıcam Konfor serisi camlar ile maksimum enerji tasarrufu. Akıllı mekanik tesisat çözümleri ve konfor odaklı iç mekan tasarımı.</p>
              </div>
            </div>
          </div>

          {/* İNOVATİF SEÇENEKLER VE KONFOR DONANIMLARI */}
          <div className="mt-6 p-5 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 rounded-2xl border border-purple-100/70 space-y-6">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h4 className="text-xs font-black text-purple-950 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                İnovatif Teknoloji ve Yaşam Konforu Donanımları
              </h4>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                Teklife Eklenen & Opsiyonel Donanımlar
              </span>
            </div>
            
            {/* 1. GRUP: İKLİMLENDİRME VE MERKEZİ TESİSAT */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                1. İklimlendirme ve Tesisat Altyapısı
              </span>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Yerden Isıtma */}
                <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-purple-500" />
                        Yerden Isıtma Sistemi (Sulu)
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasUnderfloorHeating ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {params.hasUnderfloorHeating ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      <strong>Alternatifi (Petek/Radyatör) ile Karşılaştırmalı Avantajları:</strong>
                    </p>
                    <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>Maksimum Isı Konforu:</strong> Isı zeminden homojen yükselir; ayakları sıcak, başı serin tutan ideal fizyolojik ısı dağılımı sağlar.</li>
                      <li><strong>%15-20 Yakıt Tasarrufu:</strong> 35-40°C su sıcaklığı ile çalıştığı için kombi/ısı pompası tüketimini ve faturaları azaltır.</li>
                      <li><strong>Estetik ve Alan Kazancı:</strong> Odalardaki petekleri elemine ederek mobilya yerleşim özgürlüğü sağlar.</li>
                      <li><strong>Hipoalerjenik & Sağlıklı:</strong> Toz sirkülasyonu yapmaz, ev tozu akarı ve rutubeti engeller.</li>
                    </ul>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">Yatırım Değeri:</span>
                    <span className="font-black text-purple-700 font-mono">
                      {params.hasUnderfloorHeating 
                        ? `${results.underfloorHeatingCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                        : `+${results.underfloorHeatingCost?.toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                    </span>
                  </div>
                </div>

                {/* Card 2: Su Arıtma */}
                <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        Bina Girişi Merkezi Su Arıtma
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasWaterFiltration ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {params.hasWaterFiltration ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      <strong>Alternatifi (Bireysel Arıtıcı & Damacana) ile Karşılaştırmalı Avantajları:</strong>
                    </p>
                    <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>Bütünsel Koruma:</strong> Şebeke girişinden itibaren tortu, klor, kireç ve ağır metallerden arındırılmış su sağlar.</li>
                      <li><strong>Cihaz ve Tesisat Ömrü:</strong> Kireç oluşumunu önleyerek kombi ve beyaz eşyaların ömrünü 2 kat uzatır.</li>
                      <li><strong>Cilt ve Saç Sağlığı:</strong> Duşta klorsuz yumuşak su ile cilt kuruluğunu ve saç dökülmesini azaltır.</li>
                      <li><strong>Ekonomik Bağımsızlık:</strong> Damacana taşıma derdine ve filtre değişim masraflarına son verir.</li>
                    </ul>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">Yatırım Değeri:</span>
                    <span className="font-black text-purple-700 font-mono">
                      {params.hasWaterFiltration 
                        ? `${results.waterFiltrationCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                        : `+${results.waterFiltrationCost?.toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                    </span>
                  </div>
                </div>

                {/* Card 3: İklimlendirme ve Klima Sistemleri */}
                {(() => {
                  const currentAc = getAcOptionById(params.acType || '18k_btu');
                  return (
                    <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Wind className="w-3.5 h-3.5 text-indigo-500" />
                            A++ Inverter Klima Paketi
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasAcOption ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            {params.hasAcOption ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                          </span>
                        </div>
                        
                        <div className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/80 space-y-1 text-[10px]">
                          <div className="flex items-center justify-between font-bold text-indigo-950">
                            <span>{currentAc.shortTitle}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-200/70 text-indigo-900">{currentAc.energyClass}</span>
                          </div>
                          <div className="text-slate-600">
                            <strong>Kapasite:</strong> {currentAc.btu}
                          </div>
                          <div className="text-slate-600">
                            <strong>Salon Alanı:</strong> {currentAc.targetArea} ({currentAc.recommendedRoom})
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-600 leading-relaxed">
                          <strong>Standart İnşaata Göre Konfor ve Yaşam Avantajları:</strong>
                        </p>
                        <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
                          {currentAc.advantages.map((adv, idx) => (
                            <li key={idx}><strong>{adv.split(' ')[0]}:</strong> {adv.slice(adv.indexOf(' ') + 1)}</li>
                          ))}
                          <li><strong>Estetik Montaj:</strong> Sıva altı bakır boru ve drenaj altyapısı sıfır hata ile teslim edilir.</li>
                        </ul>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-slate-400 block">Yatırım Değeri:</span>
                          {params.hasAcOption && (
                            <span className="text-[9px] text-indigo-700 font-semibold">
                              {results.acUnitCount || results.flatCount} Ünite × {results.acCostPerFlat?.toLocaleString('tr-TR')} ₺
                            </span>
                          )}
                        </div>
                        <span className="font-black text-purple-700 font-mono">
                          {params.hasAcOption 
                            ? `${results.acCostTotal?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                            : `+${((results.flatCount || 1) * currentAc.avgPricePerFlat).toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 2. GRUP: BANYO KONFORU & EVİN BANYOSUNDAKİ YAŞAM KALİTESİNE YAPTIĞIMIZ DOKUNUŞLAR */}
            <div className="space-y-3 pt-3 border-t border-purple-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-purple-600" />
                  2. Evin Banyosundaki Yaşam Kalitesine Değer Katan Konfor Dokunuşları (Banyo & Duş Paketi)
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                  🏠 Yalnızca Konut Daireleri İçindir (Dükkanlarda duş olmadığından hariçtir)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 4: Termostatik Duş Bataryası */}
                <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Bath className="w-3.5 h-3.5 text-purple-600" />
                        Termostatik Duş Bataryası
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasThermostaticShowerMixer ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {params.hasThermostaticShowerMixer ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                      </span>
                    </div>
                    
                    <div className="p-2 bg-purple-50/50 rounded-lg border border-purple-100/80 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between font-bold text-purple-950">
                        <span>38°C Emniyet Kilidi & Sabit Sıcaklık</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200/70 text-purple-900 font-bold">%30 Su Tasarrufu</span>
                      </div>
                      <div className="text-slate-600">
                        <strong>Standart:</strong> Pirinç Gövde, Haşlanma Korumalı Kartuş & Duş Seti
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      <strong>Banyo Konforuna Katkıları & Avantajları:</strong>
                    </p>
                    <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>Haşlanma ve Yanma Önleyici:</strong> 38°C emniyet butonu sayesinde çocuklar ve yaşlılar için ani sıcak su yanma riskini sıfırlar.</li>
                      <li><strong>Sabit Sıcaklık Konforu:</strong> Evde başka bir musluk veya makine çalıştığında duş suyunda sıcaklık dalgalanması yaşanmaz.</li>
                      <li><strong>%30 Su Tasarrufu:</strong> Doğru sıcaklığı ayarlamak için boşa su akıtmayı tamamen önler.</li>
                    </ul>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-400 block">Yatırım Değeri:</span>
                      {params.hasThermostaticShowerMixer && (
                        <span className="text-[9px] text-purple-700 font-semibold">
                          {results.thermostaticMixerUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.thermostaticMixerPricePerFlat || 6500).toLocaleString('tr-TR')} ₺
                        </span>
                      )}
                    </div>
                    <span className="font-black text-purple-700 font-mono">
                      {params.hasThermostaticShowerMixer 
                        ? `${results.thermostaticMixerCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                        : `+${(((results.residentialUnitsCount ?? results.flatCount) || 1) * (params.thermostaticMixerPricePerFlat || 6500)).toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                    </span>
                  </div>
                </div>

                {/* Card 5: Duş Kabinine Lineer Su Süzgeci */}
                <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-teal-600" />
                        Lineer Duş Süzgeci & Kanalı
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasLinearShowerDrain ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {params.hasLinearShowerDrain ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                      </span>
                    </div>
                    
                    <div className="p-2 bg-teal-50/50 rounded-lg border border-teal-100/80 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between font-bold text-teal-950">
                        <span>304 Kalite Paslanmaz Çelik Izgara</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-200/70 text-teal-900 font-bold">Koku Çekvalfli</span>
                      </div>
                      <div className="text-slate-600">
                        <strong>Uygulama:</strong> Etekli İzolasyon Membranlı Hemzemin Duş Kanalı
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      <strong>Banyo Konforuna Katkıları & Avantajları:</strong>
                    </p>
                    <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>Hemzemin Mimari Estetik:</strong> Duş teknesi olmaksızın banyo seramiğiyle sıfır kotta modern ve engelsiz duş alanı yaratır.</li>
                      <li><strong>%100 Koku ve Böcek Bariyeri:</strong> Çift hazneli koku klapesi (çekvalf) sayesinde giderden kötü koku ve haşere geçişini kesin engeller.</li>
                      <li><strong>Hızlı Drenaj ve Kolay Temizlik:</strong> Geniş ızgara yüzeyi ve entegre saç tutucu filtresiyle su birikmesini önler.</li>
                    </ul>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-400 block">Yatırım Değeri:</span>
                      {params.hasLinearShowerDrain && (
                        <span className="text-[9px] text-teal-700 font-semibold">
                          {results.linearDrainUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.linearDrainPricePerFlat || 2800).toLocaleString('tr-TR')} ₺
                        </span>
                      )}
                    </div>
                    <span className="font-black text-purple-700 font-mono">
                      {params.hasLinearShowerDrain 
                        ? `${results.linearDrainCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                        : `+${(((results.residentialUnitsCount ?? results.flatCount) || 1) * (params.linearDrainPricePerFlat || 2800)).toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                    </span>
                  </div>
                </div>

                {/* Card 6: Nem Sensörlü Sessiz Banyo Fanı */}
                <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Fan className="w-3.5 h-3.5 text-cyan-600" />
                        Nem Sensörlü Sessiz Banyo Fanı
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasBathroomHumidityFan ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {params.hasBathroomHumidityFan ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                      </span>
                    </div>
                    
                    <div className="p-2 bg-cyan-50/50 rounded-lg border border-cyan-100/80 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between font-bold text-cyan-950">
                        <span>Elektronik Nem Sensörü (Higrostat)</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-200/70 text-cyan-900 font-bold">25 dB Sessiz</span>
                      </div>
                      <div className="text-slate-600">
                        <strong>Özellik:</strong> Otomatik Nem Algılama + Geri Tepme Klapesi
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      <strong>Banyo Konforuna Katkıları & Avantajları:</strong>
                    </p>
                    <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>Buhar ve Küf Önleme:</strong> Duş sırasında nem %60 eşiğini aştığında otomatik devreye girer; ayna buğulanmasını ve duvar küflenmesini önler.</li>
                      <li><strong>Geri Tepme Klapesi:</strong> Şafttan alt/üst katların yemek ve sigara kokularının banyoya sızmasını kesin olarak bloke eder.</li>
                      <li><strong>25 dB Ultra Sessiz:</strong> Fısıltı seviyesinde çalışarak gece kullanımında dahi ev sakinlerini asla rahatsız etmez.</li>
                    </ul>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-400 block">Yatırım Değeri:</span>
                      {params.hasBathroomHumidityFan && (
                        <span className="text-[9px] text-cyan-700 font-semibold">
                          {results.bathroomHumidityFanUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.bathroomHumidityFanPricePerFlat || 3200).toLocaleString('tr-TR')} ₺
                        </span>
                      )}
                    </div>
                    <span className="font-black text-purple-700 font-mono">
                      {params.hasBathroomHumidityFan 
                        ? `${results.bathroomHumidityFanCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                        : `+${(((results.residentialUnitsCount ?? results.flatCount) || 1) * (params.bathroomHumidityFanPricePerFlat || 3200)).toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. GRUP: GÜNLÜK KULLANIMI KOLAYLAŞTIRAN MUTFAK VE BANYO KONFORU */}
            <div className="space-y-3 pt-3 border-t border-purple-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-purple-600" />
                  3. Pratik ve Hijyenik Mutfak & Banyo Çözümleri
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                  🏠 Yalnızca Konut Daireleri İçindir (Dükkanlar muaftır)
                </span>
              </div>

              {/* Kurumsal Farkındalık Bannerı */}
              <div className="p-3.5 bg-gradient-to-r from-purple-100/70 via-pink-50/70 to-indigo-50/70 rounded-xl border border-purple-200 text-purple-950 flex items-center gap-3">
                <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-purple-900 font-bold">Hayatı Kolaylaştıran Mühendislik Anlayışı:</strong>
                  <p className="text-[11px] text-purple-800/90 mt-0.5">
                    "Mutfak eviyesi ve banyo lavabosu için fotoselli bataryalar ile günlük kullanımı kolaylaştıran, hijyeni ve su tasarrufunu en ince detayına kadar düşünen öncü bir firmayız."
                  </p>
                </div>
              </div>

              {/* Card 7: Fotoselli Mutfak ve Banyo Bataryaları */}
              <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Mutfak Eviyesi & Banyo Lavabosu Fotoselli Batarya Paketi
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasTouchlessKitchenFaucet ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {params.hasTouchlessKitchenFaucet ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                    </span>
                  </div>
                  
                  <div className="p-2 bg-pink-50/50 rounded-lg border border-pink-100/80 space-y-1 text-[10px]">
                    <div className="flex items-center justify-between font-bold text-pink-950">
                      <span>Kızılötesi Hassas Sensör & Çift Akış Modu</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-200/70 text-pink-900 font-bold">%40 Su Tasarrufu</span>
                    </div>
                    <div className="text-slate-600">
                      <strong>Standart:</strong> Spiralli Çek-Bırak Başlık, Parmak İzi Bırakmayan Paslanmaz Kaplama
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    <strong>Neden Mutfak ve Banyo Lavabosunda Fotoselli Batarya? (Günlük Hayatı Nasıl Kolaylaştırır?):</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-600">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">✋ Temassız ve Hijyenik Kullanım:</span>
                      <p>Mutfakta yemek hazırlarken veya banyoda sabunlu/kirli ellerle batarya kollarına dokunmadan su akışını temassız kontrol etme imkanı sunar.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">🧽 Tezgah ve Lavabo Su Damlamalarına Son:</span>
                      <p>Islak ellerle bataryaya uzanırken tezgah arkasına veya mermer üstüne su damlamasını, kireç lekelerini ve sürekli mermer silme derdini tamamen yok eder.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">🦠 Çapraz Bulaşmayı Sıfırlar:</span>
                      <p>Çiğ gıdalarla temas eden bakterilerin musluk kolundan diğer yüzeylere taşınmasını önleyerek en üst düzey mutfak hijyeni sağlar.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">💧 Otomatik Kapanma & Tasarruf:</span>
                      <p>El çekildiğinde suyu anında keserek suyun açık unutulmasını önler, ev bütçesine %40'a varan su tasarrufu sağlar.</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-400 block">Yatırım Değeri:</span>
                    {params.hasTouchlessKitchenFaucet && (
                      <span className="text-[9px] text-purple-700 font-semibold">
                        {results.touchlessKitchenFaucetUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.touchlessKitchenFaucetPricePerFlat || 8500).toLocaleString('tr-TR')} ₺
                      </span>
                    )}
                  </div>
                  <span className="font-black text-purple-700 font-mono">
                    {params.hasTouchlessKitchenFaucet 
                      ? `${results.touchlessKitchenFaucetCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                      : `+${(((results.residentialUnitsCount ?? results.flatCount) || 1) * (params.touchlessKitchenFaucetPricePerFlat || 8500)).toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                  </span>
                </div>
              </div>

              {/* Card 8: Motorlu & Biyometrik Akıllı Daire Kapısı Kilitleri (DESİ / Kale / Smart) */}
              <div className="bg-white rounded-xl border border-purple-100 p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Motorlu & Biyometrik Akıllı Daire Kapısı Kilit Sistemi
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${params.hasSmartDoorLock ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {params.hasSmartDoorLock ? 'Teklife Dahil' : 'Opsiyonel Upgrade'}
                    </span>
                  </div>
                  
                  <div className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/80 space-y-1 text-[10px]">
                    <div className="flex items-center justify-between font-bold text-indigo-950">
                      <span>Parmak İzi + Şifre + Mobil Uygulama</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-200/70 text-indigo-900 font-bold">DESİ / Kale / Smart</span>
                    </div>
                    <div className="text-slate-600">
                      <strong>Standart:</strong> Motorlu Çelik Kapı Kilidi, Dokunmatik Şifre Paneli & Biyometrik Sensör
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    <strong>Neden Akıllı Motorlu Daire Kapı Kilidi? (Güvenlik & Yaşam Konforu):</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-600">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">🗝️ Anahtar Taşıma ve Unutma Derdine Son:</span>
                      <p>Mekanik anahtar kaybetme, kapıda kalma, çilingir çağırma veya yedek anahtar yaptırma sorunlarını tamamen bitirir.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">👆 3 Farklı Güvenli Giriş Yöntemi:</span>
                      <p>Yüksek hassasiyetli parmak izi okuyucu, dokunmatik şifre tuş takımı ve mobil uygulama (Bluetooth / Wi-Fi) ile anında geçiş sağlar.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">🔒 Otomatik Motorlu Kilitleme:</span>
                      <p>Kapı kapandığında çelik milleri motor gücüyle otomatik sürer. Kapı tam kapanmadığında sesli ikaz vererek üst düzey güvenlik sağlar.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-800 block">📱 Mobil Uygulamalı Geçiş Yönetimi:</span>
                      <p>DESİ, Kale veya Smart mobil uygulaması üzerinden misafirlere geçici şifre tanımlama ve giriş loglarını takip etme imkanı sunar.</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-400 block">Yatırım Değeri:</span>
                    {params.hasSmartDoorLock && (
                      <span className="text-[9px] text-purple-700 font-semibold">
                        {results.smartDoorLockUnits ?? results.residentialUnitsCount ?? results.flatCount} Konut × {(params.smartDoorLockPricePerFlat || 8500).toLocaleString('tr-TR')} ₺
                      </span>
                    )}
                  </div>
                  <span className="font-black text-purple-700 font-mono">
                    {params.hasSmartDoorLock 
                      ? `${results.smartDoorLockCost?.toLocaleString('tr-TR')} ₺ (Bütçeye Dahil)` 
                      : `+${(((results.residentialUnitsCount ?? results.flatCount) || 1) * (params.smartDoorLockPricePerFlat || 8500)).toLocaleString('tr-TR')} ₺ fark ile eklenebilir`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ÇİFT SEÇENEKLİ TEKLİF VE PAKET KARŞILAŞTIRMA MATRİSİ (DUAL OFFER İÇİN BELGE İÇİ GÖRÜNÜM) */}
          {isDualOffer && (
            <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white rounded-3xl border-2 border-indigo-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                <div>
                  <h4 className="text-sm font-black text-indigo-950 flex items-center gap-2 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Seçenekli Teklif ve Paket Karşılaştırma Matrisi (Baz vs. Plus)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Kat malikleri kurulunun bütçe ve konfor beklentilerine göre tercih edebileceği 2 farklı resmî teklif seçeneği aşağıda karşılaştırmalı olarak sunulmuştur.
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold shrink-0">
                  2 Alternatifli Resmî Paket
                </span>
              </div>

              {/* Side-by-Side Comparison Executive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. SEÇENEK: BAZ PAKET */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Teklif Seçeneği</span>
                        <h5 className="text-base font-black text-slate-900">{dualData.baseTitle}</h5>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                        Temel Standart
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Yasal deprem ve yangın yönetmeliklerine %100 uyumlu, C35/40 beton, radye temel, panel radyatörlü merkezi/bireysel ısıtma ve standart kaliteli ince işçilik içeren ekonomik yapım paketi.
                    </p>

                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Toplam İmalat Bedeli:</span>
                        <span className="font-bold font-mono text-slate-900">{dualData.customerBaseGrandTotal.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="flex items-center gap-1 font-medium">🏠 Daire Başı Pay (Konut):</span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-slate-900">{dualData.baseFlatShare.toLocaleString('tr-TR')} ₺</span>
                          <span className="text-[10px] text-slate-400 block font-normal">(~{dualData.baseFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²)</span>
                        </div>
                      </div>
                      {dualData.hasShops && (
                        <div className="flex justify-between items-center text-indigo-900 pt-1 border-t border-slate-200/60">
                          <span className="flex items-center gap-1 font-medium">🏪 Dükkan Başı Pay (Ticari):</span>
                          <div className="text-right">
                            <span className="font-bold font-mono text-indigo-950">{dualData.baseShopShare.toLocaleString('tr-TR')} ₺</span>
                            <span className="text-[10px] text-indigo-400 block font-normal">(~{dualData.baseShopUnitPrice.toLocaleString('tr-TR')} ₺/m²)</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
                        <span>Daire Başı Destek Sonrası Net Pay:</span>
                        <span className="text-emerald-700 font-mono">
                          {dualData.baseFlatNetDebt.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                      {dualData.hasShops && (
                        <div className="flex justify-between items-center font-bold text-slate-900 text-[11px]">
                          <span>Dükkan Başı Destek Sonrası Net Pay:</span>
                          <span className="text-indigo-800 font-mono">
                            {dualData.baseShopNetDebt.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    ✅ Standart radyatörlü ısıtma ve klasik bataryalar dahildir.
                  </div>
                </div>

                {/* 2. SEÇENEK: PLUS PAKET */}
                <div className="bg-gradient-to-b from-purple-50/70 to-white rounded-2xl border-2 border-purple-400 p-5 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block">2. Teklif Seçeneği (Tavsiye Edilen)</span>
                        <h5 className="text-base font-black text-purple-950 flex items-center gap-1.5">
                          <span>✨ {dualData.plusTitle}</span>
                        </h5>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-black shadow-xs">
                        Prestij & Konfor
                      </span>
                    </div>

                    <p className="text-xs text-purple-900/80 leading-relaxed">
                      Temel standartlara ilave olarak; peteksiz sulu yerden ısıtma, merkezi su arıtma, salon A++ inverter klima, termostatik duş bataryası, hemzemin lineer süzgeç, sessiz nem sensörlü banyo fanı ile mutfak eviyesi ve banyo lavabosunda temassız fotoselli bataryalar içeren yüksek katma değerli yaşam paketi.
                    </p>

                    <div className="p-3.5 bg-purple-100/60 rounded-xl space-y-2 border border-purple-200 text-xs">
                      <div className="flex justify-between items-center text-purple-900">
                        <span>Toplam İmalat Bedeli:</span>
                        <span className="font-bold font-mono text-purple-950">{dualData.customerPlusGrandTotal.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="flex justify-between items-center text-purple-950">
                        <span className="flex items-center gap-1 font-semibold">🏠 Daire Başı Pay (Konut):</span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-purple-950">{dualData.plusFlatShare.toLocaleString('tr-TR')} ₺</span>
                          <span className="text-[10px] text-purple-600 block font-normal">(~{dualData.plusFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²)</span>
                        </div>
                      </div>
                      {dualData.hasShops && (
                        <div className="flex justify-between items-center text-indigo-950 pt-1 border-t border-purple-200/70">
                          <span className="flex items-center gap-1 font-semibold">🏪 Dükkan Başı Pay (Ticari):</span>
                          <div className="text-right">
                            <span className="font-bold font-mono text-indigo-950">{dualData.plusShopShare.toLocaleString('tr-TR')} ₺</span>
                            <span className="text-[10px] text-indigo-500 block font-normal">(~{dualData.plusShopUnitPrice.toLocaleString('tr-TR')} ₺/m²)</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-purple-200 font-bold text-purple-950">
                        <span>Daire Başı Destek Sonrası Net Pay:</span>
                        <span className="text-purple-700 font-mono font-extrabold">
                          {dualData.plusFlatNetDebt.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                      {dualData.hasShops && (
                        <div className="flex justify-between items-center font-bold text-indigo-950 text-[11px]">
                          <span>Dükkan Başı Destek Sonrası Net Pay:</span>
                          <span className="text-indigo-800 font-mono font-extrabold">
                            {dualData.plusShopNetDebt.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-purple-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span>🏠 Daire Başına Ek Yatırım:</span>
                      <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md font-mono font-black">
                        +{dualData.customerFlatDelta.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                    {dualData.hasShops && (
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                        <span>🏪 Dükkan Başına Ek Yatırım:</span>
                        <span className="text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md font-mono font-black">
                          +{dualData.customerShopDelta.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Feature Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                      <th className="p-3.5 w-1/4">Donanım / İmalat Kalemi</th>
                      <th className="p-3.5 w-3/8 text-slate-600">1. Seçenek: {dualData.baseTitle}</th>
                      <th className="p-3.5 w-3/8 text-purple-900 bg-purple-50/50">2. Seçenek: {dualData.plusTitle}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dualData.features.map((feat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-base">{feat.icon}</span>
                          <span>{feat.name}</span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-2" />
                          {feat.baseSpec}
                        </td>
                        <td className="p-3.5 text-purple-950 font-semibold bg-purple-50/30">
                          <span className="text-purple-600 font-bold mr-1.5">✓</span>
                          {feat.plusSpec}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            5. PROJECT SUMMARY & TRUST STATEMENT (ÖZET VE GÜVEN BEYANI)
           ======================================================== */}
        <div className="relative z-10 mb-10">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-1 h-4 bg-indigo-600 rounded-full" />
              <span>II. PROJE ÖZETİ VE FİNANSAL ÇERÇEVE</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Functional Areas */}
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Kullanım ve Yaşam Alanları</span>
                </h4>
                <div className="space-y-3">
                  {shopUnits.length > 0 && (
                    <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600 shadow-2xs">🏪</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Zemin Kat Ticari Alanlar (Dükkan)</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold font-mono">
                              ~{dualData.baseShopUnitPrice.toLocaleString('tr-TR')} ₺/m²
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {shopUnits.length} Adet Bağımsız Dükkan • Ort. ~{avgShopArea} m²
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-indigo-900 font-mono">
                          ~{dualData.baseShopShare.toLocaleString('tr-TR')} ₺
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Dükkan Başı Bedel</div>
                      </div>
                    </div>
                  )}
                  {normalUnits.length > 0 && (
                    <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-emerald-100 text-emerald-600 shadow-2xs">🏠</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Modern Yaşam Daireleri (Konut)</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                              ~{dualData.baseFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {normalUnits.length} Adet Aile Konutu • Ort. ~{avgNormalArea} m²
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-900 font-mono">
                          ~{dualData.baseFlatShare.toLocaleString('tr-TR')} ₺
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Daire Başı Bedel</div>
                      </div>
                    </div>
                  )}
                  {mansardUnits.length > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-indigo-600 shadow-2xs">📐</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">Mansart ve Çatı Özel Birimler</div>
                          <div className="text-[10px] text-slate-500">{mansardUnits.length} Adet Ünite • Ort. ~{avgMansardArea} m²</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 font-mono">~{avgMansardArea} m²</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Ort. Brüt</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4">
                <div className="flex items-start gap-3">
                  <BadgePercent className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">İmar Teşvik & Model Yapısı</h5>
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      {contractorCount > 0 ? (
                        <>
                          Mevcut imar planındaki teşviklerden yararlanılarak kazanılan{' '}
                          {contractorMansardCount > 0 && (
                            <strong>{contractorMansardCount} adet mansart daire </strong>
                          )}
                          {contractorMansardCount > 0 && contractorNormalCount > 0 && 've '}
                          {contractorNormalCount > 0 && (
                            <strong>{contractorNormalCount} adet normal kat dairenin </strong>
                          )}
                          mülkiyeti finansman karşılığı olarak yükleniciye devredilmiştir. Bu model sayesinde hak sahiplerinin imalat maliyetleri piyasa rayiçlerinin önemli ölçüde altında (subvanse edilmiş şekilde) belirlenmiştir.
                        </>
                      ) : (
                        <>
                          Hak sahiplerinin tüm bağımsız bölümleri korunarak, imalat maliyetleri optimize edilmiş ve şeffaf hak ediş modelleriyle planlanmıştır.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-indigo-100/50">
                  <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Önemli Not</h5>
                    <p className="text-[10px] text-indigo-800 leading-relaxed">
                      Bu teklif, ön fizibilite ve mimari taslak aşamasını temsil etmektedir. Kesin paylaşım ve detaylar, hak sahipleri ile yapılacak birebir görüşmeler ve ruhsat projesi onayından sonra kesinleşecektir.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Financial Perspective */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold tracking-widest uppercase mb-4">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Yatırım ve Finansman Özeti
                </div>
                <h4 className="text-xl font-bold mb-6 text-indigo-100">Güçlü Bir Temel, Şeffaf Bir Finansal Yapı</h4>
                
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Toplam Proje Değeri</span>
                    <div className="text-3xl font-black text-emerald-400 font-mono">
                      {results.grandTotal.toLocaleString('tr-TR')} ₺
                    </div>

                    {/* Mali Mutabakat Teşhis Butonu */}
                    <button
                      type="button"
                      onClick={() => setIsDiagnosticModalOpen(true)}
                      className="mt-3 w-full py-2.5 px-3 bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-400/30 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Scale className="w-4 h-4 text-indigo-300" />
                      <span>🔍 Malik Dağılım Mutabakat Teşhisini Aç</span>
                    </button>

                    {/* Istanbul Real Estate Valuation Button */}
                    <button
                      type="button"
                      onClick={() => setIsValuationModalOpen(true)}
                      className="mt-2 w-full py-2.5 px-3 bg-amber-600/40 hover:bg-amber-600/60 border border-amber-400/30 text-amber-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Building2 className="w-4 h-4 text-amber-300" />
                      <span>🏢 İstanbul Emlak Piyasa Değerlemesi</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-xs text-slate-300">İnşaat ve İmalat Bedeli</span>
                      </div>
                      <span className="text-xs font-bold font-mono">{(results.grandTotal * 0.85).toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-300">Ruhsat, Harç ve Müşavirlik</span>
                      </div>
                      <span className="text-xs font-bold font-mono">{(results.grandTotal * 0.15).toLocaleString('tr-TR')} ₺</span>
                    </div>

                    {/* Daire ve Dükkan Payı Detayı */}
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 mt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span>🏠</span> Konut Birim Fiyatı & Daire Payı:
                        </span>
                        <div className="text-right">
                          <span className="text-emerald-400 font-bold font-mono block">
                            ~{dualData.baseFlatShare.toLocaleString('tr-TR')} ₺ / daire
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (~{dualData.baseFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²)
                          </span>
                        </div>
                      </div>

                      {shopUnits.length > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/10">
                          <span className="text-indigo-300 flex items-center gap-1.5">
                            <span>🏪</span> Dükkan Birim Fiyatı & Dükkan Payı:
                          </span>
                          <div className="text-right">
                            <span className="text-indigo-300 font-bold font-mono block">
                              ~{dualData.baseShopShare.toLocaleString('tr-TR')} ₺ / dükkan
                            </span>
                            <span className="text-[10px] text-indigo-400 font-mono">
                              (~{dualData.baseShopUnitPrice.toLocaleString('tr-TR')} ₺/m²)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {params.parkingFeeMode && params.parkingFeeMode !== 'none' && (
                      <div className="flex flex-col gap-1.5 pt-3 mt-1 border-t border-white/5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Car className="w-3.5 h-3.5 text-blue-400" />
                            <div>
                              <span className="text-xs text-slate-300 block">Hesaplanan Otopark Harcı</span>
                              <span className="text-[10px] text-blue-400/90 font-medium">
                                {results.parkingDeficientSpaces} Araç İçin Toplam • Daire Başı: {results.parkingFeePerFlat?.toLocaleString('tr-TR')} ₺
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-blue-400 block">
                              {results.parkingFeeActual?.toLocaleString('tr-TR')} ₺
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              (1 Araç: {results.parkingBirimBedeli?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺)
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 leading-normal pl-6">
                          {params.parkingFeeMode === 'included' 
                            ? '✅ Müteahhit Teklifine Dahil Edilmiştir (Ruhsat aşamasında müteahhit öder)' 
                            : '⚠️ Teklif Genel Toplamına Hariçtir (Ruhsat aşamasında malikler/işveren öder)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Landmark className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Finansman Modeli</div>
                    <div className="text-xs font-bold text-white">{supportModelTitle}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bağımsız Bölüm Türlerine Göre Birim Fiyat ve İmalat Dağılım Tablosu */}
          <div className="mt-8 p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Bağımsız Bölüm Türlerine Göre İmalat ve Birim Fiyat Dağılımı
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Konut ve ticari alanların birim metrekare fiyatları ve bağımsız bölüm başına düşen imalat payları
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold self-start sm:self-auto font-mono">
                Toplam İnşaat Alanı: {results.totalArea.toLocaleString('tr-TR')} m²
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                    <th className="p-3">Bağımsız Bölüm Türü</th>
                    <th className="p-3 text-center">Adet</th>
                    <th className="p-3 text-right">Ort. Alan</th>
                    <th className="p-3 text-right">Toplam İnşaat Alanı</th>
                    <th className="p-3 text-right text-emerald-800">İmalat Birim Fiyatı</th>
                    <th className="p-3 text-right text-slate-900">Bölüm Başı İmalat Payı</th>
                    <th className="p-3 text-right text-slate-900">Toplam İmalat Tutarı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Konut Daireleri */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-base">🏠</span>
                      <div>
                        <span>Modern Konut Daireleri</span>
                        <span className="block text-[10px] text-slate-400 font-normal">Standart Kat Aile Konutları</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold font-mono text-slate-800">{normalUnits.length}</td>
                    <td className="p-3 text-right font-mono text-slate-700">~{avgNormalArea} m²</td>
                    <td className="p-3 text-right font-mono text-slate-700">{(normalUnits.length * avgNormalArea).toLocaleString('tr-TR')} m²</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                      ~{dualData.baseFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                      ~{dualData.baseFlatShare.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      {(normalUnits.length * dualData.baseFlatShare).toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>

                  {/* Dükkanlar (varsa) */}
                  {shopUnits.length > 0 && (
                    <tr className="hover:bg-indigo-50/20 transition-colors bg-indigo-50/10">
                      <td className="p-3 font-bold text-indigo-950 flex items-center gap-2">
                        <span className="text-base">🏪</span>
                        <div>
                          <span>Zemin Kat Ticari Dükkanlar</span>
                          <span className="block text-[10px] text-indigo-400 font-normal">Cadde Cepheli Ticari Alanlar</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold font-mono text-indigo-950">{shopUnits.length}</td>
                      <td className="p-3 text-right font-mono text-indigo-900">~{avgShopArea} m²</td>
                      <td className="p-3 text-right font-mono text-indigo-900">{(shopUnits.length * avgShopArea).toLocaleString('tr-TR')} m²</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/50">
                        ~{dualData.baseShopUnitPrice.toLocaleString('tr-TR')} ₺/m²
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-indigo-950">
                        ~{dualData.baseShopShare.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="p-3 text-right font-mono font-black text-indigo-950">
                        {(shopUnits.length * dualData.baseShopShare).toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  )}

                  {/* Mansart (varsa) */}
                  {mansardUnits.length > 0 && (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-base">📐</span>
                        <div>
                          <span>Mansart ve Çatı Özel Birimleri</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Finansman Teşvik Üniteleri</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold font-mono text-slate-800">{mansardUnits.length}</td>
                      <td className="p-3 text-right font-mono text-slate-700">~{avgMansardArea} m²</td>
                      <td className="p-3 text-right font-mono text-slate-700">{(mansardUnits.length * avgMansardArea).toLocaleString('tr-TR')} m²</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                        ~{dualData.baseFlatUnitPrice.toLocaleString('tr-TR')} ₺/m²
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                        ~{dualData.baseFlatShare.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        {(mansardUnits.length * dualData.baseFlatShare).toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="p-3">TOPLAM İMALAT VE YAPI DEĞERİ</td>
                    <td className="p-3 text-center font-mono">{residentialCount + shopCount}</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono">{results.totalArea.toLocaleString('tr-TR')} m²</td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      Ort. ~{results.grossCostPerSqM.toLocaleString('tr-TR')} ₺/m²
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">-</td>
                    <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                      {results.grandTotal.toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================
            6. PAYMENT PLAN SUMMARY (ÖDEME VE TAKVİM ÖZETİ)
           ======================================================== */}
        <div className="relative z-10 mb-10">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-1 h-4 bg-indigo-600 rounded-full" />
              <span>IV. ÖDEME VE TESLİM TAKVİMİ</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-emerald-950 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Uygulama Süreci
                </h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed mb-4">
                  Belediyeden inşaat ruhsatı alındığı tarihten itibaren <strong>{results.finalMonths} ay</strong> içerisinde tüm imalatlar tamamlanarak anahtar teslim yapılacaktır.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-emerald-100 text-[10px] text-emerald-900 font-bold">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Ruhsat Onayı</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> İskân Alımı</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Kat Mülkiyeti</span>
              </div>
            </div>

            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <h4 className="text-sm font-bold text-indigo-950 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Ödeme Prensibi
              </h4>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                {isContractorShareModel 
                  ? "Arsa payı karşılığı modelde maliklerin herhangi bir nakit ödeme yükümlülüğü yoktur. Finansman tamamen yüklenici tarafından karşılanır."
                  : `Hakediş usulü modelde, ödemeler inşaatın fiziki ilerlemesine paralel olarak veya ${params.installmentCount || 12} aya yayılan vadelerle gerçekleştirilir.`}
              </p>
            </div>

            <div className="md:col-span-2 p-5 bg-purple-50/70 rounded-3xl border border-purple-100 flex items-start gap-3 mt-1 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
                  🛡️ Enflasyon ve Vade Farkı Güvencesi (TEFE/TÜFE Farkı Yoktur)
                </h5>
                <p className="text-[10px] text-purple-800 leading-relaxed mt-1">
                  Firmamız kentsel dönüşüm sürecinde kat maliklerinden herhangi bir TEFE/TÜFE, enflasyon farkı veya vade farkı talep etmemektedir. Anlaşma anında belirlenen ödeme takvimi ve rakamlar, inşaat süresi boyunca tamamen sabit kalır ve kesinlikle artırılmaz.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            6. ATTACHMENTS & PROJECT IMAGES (EKLER VE GÖRSELLER)
           ======================================================== */}
        {uploadedImages.length > 0 && (
          <div className="relative z-10 mb-8 border border-slate-200 rounded-2xl p-5 bg-white print:break-inside-avoid">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-indigo-600" />
              <span>5. TEKLİF EKLERİ VE GÖRSELLERİ</span>
            </h3>
            
            <div className={`grid gap-4 ${uploadedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {uploadedImages.map((img, idx) => (
                <div key={img.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center text-center shadow-xs break-inside-avoid page-break-inside-avoid">
                  <img 
                    src={img.url} 
                    alt={img.caption || 'Ek Belge'} 
                    className="max-h-[280px] w-full object-contain rounded-lg border border-slate-100 bg-white"
                  />
                  <span className="text-xs font-bold text-slate-700 mt-2">
                    Ek {idx + 1}: {img.caption || img.name || 'Belge / Görsel'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            7. CORPORATE GUARANTEES & LEGAL COMMITMENTS
           ======================================================== */}
        <div className="relative z-10 mb-8 border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>6. KURUMSAL TAAHHÜTLER VE HUKUKİ KORUMA PROTOKOLÜ</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">🏛️ Yasal Garanti (TBK m. 478)</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Taşıyıcı betonarme karkas sistemde <strong>20 Yıl</strong>, ince işçilik ve cephe imalatlarında <strong>5 Yıl</strong>, mekanik/asansör donatılarında <strong>2 Yıl</strong> resmi yüklenici garantisi.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">⏱️ Kesin Teslim & Kira Desteği</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                İnşaat süresinin aşılması durumunda, gecikilen her ay için kat maliklerine emsal kira bedeli üzerinden <strong>gecikme tazminatı</strong> nakden ve defaten ödenir.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">📑 Noter Onaylı Sözleşme</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Bu teklifname kabul edildiğinde, taraflar arasında ilgili Noterlik nezdinde resmî <strong>Düzenleme Şeklinde İnşaat Yapım Sözleşmesi</strong> akdedilecektir.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">👥 Mirasçı Bağlayıcılığı (Halefiyet)</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Kat maliklerinden birinin vefatı, iflası, hisse devri veya kısıtlanması durumunda; yasal mirasçılar veya yeni malikler sözleşmeye aynen tabidir. Miras uyuşmazlıkları inşaat sürecini durduramaz.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">⚖️ Yasal Salt Çoğunluk Kararı</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Teklifin ve yapım sözleşmesinin geçerliliği, güncel kentsel dönüşüm mevzuatına göre arsa payı oranında yasal salt çoğunluğun (%50+1) kararına ve gerekli muvafakatlerin verilmesine bağlıdır.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">📈 Enflasyon & Fiyat Sabitleme</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Belirlenen ödeme takvimi dâhilinde hareket edildiği sürece piyasa maliyet artışları kat maliklerine yansıtılamaz. Kat maliklerinin kendi kusurlarından kaynaklı gecikmelerde ise güncel maliyetler revize edilir.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
            <strong>📌 Mücbir Sebep & Resmi Süreç Bilgilendirmesi:</strong> Belirtilen teslim süresi, belediye yapı ruhsatının kesinleştiği tarihten itibaren başlar. Doğal afetler, resmî kurum (Belediye, Bakanlık vb.) imar onay veya askı süreçleri ve altyapı sağlayıcı kurumların (İSKİ, İGDAŞ, BEDAŞ vb.) resmî onay süreçlerindeki gecikmeler yasal olarak süreye ilave edilir.
          </div>
        </div>

        {/* ========================================================
            7.5. ADDITIONAL CLAUSES / SPECIAL PROVISIONS ON-SCREEN
           ======================================================== */}
        {clauses.length > 0 && (
          <div className="relative z-10 mb-8 border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileSignature className="w-4 h-4 text-indigo-600" />
              <span>✍️ TEKLİF EK MADDELERİ VE ÖZEL HÜKÜMLER</span>
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700 font-semibold">
              {clauses.map((clause, idx) => (
                <li key={idx} className="leading-relaxed">
                  {clause}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ========================================================
            8. MUTUAL SIGNATURE & CORPORATE SEAL BLOCKS
           ======================================================== */}
        <div className="relative z-10 pt-6 border-t-2 border-slate-900">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            {/* Left Block: Client / Owner Committee */}
            <div className="space-y-1">
              <div className="font-extrabold text-slate-950 uppercase tracking-wide">
                ARSA SAHİPLERİ / BİNA YÖNETİMİ
              </div>
              <p className="text-[11px] text-slate-500">Kat Malikleri Kurulu / Temsilci Heyeti</p>

              {isDualOffer && (
                <div className="my-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-left inline-block w-full max-w-[280px]">
                  <span className="text-[10px] font-bold text-slate-800 block text-center mb-1">
                    Muvafakat Edilen Teklif Paketi:
                  </span>
                  <div className="flex items-center justify-around gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-slate-700">
                      <span className="w-3 h-3 border border-slate-400 rounded-sm inline-block" />
                      1. Seçenek ({dualData.baseTitle})
                    </span>
                    <span className="flex items-center gap-1 font-bold text-purple-900">
                      <span className="w-3 h-3 border border-purple-500 rounded-sm inline-block" />
                      2. Seçenek ({dualData.plusTitle})
                    </span>
                  </div>
                </div>
              )}

              <div className="h-16 flex items-center justify-center text-slate-300 italic text-[11px]">
                (İmza / Tarih / T.C. Kimlik)
              </div>
              <div className="text-slate-400 font-mono text-[11px]">Tarih: ..... / ..... / 2026</div>
            </div>

            {/* Right Block: Contractor / Corporate Seal */}
            <div className="space-y-1">
              <div className="font-extrabold text-slate-950 uppercase tracking-wide">
                YÜKLENİCİ FİRMA KAŞE / İMZA
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{compLegal}</p>
              <div className="h-20 flex flex-col items-center justify-center text-slate-600">
                <span className="font-bold text-xs text-indigo-900">{compAuth}</span>
                <span className="text-[10px] text-slate-500">{compAuthTitle}</span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">Tarih: ..... / ..... / 2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* BAĞIMSIZ BÖLÜM VE KAT DAĞILIMI DÜZENLEME MODALI */}
      {isUnitConfigOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">🏢</div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Bağımsız Bölüm & Kat Yapılandırması</h4>
                  <p className="text-[10px] text-slate-500">Mimar Yapısal Veri Düzeltme Paneli</p>
                </div>
              </div>
              <button 
                onClick={() => setIsUnitConfigOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-left">
              {/* Açıklama Callout */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100/70 text-[11px] text-amber-900 leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <span>💡</span> Bağımsız Bölüm & Bodrum Kat Hesaplama Rehberi
                </div>
                <p>
                  Teklifteki daire, dükkan ve bodrum kat sayıları; <strong>Kat Sayısı</strong>, <strong>Katta Daire</strong>, <strong>Zemin Dükkan</strong> ve <strong>Bodrum İşlevi</strong> seçeneklerine göre otomatik hesaplanır:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
                  <li><strong>Zemin+8 Kat + 1 Bodrum (Sığınak)</strong>, katta 4 daire ve zemin dükkan ise: <strong>32 Daire + 4 Dükkan (36 Bölüm) + 1 Bodrum Kat</strong> olur.</li>
                  <li><strong>2 Bodrum Kat (Otopark & Sığınak)</strong> seçilirse: Otopark ve sığınak ortak alan sayılır, dükkan ve daire adetleri ünite sayısına eklenir.</li>
                  <li><strong>Bodrum Kat İşyeri / Dükkan</strong> seçilirse: Bodrum kattaki bağımsız dükkan sayısı da toplam ticari ünite adedine dahil edilir.</li>
                </ul>
              </div>

              {/* HIZLI ŞABLONLAR / ÇÖZÜMLER */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hızlı Çözüm Şablonları (Tek Tıkla Uygula)</span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleApplyUnitConfig({
                      floorCount: 8,
                      flatsPerFloor: 4,
                      hasGroundFloorShop: true,
                      shopCount: 4,
                      basementCount: 1,
                      basementPurpose: 'shelter_depot',
                      basementShopCount: 0,
                    })}
                    className="p-3 text-left bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/80 hover:border-indigo-200 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-indigo-900 group-hover:text-indigo-700">8 Katlı + 1 Bodrumlu Karma Yapı</div>
                      <div className="text-[10px] text-indigo-700/80">7 Normal Kat × 4 Daire = 28 Daire + 4 Zemin Dükkan + 1 Bodrum (Sığınak)</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-1 rounded font-mono">32 Birim</span>
                  </button>

                  <button
                    onClick={() => handleApplyUnitConfig({
                      floorCount: 8,
                      flatsPerFloor: 4,
                      hasGroundFloorShop: false,
                      shopCount: 0,
                      basementCount: 1,
                      basementPurpose: 'parking',
                      basementShopCount: 0,
                    })}
                    className="p-3 text-left bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/80 hover:border-emerald-200 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-emerald-900 group-hover:text-emerald-700">32 Dairelik Otoparklı Saf Konut Projesi</div>
                      <div className="text-[10px] text-emerald-700/80">8 Normal Kat × 4 Daire = 32 Daire + 1 Bodrum (Kapalı Otopark & Sığınak)</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-mono">32 Daire</span>
                  </button>

                  <button
                    onClick={() => handleApplyUnitConfig({
                      floorCount: 9,
                      flatsPerFloor: 4,
                      hasGroundFloorShop: true,
                      shopCount: 4,
                      basementCount: 2,
                      basementPurpose: 'parking',
                      basementShopCount: 0,
                    })}
                    className="p-3 text-left bg-purple-50/50 hover:bg-purple-50 border border-purple-100/80 hover:border-purple-200 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-purple-900 group-hover:text-purple-700">Zemin + 8 Kat + 2 Bodrum Kat (Çift Bodrum Otopark)</div>
                      <div className="text-[10px] text-purple-700/80">8 Normal Kat × 4 Daire = 32 Daire + 4 Zemin Dükkan + 2 Bodrum Kat</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-1 rounded font-mono">36 Birim</span>
                  </button>

                  <button
                    onClick={() => handleApplyUnitConfig({
                      floorCount: 8,
                      flatsPerFloor: 4,
                      hasGroundFloorShop: true,
                      shopCount: 4,
                      basementCount: 1,
                      basementPurpose: 'commercial_shop',
                      basementShopCount: 2,
                    })}
                    className="p-3 text-left bg-amber-50/50 hover:bg-amber-50 border border-amber-200/80 hover:border-amber-300 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-900 group-hover:text-amber-800">Bodrum & Zemin Dükkanlı Ticari Yapı</div>
                      <div className="text-[10px] text-amber-800/80">7 Kat Daire (28 Daire) + 4 Zemin Dükkan + 2 Bodrum Kat Dükkan</div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-1 rounded font-mono">34 Birim</span>
                  </button>
                </div>
              </div>

              {/* İNCE AYAR PARAMETRELERİ */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">İnce Ayar Mekanizması</span>
                <div className="grid grid-cols-2 gap-4">
                  {/* Kat Sayısı */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">🏢 Toplam Üst Kat Sayısı</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={tempFloorCount}
                      onChange={(e) => setTempFloorCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono bg-slate-50"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block font-medium">Zemin + {Math.max(0, tempFloorCount - 1)} Normal Kat</span>
                  </div>

                  {/* Katta Daire Sayısı */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">🔢 Katta Daire Sayısı</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={tempFlatsPerFloor}
                      onChange={(e) => setTempFlatsPerFloor(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono bg-slate-50"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block font-medium">Her kattaki daire</span>
                  </div>
                </div>

                {/* Zemin Kat Ticari Seçeneği */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempHasShop}
                        onChange={(e) => setTempHasShop(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                      <span>Zemin Katta Dükkan / İşyeri Var</span>
                    </label>

                    {tempHasShop && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={tempShopCount}
                          onChange={(e) => setTempShopCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border border-slate-300 bg-white"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">Adet Dükkan</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BODRUM KAT & ALTYAPI DÜZENİ */}
                <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3">
                  <div className="text-[11px] font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏗️</span> Bodrum Kat Yapısı & Altyapı Seçenekleri
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Bodrum Kat Sayısı */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Bodrum Kat Sayısı</label>
                      <select
                        value={tempBasementCount}
                        onChange={(e) => setTempBasementCount(parseInt(e.target.value) || 0)}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white font-mono focus:border-purple-500 focus:outline-none cursor-pointer"
                      >
                        <option value={0}>Bodrum Kat Yok (0 Kat)</option>
                        <option value={1}>1 Bodrum Kat (-1. Kat)</option>
                        <option value={2}>2 Bodrum Kat (-1, -2. Kat)</option>
                        <option value={3}>3 Bodrum Kat (-1, -2, -3. Kat)</option>
                        <option value={4}>4 Bodrum Kat (-1... -4. Kat)</option>
                      </select>
                    </div>

                    {/* Bodrum Kullanım Amacı */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Bodrum Kat Kullanım Amacı</label>
                      <select
                        value={tempBasementPurpose}
                        onChange={(e) => setTempBasementPurpose(e.target.value)}
                        disabled={tempBasementCount === 0}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white focus:border-purple-500 focus:outline-none disabled:opacity-50 cursor-pointer"
                      >
                        <option value="shelter_depot">🛡️ Sığınak & Depo / Ortak Alan</option>
                        <option value="parking">🚗 Kapalı Otopark & Sığınak</option>
                        <option value="commercial_shop">🏬 Bodrum Kat İşyeri / Dükkan</option>
                        <option value="basement_flat">🏠 Bodrum Kat Daire / Konut</option>
                      </select>
                    </div>
                  </div>

                  {/* Eğer Bodrum Kat İşyeri/Dükkan Seçildiyse */}
                  {tempBasementCount > 0 && (tempBasementPurpose === 'commercial_shop' || tempBasementPurpose === 'shop') && (
                    <div className="pt-1 flex items-center justify-between bg-white/90 p-2.5 rounded-xl border border-purple-150">
                      <span className="text-[10.5px] font-bold text-purple-900">Bodrum Kat İşyeri / Dükkan Adedi:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={tempBasementShopCount}
                          onChange={(e) => setTempBasementShopCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-xs font-bold font-mono px-2 py-1 rounded-lg border border-purple-300 bg-white text-center"
                        />
                        <span className="text-[10px] text-purple-800 font-bold">Adet Dükkan</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Preview Bar */}
                <div className="p-4 bg-indigo-900 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
                  <div>
                    <span className="text-[9px] text-indigo-300 uppercase font-black tracking-widest block">Yeni Dağılım Taslağı</span>
                    <span className="text-sm font-black font-mono block">
                      {tempHasShop ? Math.max(1, tempFloorCount - 1) : tempFloorCount} Kat × {tempFlatsPerFloor} Daire = { (tempHasShop ? Math.max(1, tempFloorCount - 1) : tempFloorCount) * tempFlatsPerFloor } Daire
                      {tempHasShop ? ` + ${tempShopCount} Zemin Dükkan` : ''}
                      {tempBasementCount > 0 && (tempBasementPurpose === 'commercial_shop' || tempBasementPurpose === 'shop') ? ` + ${tempBasementShopCount} Bodrum Dükkan` : ''}
                    </span>
                    <span className="text-[10px] text-indigo-200 font-medium block mt-0.5">
                      Altyapı: {tempBasementCount > 0 ? `${tempBasementCount} Bodrum Kat (${tempBasementPurpose === 'parking' ? 'Kapalı Otopark & Sığınak' : tempBasementPurpose === 'commercial_shop' || tempBasementPurpose === 'shop' ? 'Bodrum Kat İşyeri / Dükkan' : tempBasementPurpose === 'basement_flat' ? 'Bodrum Kat Daire' : 'Sığınak & Depo'})` : 'Bodrum Kat Yok'}
                    </span>
                  </div>
                  <span className="text-xs font-black bg-indigo-800 border border-indigo-700 px-3 py-1.5 rounded-xl font-mono text-emerald-400 shrink-0">
                    Toplam {((tempHasShop ? Math.max(1, tempFloorCount - 1) : tempFloorCount) * tempFlatsPerFloor) + (tempHasShop ? tempShopCount : 0) + (tempBasementCount > 0 && (tempBasementPurpose === 'commercial_shop' || tempBasementPurpose === 'shop') ? tempBasementShopCount : 0)} Ünite
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setIsUnitConfigOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all"
              >
                İptal Et
              </button>
              <button
                onClick={() => handleApplyUnitConfig()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1.5"
              >
                Değişiklikleri Teklife Uygula 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mali Mutabakat Teşhis Modalı */}
      <ReconciliationDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        params={params}
        results={results}
        onSyncParams={(updatedParams) => {
          if (onUpdateAllParams) {
            onUpdateAllParams(updatedParams);
          }
        }}
        theme={theme === 'gray' ? 'gray' : 'light'}
      />

      {/* İstanbul Emlak Değerleme Modalı */}
      <IstanbulRealEstateValuationModal
        isOpen={isValuationModalOpen}
        onClose={() => setIsValuationModalOpen(false)}
        params={params}
        flats={params.flats || []}
        totalConstructionCost={results.grandTotal || 0}
        onUpdateFlats={(updatedFlats) => {
          if (onUpdateAllParams) {
            onUpdateAllParams({
              ...params,
              flats: updatedFlats,
            });
          }
        }}
        onUpdateParams={(updatedParams) => {
          if (onUpdateAllParams) {
            onUpdateAllParams({
              ...params,
              ...updatedParams,
            });
          }
        }}
        theme={theme}
      />
    </div>
  );
};
