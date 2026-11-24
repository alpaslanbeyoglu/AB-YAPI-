import React, { useState } from 'react';
import type { BuildingModelParams, FlatItem } from '../types';
import { isAxisAlignedRectanglePolygon, resolveThreeBuildingFootprint } from '../utils/footprintUtils';

type Props = { model: BuildingModelParams; flats?: FlatItem[] };

export function ResidentialFloorPlan({ model, flats }: Props) {
  const units = flats ?? model.flats ?? [];
  const floors = [...new Set(units.map(f => f.floorNumber ?? 0))].sort((a, b) => a - b);
  const [choice, select] = useState<number | undefined>();
  const floor = choice !== undefined && floors.includes(choice) ? choice : floors.find(f => f > 0) ?? floors[0];
  const selected = units.filter(f => (f.floorNumber ?? 0) === floor);
  const { W, D, activePolyPts } = resolveThreeBuildingFootprint(model);
  const count = selected.length;
  const beds = Number(model.roomType?.split('+')[0]);
  const stair = model.stairWidth;
  const lifts = model.elevatorCount * model.elevatorWidth;
  const coreW = stair + lifts;
  const coreD = Math.max(model.stairDepth, lifts ? model.elevatorDepth : 0);
  const landing = Math.max(1.2, model.staircaseLandingDepth || 1.2);
  const cx = W / 2 + (model.coreOffsetX || 0);
  const cy = D / 2 + (model.coreOffsetY || 0);
  const x = cx - coreW / 2;
  const y = cy - coreD / 2;
  const bottom = y + coreD + landing;
  const frontRooms = Math.ceil((beds + 1) / 2);
  const backRooms = beds + 1 - frontRooms;
  const split = count === 2 ? cx : W;
  const frontWidth = Math.min(split, count === 2 ? W - split : W);
  const wings = selected.map((f,i) => ({
    id: f.id, left: i === 0 ? 0 : split, right: i === 0 ? split : W,
    passage: i === 0 ? x : W - x - coreW,
  }));
  // Each room door must meet the private hallway on its own side of the core.
  function doorPosition(a: number, width: number, index: number) {
    const end = a + width;
    const spans = [
      [a, Math.min(end, x)],
      [Math.max(a, x + coreW), end],
    ];
    const candidates = count === 1 ? spans : [spans[index]];
    const span = candidates.find(([start, stop]) => stop - start >= 1.05);
    return span ? (span[0] + span[1] - 0.82) / 2 : null;
  }
  const inaccessible = wings.some(({left, right}, index) =>
    [frontRooms, backRooms].some(n => {
      const width = (right - left) / n;
      return Array.from({length:n}, (_,i) => doorPosition(left+i*width, width, index)).includes(null);
    })
  );
  const faces = model.facadeConfigs || [];
  const blocked = [0, 2].some((i) => faces[i] && (faces[i].isAdjacent || faces[i].isBlankWall ||
    faces[i].windowCountPerFloor < count * (i === 0 ? frontRooms : backRooms)));
  let reason = '';
  if (!count) reason = '3. aşamada bağımsız bölümleri katlara atayın.';
  else if (floor < 0 || selected.some(f => f.flatType && f.flatType !== 'standard') || (floor === 0 && model.hasGroundFloorShop))
    reason = 'Bu katta konut dışı, bodrum veya özel tip bölüm var. Otomatik yerleşim standart konut katları için kullanılabilir.';
  else if (activePolyPts && !isAxisAlignedRectanglePolygon(activePolyPts) || (floor > 0 && model.hasCantilever))
    reason = 'Bu katın özel oturumu için otomatik oda yerleşimi henüz desteklenmiyor.';
  else if (count > 2) reason = 'Bu sürüm katta bir veya iki daire için yerleşim üretiyor.';
  else if (!Number.isInteger(beds) || beds < 1 || beds > 5 || stair <= 0 || coreD <= 0 ||
    x < 0 || x + coreW > W || y < 2.5 || D - bottom < 2.5 ||
    coreD < 2.75 || wings.some(w => w.passage < 3) || frontWidth / frontRooms < 2.35 || frontWidth / backRooms < 2.35)
    reason = 'Seçilen oda tipi, merdiven/asansör ve geçiş alanları bu ölçülere sığmıyor.';
  else if (inaccessible) reason = 'Çekirdek konumu en az bir odanın hole açılmasını engelliyor.';
  else if (blocked) reason = 'Ön ve arka cephedeki pencere ayarları bu oda dağılımına yetmiyor.';

  const outline = '#334155';
  const box = (a:number,b:number,w:number,h:number,fill:string) =>
    <rect x={a} y={b} width={w} height={h} fill={fill} stroke={outline} strokeWidth={0.065}/>;
  const label = (a:number,b:number,s:string,size=0.29) =>
    <text x={a} y={b} textAnchor="middle" dominantBaseline="middle" fontSize={size} fill="#172d39">{s}</text>;
  const opening = (a:number,b:number,vertical=false) =>
    <line x1={a} y1={b} x2={vertical?a:a+0.82} y2={vertical?b+0.82:b} stroke="#fff" strokeWidth={0.13}/>;
  return <section className="space-y-3 rounded-xl border bg-white p-4 text-slate-800">
    <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">Konut katı ön planı</h3>
      {floors.length > 0 && <label className="text-sm">Kat <select className="rounded border p-1" value={floor} onChange={e=>select(Number(e.target.value))}>
        {floors.map(n=><option key={n} value={n}>{n === 0 ? 'Zemin' : n < 0 ? Math.abs(n)+'. bodrum' : n+'. kat'}</option>)}
      </select></label>}</div>
    {reason ? <p role="status" className="text-sm">{reason}</p> : <>
      <p className="text-sm">{W.toFixed(2)} × {D.toFixed(2)} m · {count} daire · {model.roomType} · Açık mutfak önerisi</p>
      <svg viewBox={`-0.3 -0.65 ${W+0.6} ${D+1}`} role="img" aria-label="Seçili katın önerilen oda, pencere, merdiven ve sahanlık yerleşimi" className="mx-auto max-h-[560px] w-full">
        {label(W/2,-0.35,'Ön cephe')}
        {box(0,0,W,D,'#f3f1eb')}
        {wings.map(({id,left,right}, index) => <g key={id}>
          {[true,false].map(front => {
            const n = front ? frontRooms : backRooms;
            const h = front ? y : D-bottom;
            const w = (right-left)/n;
            const top = front ? 0 : bottom;
            return Array.from({length:n},(_,i)=>{
              const a = left+i*w;
              const room = front && i===0 ? 'Salon + mutfak' : 'Oda '+(front ? i : frontRooms+i);
              return <g key={room}>{box(a,top,w,h,room.startsWith('Salon')?'#e3f1ec':'#edf3fa')}
                {label(a+w/2,top+h/2,room)}
                <line x1={a+w*.3} x2={a+w*.7} y1={front?0:D} y2={front?0:D} stroke="#0284c7" strokeWidth={0.13}/>
                {opening(doorPosition(a,w,index)!,front?y:bottom)}
              </g>;
            });
          })}
          {box(index===0?0:W-1.6,y+0.95,1.6,1.8,'#dbeafe')}
          {label(index===0?.8:W-.8,y+1.85,'Banyo')}
          {opening(index===0?1.6:W-1.6,y+1.05,true)}
          {label(index===0?x/2:(x+coreW+W)/2,bottom-.45,'Daire '+id)}
        </g>)}
        {box(x,y,stair,coreD,'#cbd5e1')}
        {Array.from({length:9},(_,i)=><line key={i} x1={x+.12} x2={x+stair-.12} y1={y+coreD*(i+1)/10} y2={y+coreD*(i+1)/10} stroke="#64748b" strokeWidth={.04}/>)}
        {label(x+stair/2,y+coreD/2,'Merdiven')}
        {lifts>0 && <>{box(x+stair,y,lifts,model.elevatorDepth,'#d4d4d8')}{label(x+stair+lifts/2,y+model.elevatorDepth/2,'Asansör')}</>}
        {box(x,y+coreD,coreW,landing,'#fff7de')}{label(cx,bottom-landing/2,'Sahanlık')}
        {opening(x,y+coreD+.12,true)}{opening(x+coreW,y+coreD+.12,true)}
        {opening(x+stair/2-.41,y+coreD)}
      </svg>
      <p className="text-xs text-slate-600">Mavi çizgiler önerilen pencereleri, duvarlardaki boşluklar kapıları gösterir. Ölçüler brüttür. Uygulama projesi için mimari çözüm gerekir.</p>
    </>}
  </section>;
}
