import type { CompanyProfile, ProjectParams } from '../types';
import { DEFAULT_PARAMS } from './calculatorEngine';

export const priceGroups = {
  'Teklif satış fiyatı': {
    manualFlatUnitPrice: 'Konut · m²', manualShopUnitPrice: 'Dükkân · m²',
  },
  'Kaba yapı ve işçilik': {
    priceConcrete: 'Hazır beton · m³', priceSteel: 'Donatı çeliği · ton', priceSteelLabor: 'Demir işçiliği · ton',
    priceFormworkLabor: 'Kalıp işçiliği · motorun esas aldığı m²', totalLaborUnitPrice: 'Toplu kaba işçilik · m²',
    priceBrickMaterial: 'Duvar malzemesi · m²', priceBrickLabor: 'Duvar işçiliği · m²', priceExcavation: 'Hafriyat · m³',
  },
  'İnce işler ve tesisat': {
    priceKitchen: 'Mutfak · daire', priceDoors: 'İç kapılar · daire', pricePvc: 'Doğrama · m²', priceTiles: 'Seramik · m²',
    pricePaintPlaster: 'Boya ve sıva · m²', pricePlumbing: 'Sıhhi tesisat · daire', priceElectric: 'Elektrik · daire',
    priceGas: 'Doğalgaz · daire', priceSmartHome: 'Akıllı ev · daire', costIntercom: 'Diafon · sistem', costElevator: 'Asansör · sistem',
  },
  'İdari giderler': {
    costNotaryContract: 'Noter · proje', costCompany: 'Şantiye kuruluşu · proje', priceProjectPermit: 'Proje ve ruhsat · m²',
    priceSgk: 'SGK · m²', costInsurance: 'Sigorta · proje', costSalesMarketing: 'Satış ve pazarlama · proje',
  },
} as const;
export type PriceKey = { [G in keyof typeof priceGroups]: keyof typeof priceGroups[G] }[keyof typeof priceGroups];
export type BasePrice = { amount: number; currency: 'TRY' | 'USD'; month: string; source: string };
export type Exchange = { rate: number; date: string };
export type Catalog = Partial<Record<PriceKey, BasePrice>>;
export type LaborReference = { minimumMonthlyWage: number; minimumWageType: 'net' | 'gross'; artisanDailyPercent: number; updatedAt: string };
declare module '../types' {
  interface CompanyProfile {
    basePrices?: Catalog;
    laborReference?: LaborReference;
    basePriceExchange?: Exchange;
  }
}
export function projectBasePrices(profile: CompanyProfile, live: Exchange | null): Partial<ProjectParams> {
  const fx = [live, profile.basePriceExchange].filter((q): q is Exchange => !!q && Number.isFinite(q.rate) && q.rate > 0).sort((a,b) => b.date.localeCompare(a.date))[0];
  const prices: Partial<Record<PriceKey, number>> = {};
  for (const group of Object.values(priceGroups)) {
    for (const key of Object.keys(group) as PriceKey[]) {
      const item = profile.basePrices?.[key];
      if (!item || !Number.isFinite(item.amount) || item.amount < 0) continue;
      if (item.currency === 'USD' && !fx) continue;
      prices[key] = Math.round(item.amount * (item.currency === 'USD' ? fx!.rate : 1) * 100) / 100;
    }
  }
  return fx ? { ...prices, usdRate: fx.rate } : prices;
}
export function defaultPrice(key: PriceKey): number {
  return DEFAULT_PARAMS[key] ?? 0;
}
export function suggestPrice(base: BasePrice, target: string, series: Record<string, number>) {
  if (base.currency !== 'TRY' || !base.month || base.month >= target || !(series[base.month] > 0)) return null;
  const month = Object.keys(series).filter(m => m <= target && m > base.month && series[m] > 0).sort().pop();
  if (!month) return null;
  const ratio = series[month] / series[base.month];
  return { month, ratio, amount: Math.round(base.amount * ratio * 100) / 100 };
}
