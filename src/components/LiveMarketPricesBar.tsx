import React, { useState } from 'react';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { indexUrl, useMarketData } from '../hooks/useMarketData';
import { defaultPrice, priceGroups, suggestPrice, type BasePrice, type PriceKey, type LaborReference } from '../utils/companyPrices';

const yfk = 'https://yfk.csb.gov.tr/aylik-guncel-rayic-ve-birim-fiyat-listeleri-113351';
const monthNow = () => new Date().toLocaleDateString('sv-SE', {timeZone:'Europe/Istanbul'}).slice(0,7);
const money = (value: number) => value.toLocaleString('tr-TR', {maximumFractionDigits: 2});
const input = 'rounded border border-slate-300 px-2 py-1.5 w-full text-slate-900 bg-white';

export function LiveMarketPricesBar() {
  const { profile } = useCompanyProfile();
  return <PriceEditor key={profile.companyName} />;
}
function PriceEditor() {
  const { profile, updateProfile } = useCompanyProfile();
  const market = useMarketData();
  const [key, setKey] = useState<PriceKey>('manualFlatUnitPrice');
  const [target, setTarget] = useState(monthNow);
  const [edit, setEdit] = useState<BasePrice | null>(null);
  const [notice, setNotice] = useState('');
  const defaultLabor: LaborReference = { minimumMonthlyWage: 28075.5, minimumWageType: 'net', artisanDailyPercent: 8, updatedAt: '2026-01' };
  const labor = profile.laborReference ?? defaultLabor;
  const [laborEdit, setLaborEdit] = useState<LaborReference | null>(null);
  const laborDraft = laborEdit ?? labor;
  const artisanDay = laborDraft.minimumMonthlyWage * laborDraft.artisanDailyPercent / 100;
  const saved = profile.basePrices?.[key];
  const row = edit ?? saved ?? {amount: defaultPrice(key), currency: 'TRY', month: '', source: ''};
  const offer = key in priceGroups['Teklif satış fiyatı'];
  const indexed = !offer && !(key in priceGroups['İdari giderler']);
  const proposal = indexed && row.amount > 0 ? suggestPrice(row, target, market.series) : null;
  const latest = Object.keys(market.series).sort().pop();
  function change(patch: Partial<BasePrice>) {
    setEdit({...row, ...patch});
    setNotice('');
  }
  function save(item: BasePrice) {
    if (!Number.isFinite(item.amount) || item.amount < 0 || !item.month || item.month > monthNow()) {
      setNotice('Geçerli bir fiyat ve baz ay girin.'); return;
    }
    if (item.currency === 'USD' && !market.fx) {
      setNotice('USD fiyatı kaydetmek için önce kur alınmalı.'); return;
    }
    updateProfile({basePrices: {...profile.basePrices, [key]:item}, ...(market.fx && {basePriceExchange:market.fx})});
    setEdit(null);
    setNotice('Firma baz fiyatı kaydedildi. Yeni projelerde kullanılacak.');
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">Firma baz fiyatları</h3>
      <button type="button" className="rounded border bg-white px-3 py-1.5" disabled={market.busy} onClick={market.refresh}>{market.busy ? 'Kontrol ediliyor…' : 'Kur ve endeksi doğrula'}</button>
    </div>
    <p className="text-xs">USD/TL · {market.fx ? market.fx.rate.toLocaleString('tr-TR',{maximumFractionDigits:4}) + ' · ' + market.fx.date : 'Kur bekleniyor'} · TCMB / Frankfurter<br/>Türkiye konut inşaat maliyet endeksi · Eurostat · Son dönem {latest ?? '—'} · {market.message}</p>
    <div className="flex gap-4 text-xs underline"><a href={yfk} target="_blank" rel="noreferrer">Bakanlık aylık rayiçleri</a><a href={indexUrl} target="_blank" rel="noreferrer">Endeks verisi</a></div>
    <div className="rounded-lg border bg-white p-3 space-y-2">
      <h4 className="font-semibold">Asgari ücret ve usta yevmiyesi</h4>
      <p className="text-xs">Başlangıç asgari ücret değeri 2026 dönemi için Çalışma Bakanlığı verisidir. Yeni resmi ücret açıklandığında güncelleyebilirsiniz.</p>
      <div className="grid gap-2 sm:grid-cols-4">
        <label>Aylık asgari ücret (TL)<input className={input} type="number" min="0" value={laborDraft.minimumMonthlyWage} onChange={e=>setLaborEdit({...laborDraft,minimumMonthlyWage:Number(e.target.value)})}/></label>
        <label>Ücret türü<select className={input} value={laborDraft.minimumWageType} onChange={e=>setLaborEdit({...laborDraft,minimumWageType:e.target.value as LaborReference['minimumWageType']})}><option value="net">Net</option><option value="gross">Brüt</option></select></label>
        <label>Usta yevmiyesi (% aylık)<input className={input} type="number" min="0" step="0.1" value={laborDraft.artisanDailyPercent} onChange={e=>setLaborEdit({...laborDraft,artisanDailyPercent:Number(e.target.value)})}/></label>
        <div className="self-end rounded bg-slate-50 p-2">Önerilen yevmiye<br/><b>{money(artisanDay)} TL / gün</b></div>
      </div>
      <button type="button" className="rounded border bg-white px-3 py-1.5" onClick={()=>{updateProfile({laborReference:{...laborDraft,updatedAt:monthNow()}});setLaborEdit(null);}}>Ücret ayarlarını kaydet</button>
      <a className="text-xs underline" href="https://www.csgb.gov.tr/poco-pages/asgari-ucret/" target="_blank" rel="noreferrer">Çalışma Bakanlığı asgari ücret kaynağı</a>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label>Fiyat kalemi<select className={input} value={key} onChange={e=>{setKey(e.target.value as PriceKey);setEdit(null);setNotice('');}}>
        {Object.entries(priceGroups).map(([group, items])=><optgroup key={group} label={group}>{Object.entries(items).map(([id,label])=><option value={id} key={id}>{label}</option>)}</optgroup>)}
      </select></label>
      <label>{offer ? 'Teklif fiyatı / m²' : 'Baz birim fiyat'}<input className={input} type="number" min="0" step="any" value={Number.isFinite(row.amount) ? row.amount : ''} onChange={e=>change({amount:e.target.valueAsNumber})}/></label>
      {offer && <label>Para birimi<select className={input} value={row.currency} onChange={e=>change({currency:e.target.value as BasePrice['currency'],amount:NaN})}><option value="TRY">TL</option><option value="USD">USD</option></select></label>}
      <label>Baz fiyat ayı<input className={input} type="month" max={monthNow()} value={row.month} onChange={e=>change({month:e.target.value})}/></label>
      <label>Fiyat kaynağı<input className={input} placeholder={offer ? 'Firma satış listesi' : 'Tedarikçi veya rayiç poz no'} value={row.source} onChange={e=>change({source:e.target.value})}/></label>
    </div>
    <p className="text-xs">{!saved && !edit ? 'Başlangıç değeri. ' : ''}{offer ? 'Sıfır girildiğinde projenin fiyat hesaplama kuralı kullanılır. USD tutarı yeni projeye alınırken TL’ye çevrilir.' : 'Yeni projeye bu baz fiyat aktarılır. Mevcut projede yapılan özel fiyat girişi o projeye aittir.'}</p>
    <button type="button" className="rounded bg-indigo-600 px-3 py-2 text-white" onClick={()=>save(row)}>Baz fiyatı kaydet</button>
    {indexed && <div className="space-y-2 border-t pt-3">
      <label className="flex items-center gap-2 font-semibold">Teklif ayı <input className="rounded border px-2 py-1" type="month" value={target} onChange={e=>setTarget(e.target.value)}/></label>
      {proposal ? <><p>{row.month} → {proposal.month} · %{money((proposal.ratio-1)*100)} · Birim fark {money(proposal.amount-row.amount)} TL · <b>Öneri {money(proposal.amount)} TL</b></p>
        {proposal.month < target && <p className="text-xs">{target} için endeks henüz yok. Fark yalnızca {proposal.month} dönemine kadar hesaplandı.</p>}
        <button type="button" className="rounded border bg-white px-3 py-1.5" disabled={market.busy || !market.indexVerified} onClick={()=>save({...row,amount:proposal.amount,month:proposal.month,source:'Eurostat konut inşaat maliyet endeksi · '+row.month+' baz fiyatı '+money(row.amount)+' TL'+(row.source ? ' · '+row.source : '')})}>Öneriyi firma baz fiyatına uygula</button></> :
        <p className="text-xs">Fark önerisi için baz ayda ve sonrasında yayımlanmış endeks ile pozitif bir TL fiyatı gerekir.</p>}
      <p className="text-xs">Genel konut maliyeti değişimine dayanan bütçe tahminidir. Aynı pozun teklif ayına ait resmî rayici varsa onu kullanın.</p>
    </div>}
    {notice && <p role="status" className="text-xs font-semibold">{notice}</p>}
  </section>;
}
