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
  Plus
} from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { generateOfferHtml } from '../utils/reportExport';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { getRoofTypeShortTitle } from '../utils/roofUtils';

interface OfferTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  onUpdateParam?: (key: keyof ProjectParams, val: any) => void;
  theme?: AppTheme;
}

export const OfferTab: React.FC<OfferTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  onUpdateParam,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const offerDocRef = useRef<HTMLDivElement>(null);

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
        if (e.target?.result && typeof e.target.result === 'string') {
          // Default caption from filename (remove extension)
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setUploadedImages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              url: e.target.result,
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
  const upperFloorsCount = Math.max(0, (params.floorCount || 5) - 1);
  let upperFloorArea = Math.max(10, params.baseBuildArea || 120);
  if (params.hasCantilever && params.cantileverDepth && params.cantileverDepth > 0) {
    const estW = Math.max(5, Math.sqrt(upperFloorArea / 1.2));
    const estD = estW * 1.2;
    if (params.cantileverDirection === 'all') {
      upperFloorArea = (estW + 2 * params.cantileverDepth) * (estD + 2 * params.cantileverDepth);
    } else if (params.cantileverDirection === 'front') {
      upperFloorArea = estW * (estD + params.cantileverDepth);
    } else {
      upperFloorArea = estW * (estD + 2 * params.cantileverDepth);
    }
  }
  const residentialFloors = params.hasGroundFloorShop ? Math.max(1, (params.floorCount || 5) - 1) : Math.max(1, params.floorCount || 5);
  const flatsPerFloor = Math.max(1, Math.round((results.flatCount || 10) / residentialFloors));
  const physicalGrossArea = Math.max(20, Math.round((upperFloorArea / flatsPerFloor) * 10) / 10);
  const physicalNetArea = Math.max(15, Math.round((physicalGrossArea * 0.8) * 10) / 10);
  const estimatedLandArea = params.landArea && params.landArea > 0 ? params.landArea : Math.round((params.baseBuildArea || 150) / 0.4);

  const isContractorShareModel = params.projectModel === 'contractorShare';

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

  const handleSaveToDrive = async () => {
    if (!hasToken) {
      onOpenDrivePanel();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const html = generateOfferHtml(params, results, false, profile, uploadedImages);
      const safeAddr = (params.projectAddress || 'Proje').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const safeName = compName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
      const fileName = `${safeName}_Teklif_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `${compName} Müşteri Teklifi - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `Teklif belgesi Google Drive'a başarıyla kaydedildi: "${res.name}"`,
      });
    } catch (err: any) {
      setSaveStatus({ type: 'error', msg: err?.message || 'Drive kaydı başarısız oldu.' });
    } finally {
      setIsSaving(false);
    }
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

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSaving ? 'Kaydediliyor...' : "Drive'a Kaydet"}</span>
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

      {saveStatus && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 print:hidden border ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{saveStatus.msg}</span>
        </div>
      )}

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
              {compName} RESMİ TEKLİF VE TAAHHÜT BELGESİ
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
            2. PROJECT & LAND SPECIFICATION MATRIX (PROJE KÜNYESİ)
           ======================================================== */}
        <div className="relative z-10 mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>1. PROJE VE TAŞINMAZ MİMARİ KÜNYESİ</span>
            </h3>
            <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {params.projectAddress || 'Belirtilmemiş Adres'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Arsa Alanı</span>
              <div className="text-sm font-bold text-slate-900 font-mono">{estimatedLandArea.toLocaleString('tr-TR')} m²</div>
              <span className="text-[10px] text-slate-400">Tahmini Parsel Yüzölçümü</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Taban Oturumu (TAKS)</span>
              <div className="text-sm font-bold text-slate-900 font-mono">{results.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
              <span className="text-[10px] text-slate-400">Zemin Taban İmarı</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Toplam İnşaat Alanı</span>
              <div className="text-sm font-bold text-indigo-700 font-mono">{results.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²</div>
              <span className="text-[10px] text-slate-400">Ruhsata Esas Toplam İmalat</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kat / Blok Düzeni</span>
              <div className="text-sm font-bold text-slate-900">{params.floorCount || 5} Normal Kat</div>
              <span className="text-[10px] text-slate-400">{params.hasGroundFloorShop ? '+ 1 Zemin Ticari Kat' : 'Tamamı Konut'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Bağımsız Bölüm Sayısı</span>
              <div className="text-sm font-bold text-slate-900 font-mono">{results.flatCount} Konut Dairesi</div>
              <span className="text-[10px] text-slate-400">{params.hasGroundFloorShop ? `+ ${params.shopCount || 1} Dükkan/Mağaza` : 'Kat Başı ~' + flatsPerFloor + ' Daire'}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tip Daire Alanları</span>
              <div className="text-sm font-bold text-slate-900 font-mono">Brüt: {physicalGrossArea} m²</div>
              <span className="text-[10px] text-slate-500 font-mono">Net: {physicalNetArea} m² (~%80)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Birim İmalat Maliyeti</span>
              <div className="text-sm font-bold text-emerald-700 font-mono flex items-center gap-1.5">
                <span>{results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</span>
                {!!((params.manualFlatUnitPrice && params.manualFlatUnitPrice > 0) || (params.manualShopUnitPrice && params.manualShopUnitPrice > 0)) && (
                  <span className="text-[9px] font-sans font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Özel Fiyat
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">~{results.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Teslim Takvimi</span>
              <div className="text-sm font-bold text-indigo-900 font-mono">{results.finalMonths} Ay (Net Süre)</div>
              <span className="text-[10px] text-slate-400">Ruhsat + İskân Dahil</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            3. FINANCIAL EXECUTIVE OVERVIEW (MALİ ÇERÇEVE & BÜTÇE)
           ======================================================== */}
        <div className="relative z-10 mb-8 p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">FİNANSAL TEKLİF ÖZETİ</span>
              <h4 className="text-lg font-bold text-white">Toplam Proje İmalat ve Finansman Hacmi</h4>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 block">Toplam Proje İmalat Bedeli</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Uygulanan Finansman Modeli</span>
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{supportModelTitle}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Toplam Hak Sahibi Payı</span>
              <div className="font-semibold text-slate-100 font-mono">
                {isContractorShareModel
                  ? `${results.flatResults.filter(f => !f.isContractorShare).length} Daire (%${Math.round((results.flatResults.filter(f => !f.isContractorShare).length / Math.max(1, results.flatCount)) * 100)})`
                  : `${results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL (%100 Kat Malikleri)`}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Müteahhit / Yüklenici Payı</span>
              <div className="font-semibold text-emerald-300 font-mono">
                {isContractorShareModel
                  ? `${results.flatResults.filter(f => f.isContractorShare).length} Bağımsız Bölüm (Finansman Karşılığı)`
                  : '0 Daire (Yalnızca Müteahhitlik Hizmet Bedeli)'}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            4. TECHNICAL SPECIFICATIONS & QUALITY ASSURANCE (TEKNİK ŞARTNAME)
           ======================================================== */}
        <div className="relative z-10 mb-8 border border-slate-200 rounded-2xl p-5 bg-slate-50/70">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>2. YAPISAL TEKNİK ŞARTNAME & İMALAT STANDARTLARI</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
            <div className="space-y-2.5">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Taşıyıcı Sistem, Beton & Temel İzolasyonu</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  TBDY-2018 Türkiye Bina Deprem Yönetmeliği'ne tam uyumlu <strong className="text-slate-900">C30/35 veya C35/40 Hazır Beton</strong> ve B420C nervürlü demir donatı. Zemin etüt raporuna göre boyutlandırılmış radye jeneral temel ve temel altında çift kat membranlı su bohçalama ve drenaj sistemi.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dış Cephe Yalıtımı (Mantolama) & Çatı</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Bina dış cephesinde minimum <strong className="text-slate-900">5 cm Karbonlu EPS veya Taşyünü</strong> ısı yalıtım mantolaması, fileli sıva ve Jotun/Filli Boya silikonlu dış cephe boyası. Çatıda su ve ısı yalıtımlı {getRoofTypeShortTitle(params.roofType)} sistem imalatı.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pencere Doğramaları & Daire Kapıları</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  70-76 mm serisi 5 odacıklı çift contalı PVC doğrama (Pimapen / Fıratpen / Egepen) ve <strong className="text-slate-900">Isıcam Konfor Sinerji</strong> serisi argon gazlı çift camlar. Daire girişlerinde monoblok kilit sistemli 1. Sınıf çelik kapı ve CNC lakeli iç oda kapıları.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mekanik Tesisat, Asansör & İç Mekan Donatısı</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Bireysel doğalgaz kombili kalorifer / yerden ısıtma altyapısı. <strong className="text-slate-900">TSE ve CE onaylı</strong> tam otomatik paslanmaz kabinli, kat kurtaranlı asansör. 1. Sınıf Çanakkale/Ege seramikler, AGT derzli parkeler ve Vitra/E.C.A. banyo vitrifiye ürünleri.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            5. INDIVIDUAL UNIT ALLOCATION & COST BREAKDOWN TABLE
           ======================================================== */}
        <div className="relative z-10 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>3. HAK SAHİPLERİ BAĞIMSIZ BÖLÜM DAĞILIM VE BORÇLANDIRMA TABLOSU</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Toplam {results.flatCount} Bağımsız Bölüm
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="p-3 border-b border-slate-200">No & Kat / Cephe</th>
                  <th className="p-3 border-b border-slate-200">Hak Sahibi / T.C.</th>
                  <th className="p-3 border-b border-slate-200">Oda & Alan</th>
                  <th className="p-3 border-b border-slate-200 text-center">Şerefiye</th>
                  <th className="p-3 border-b border-slate-200 text-right">Arsa Mahsubu</th>
                  <th className="p-3 border-b border-slate-200 text-right">İmalat Bedeli</th>
                  {isContractorShareModel ? (
                    <>
                      <th className="p-3 border-b border-slate-200 text-right text-emerald-700">Kat Karşılığı Mahsubu</th>
                      <th className="p-3 border-b border-slate-200 text-right text-indigo-900 bg-indigo-50/60">Net Malik Borcu</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 border-b border-slate-200 text-right text-indigo-700">Ödenen Peşinat</th>
                      <th className="p-3 border-b border-slate-200 text-right text-emerald-700">Dönüşüm Desteği</th>
                      <th className="p-3 border-b border-slate-200 text-right text-indigo-900 bg-indigo-50/60">Kalan Net Borç</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {results.flatResults.map((flat) => {
                  const totalFlats = results.flatCount || 10;
                  const totalFloors = params.floorCount || 5;
                  const flatsPerFloor = Math.max(1, Math.ceil(totalFlats / totalFloors));
                  const floorNo = flat.floorNumber !== undefined ? flat.floorNumber : Math.min(totalFloors, Math.ceil(flat.id / flatsPerFloor));
                  const floorText = floorNo === 0 ? 'Zemin Kat' : `${floorNo}. Kat`;
                  const facadeText = flat.facade ? (flat.facade.charAt(0).toUpperCase() + flat.facade.slice(1)) : 'Güney';
                  const roomCountText = flat.flatType === 'shop' 
                    ? 'Ticari / Dükkan' 
                    : params.roomType ? `${params.roomType} Oda` : (flat.area < 65 ? '1+1' : flat.area < 95 ? '2+1' : flat.area < 135 ? '3+1' : '4+1');
                  
                  const serefiyeVal = flat.serefiyeMultiplier || 1.0;
                  const serefiyeDiff = Math.round((serefiyeVal - 1) * 100);
                  const landShareDiff = flat.landShareDifference || 0;

                  return (
                    <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-indigo-900">Daire {flat.id}</span>
                          {flat.flatType === 'mansard' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              Mansart Çatı
                            </span>
                          )}
                          {flat.flatType === 'duplex' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Çatı Dubleksi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {floorText} • {facadeText}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{flat.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">TC: {flat.tc}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{roomCountText}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Brüt: {physicalGrossArea} m² <span className="text-[9px] text-slate-400">(Pay: {flat.area} m²)</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono font-medium">Net: {physicalNetArea} m²</div>
                      </td>

                      <td className="p-3 text-center font-mono">
                        {serefiyeDiff !== 0 ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${serefiyeDiff > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            x{serefiyeVal.toFixed(2)} ({serefiyeDiff > 0 ? '+' : ''}{serefiyeDiff}%)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">1.00 (Standart)</span>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono text-[11px]">
                        {landShareDiff !== 0 ? (
                          <span className={`font-semibold ${landShareDiff > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {landShareDiff > 0 ? '+' : ''}{landShareDiff.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </span>
                        ) : (
                          <span className="text-slate-400">0 TL</span>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-900 font-semibold">
                        {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>

                      {isContractorShareModel ? (
                        <>
                          <td className="p-3 text-right text-emerald-700 font-semibold font-mono">
                            -{flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            <span className="block text-[9px] text-slate-400">
                              {flat.isContractorShare ? 'Müteahhit Payı Satış' : 'Arsa Payı Mahsubu'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-emerald-800 font-mono bg-emerald-50/50">
                            0 TL
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-right text-indigo-700 font-mono">
                            -{flat.downPayment.toLocaleString('tr-TR')} TL
                          </td>
                          <td className="p-3 text-right text-emerald-700 font-mono font-semibold">
                            {flat.usedCredit > 0 ? `-${flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '0 TL'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-950 font-mono bg-indigo-50/40">
                            {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                <tr>
                  <td colSpan={3} className="p-3">GENEL PROJE TOPLAMI:</td>
                  <td className="p-3 text-center font-mono">-</td>
                  <td className="p-3 text-right font-mono">0 TL</td>
                  <td className="p-3 text-right font-mono text-indigo-900">
                    {results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </td>
                  {isContractorShareModel ? (
                    <>
                      <td className="p-3 text-right font-mono text-emerald-700">
                        -{results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-800 bg-emerald-100/50">
                        0 TL
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-right font-mono text-indigo-700">
                        -{results.flatResults.reduce((s, f) => s + f.downPayment, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700">
                        -{results.flatResults.reduce((s, f) => s + f.usedCredit, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-indigo-950 bg-indigo-100/60 font-black">
                        {results.flatResults.reduce((s, f) => s + f.netRemainingDebt, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ========================================================
            6. PAYMENT SCHEDULE & MILESTONES (HAKEDİŞ & ÖDEME PLANI)
           ======================================================== */}
        <div className="relative z-10 mb-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>
                4.{' '}
                {isContractorShareModel
                  ? 'KAT KARŞILIĞI FİNANSMAN VE YAPIM BEYANI'
                  : params.paymentPlanType === 'installments'
                  ? `AYLIK EŞİT TAKSİTLİ ÖDEME TAKVİMİ (${params.installmentCount || 12} AY)`
                  : params.paymentPlanType === 'hybrid'
                  ? `KARMA ÖDEME TAKVİMİ (PEŞİNAT + ARA ÖDEMELER + ${params.installmentCount || 12} AY TAKSİT)`
                  : 'FİZİKİ İLERLEME HAKEDİŞ TAKVİMİ (5 AŞAMALI)'}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Model: {isContractorShareModel ? 'Kat Karşılığı' : params.paymentPlanType === 'installments' ? 'Eşit Taksitli' : params.paymentPlanType === 'hybrid' ? 'Hibrit Ödeme' : 'Aşamalı Hakediş'}
            </span>
          </div>

          {isContractorShareModel ? (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 text-xs text-emerald-950 leading-relaxed space-y-2">
              <div className="font-bold text-emerald-900 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kat Karşılığı Yapım Modeli Finansman Güvencesi</span>
              </div>
              <p>
                Bu yapım modelinde, yapının projelendirilmesi, şantiye kurulumu, malzeme tedariği, kaba ve ince imalat ile iskân alımına kadar olan <strong>tüm maliyetler {compLegal} tarafından üstlenilmiştir</strong>. Arsa maliklerinin herhangi bir nakit borçlanması, ara ödeme veya aylık taksit yükümlülüğü bulunmamaktadır.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] text-emerald-900">
                <div className="p-2.5 bg-white/70 rounded-lg border border-emerald-200">
                  <strong>🏢 Malik Daireleri:</strong> Hak sahiplerine anahtar teslim olarak bedelsiz teslim edilir.
                </div>
                <div className="p-2.5 bg-white/70 rounded-lg border border-emerald-200">
                  <strong>📜 Teminat & Güvence:</strong> İnşaat ilerleme seviyelerine göre tapu devirleri kademeli olarak yapılır.
                </div>
              </div>
            </div>
          ) : params.paymentPlanType === 'installments' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Daire / Malik</th>
                    <th className="p-3 border-b border-slate-200 text-right">Daire Payı Bedeli</th>
                    <th className="p-3 border-b border-slate-200 text-right text-indigo-700">Ödenen Peşinat</th>
                    <th className="p-3 border-b border-slate-200 text-right text-emerald-700">Devlet Desteği</th>
                    <th className="p-3 border-b border-slate-200 text-right font-bold">Kalan Net Borç</th>
                    <th className="p-3 border-b border-slate-200 text-center">Vade</th>
                    <th className="p-3 border-b border-slate-200 text-right text-emerald-900 bg-emerald-50 font-bold">
                      Aylık Taksit Tutarı
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.flatResults.map((flat) => (
                    <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        Daire {flat.id} ({flat.name})
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-indigo-700">
                        -{flat.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                        {flat.usedCredit > 0 ? `-${flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '0 TL'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">
                        {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {flat.flatType === 'shop' ? '-' : (flat.netRemainingDebt > 0 ? `${params.installmentCount || 12} Ay` : '-')}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-900 font-mono bg-emerald-50/50">
                        {flat.flatType === 'shop' 
                          ? 'Dükkan Tek Sefer' 
                          : (flat.netRemainingDebt > 0
                            ? `${flat.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay`
                            : '0 TL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                  <tr>
                    <td colSpan={4} className="p-3 text-slate-800">
                      PROJE ŞANTİYESİ AYLIK TOPLAM HAKEDİŞ GİRİŞİ:
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900">
                      {results.flatResults
                        .reduce((sum, f) => sum + f.netRemainingDebt, 0)
                        .toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
                      TL
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {params.installmentCount || 12} Ay
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-900 text-sm bg-emerald-100/70 font-black">
                      {(results.totalMonthlyInstallments || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : params.paymentPlanType === 'hybrid' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Daire / Malik</th>
                    <th className="p-3 border-b border-slate-200 text-right">Net Kalan Borç</th>
                    <th className="p-3 border-b border-slate-200 text-right text-indigo-700">1. Ara Ödeme (%25 Kaba)</th>
                    <th className="p-3 border-b border-slate-200 text-right text-purple-700">2. Ara Ödeme (%15 İskân)</th>
                    <th className="p-3 border-b border-slate-200 text-right">Taksitlendirilen (%60)</th>
                    <th className="p-3 border-b border-slate-200 text-right text-emerald-900 bg-emerald-50 font-bold">
                      Aylık Taksit ({params.installmentCount || 12} Ay)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.flatResults.map((flat) => {
                    const interim1 = Math.round(flat.netRemainingDebt * 0.25);
                    const interim2 = Math.round(flat.netRemainingDebt * 0.15);
                    const remainingToInstallments = Math.max(0, flat.netRemainingDebt - interim1 - interim2);
                    const hybridMonthly = Math.round(remainingToInstallments / Math.max(1, params.installmentCount || 12));

                    return (
                      <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          Daire {flat.id} ({flat.name})
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 font-mono">
                          {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                        <td className="p-3 text-right text-indigo-700 font-mono">
                          {flat.flatType === 'shop' ? '-' : interim1.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                        </td>
                        <td className="p-3 text-right text-purple-700 font-mono">
                          {flat.flatType === 'shop' ? '-' : interim2.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                          {flat.flatType === 'shop' ? '-' : remainingToInstallments.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-900 font-mono bg-emerald-50/50">
                          {flat.flatType === 'shop' 
                            ? 'Dükkan Tek Sefer' 
                            : (flat.netRemainingDebt > 0 ? `${hybridMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay` : '0 TL')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Daire / Malik</th>
                    <th className="p-3 border-b border-slate-200">1. Ruhsat (%{params.stage1Pay || 20})</th>
                    <th className="p-3 border-b border-slate-200">2. Temel (%{params.stage2Pay || 20})</th>
                    <th className="p-3 border-b border-slate-200">3. Kaba (%{params.stage3Pay || 30})</th>
                    <th className="p-3 border-b border-slate-200">4. İnce (%{params.stage4Pay || 20})</th>
                    <th className="p-3 border-b border-slate-200">5. İskân (%{params.stage5Pay || 10})</th>
                    <th className="p-3 border-b border-slate-200 font-bold text-right">Toplam Net Borç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.flatResults.map((flat) => (
                    <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        Daire {flat.id} ({flat.name})
                      </td>
                      <td className="p-3 text-slate-700 font-mono">
                        {flat.flatType === 'shop' ? '-' : flat.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                      </td>
                      <td className="p-3 text-slate-700 font-mono">
                        {flat.flatType === 'shop' ? '-' : flat.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                      </td>
                      <td className="p-3 text-slate-700 font-mono">
                        {flat.flatType === 'shop' ? '-' : flat.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                      </td>
                      <td className="p-3 font-semibold text-indigo-700 font-mono">
                        {flat.flatType === 'shop' ? '-' : flat.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                      </td>
                      <td className="p-3 text-slate-700 font-mono">
                        {flat.flatType === 'shop' ? '-' : flat.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL'}
                      </td>
                      <td className="p-3 font-bold text-slate-950 font-mono text-right">
                        {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
