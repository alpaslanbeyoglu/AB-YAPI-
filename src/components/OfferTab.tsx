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
  Info
} from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { generateOfferHtml } from '../utils/offerReportExport';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { getRoofTypeShortTitle } from '../utils/roofUtils';

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
          ...(p.additionalOfferClauses && Array.isArray(p.additionalOfferClauses) ? { additionalOfferClauses: p.additionalOfferClauses } : {}),
        });
      }
      setAiPromptText('');
      alert('✨ Yapay zeka metni başarıyla analiz ederek teklif parametrelerini güncelledi. Mevcut resmi teklif şablonu yeni verilere göre yenilendi!');
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
  const residentialFlats = results.flatResults.filter(f => f.flatType !== 'shop');
  const shopCount = results.flatResults.filter(f => f.flatType === 'shop').length;
  const residentialCount = residentialFlats.length;
  const totalUnits = results.flatResults.length;
  const contractorCount = results.flatResults.filter(f => f.isContractorShare).length;
  const ownerCount = totalUnits - contractorCount;

  const physicalGrossArea = residentialFlats.length > 0
    ? Math.round((residentialFlats.reduce((s, f) => s + f.area, 0) / residentialFlats.length) * 10) / 10
    : Math.max(20, Math.round((upperFloorArea / flatsPerFloor) * 10) / 10);
  const physicalNetArea = residentialFlats.length > 0
    ? Math.round((residentialFlats.reduce((s, f) => s + (f.netArea || f.area * 0.8), 0) / residentialFlats.length) * 10) / 10
    : Math.max(15, Math.round((physicalGrossArea * 0.8) * 10) / 10);
  const estimatedLandArea = params.landArea && params.landArea > 0 ? params.landArea : Math.round((params.baseBuildArea || 150) / 0.4);

  const isContractorShareModel = params.projectModel === 'contractorShare';

  const shopUnits = results.flatResults.filter(f => f.flatType === 'shop');
  const normalUnits = results.flatResults.filter(f => f.flatType !== 'shop' && f.flatType !== 'mansard' && f.flatType !== 'duplex');
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
          {onNavigateToSurec && (
            <button
              type="button"
              onClick={() => {
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
          ADDITIONAL CLAUSES / SPECIAL PROVISIONS EDITOR
         ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
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
            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Kat Yapısı</span>
              <div className="text-sm font-bold text-slate-900">
                {params.floorCount || 5} Katlı Yapı
              </div>
              <span className="text-[10px] text-slate-500">
                {params.hasGroundFloorShop ? 'Ticari + Konut' : 'Tamamı Konut'}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Toplam Birim</span>
              <div className="text-sm font-bold text-slate-900">
                {residentialCount} Daire {shopCount > 0 ? `+ ${shopCount} Dükkan` : ''}
              </div>
              <span className="text-[10px] text-slate-500">Bağımsız Bölüm</span>
            </div>

            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">İmalat Bedelleri</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="text-[10px] text-slate-400 font-normal">Konut:</span>
                  <span className="text-emerald-600">~{(params.manualFlatUnitPrice || results.grossCostPerSqM).toLocaleString('tr-TR')} ₺/m²</span>
                </div>
                {params.hasGroundFloorShop && (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 font-normal">Dükkan:</span>
                    <span className="text-indigo-600">~{(params.manualShopUnitPrice || results.grossCostPerSqM).toLocaleString('tr-TR')} ₺/m²</span>
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
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-indigo-600">🏪</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">Zemin Kat Ticari Alanlar</div>
                          <div className="text-[10px] text-slate-500">{shopUnits.length} Adet Bağımsız Dükkan</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">~{avgShopArea} m²</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Ort. Brüt</div>
                      </div>
                    </div>
                  )}
                  {normalUnits.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-indigo-600">🏠</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">Modern Yaşam Daireleri</div>
                          <div className="text-[10px] text-slate-500">{normalUnits.length} Adet Aile Konutu</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">~{avgNormalArea} m²</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Ort. Brüt</div>
                      </div>
                    </div>
                  )}
                  {mansardUnits.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-indigo-600">📐</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">Mansart ve Çatı Özel Birimler</div>
                          <div className="text-[10px] text-slate-500">{mansardUnits.length} Adet Ünite</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">~{avgMansardArea} m²</div>
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
                    <h5 className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">İmar Teşvik Avantajı</h5>
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      Mevcut imar planındaki teşviklerden yararlanılarak kazanılan <strong>4 adet mansart daire</strong> ve <strong>2 adet normal kat dairenin</strong> mülkiyeti finansman karşılığı olarak yükleniciye devredilmiştir. Bu model sayesinde hak sahiplerinin imalat maliyetleri piyasa rayiçlerinin önemli ölçüde altında (subvanse edilmiş şekilde) belirlenmiştir.
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
                  Sözleşme tarihinden itibaren <strong>{results.finalMonths} ay</strong> içerisinde tüm imalatlar tamamlanarak anahtar teslim yapılacaktır.
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
            <span>6. KURUMSAL TAAHHÜTLER VE YASAL GARANTİ PROTOKOLÜ</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">🏛️ Yasal Garanti (TBK m. 478)</span>
              <p className="text-[11px] text-slate-600">
                Taşıyıcı betonarme karkas sistemde <strong>20 Yıl</strong>, ince işçilik ve cephe imalatlarında <strong>5 Yıl</strong>, mekanik/asansör donatılarında <strong>2 Yıl</strong> resmi yüklenici garantisi.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">⏱️ Kesin Teslim & Kira Desteği</span>
              <p className="text-[11px] text-slate-600">
                İnşaat süresinin aşılması durumunda, gecikilen her ay için kat maliklerine emsal kira bedeli üzerinden <strong>gecikme tazminatı</strong> nakden ve defaten ödenir.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">📑 Noter Onaylı Sözleşme</span>
              <p className="text-[11px] text-slate-600">
                Bu teklifname kabul edildiğinde, taraflar arasında ilgili Noterlik nezdinde resmî <strong>Düzenleme Şeklinde İnşaat Yapım Sözleşmesi</strong> akdedilecektir.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
            <strong>📌 Mücbir Sebep & Resmi Süreç Bilgilendirmesi:</strong> Belirtilen teslim süresi, belediye yapı ruhsatının kesinleştiği tarihten itibaren başlar. Doğal afetler, resmî kurum izinlerindeki gecikmeler veya altyapı sağlayıcı kurumların (İSKİ, İGDAŞ vb.) süreçleri yasal olarak süreye ilave edilir.
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
              <div className="h-20 flex items-center justify-center text-slate-300 italic text-[11px]">
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
    </div>
  );
};
