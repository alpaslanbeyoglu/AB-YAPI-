import React, { useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, Copy, Search, FileText, PlusCircle, X } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { generateContractHtml } from '../utils/reportExport';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { useCompanyProfile } from '../context/CompanyProfileContext';

interface ContractTabProps {
  params: ProjectParams;
  results: CalculationResult;
  onUpdateParam?: (key: keyof ProjectParams, value: any) => void;
  theme?: AppTheme;
}

export const ContractTab: React.FC<ContractTabProps> = ({
  params,
  results,
  onUpdateParam,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);

  const isGray = theme === 'gray';

  const showFirstAuth = profile.printOptions?.showFirstAuthorized !== false && !!profile.authorizedPerson;
  const showFirstAuthChamber = profile.printOptions?.showFirstAuthorizedChamber !== false && !!(profile.authorizedChamberNo || profile.authorizedChamber);
  const showSecondAuth = profile.printOptions?.showSecondAuthorized === true && !!profile.authorizedPerson2;
  const showSecondAuthChamber = profile.printOptions?.showSecondAuthorizedChamber !== false && !!(profile.authorizedChamberNo2 || profile.authorizedChamber2);

  const contractTitle =
    params.projectModel === 'contractorShare'
      ? 'ARSA PAYI KARŞILIĞI İNŞAAT VE GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ'
      : params.transformationStatus !== 'none'
      ? '6306 SAYILI KANUN KAPSAMINDA KENTSEL DÖNÜŞÜM BİNA YAPIM SÖZLEŞMESİ'
      : 'ÖZ KAYNAKLI BİNA YAPIM VE TAAHHÜT SÖZLEŞMESİ';

  const handleExportPdf = async () => {
    if (!contractRef.current) return;
    const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const fileName = `${safeName}_Resmi_Sozlesme_${safeAddr || 'Proje'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(contractRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateContractHtml(params, results, profile);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    printHtmlContent(html, `${safeName}_Resmi_Sozlesme_${params.projectAddress || 'Proje'}`);
  };

  const handleCopyToClipboard = () => {
    if (!contractRef.current) return;
    const textContent = contractRef.current.innerText;
    navigator.clipboard.writeText(textContent);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2500);
  };

  // Helper to render text with search keyword highlight
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-900 rounded font-semibold px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div
        className={`p-5 rounded-3xl border shadow-sm print:hidden space-y-4 ${
          isGray ? 'bg-slate-100/90 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={`font-semibold text-sm ${isGray ? 'text-slate-900' : 'text-slate-800'}`}>
              Resmi İnşaat Yapım Sözleşmesi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              TBK m. 478 ve 6306 sayılı kanun hükümlerine tam uyumlu 12 maddelik hukuki sözleşme metni ve Ek-1 tablosu
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-sm border transition-all active:scale-95 cursor-pointer ${
                copiedStatus
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {copiedStatus ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStatus ? 'Metin Kopyalandı!' : 'Metni Kopyala'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotesEditor(!showNotesEditor)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-sm border transition-all active:scale-95 cursor-pointer ${
                showNotesEditor || params.customContractNotes
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              <span>İlave Özel Şartlar {params.customContractNotes ? '(Aktif)' : ''}</span>
            </button>

            <PrintAndPdfButtons
              onExportPdf={handleExportPdf}
              onPrint={handlePrint}
              getHtmlContent={() => generateContractHtml(params, results, profile)}
              documentTitle={`${profile.companyName || 'AB YAPI'} - Yapım Sözleşmesi`}
              theme={theme}
            />
          </div>
        </div>

        {/* In-Contract Search Bar */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sözleşme içerisinde ara (örn: gecikme, hakediş, garanti, iskân, ceza)..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] text-slate-500 font-medium">
              Kelime Vurgulama Aktif
            </span>
          )}
        </div>

        {/* Custom Contract Notes Editor Box */}
        {(showNotesEditor || params.customContractNotes) && onUpdateParam && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 mt-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Sözleşmeye İlave Özel Maddeler ve Notlar (Madde 13):</span>
              </label>
              {params.customContractNotes && (
                <button
                  type="button"
                  onClick={() => onUpdateParam('customContractNotes', '')}
                  className="text-[11px] text-red-600 hover:underline"
                >
                  Temizle
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={params.customContractNotes || ''}
              onChange={(e) => onUpdateParam('customContractNotes', e.target.value)}
              placeholder="Örn: Kombi markası Vaillant olacaktır. Hafriyat aşamasında komşu binaya perde beton çekilecektir. Ortak alan seramikleri Kütahya Seramik 60x120 yapılacaktır..."
              className="w-full text-xs p-3 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-800"
            />
            <p className="text-[10px] text-amber-700">
              Girilen bu metin otomatik olarak sözleşmenin son maddesi olarak ekran ve PDF çıktılarına eklenir.
            </p>
          </div>
        )}
      </div>

      {/* Contract Document Content */}
      <div
        ref={contractRef}
        className={`border rounded-3xl p-6 sm:p-10 shadow-sm text-xs leading-relaxed text-slate-700 text-justify print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${
          isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              {highlightText(contractTitle)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Tarih: {results.calculatedAt} | Belge No: {profile.companyName}-{new Date().getFullYear()}/SÖZ-01
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* SECTION I */}
          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase">
            {highlightText('BÖLÜM I: TARAFLAR VE PROJE TANIMI')}
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 1: TARAFLAR')}</h4>
            <p className="text-slate-700">
              {highlightText(
                'İşbu Sözleşme, aşağıda bilgileri yer alan taraflar arasında 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun ve Türk Borçlar Kanunu hükümleri çerçevesinde imza altına alınmıştır:'
              )}
            </p>
            <div className="mt-2.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1.5 text-slate-800">
              <p>
                <strong className="text-slate-900">1. YÜKLENİCİ (MÜTEAHHİT):</strong>{' '}
                {highlightText(profile.legalName || profile.companyName)}{' '}
                {profile.address && `(${highlightText(profile.address)})`}{' '}
                {profile.taxOffice && profile.taxNumber && `[Vergi Dairesi: ${highlightText(profile.taxOffice)} / V.No: ${highlightText(profile.taxNumber)}]`}
                {profile.chamberNo && ` [Sicil/Oda No: ${highlightText(profile.chamberNo)}]`}
              </p>
              {(showFirstAuth || showSecondAuth) && (
                <p>
                  <strong className="text-slate-900">Yetkili Temsilci:</strong>{' '}
                  {showFirstAuth && `${highlightText(profile.authorizedPerson)} (${highlightText(profile.authorizedTitle)}${showFirstAuthChamber ? ` - ${highlightText(profile.authorizedChamberNo || profile.authorizedChamber || '')}` : ''})`}
                  {showFirstAuth && showSecondAuth && ' / '}
                  {showSecondAuth && `${highlightText(profile.authorizedPerson2!)} (${highlightText(profile.authorizedTitle2 || '')}${showSecondAuthChamber ? ` - ${highlightText(profile.authorizedChamberNo2 || profile.authorizedChamber2 || '')}` : ''})`}
                </p>
              )}
              {profile.bankName && profile.iban && (
                <p className="font-mono text-[11px] text-indigo-900">
                  <strong>Resmî Banka Hesabı:</strong> {highlightText(profile.bankName)} - IBAN: {highlightText(profile.iban)}
                </p>
              )}
            </div>
            <p className="mt-2 text-slate-700">
              <strong className="text-slate-900">2. İŞ SAHİBİ / KAT MALİKLERİ:</strong>{' '}
              {highlightText("İşbu Sözleşme'nin ayrılmaz parçası olan Ek-1 Hak Sahipleri Listesi'nde isim, T.C. Kimlik numarası ve arsa payı oranları yer alan gayrimenkul malikleri.")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 2: SÖZLEŞME KONUSU VE GAYRİMENKUL BİLGİLERİ')}</h4>
            <p className="text-slate-700">
              {highlightText('İşbu sözleşmenin konusu; Tapuda')} <strong className="text-indigo-700">{highlightText(params.projectAddress)}</strong> {highlightText('adresinde kayıtlı bulunan taşınmaz üzerindeki mevcut yapının yıkılması, yerine yürürlükteki imar mevzuatına ve onaylı mimari/statik projesine uygun olarak; taban oturumu')} <strong className="text-slate-900 font-mono">{results.baseArea.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²</strong>, {highlightText('toplam brüt inşaat alanı')} <strong className="text-slate-900 font-mono">{results.totalArea.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²</strong> {highlightText('olan ve toplam')} <strong className="text-slate-900 font-mono">{params.hasGroundFloorShop ? `${results.flatCount + (params.shopCount || 1)} Adet (${results.flatCount} Daire, ${params.shopCount || 1} Dükkan)` : `${results.flatCount} Adet (${results.flatCount} Daire)`}</strong> {highlightText('bağımsız bölümden oluşan yeni binanın Yüklenici tarafından anahtar teslim imal edilmesi ve hakediş esaslarının düzenlenmesidir.')}
            </p>
          </div>

          {/* SECTION II */}
          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase pt-2">
            {highlightText('BÖLÜM II: MALİ HÜKÜMLER VE HAKEDİŞ ESASLARI')}
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 3: PROJE İMALAT BEDELİ VE ENFLASYON UYARLAMASI')}</h4>
            <p className="text-slate-700">
              {highlightText('Projede yer alan bağımsız bölümlerin birim imalat fiyatı')} <strong className="text-slate-900 font-mono">{results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong> {highlightText('olarak tespit edilmiştir. Toplam proje yapım bedeli')} <strong className="text-emerald-700 font-mono">{results.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong>{highlightText("'dir. Maliklerin daire başı yapacağı ödemeler inşaatın fiziki ilerleme seviyesine (hakedişe) göre tahsil edilir. Vadesinde ödenmeyen tutarlara TÜİK Yİ-ÜFE oranında fark yansıtılır.")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 4: KENTSEL DÖNÜŞÜM DESTEK MODELİ VE HARÇ MUAFİYETLERİ')}</h4>
            <p className="text-slate-700">
              {highlightText("İşbu proje 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun kapsamında yürütülmektedir. Projede kamu hibe ve kredi desteği mekanizmaları uygulanacaktır. İlgili kamu hibeleri ve banka kredileri topluca müteahhide ödenmeyip, Çevre ve Şehircilik Bakanlığı ile banka ekspertiz yetkililerinin şantiyede onayladığı fiziki tamamlanma oranlarına göre Yüklenici hesabına aktarılır. 6306 sayılı Kanun'un sağladığı Tapu Harcı, Damga Vergisi, Noter Harçları ve Belediye Ruhsat Harç muafiyetleri aynen uygulanır.")}
            </p>
          </div>

          <div>
            {params.paymentPlanType === 'installments' ? (
              <>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 5: AYLIK EŞİT TAKSİTLİ ÖDEME PLANI VE VADE ESASLARI')}</h4>
                <p className="text-slate-700">
                  {highlightText('Müteahhite yapılacak ödemeler, kat maliklerinin peşinat ve kentsel dönüşüm destekleri mahsup edildikten sonra kalan net borç tutarları üzerinden toplam')} <strong className="text-indigo-700 font-mono">{params.installmentCount || 12} eşit aylık taksite</strong> {highlightText('bölünerek tahsil edilecektir:')}
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
                  <li>
                    <strong className="text-slate-900">Peşinat ve Başlangıç:</strong> {highlightText('Sözleşme imza ve ruhsat aşamasında kararlaştırılan peşinat tutarları peşinen tahsil edilir.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">Aylık Vade Günü:</strong> {highlightText("Taksitler her takvim ayının ilk 5 (beş) iş günü içerisinde Yüklenici'nin bildireceği resmi banka hesabına yatırılacaktır.")}
                  </li>
                  <li>
                    <strong className="text-slate-900">Gecikme Hali:</strong> {highlightText('Mücbir sebep olmaksızın vadesinde ödenmeyen taksitlere yasal temerrüt faizi ve Yİ-ÜFE farkı yansıtılır.')}
                  </li>
                </ul>
              </>
            ) : params.paymentPlanType === 'hybrid' ? (
              <>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 5: KARMA (HİBRİT) ÖDEME PLANI VE HAKEDİŞ ESASLARI')}</h4>
                <p className="text-slate-700">
                  {highlightText('Müteahhite yapılacak ödemeler peşinat, inşaat ilerleme ara ödemeleri ve aylık taksitlerin kombinasyonu ile gerçekleştirilir:')}
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
                  <li>
                    <strong className="text-slate-900">1. Peşinat:</strong> {highlightText('Sözleşme imzasında belirlenen tutar.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">2. Kaba İnşaat Ara Ödemesi (%25):</strong> {highlightText('Taşıyıcı betonarme sistem ve duvarların tamamlanmasında.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">3. İskân Ara Ödemesi (%15):</strong> {highlightText('İskân ruhsatının alınması ve teslim aşamasında.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">4. Aylık Taksitler (%60):</strong> {highlightText('Kalan bakiye toplam')} <strong className="text-indigo-700 font-mono">{params.installmentCount || 12} eşit aylık taksite</strong> {highlightText('bölünerek tahsil edilir.')}
                  </li>
                </ul>
              </>
            ) : (
              <>
                <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 5: DİNAMİK FİZİKİ İLERLEME HAKEDİŞ ORANLARI')}</h4>
                <p className="text-slate-700">{highlightText('Müteahhite yapılacak hakediş ödemeleri aşağıdaki 5 fiziki aşama takvimine göre gerçekleştirilir:')}</p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
                  <li>
                    <strong className="text-slate-900">1. Hakediş (%{params.stage1Pay}):</strong> {highlightText('Sözleşmenin imzalanması ve ruhsat/mimari projelerin hazırlanması.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">2. Hakediş (%{params.stage2Pay}):</strong> {highlightText('Hafriyatın tamamlanıp radye temel ve subasman seviyesi betonarme vizesinin alınması.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">3. Hakediş (%{params.stage3Pay}):</strong> {highlightText('Betonarme karkas ve tuğla duvar örümünün (Kaba İnşaat) tamamlanması.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">4. Hakediş (%{params.stage4Pay}):</strong> {highlightText('İnce inşaat, Tesisatlar, cephe mantolama ve doğramalar.')}
                  </li>
                  <li>
                    <strong className="text-slate-900">5. Hakediş (%{params.stage5Pay}):</strong> {highlightText("Yapı Kullanım İzin Belgesi'nin (İskân) belediyeden alınıp bağımsız bölümlerin anahtar teslim kabulünde.")}
                  </li>
                </ul>
              </>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 6: YAPI DENETİM ONAYI VE İMALAT VİZELERİ')}</h4>
            <p className="text-slate-700">
              {highlightText('Hakediş ödemelerinin serbest bırakılmasında T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı onaylı Yapı Denetim Firması hakediş seviye raporları ile ilgili belediyenin betonarme ve donatı vize tutanakları esas alınır. Şantiyede onay verilmeyen seviyelerin ödemesi serbest bırakılmaz.')}
            </p>
          </div>

          {/* SECTION III */}
          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase pt-2">
            {highlightText('BÖLÜM III: SÜRE, GECİKME TAZMİNATI, MÜCBİR SEBEPLER VE İŞ GÜVENLİĞİ')}
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 7: BİNANIN TAHLİYESİ VE DEMİRBAŞLAR')}</h4>
            <p className="text-slate-700">
              {highlightText('İş Sahibi / Kat Malikleri veya kiracıları, yıkım ruhsatı alınmasını müteakip en geç 30 gün içerisinde binayı boş teslim edecektir. Sökülebilir demirbaş malzemeler yıkım sözleşmesi gereğince yıkıcı firmaya verilmek üzere Yüklenici uhdesindedir.')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 8: İNŞAAT TESLİM SÜRESİ VE GECİKME TAZMİNATI (CEZAİ ŞART)')}</h4>
            <p className="text-slate-700">
              {highlightText('İnşaatın teslim süresi, belediye inşaat ruhsatının alındığı tarihten itibaren')} <strong className="text-slate-900 font-mono">{results.finalMonths} Ay</strong> {highlightText('olarak kararlaştırılmıştır. İnşaatın bu süre içerisinde teslim edilmemesi halinde Yüklenici, taahhüt edilen teslim tarihinden itibaren gecikilen her bir ay için bağımsız bölüm başına bölgedeki emsal rayiç kira bedeli tutarında gecikme tazminatını Arsa Sahiplerine ödemeyi kabul ve taahhüt eder.')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 9: MÜCBİR SEBEPLER VE SÜRE UZATIMI')}</h4>
            <p className="text-slate-700">
              {highlightText('Deprem, sel, salgın gibi doğal afetler ile T.C. Belediyeleri ve resmî kurumlar nezdinde yürütülen ruhsat/imar planı askı ve itiraz süreçleri, imar planı değişiklikleri ve idari durdurmalar mücbir sebep kabul edilir. Mücbir sebep hallerinde geçen süreler inşaat teslim süresine ilave edilir.')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 10: İŞ SAĞLIĞI VE SGK YÜKÜMLÜLÜKLERİ')}</h4>
            <p className="text-slate-700">
              {highlightText('Yüklenici, 4857 sayılı İş Kanunu ve İş Sağlığı Tüzüğü hükümlerine uymak zorundadır. Şantiyede meydana gelebilecek iş kazalarından ve 3. şahıslara verilebilecek zararlardan tamamen Yüklenici sorumludur. Tüm personelin SGK primleri ve All-Risk şantiye sigortası Yüklenici tarafından karşılanacaktır.')}
            </p>
          </div>

          {/* SECTION IV */}
          <h3 className="font-semibold text-indigo-700 border-b border-slate-200 pb-2 text-xs uppercase pt-2">
            {highlightText('BÖLÜM IV: GARANTİ SÜRELERİ (TBK m. 478) VE İHTİLAFLAR')}
          </h3>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 11: MEVZUATA UYGUN GARANTİ SÜRELERİ')}</h4>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-700">
              <li>
                <strong className="text-slate-900">Ağır Kusur ve Gizli Ayıplar (Taşıyıcı Sistem, Beton, Demir):</strong> {highlightText('20 (Yirmi) Yıl Garanti.')}
              </li>
              <li>
                <strong className="text-slate-900">Açık Ayıplar, İnce İşçilik ve Su/Isı Yalıtımı:</strong> {highlightText('5 (Beş) Yıl Garanti.')}
              </li>
              <li>
                <strong className="text-slate-900">Mekanik, Elektrik Donanım ve Asansör Cihazları:</strong> {highlightText('Üretici garantisi uyarınca 2 (İki) Yıl Garanti.')}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 text-xs mb-1.5">{highlightText('MADDE 12: UYUŞMAZLIKLARIN ÇÖZÜMÜ')}</h4>
            <p className="text-slate-700">
              {highlightText('İşbu Sözleşmeden doğabilecek tüm uyuşmazlıklarda')} <strong className="text-slate-900">{highlightText(params.projectAddress?.split('/')[0] || 'Yerel')} Mahkemeleri ve İcra Daireleri</strong> {highlightText('yetkilidir.')}
            </p>
          </div>

          {params.customContractNotes && (
            <div>
              <h4 className="font-semibold text-amber-900 text-xs mb-1.5">{highlightText('MADDE 13: İLAVE ÖZEL ŞARTLAR VE HÜKÜMLER')}</h4>
              <p className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-slate-800 font-mono text-xs whitespace-pre-wrap">
                {highlightText(params.customContractNotes)}
              </p>
            </div>
          )}

          {/* Section V: Ek-1 Hak Sahipleri Listesi */}
          <div className="pt-2">
            <h4 className="font-semibold text-indigo-700 text-xs mb-3 uppercase">
              {highlightText('BÖLÜM V: EK-1 HAK SAHİPLERİ VE BAĞIMSIZ BÖLÜM DAĞILIM LİSTESİ')}
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">Daire No</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">Hak Sahibi Adı</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">T.C. Kimlik No</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold text-center">Arsa Payı</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">Alan</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">Toplam Bedel</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">Peşinat</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold">Kalan Borç</th>
                    <th className="p-2.5 border-b border-slate-200 font-semibold text-center">İmza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.flatResults.map((f) => {
                    const landShareStr = f.landShareNumerator && params.totalLandShareDenominator
                      ? `${f.landShareNumerator}/${params.totalLandShareDenominator}`
                      : `1/${results.flatResults.length}`;
                    return (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-900">Daire {f.id}</td>
                        <td className="p-2.5 text-slate-900">{highlightText(f.name)}</td>
                        <td className="p-2.5 text-slate-500 font-mono">{highlightText(f.tc)}</td>
                        <td className="p-2.5 text-slate-700 font-mono text-center">{landShareStr}</td>
                        <td className="p-2.5 text-slate-700 font-mono">{f.area} m²</td>
                        <td className="p-2.5 text-slate-900 font-mono">
                          {f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono">{f.downPayment.toLocaleString('tr-TR')} TL</td>
                        <td className="p-2.5 font-bold text-slate-900 font-mono">
                          {f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                        <td className="p-2.5 text-center text-slate-300 font-mono text-[10px]">
                          ........................
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-10 px-4 text-xs text-slate-700 border-t border-slate-200">
            <div className="text-center border-r border-dashed border-slate-300 pr-4">
              <p className="font-bold mb-10 text-slate-900">ARSA SAHİPLERİ / KAT MALİKLERİ</p>
              <div className="h-10 border-b border-slate-300 mx-8 mb-2"></div>
              <p className="text-slate-400 text-[10px]">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            <div className="text-center pl-4 relative">
              <p className="font-bold mb-1 text-slate-900">YÜKLENİCİ FİRMA KAŞE / İMZA</p>
              <p className="text-[11px] text-slate-600 mb-2 leading-tight">
                {profile.legalName || profile.companyName}
              </p>

              <div className="flex items-center justify-center gap-4 min-h-[50px] relative my-1">
                {profile.stampUrl && (
                  <img
                    src={profile.stampUrl}
                    alt="Kaşe/İmza"
                    className="max-h-12 object-contain absolute opacity-80 z-10 pointer-events-none"
                  />
                )}
                {showFirstAuth && profile.authorizedPerson && (
                  <div className="relative z-0">
                    <p className="font-bold text-slate-900 text-xs">{profile.authorizedPerson}</p>
                    <p className="text-[10px] text-indigo-700">{profile.authorizedTitle}</p>
                    {showFirstAuthChamber && (profile.authorizedChamberNo || profile.authorizedChamber) && (
                      <p className="text-[9px] text-slate-500 font-mono">{profile.authorizedChamberNo || profile.authorizedChamber}</p>
                    )}
                  </div>
                )}
                {showSecondAuth && profile.authorizedPerson2 && (
                  <div className="relative z-0 border-l border-slate-200 pl-3">
                    <p className="font-bold text-slate-900 text-xs">{profile.authorizedPerson2}</p>
                    <p className="text-[10px] text-emerald-700">{profile.authorizedTitle2}</p>
                    {showSecondAuthChamber && (profile.authorizedChamberNo2 || profile.authorizedChamber2) && (
                      <p className="text-[9px] text-slate-500 font-mono">{profile.authorizedChamberNo2 || profile.authorizedChamber2}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="h-6 border-b border-slate-300 mx-8 mb-2"></div>
              <p className="text-slate-400 text-[10px]">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
