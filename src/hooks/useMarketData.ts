import { useEffect, useState } from 'react';
import type { Exchange } from '../utils/companyPrices';

const fxUrl = 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=TRY&providers=TCMB';
export const indexUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_copi_m?geo=TR&indic_bt=COST&unit=I21&s_adj=NSA&cpa2_1=CPA_F41001_X_410014&freq=M&sinceTimePeriod=2020-01';
type References = { fx: Exchange | null; series: Record<string, number> };
const cacheKey = 'ab_yapi_public_price_references_v1';
function readCache(): References {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && typeof cached.series === 'object' && cached.series !== null) return cached;
  } catch {}
  return { fx: null, series: {} };
}
export function latestExchange() { return readCache().fx; }
async function json(url: string) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Kaynak yanıt vermedi');
  return response.json();
}
async function getFx(): Promise<Exchange> {
  const rows = await json(fxUrl);
  const row = rows.find((v: {base: string; quote: string}) => v.base === 'USD' && v.quote === 'TRY');
  if (!row || !Number.isFinite(row.rate) || row.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error('Kur doğrulanamadı');
  return { rate: row.rate, date: row.date };
}
async function getSeries() {
  const data = await json(indexUrl);
  const series: Record<string, number> = {};
  for (const [month, idx] of Object.entries(data.dimension.time.category.index)) {
    const v = data.value[String(idx)];
    if (/^\d{4}-\d{2}$/.test(month) && Number.isFinite(v) && v > 0) series[month] = v;
  }
  if (!Object.keys(series).length) throw new Error('Endeks doğrulanamadı');
  return series;
}
export function useMarketData() {
  const [data, setData] = useState(readCache);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [indexVerified, setIndexVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true);
    Promise.allSettled([getFx(), getSeries()]).then(([fx, series]) => {
      if (!active) return;
      const cached = readCache();
      const next = { fx: fx.status === 'fulfilled' ? fx.value : cached.fx, series: series.status === 'fulfilled' ? series.value : cached.series };
      try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
      setIndexVerified(series.status === 'fulfilled');
      setData(next);
      const failed = [fx.status === 'rejected' && 'Kur', series.status === 'rejected' && 'Endeks'].filter(Boolean);
      setMessage(failed.length ? failed.join(' / ') + ' doğrulanamadı. Varsa son alınan değer gösteriliyor.' : 'Kaynaklar doğrulandı.');
      setBusy(false);
    });
    const timer = window.setTimeout(() => setAttempt(n => n + 1), 3600000);
    return () => { active = false; clearTimeout(timer); };
  }, [attempt]);
  return { ...data, indexVerified, busy, message, refresh: () => setAttempt(n => n + 1) };
}
