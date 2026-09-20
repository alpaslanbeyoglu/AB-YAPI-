import React, { useState } from 'react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import {
  TrendingUp,
  ShieldAlert,
  Clock,
  Banknote,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Calendar,
  Layers,
  HelpCircle,
  Lightbulb,
  DollarSign
} from 'lucide-react';

interface CfoFinancialStrategyModuleProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
}

export const CfoFinancialStrategyModule: React.FC<CfoFinancialStrategyModuleProps> = ({
  params,
  results,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';

  // Interactive CFO Simulation States
  const [grantDelayDays, setGrantDelayDays] = useState<number>(30); // 15, 30, 45, 60
  const [ownerTimelinessPercent, setOwnerTimelinessPercent] = useState<number>(90); // 100, 90, 75, 60
  const [activeTab, setActiveTab] = useState<'timeline' | 'recommendations' | 'simulation'>('timeline');

  // Key Financial Figures
  const grandTotal = results.grandTotal || 0;
  const subTotalCost = results.subTotalCost || 0;
  const profitAmount = results.profitAmount || 0;
  const totalMonths = results.finalMonths || params.manualMonths || 12;

  // Total Grants & Loans in the Project
  const flats = results.flatResults || [];
  const ownerFlats = flats.filter((f) => !f.isContractorShare);
  const totalGrants = ownerFlats.reduce((sum, f) => sum + (f.usedGrant || 0), 0);
  const totalCredits = ownerFlats.reduce((sum, f) => sum + (f.usedCredit || 0), 0);
  const totalDownPayments = ownerFlats.reduce((sum, f) => sum + (f.downPayment || 0), 0);

  // Financial Health Metrics
  const avgMonthlyExpense = subTotalCost / (totalMonths || 12);
  const recommendedWorkingCapitalBuffer = avgMonthlyExpense * 1.5; // 1.5 months liquidity reserve
  const estimatedGrantPayoutDelayImpact = (totalGrants + totalCredits) * (grantDelayDays / 365) * 0.4; // Liquidity pressure index
  
  // Liquidity Health Score calculation (0 - 100)
  let liquidityScore = 92;
  if (grantDelayDays > 30) liquidityScore -= 10;
  if (grantDelayDays > 45) liquidityScore -= 12;
  if (ownerTimelinessPercent < 90) liquidityScore -= 8;
  if (ownerTimelinessPercent < 75) liquidityScore -= 15;
  if (liquidityScore < 50) liquidityScore = 50;

  // Timeline Phase Data (Finans Sorumlusu Nakit Akış Takvimi)
  const timelinePhases = [
    {
      phaseNumber: 1,
      phaseName: 'Ruhsat, Proje & Şantiye Kurulumu',
      monthsLabel: '1 - 2. Aylar',
      expenseSharePercent: 8,
      estimatedExpense: results.officialCost + results.sgkSalesCost * 0.3,
      expenseItems: [
        'Mimar, statik, mekanik, elektrik proje müellifleri',
        'Noter sözleşme harçları, YAMBİS, belediye ruhsat harçları',
        'Zemin etüdü, jeoloji raporları & yapı denetim hizmet bedeli',
        'Şantiye kurulumu, konteyner, geçici elektrik/su abonelikleri'
      ],
      incomeItems: [
        `Malikler Peşinat Ödemeleri (%20-25) ~ ${totalDownPayments > 0 ? totalDownPayments.toLocaleString('tr-TR') + ' ₺' : (grandTotal * 0.2).toLocaleString('tr-TR') + ' ₺'}`,
        'Müteahhit Başlangıç Öz Kaynak Sermayesi'
      ],
      grantPayoutStatus: 'Henüz Kamu Hakedişi Başlamadı (Sıfır Hakediş)',
      cfoAdvice: 'Sözleşme imzasında malik peşinatları eksiksiz tahsil edilmelidir. Resmi harçlar ve proje giderleri peşin ödendiğinden başlangıçta öz kaynak hazır bulundurulmalıdır.',
      riskLevel: 'Low' as const
    },
    {
      phaseNumber: 2,
      phaseName: 'Hafriyat & Kaba İnşaat (Temel / Bodrum / Subasman)',
      monthsLabel: `3 - ${Math.ceil(totalMonths * 0.4)}. Aylar`,
      expenseSharePercent: 35,
      estimatedExpense: results.kabaTotalCost * 0.55,
      expenseItems: [
        'Hafriyat & kazı firması, kaya kırıcı & nakliye',
        'C30/35 Hazır beton alımları (Radye temel & bodrum perdeleri)',
        'Nervürlü demir donatı alımı (Ton bazlı demir tüccarı)',
        'Kalıpçı, demirci ve beton döküm taşeron hakedişleri',
        'SGK asgari işçilik stopaj ve prim ödemeleri'
      ],
      incomeItems: [
        'Malikler 2. Aşama Taksiti (%25 Subasman Vizesi)',
        `1. Kamu / Banka Hakedişi (Temel Vizesi) ~ Tahmini: ${((totalGrants + totalCredits) * 0.25).toLocaleString('tr-TR')} ₺`
      ],
      grantPayoutStatus: `⚠️ Hakediş Vizesi Onayından Sonra ${grantDelayDays} Gün İçinde Hesaba Geçer`,
      cfoAdvice: `Kamu hakediş ödemelerinde ${grantDelayDays} günlük bürokratik gecikme riski mevcuttur. Beton ve demir tedarikçilerine 30-60 günlük vadeli çek/akreditif verilmeli veya peşinat bakiyesi köprü finansmanı olarak kullanılmalıdır.`,
      riskLevel: 'High' as const
    },
    {
      phaseNumber: 3,
      phaseName: 'Normal Kat Betonları & Kaba Yapı Tamamlanması',
      monthsLabel: `${Math.ceil(totalMonths * 0.4) + 1} - ${Math.ceil(totalMonths * 0.65)}. Aylar`,
      expenseSharePercent: 25,
      estimatedExpense: results.kabaTotalCost * 0.45,
      expenseItems: [
        'Normal kat döşeme betonları ve kolon/perde imalatı',
        'Tuğla / Bims / Gazbeton dış ve iç duvar örme işçiliği',
        'Çatı ahşap/çelik karkas, kiremit/membran su yalıtımı',
        'Dış cephe iskelesi kurulumu & iş güvenliği fileleri'
      ],
      incomeItems: [
        'Malikler 3. Aşama Taksiti (%25 Kat Betonları)',
        `2. Kamu / Banka Hakedişi (Kaba Yapı Bitiş Vizesi) ~ Tahmini: ${((totalGrants + totalCredits) * 0.30).toLocaleString('tr-TR')} ₺`
      ],
      grantPayoutStatus: 'Yapı Denetim Kat Vizeleri Sonrası 15-30 Gün İçi Ödeme',
      cfoAdvice: 'Tuğla ve çatı malzemesi toplu alımlarında peşin ödeme iskontoları (%5-%8) değerlendirilmelidir. Maliklerin kat beton taksit ödemeleri aksatılmadan takip edilmelidir.',
      riskLevel: 'Medium' as const
    },
    {
      phaseNumber: 4,
      phaseName: 'Tesisat, Doğrama & İnce Sıva / Şap Aşaması',
      monthsLabel: `${Math.ceil(totalMonths * 0.65) + 1} - ${Math.ceil(totalMonths * 0.85)}. Aylar`,
      expenseSharePercent: 20,
      estimatedExpense: results.systemsCost + results.finishingTotalCost * 0.4,
      expenseItems: [
        'Asansör firması avansı & kuyu/ray montaj imalatları',
        'PVC / Alüminyum ısı camlı doğrama imalatı & montajı',
        'Elektrik, su, doğalgaz ve kalorifer iç tesisat ekipleri',
        'Kara sıva, alçı sıva, şap dökümü ve dış cephe mantolama'
      ],
      incomeItems: [
        'Malikler 4. Aşama Taksiti (%15-20 İnce Yapı)',
        `3. Kamu / Banka Hakedişi (Tesisat & Sıva Vizesi) ~ Tahmini: ${((totalGrants + totalCredits) * 0.25).toLocaleString('tr-TR')} ₺`
      ],
      grantPayoutStatus: 'Yapı Denetim Tesisat Vizesi Onayında Hesaba Yatar',
      cfoAdvice: 'Asansör ve PVC doğrama tedarik süreleri uzun olduğundan (45-60 gün), sipariş avansları kaba inşaatın sonunda ödenerek üretim bandına alınmalıdır.',
      riskLevel: 'Medium' as const
    },
    {
      phaseNumber: 5,
      phaseName: 'İç Bitişler, İskân Alımı & Anahtar Teslim',
      monthsLabel: `${Math.ceil(totalMonths * 0.85) + 1} - ${totalMonths}. Aylar`,
      expenseSharePercent: 12,
      estimatedExpense: results.finishingTotalCost * 0.6,
      expenseItems: [
        'Mutfak dolapları, membran/lake iç kapılar, banyo vitrifiyeleri',
        'Seramik, laminat parke, iç cephe boyası ve armatürler',
        'Asansör yeşil etiket tescili & işletme ruhsatı harçları',
        'SGK ilişiksizlik belgesi kapatma stopajı & belediye iskân harçları'
      ],
      incomeItems: [
        'Malikler Son Taksit (%5-10 Anahtar Teslim & İskân)',
        `4. Kamu / Banka Son Hakedişi (İskân Vizesi) ~ Tahmini: ${((totalGrants + totalCredits) * 0.20).toLocaleString('tr-TR')} ₺`
      ],
      grantPayoutStatus: 'Belediye İskân Belgesi Düzenlendikten Sonra Kapanış Ödemesi',
      cfoAdvice: 'SGK ilişiksizlik primi ve belediye iskân harçları peşin ödenmeden yapı kullanım izni alınamaz. Şantiye kasasında iskân süreci için mutlaka en az %5 nakit rezerv tutulmalıdır.',
      riskLevel: 'Low' as const
    }
  ];

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 shadow-sm transition-all ${
      isGray ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-950 border-slate-800 text-white'
    }`}>
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                CFO FİNANSAL STRATEJİ VE NAKİT AKIŞ DENGE MODÜLÜ
              </h3>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold">
                CFO Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Müteahhit Finans Sorumlusu Bakış Açısıyla Gelir-Gider Zamanlaması, Hakediş Vade Analizi ve Risk Dengeleme
            </p>
          </div>
        </div>

        {/* Navigation Tabs inside Module */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold print:hidden">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            📅 Şantiye Takvimi & Nakit Akışı
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            💡 Finans Sorumlusu Tavsiyeleri
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🎛️ Vade & Likidite Simülatörü
          </button>
        </div>
      </div>

      {/* CFO Key Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Liquidity Health Index */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
            <span>Likidite Denge Skoru</span>
            <Scale className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {liquidityScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
              Stabil
            </span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            Grup nakit dengesi ve tahsilat süreleri dengeli
          </p>
        </div>

        {/* KPI 2: Critical Working Capital Buffer */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
            <span>Önerilen İhtiyat Akçesi</span>
            <Banknote className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {recommendedWorkingCapitalBuffer.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            En az 1.5 aylık şantiye işletme gideri rezervi
          </p>
        </div>

        {/* KPI 3: Total Grants & Credits Managed */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
            <span>Kamu Hibe & Kredi Hakedişi</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-300">
            {(totalGrants + totalCredits).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            4 aşamada Bakanlık/Banka hakedişi ile aktarılacak
          </p>
        </div>

        {/* KPI 4: Public Grant Delay Setting */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
            <span>Tahmini Hakediş Vadesi</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-300">
            ~{grantDelayDays} Gün
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            Vize onayından müteahhit hesabına geçiş süresi
          </p>
        </div>
      </div>

      {/* TAB 1: Detailed Timeline & Cash Flow Phase Matrix */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Yapı İlerlemesine Göre Gelir-Gider Zamanlama ve Hakediş Dengesi</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Toplam Süre: {totalMonths} Ay ({totalMonths * 30} Gün)
            </span>
          </div>

          <div className="space-y-3">
            {timelinePhases.map((phase) => (
              <div
                key={phase.phaseNumber}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Phase Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-black font-mono flex items-center justify-center shrink-0">
                      0{phase.phaseNumber}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{phase.phaseName}</span>
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                          {phase.monthsLabel}
                        </span>
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-sans">Aşama Harcama Bütçesi</span>
                      <span className="font-bold text-red-400">
                        ~{phase.estimatedExpense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺ ({phase.expenseSharePercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid: Expenses vs Incomes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left Column: Expenses & Subcontractors */}
                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Bu Aşamada Çıkacak Giderler & Ödemeler</span>
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                      {phase.expenseItems.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column: Incomes & Collections */}
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>Bu Aşamada Girecek Tahsilat & Gelirler</span>
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                      {phase.incomeItems.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CFO Advice & Public Grant Delay Box */}
                <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 text-[11px] block">
                        💡 Finans Sorumlusu (CFO) Stratejik Tavsiyesi:
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                        {phase.cfoAdvice}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700 text-[10px] font-mono text-purple-300 font-semibold">
                    {phase.grantPayoutStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Strategic CFO Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Finans Direktörü (CFO) Nakit & Risk Yönetimi Aksiyon Planı</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Public Grant Delay Strategy */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs border-b border-slate-800 pb-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>1. Kamu Destekleri & Hakediş Vade Yönetimi</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>21-35 Günlük Bürokrasi Tamponu:</strong> Yapı Denetim vizesi onaylandıktan sonra Çevre, Şehircilik ve İklim Değişikliği Bakanlığı / İl Müdürlüğü / Emlak Konut hakediş ödemeleri ortalama 3-5 hafta sonra hesaba geçer.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Banka Temlik Sözleşmesi:</strong> Kamu hakediş ödemeleri gelene kadar şantiye imalatlarının aksamaması için hakediş temlikli kentsel dönüşüm teminat mektubu/kredi hattı hazır bulundurulmalıdır.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 2: Owner Payment Discipline */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs border-b border-slate-800 pb-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>2. Malik Ödemeleri & Taksit Disiplini</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Fiziki Vizeye İndeksli Ödeme:</strong> Malik taksitleri doğrudan takvim tarihine değil, şantiye aşamasına (ör. "Subasman Vizesi Onayı", "3. Kat Betonu") indekslenmelidir.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Gecikme Cezası & Şantiye İhtarı:</strong> Taksitini 15 günden fazla geciktiren maliklere aylık %3 gecikme faizi uygulanacağı sözleşmede netleştirilmelidir.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 3: Vendor Procurement & Discount */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs border-b border-slate-800 pb-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>3. Taşeron & Malzeme Satın Alma Stratejisi</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Toplu Demir-Beton Peşin Alım İskontosu:</strong> Şantiye başında demir ve hazır beton firmaları ile miktar sabitlemeli anlaşma yapılarak %15'e varan enflasyonel fiyat artış riski bloke edilmelidir.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>30-60 Günlük Tedarikçi Vadeleri:</strong> İnce işçilik (PVC, asansör, mutfak) malzemelerinde peşinat %30, kalan %70 imalat tesliminde ödenmek üzere kademelendirilmelidir.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 4: Working Capital & Contingency Reserve */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs border-b border-slate-800 pb-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>4. Çalışma Sermayesi & İskân Kapanış Rezervi</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kritik Kasa Rezervi (Buffer):</strong> En az 1.5 aylık şantiye gideri tutarında ({recommendedWorkingCapitalBuffer.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺) acil durum rezervi kasada hazır tutulmalıdır.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>İskân Harçları ve SGK İlişiksizlik:</strong> Belediye yapı kullanım izni ve SGK asgari işçilik fark primleri için proje sonuna %5'lik iskân rezervi ayrılmalıdır.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Interactive Vade & Likidite Simulator */}
      {activeTab === 'simulation' && (
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-400" />
            <span>İnteraktif Kamu Hakediş Vadesi ve Tahsilat Simülatörü</span>
          </h4>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slider 1: Public Grant Delay Days */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-200">
                    Kamu Hakediş Ödeme Vadesi (Gecikme Gün)
                  </label>
                  <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {grantDelayDays} Gün
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="15"
                  value={grantDelayDays}
                  onChange={(e) => setGrantDelayDays(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>15 Gün (Hızlı)</span>
                  <span>30 Gün (Normal)</span>
                  <span>45 Gün (Bürokratik)</span>
                  <span>60 Gün (Kritik)</span>
                </div>
              </div>

              {/* Slider 2: Owner Payment Timeliness */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-200">
                    Malik Taksit Ödeme Disiplini / Uyum Oranı
                  </label>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    %{ownerTimelinessPercent} Zamanında
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="10"
                  value={ownerTimelinessPercent}
                  onChange={(e) => setOwnerTimelinessPercent(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>%60 (Aksak)</span>
                  <span>%80 (Makul)</span>
                  <span>%100 (Eksiksiz)</span>
                </div>
              </div>
            </div>

            {/* Simulation Result Output Box */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                📊 Simülasyon Sonuç Ve Nakit Akış Değerlendirmesi:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Simüle Edilen Likidite Skoru</span>
                  <span className="text-lg font-bold text-emerald-400">{liquidityScore} / 100</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Tahmini Vade Köprü İhtiyacı</span>
                  <span className="text-lg font-bold text-amber-400">
                    {((totalGrants + totalCredits) * (grantDelayDays / 365)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Gerekli Minimum İşletme Rezervi</span>
                  <span className="text-lg font-bold text-purple-300">
                    {(recommendedWorkingCapitalBuffer * (1 + (60 - ownerTimelinessPercent) / 100)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
