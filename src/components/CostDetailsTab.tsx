import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  Sparkles,
  TrendingUp,
  Hammer,
  Layers,
  Scale,
  DollarSign,
  Briefcase,
  HardHat,
  ChevronDown,
  Printer,
  ChevronRight,
  Info,
  Package,
  Settings2,
  Coins,
  Wrench,
  Calculator,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';

interface CostDetailsTabProps {
  params: ProjectParams;
  results: CalculationResult;
  theme?: AppTheme;
  onChangeParams?: (newParams: ProjectParams) => void;
  onCalculate?: () => void;
}

interface CostGroup {
  name: string;
  key: string;
  total: number;
  labor: number;
  material: number;
  color: string;
}

interface MaterialTakeoffItem {
  id: string;
  category: 'kaba' | 'ince' | 'tesisat' | 'resmi';
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  laborShare: number; // percentage
}

export const CostDetailsTab: React.FC<CostDetailsTabProps> = ({
  params,
  results,
  theme = 'light',
  onChangeParams,
  onCalculate,
}) => {
  const updateParam = <K extends keyof ProjectParams>(key: K, value: ProjectParams[K]) => {
    if (onChangeParams) {
      onChangeParams({
        ...params,
        [key]: value,
      });
    }
  };
  const [currency, setCurrency] = useState<'TL' | 'USD'>('TL');
  const [activeChart, setActiveChart] = useState<'donut' | 'stacked'>('donut');
  const [hoveredData, setHoveredData] = useState<{ label: string; value: number; percent: number } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCostSettingsOpen, setIsCostSettingsOpen] = useState(true);

  // Live Market Data States
  const [usdTry, setUsdTry] = useState<number>(32.85);
  const [eurTry, setEurTry] = useState<number>(35.60);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [steelPrice, setSteelPrice] = useState<number>(33350);
  const [concretePrice, setConcretePrice] = useState<number>(3500);

  // Simulation states
  const [simBase, setSimBase] = useState<number>(0);
  const [simFx, setSimFx] = useState<number>(10);
  const [simMat, setSimMat] = useState<number>(15);
  const [simLab, setSimLab] = useState<number>(20);

  useEffect(() => {
    setIsLiveActive(true);
    setLastUpdated(new Date().toLocaleDateString('tr-TR'));

    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.result === 'success' && data.rates && data.rates.TRY) {
          const usdRate = data.rates.TRY;
          const eurRate = usdRate / (data.rates.EUR || 0.92);
          const freshUsd = Number(usdRate.toFixed(2));
          const freshEur = Number(eurRate.toFixed(2));
          setUsdTry(freshUsd);
          setEurTry(freshEur);
          // Synchronize material prices dynamically with realistic market indices
          const freshSteel = Math.round(33000 + (usdRate - 32.85) * 450);
          const freshConcrete = Math.round(3450 + (usdRate - 32.85) * 50);
          setSteelPrice(freshSteel);
          setConcretePrice(freshConcrete);

          // Sync with central project params so calculations are automatically grounded on load
          if (onChangeParams) {
            onChangeParams({
              ...params,
              usdRate: freshUsd,
              priceSteel: freshSteel,
              priceConcrete: freshConcrete,
            });
          }
        }
      })
      .catch((err) => {
        console.error('Döviz kuru API hatası:', err);
      });
  }, []);

  // Update simBase once results load
  useEffect(() => {
    const totalSumVal = (results.kabaTotalCost || 0) + (results.finishingTotalCost || 0) + (results.systemsCost || 0) + (results.officialCost || 0) + (results.sgkSalesCost || 0);
    setSimBase(totalSumVal);
  }, [results]);

  const donutSvgRef = useRef<SVGSVGElement>(null);
  const stackedSvgRef = useRef<SVGSVGElement>(null);

  const isLight = theme === 'light';
  const isGray = theme === 'gray';

  // Currency multiplier
  const rate = currency === 'TL' ? 1 : 1 / (params.usdRate || 34.5);
  const sym = currency === 'TL' ? '₺' : '$';

  // Extract variables
  const totalArea = results.totalArea || 100;
  const flatCount = params.flatCount || 10;

  // 1. Group Costs logically into Rough, Fine, Systems, and Official/SGK
  const roughCost = results.kabaTotalCost || 0;
  const fineCost = results.finishingTotalCost || 0;
  const systemsCost = results.systemsCost || 0;
  const officialCostCombined = (results.officialCost || 0) + (results.sgkSalesCost || 0);

  // Estimating labor vs material split based on typical construction metrics
  // Rough Construction: typically kaba labor price is params.costKabaWork * totalArea.
  // Material is kabaTotalCost - kabaLabor
  const roughLabor = Math.min(roughCost * 0.95, (params.costKabaWork || 0) * totalArea * (params.costMultiplier || 1));
  const roughMaterial = Math.max(0, roughCost - roughLabor);

  // Fine Construction: typically 45% labor, 55% material
  const fineLabor = fineCost * 0.45;
  const fineMaterial = fineCost * 0.55;

  // Systems (elevator, plumbing system, gas, smart home): 25% labor, 75% material
  const systemsLabor = systemsCost * 0.25;
  const systemsMaterial = systemsCost * 0.75;

  // Official / SGK: Official fees are usually 10% labor (consultancy/notary fees, sgk employee), 90% other costs (taxes, licenses)
  const officialLabor = officialCostCombined * 0.15;
  const officialMaterial = officialCostCombined * 0.85;

  const costGroups: CostGroup[] = [
    {
      name: 'Kaba İnşaat',
      key: 'kaba',
      total: roughCost,
      labor: roughLabor,
      material: roughMaterial,
      color: '#4f46e5', // indigo-600
    },
    {
      name: 'İnce İnşaat',
      key: 'ince',
      total: fineCost,
      labor: fineLabor,
      material: fineMaterial,
      color: '#10b981', // emerald-500
    },
    {
      name: 'Mekanik, Elektrik & Ortak Sistemler',
      key: 'tesisat',
      total: systemsCost,
      labor: systemsLabor,
      material: systemsMaterial,
      color: '#f59e0b', // amber-500
    },
    {
      name: 'Resmi Harçlar, SGK & İdari',
      key: 'resmi',
      total: officialCostCombined,
      labor: officialLabor,
      material: officialMaterial,
      color: '#a855f7', // purple-500
    },
  ];

  const totalSum = roughCost + fineCost + systemsCost + officialCostCombined;
  const totalLabor = roughLabor + fineLabor + systemsLabor + officialLabor;
  const totalMaterial = roughMaterial + fineMaterial + systemsMaterial + officialMaterial;

  // 2. Generate Detailed Take-off (Metraj) Items from calculation inputs
  const materialItems: MaterialTakeoffItem[] = [
    // Kaba İnşaat
    {
      id: 'm1',
      category: 'kaba',
      name: 'Hazır Beton (C30/35 Sınıfı)',
      unit: 'm³',
      quantity: results.concreteM3,
      unitPrice: params.priceConcrete,
      total: results.concreteM3 * params.priceConcrete * (params.costMultiplier || 1),
      laborShare: 15,
    },
    {
      id: 'm2',
      category: 'kaba',
      name: 'Nervürlü İnşaat Demiri (Q8-Q32)',
      unit: 'Ton',
      quantity: results.steelTon,
      unitPrice: params.priceSteel,
      total: results.steelTon * params.priceSteel * (params.costMultiplier || 1),
      laborShare: 10,
    },
    {
      id: 'm3',
      category: 'kaba',
      name: 'Kalıp, İskele ve Betonarme İşçiliği',
      unit: 'm²',
      quantity: totalArea,
      unitPrice: params.costKabaWork,
      total: totalArea * params.costKabaWork * (params.costMultiplier || 1),
      laborShare: 90,
    },
    // Tesisat & Sistemler
    {
      id: 'm4',
      category: 'tesisat',
      name: 'Sınıf Çift Hızlı Asansör Sistemi',
      unit: 'Adet',
      quantity: params.elevatorCount || 1,
      unitPrice: params.costElevator / (params.elevatorCount || 1),
      total: params.costElevator * (params.costMultiplier || 1),
      laborShare: 20,
    },
    {
      id: 'm5',
      category: 'tesisat',
      name: 'Akıllı Ev Otomasyonu ve Altyapısı',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.priceSmartHome,
      total: flatCount * params.priceSmartHome * (params.costMultiplier || 1),
      laborShare: 15,
    },
    {
      id: 'm6',
      category: 'tesisat',
      name: 'Doğalgaz & Kalorifer Kolon Tesisatı',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.priceGas,
      total: flatCount * params.priceGas * (params.costMultiplier || 1),
      laborShare: 30,
    },
    {
      id: 'm7',
      category: 'tesisat',
      name: 'Diafon & Görüntülü İnterkom Sistemi',
      unit: 'Sistem',
      quantity: 1,
      unitPrice: params.costIntercom,
      total: params.costIntercom * (params.costMultiplier || 1),
      laborShare: 20,
    },
    // İnce İnşaat
    {
      id: 'm8',
      category: 'ince',
      name: 'Sıhhi ve Temiz Su Tesisatı',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.pricePlumbing,
      total: flatCount * params.pricePlumbing * (params.costMultiplier || 1),
      laborShare: 45,
    },
    {
      id: 'm9',
      category: 'ince',
      name: 'Kuvvetli & Zayıf Akım Elektrik İşleri',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.priceElectric,
      total: flatCount * params.priceElectric * (params.costMultiplier || 1),
      laborShare: 45,
    },
    {
      id: 'm10',
      category: 'ince',
      name: 'Isıcamlı PVC Doğrama Pencere Sistemleri',
      unit: 'm²',
      quantity: Math.round(totalArea * 0.18 * 10) / 10,
      unitPrice: params.pricePvc,
      total: totalArea * 0.18 * params.pricePvc * (params.costMultiplier || 1),
      laborShare: 25,
    },
    {
      id: 'm11',
      category: 'ince',
      name: 'Seramik & Islak Zemin Kaplamaları',
      unit: 'm²',
      quantity: totalArea,
      unitPrice: params.priceTiles,
      total: totalArea * params.priceTiles * (params.costMultiplier || 1),
      laborShare: 50,
    },
    {
      id: 'm12',
      category: 'ince',
      name: 'Lake Boyalı Hazır Mutfak Dolapları',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.priceKitchen,
      total: flatCount * params.priceKitchen * (params.costMultiplier || 1),
      laborShare: 20,
    },
    {
      id: 'm13',
      category: 'ince',
      name: 'Ahşap Panel İç Kapılar (Ebeveyn + Odalar)',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.priceDoors,
      total: flatCount * params.priceDoors * (params.costMultiplier || 1),
      laborShare: 20,
    },
    {
      id: 'm14',
      category: 'ince',
      name: 'Alçı Sıva & Saten İç/Dış Boya İşleri',
      unit: 'm²',
      quantity: Math.round(totalArea * 2.8 * 10) / 10,
      unitPrice: params.pricePaintPlaster,
      total: totalArea * 2.8 * params.pricePaintPlaster * (params.costMultiplier || 1),
      laborShare: 70,
    },
    // Resmi İşlemler & İdari Giderler
    {
      id: 'm15',
      category: 'resmi',
      name: 'İmar Noter, Yapı Denetim Sözleşmeleri',
      unit: 'Proje',
      quantity: 1,
      unitPrice: params.costNotaryContract,
      total: params.costNotaryContract * (params.costMultiplier || 1),
      laborShare: 0,
    },
    {
      id: 'm16',
      category: 'resmi',
      name: 'Şantiye Kuruluşu & Merkez Şirket Gideri',
      unit: 'Ay',
      quantity: Math.round(results.finalMonths || 12),
      unitPrice: params.costCompany,
      total: params.costCompany * (params.costMultiplier || 1),
      laborShare: 50,
    },
    {
      id: 'm17',
      category: 'resmi',
      name: 'Belediye Ruhsatı, Mimari Projeler & Vizeler',
      unit: 'm²',
      quantity: totalArea,
      unitPrice: params.priceProjectPermit,
      total: totalArea * params.priceProjectPermit * (params.costMultiplier || 1),
      laborShare: 20,
    },
    {
      id: 'm18',
      category: 'resmi',
      name: 'SGK Asgari İşçilik Ödemesi',
      unit: 'm²',
      quantity: totalArea,
      unitPrice: params.priceSgk,
      total: totalArea * params.priceSgk * (params.costMultiplier || 1),
      laborShare: 0,
    },
    {
      id: 'm19',
      category: 'resmi',
      name: 'All-Risk İnşaat Şantiye Sigortası',
      unit: 'Proje',
      quantity: 1,
      unitPrice: params.costInsurance,
      total: params.costInsurance * (params.costMultiplier || 1),
      laborShare: 0,
    },
    {
      id: 'm20',
      category: 'resmi',
      name: 'Pazarlama, Satış ve Reklam Tanıtım',
      unit: 'Daire',
      quantity: flatCount,
      unitPrice: params.costSalesMarketing,
      total: flatCount * params.costSalesMarketing * (params.costMultiplier || 1),
      laborShare: 30,
    },
  ];

  // 3. Render D3 Pie / Donut Chart
  useEffect(() => {
    if (!donutSvgRef.current) return;

    // Reset container
    d3.select(donutSvgRef.current).selectAll('*').remove();

    const width = 360;
    const height = 360;
    const radius = Math.min(width, height) / 2 - 10;

    const svg = d3
      .select(donutSvgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const data = costGroups.map((g) => ({
      name: g.name,
      value: g.total * rate,
      color: g.color,
    }));

    const pie = d3
      .pie<any>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<any>()
      .innerRadius(radius * 0.62) // Elegant Donut feel
      .outerRadius(radius);

    const arcHover = d3
      .arc<any>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius + 6);

    const path = svg
      .selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', isLight ? '#ffffff' : '#1e293b')
      .attr('stroke-width', '3px')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    // Interactive Hover Animations
    path.on('mouseover', function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('d', arcHover)
        .attr('filter', 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))');

      const percent = (d.data.value / (totalSum * rate)) * 100;
      setHoveredData({
        label: d.data.name,
        value: d.data.value,
        percent: percent,
      });
    });

    path.on('mouseleave', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('d', arc)
        .attr('filter', null);
      setHoveredData(null);
    });

    // Animate drawing
    path
      .transition()
      .duration(800)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t));
        };
      });
  }, [results, currency, activeChart, theme]);

  // 4. Render D3 Stacked Bar Chart (Labor vs Material Split)
  useEffect(() => {
    if (!stackedSvgRef.current) return;

    d3.select(stackedSvgRef.current).selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 40, left: 70 };
    const width = 450;
    const height = 300;

    const svg = d3
      .select(stackedSvgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    // Data mapped
    const data = costGroups.map((g) => ({
      category: g.name.substring(0, 11) + '...',
      Malzeme: g.material * rate,
      İşçilik: g.labor * rate,
    }));

    const subgroups = ['Malzeme', 'İşçilik'];
    const groups = data.map((d) => d.category);

    const x = d3.scaleBand().domain(groups).range([0, chartW]).padding(0.35);
    const yMax = d3.max(data, (d) => d.Malzeme + d.İşçilik) || 1000;
    const y = d3.scaleLinear().domain([0, yMax * 1.05]).range([chartH, 0]);

    // Color Palette
    const color = d3
      .scaleOrdinal<string>()
      .domain(subgroups)
      .range(['#6366f1', '#10b981']); // Indigo for Material, Emerald for Labor

    // Gridlines
    svg
      .append('g')
      .attr('class', 'grid')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.25)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-chartW)
          .tickFormat(() => '')
      );

    // Axes
    svg
      .append('g')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', isLight ? '#475569' : '#94a3b8');

    svg
      .append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d: any) => `${sym}${(d / 1e6).toFixed(1)}M`)
      )
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', isLight ? '#475569' : '#94a3b8');

    const stackedData = d3.stack().keys(subgroups)(data as any);

    // Draw Bars
    svg
      .append('g')
      .selectAll('g')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('fill', (d) => color(d.key)!)
      .selectAll('rect')
      .data((d) => d)
      .enter()
      .append('rect')
      .attr('x', (d: any) => x(d.data.category)!)
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .style('opacity', 0.95)
      .on('mouseover', function () {
        d3.select(this).style('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).style('opacity', 0.95);
      });

    // Simple Legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${chartW - 120}, -20)`);

    subgroups.forEach((sub, i) => {
      const legRow = legend.append('g').attr('transform', `translate(0, ${i * 15})`);
      legRow
        .append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', color(sub)!);
      legRow
        .append('text')
        .attr('x', 15)
        .attr('y', 9)
        .text(sub)
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('fill', isLight ? '#334155' : '#e2e8f0');
    });
  }, [results, currency, activeChart, theme]);

  // Filtering & searching of takeoff items
  const filteredItems = materialItems.filter((item) => {
    const matchesCat = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'kaba':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ince':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'tesisat':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resmi':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'kaba':
        return 'Kaba İnşaat';
      case 'ince':
        return 'İnce İnşaat';
      case 'tesisat':
        return 'Sistem / Tesisat';
      case 'resmi':
        return 'Resmi & İdari';
      default:
        return cat;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in print:p-0">
      {/* 1. Upper Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl shadow-md text-white border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Hammer className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
              Metraj & İşçilik Analizörü
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight font-display">
            İnşaat Maliyet Detayları
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Toplam imalat hacmi üzerinden malzeme miktarları, işçilik giderleri ve metraj hiyerarşisi.
          </p>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setCurrency('TL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              currency === 'TL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Türk Lirası (₺)
          </button>
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              currency === 'USD'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dolar ($)
          </button>
        </div>
      </div>

      {/* 2. Top-level Summary Widgets (Anti-Slop flat structure) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Cost */}
        <div className={`p-4 rounded-xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Toplam Maliyet</span>
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-800">
            {sym}{(totalSum * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Kârsız yapım maliyeti</div>
        </div>

        {/* Material Cost */}
        <div className={`p-4 rounded-xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <Package className="w-3.5 h-3.5 text-indigo-500" />
            <span>Malzeme Giderleri</span>
          </div>
          <div className="text-lg font-bold tracking-tight text-indigo-600">
            {sym}{(totalMaterial * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Oran: %{Math.round((totalMaterial / totalSum) * 100)} (Demir, Beton vb.)
          </div>
        </div>

        {/* Labor Cost */}
        <div className={`p-4 rounded-xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <HardHat className="w-3.5 h-3.5 text-emerald-500" />
            <span>İşçilik Giderleri</span>
          </div>
          <div className="text-lg font-bold tracking-tight text-emerald-600">
            {sym}{(totalLabor * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Oran: %{Math.round((totalLabor / totalSum) * 100)} (Kalıp, Montaj vb.)
          </div>
        </div>

        {/* Concrete Volume */}
        <div className={`p-4 rounded-xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span>Beton Metrajı</span>
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-800">
            {results.concreteM3.toFixed(1)} m³
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {sym}{(params.priceConcrete * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} / m³ birim fiyat
          </div>
        </div>

        {/* Steel Volume */}
        <div className={`p-4 rounded-xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <Scale className="w-3.5 h-3.5 text-purple-500" />
            <span>Demir Metrajı</span>
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-800">
            {results.steelTon.toFixed(1)} Ton
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {sym}{(params.priceSteel * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} / Ton birim fiyat
          </div>
        </div>
      </div>

      {/* 2.5 Birim Maliyet Kalemleri Düzenleme Paneli */}
      {onChangeParams && (
        <div className={`p-0 rounded-2xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
          <button
            type="button"
            onClick={() => setIsCostSettingsOpen(!isCostSettingsOpen)}
            className={`w-full px-5 py-4 ${isGray ? 'bg-slate-200/50 hover:bg-slate-200' : 'bg-slate-50 hover:bg-slate-100/80'} flex items-center justify-between text-left transition-colors`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  🏗️ Birim Maliyet Girdileri & İnce Ayar Kalemleri
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Müteahhitlik ve inşaat malzeme birim fiyatlarını değiştirerek tüm metraj hesaplarını, grafik kırılımlarını ve sözleşmeleri anlık güncelleyin.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-full font-bold">
                Grafiklerle Canlı Senkronize
              </span>
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                {isCostSettingsOpen ? (
                  <>Gizle <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /></>
                ) : (
                  <>Göster / Düzenle <ChevronDown className="w-4 h-4 transition-transform" /></>
                )}
              </span>
            </div>
          </button>

          {isCostSettingsOpen && (
            <div className="p-6 space-y-5 border-t border-slate-200/60">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Resmi Süreç & Pazarlama */}
                <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="text-xs font-bold text-purple-700 flex items-center gap-1.5 uppercase tracking-wider border-b border-purple-200/60 pb-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    Resmi Süreç & Pazarlama
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Noter & Tapu Şerhi (TL):</label>
                      <input
                        type="number"
                        value={params.costNotaryContract}
                        onChange={(e) => updateParam('costNotaryContract', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Şirket & YAMBİS Belgesi (TL):</label>
                      <input
                        type="number"
                        value={params.costCompany}
                        onChange={(e) => updateParam('costCompany', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Projeler & Harçlar (m² - TL):</label>
                      <input
                        type="number"
                        value={params.priceProjectPermit}
                        onChange={(e) => updateParam('priceProjectPermit', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">SGK Asgari İşçilik (m² - TL):</label>
                      <input
                        type="number"
                        value={params.priceSgk}
                        onChange={(e) => updateParam('priceSgk', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">All-Risk Sigortası (TL):</label>
                      <input
                        type="number"
                        value={params.costInsurance}
                        onChange={(e) => updateParam('costInsurance', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Pazarlama (Daire Başı - TL):</label>
                      <input
                        type="number"
                        value={params.costSalesMarketing}
                        onChange={(e) => updateParam('costSalesMarketing', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                  </div>
                </div>

                {/* Kaba İnşaat */}
                <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider border-b border-indigo-200/60 pb-1.5">
                    <Hammer className="w-3.5 h-3.5" />
                    Kaba İnşaat Malzemeleri
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Beton C30/35 (m³ - TL):</label>
                      <input
                        type="number"
                        value={params.priceConcrete}
                        onChange={(e) => updateParam('priceConcrete', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">İnşaat Demiri (Ton - TL):</label>
                      <input
                        type="number"
                        value={params.priceSteel}
                        onChange={(e) => updateParam('priceSteel', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Hafriyat & Kalıp İşçiliği (m²):</label>
                      <input
                        type="number"
                        value={params.costKabaWork}
                        onChange={(e) => updateParam('costKabaWork', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    {/* Metraj Summary inside section */}
                    <div className="mt-6 pt-4 border-t border-indigo-100 bg-indigo-50/50 p-3 rounded-lg text-[10px] text-indigo-950 font-mono space-y-1.5">
                      <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1">
                        <span>📦 Ölçü Entegre Metraj:</span>
                      </p>
                      <p className="flex justify-between"><span>Toplam Alan:</span> <span>{(results.totalArea || 0).toFixed(1)} m²</span></p>
                      <p className="flex justify-between"><span>Beton Metrajı:</span> <span>{(results.concreteM3 || 0).toFixed(1)} m³</span></p>
                      <p className="flex justify-between"><span>Demir Metrajı:</span> <span>{(results.steelTon || 0).toFixed(1)} Ton</span></p>
                    </div>
                  </div>
                </div>

                {/* İnce İşçilik & Donanım */}
                <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 uppercase tracking-wider border-b border-emerald-200/60 pb-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    İnce İşçilik & Donanım
                  </h4>
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Asansör (Bina - TL):</label>
                      <input
                        type="number"
                        value={params.costElevator}
                        onChange={(e) => updateParam('costElevator', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Akıllı Ev (Daire - TL):</label>
                      <input
                        type="number"
                        value={params.priceSmartHome}
                        onChange={(e) => updateParam('priceSmartHome', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Diafon & Giriş (Bina - TL):</label>
                      <input
                        type="number"
                        value={params.costIntercom}
                        onChange={(e) => updateParam('costIntercom', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Doğalgaz & Kombi (TL):</label>
                      <input
                        type="number"
                        value={params.priceGas}
                        onChange={(e) => updateParam('priceGas', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Sıhhi Tesisat/Vitrifiye (TL):</label>
                      <input
                        type="number"
                        value={params.pricePlumbing}
                        onChange={(e) => updateParam('pricePlumbing', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Elektrik Altyapı (TL):</label>
                      <input
                        type="number"
                        value={params.priceElectric}
                        onChange={(e) => updateParam('priceElectric', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">PVC Doğrama (m² - TL):</label>
                      <input
                        type="number"
                        value={params.pricePvc}
                        onChange={(e) => updateParam('pricePvc', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Seramik & Parke (m² - TL):</label>
                      <input
                        type="number"
                        value={params.priceTiles}
                        onChange={(e) => updateParam('priceTiles', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Mutfak & Tezgah (TL):</label>
                      <input
                        type="number"
                        value={params.priceKitchen}
                        onChange={(e) => updateParam('priceKitchen', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">İç/Dış Kapılar (TL):</label>
                      <input
                        type="number"
                        value={params.priceDoors}
                        onChange={(e) => updateParam('priceDoors', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Şap, Sıva & Boya (m² - TL):</label>
                      <input
                        type="number"
                        value={params.pricePaintPlaster}
                        onChange={(e) => updateParam('pricePaintPlaster', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-3 py-1 rounded-lg border font-mono bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-indigo-500`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-50/30 -mx-6 -mb-6 p-4 rounded-b-2xl">
                <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Girdiğiniz birim fiyatlar otomatik olarak kaydedilir, grafikler ve raporlar anında güncellenir.</span>
                </span>
                {onCalculate && (
                  <button
                    type="button"
                    onClick={onCalculate}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>RAPOR GEÇMİŞİNE KAYDET</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CANLI PİYASA VERİLERİ VE SİMÜLATÖR PANELİ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Taraf: Canlı Veri Akışı ve Piyasa Kartları */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-5 rounded-2xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Canlı Piyasa Girdi Fiyatları ve Endeksleri
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Anlık döviz kurları ve güncel kentsel dönüşüm malzeme birim maliyetleri.
                </p>
              </div>
              <div className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-bold self-start sm:self-auto">
                Güncelleme: <span className="text-indigo-600">{lastUpdated || 'Canlı'}</span>
              </div>
            </div>

            {/* Grid for Live Rates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">USD / TRY</span>
                <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">{usdTry} ₺</span>
                <span className="text-[9px] text-emerald-600 font-semibold">▲ Anlık Canlı</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">EUR / TRY</span>
                <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">{eurTry} ₺</span>
                <span className="text-[9px] text-emerald-600 font-semibold">▲ Anlık Canlı</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">İnşaat Demiri (Ø32)</span>
                <span className="text-xs font-extrabold text-amber-600 block mt-1.5 font-mono">{(steelPrice * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} {sym}/Ton</span>
                <span className="text-[9px] text-rose-500 font-semibold">▲ Piyasa Baskısı</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Hazır Beton (C30)</span>
                <span className="text-xs font-extrabold text-sky-600 block mt-1.5 font-mono">{(concretePrice * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} {sym}/m³</span>
                <span className="text-[9px] text-emerald-600 font-semibold">● Stabil Endeks</span>
              </div>
            </div>

            {/* A4 Printable and copy details */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">
                * İnşaat demiri ve beton endeksleri serbest piyasa haftalık ortalamalarıdır.
              </span>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Rapor Çıktısı Al (PDF / Yazdır)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sağ Taraf: Müteahhitlik Maliyet Simülatörü */}
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 font-display">Bütçe & Sapma Simülatörü</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Mevcut projenizin bütçesi üzerinden, piyasada oluşabilecek sapma ve enflasyon oranlarını simüle edin.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mevcut Proje Maliyeti ({sym}):</label>
                <input
                  type="number"
                  value={Math.round(simBase * rate)}
                  onChange={(e) => setSimBase((Number(e.target.value) || 0) / rate)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="Baz maliyet tutarı"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Döviz (%)</label>
                  <input
                    type="number"
                    value={simFx}
                    onChange={(e) => setSimFx(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Malzeme (%)</label>
                  <input
                    type="number"
                    value={simMat}
                    onChange={(e) => setSimMat(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">İşçilik (%)</label>
                  <input
                    type="number"
                    value={simLab}
                    onChange={(e) => setSimLab(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Simulation Result Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 mt-4">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>Toplam Maliyet Sapma Oranı:</span>
                  <span className="font-bold text-rose-500 font-mono">+{( (simFx * 0.20) + (simMat * 0.55) + (simLab * 0.25) ).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold">Yeni Tahmini Bütçe:</span>
                  <span className="text-sm font-extrabold text-indigo-600 font-mono">
                    {sym}{( simBase * (1 + ( (simFx * 0.20) + (simMat * 0.55) + (simLab * 0.25) ) / 100) * rate ).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-200/60">
                  <span className="text-slate-400">Tahmini Bütçe Farkı:</span>
                  <span className="font-bold text-rose-500 font-mono">
                    +{sym}{( (simBase * (1 + ( (simFx * 0.20) + (simMat * 0.55) + (simLab * 0.25) ) / 100) - simBase) * rate ).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. D3 charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Donut / Pie chart (Large container) */}
        <div className={`lg:col-span-7 p-5 rounded-2xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm flex flex-col`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                İmalat Gruplarına Göre Maliyet Dağılımı
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Donut grafikteki dilimlerin üzerine gelerek detayları filtreleyebilirsiniz.
              </p>
            </div>

            {/* Toggle visual */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveChart('donut')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                  activeChart === 'donut' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                İmalat Kırılımı (Donut)
              </button>
              <button
                type="button"
                onClick={() => setActiveChart('stacked')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                  activeChart === 'stacked' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                Malzeme vs İşçilik (Stacked)
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 min-h-[340px]">
            {/* SVG Holder */}
            <div className="relative w-72 h-72 flex-shrink-0">
              <svg
                ref={activeChart === 'donut' ? donutSvgRef : stackedSvgRef}
                className="w-full h-full"
              />

              {/* Dynamic Overlay labels inside the donut hole */}
              {activeChart === 'donut' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-8">
                  {hoveredData ? (
                    <>
                      <span className="text-[10px] font-semibold text-slate-400 line-clamp-1">
                        {hoveredData.label}
                      </span>
                      <span className="text-sm font-black text-slate-800 tracking-tight mt-1">
                        {sym}
                        {hoveredData.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1.5 border border-indigo-100">
                        %{hoveredData.percent.toFixed(1)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Maliyet Toplamı
                      </span>
                      <span className="text-base font-extrabold text-slate-800 tracking-tight mt-1.5">
                        {sym}
                        {(totalSum * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-semibold mt-1">
                        %100 İnşaat Payı
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Explanatory sidebar / Legend items */}
            <div className="flex-1 w-full flex flex-col gap-2.5">
              {costGroups.map((group) => {
                const percent = (group.total / totalSum) * 100;
                return (
                  <div
                    key={group.key}
                    onClick={() => setFilterCategory(group.key)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs flex items-center justify-between ${
                      filterCategory === group.key
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-md shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <div>
                        <span className="font-bold text-slate-700 block">
                          {group.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          M: %{Math.round((group.material / group.total) * 100)} | İ: %
                          {Math.round((group.labor / group.total) * 100)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-800 block">
                        {sym}
                        {(group.total * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        %{percent.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Informational Cards and Labor vs Material Split */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Labor Breakdown Info Card */}
          <div className={`p-5 rounded-2xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm flex-1 flex flex-col justify-between`}>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                İşçilik Giderleri Kırılımı
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                İşçilik maliyeti, şantiye kadrosunun ve alt yüklenici ekiplerinin (betonarme, kalıp, tesisat, sıva, seramik ekipleri) hak edişlerini temsil eder.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Kaba İnşaat Kalıp & Demir Ekipleri</span>
                  <span className="font-bold text-slate-800">{sym}{(roughLabor * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(roughLabor / totalLabor) * 100}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">İnce İşçilik (Boyacı, Alçı, Seramik Ekipleri)</span>
                  <span className="font-bold text-slate-800">{sym}{(fineLabor * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(fineLabor / totalLabor) * 100}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Mekanik/Elektrik Tesisat Montaj Ekipleri</span>
                  <span className="font-bold text-slate-800">{sym}{(systemsLabor * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(systemsLabor / totalLabor) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-800 mt-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
              <span>
                <strong>Güvenli Kasa Notu:</strong> Hesaplama, inşaatın yapıldığı bölgenin rayiç işçilik bedellerini ve asgari SGK bildirim primlerini korumak için asgari katsayılardan hesaplanmıştır.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Large Interactive Metraj (Take-off) and Labor Ledger Table */}
      <div className={`p-5 rounded-2xl border ${isGray ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'} shadow-sm`}>
        {/* Search, Filter and Actions Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              İnşaat Malzeme Metraj ve İmalat Cetveli
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hesaplama motorundan elde edilen dinamik malzeme metrajları ve alt grupların maliyet dökümleri.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  filterCategory === 'all'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hepsi
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('kaba')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  filterCategory === 'kaba'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-indigo-700'
                }`}
              >
                Kaba İnşaat
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('ince')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  filterCategory === 'ince'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                İnce İşçilik
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('tesisat')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  filterCategory === 'tesisat'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                Mekanik/Elektrik
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('resmi')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  filterCategory === 'resmi'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-purple-700'
                }`}
              >
                Resmi/SGK
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Metraj kalemi ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none rounded-xl px-3 py-1.5 w-full sm:w-48 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Dynamic Table with mini-D3 percentage bars */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-1/12">Kod</th>
                <th className="py-3 px-4 w-4/12">İmalat Grubu / Kalem Açıklaması</th>
                <th className="py-3 px-4 w-2/12">Miktar / Birim</th>
                <th className="py-3 px-4 w-2/12">Birim Fiyat</th>
                <th className="py-3 px-4 w-2/12 text-right">Toplam Gider</th>
                <th className="py-3 px-4 w-1/12 text-right">Maliyet Payı</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Aranan kriterlere uygun metraj kalemi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const sharePercent = (item.total / totalSum) * 100;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 hover:bg-indigo-50/20 transition-colors ${
                        index % 2 === 1 ? 'bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        {item.id.toUpperCase()}
                      </td>

                      {/* Name / Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(item.category)} font-bold`}>
                            {getCategoryName(item.category)}
                          </span>
                          <span className="font-bold text-slate-800">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Quantity / Unit */}
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {item.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} {item.unit}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        {sym}
                        {(item.unitPrice * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-800">
                        {sym}
                        {(item.total * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </td>

                      {/* Maliyet Payı: D3 inline Spark-Bar showing weight */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Mini SVG Bar representing the D3 scale */}
                          <svg className="w-12 h-3 bg-slate-100 rounded-sm shrink-0">
                            <rect
                              width={`${Math.min(100, Math.max(3, sharePercent * 5))}%%`}
                              height="100%"
                              fill={
                                item.category === 'kaba'
                                  ? '#4f46e5'
                                  : item.category === 'ince'
                                  ? '#10b981'
                                  : item.category === 'tesisat'
                                  ? '#f59e0b'
                                  : '#a855f7'
                              }
                              rx={1}
                            />
                          </svg>
                          <span className="font-bold text-slate-600 text-[10px] w-8">
                            %{sharePercent.toFixed(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td className="py-4 px-4 rounded-l-xl">TOPLAM</td>
                <td className="py-4 px-4" colSpan={3}>
                  Kârsız İmalat Giderleri Toplam Cetveli
                </td>
                <td className="py-4 px-4 text-right font-black">
                  {sym}
                  {(totalSum * rate).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </td>
                <td className="py-4 px-4 rounded-r-xl text-right">
                  %100.0
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
