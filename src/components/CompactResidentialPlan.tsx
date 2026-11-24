import type { BuildingModelParams } from '../types';

type Props = {
  model: BuildingModelParams;
  width: number;
  depth: number;
  bedrooms: number;
};

export function renderCompactResidentialPlan({ model, width, depth, bedrooms }: Props) {
  const stairsWidth = model.stairDepth;
  const landingWidth = Math.max(1.2, model.staircaseLandingDepth || 1.2);
  const lifts = model.elevatorCount || 0;
  const liftWidth = lifts ? model.elevatorWidth : 0;
  const liftDepth = lifts ? model.elevatorDepth * lifts : 0;
  const coreDepth = Math.max(model.stairWidth, liftDepth);
  const rightOfCore = stairsWidth + landingWidth + liftWidth;
  const frontHall = (depth - coreDepth) / 2 - 1.1;
  const coreTop = frontHall + 1.1;
  const coreEnd = coreTop + coreDepth;
  const rearRoomStart = coreEnd + 1.1;
  const bathWidth = 1.65;
  const frontCount = bedrooms > 1 ? 2 : 1;
  const rearCount = bedrooms + 1 - frontCount;
  const frontWidth = (width - bathWidth) / frontCount;
  const rearWidth = width / rearCount;
  const facades = model.facadeConfigs ?? [];
  const hasWindows = (facade: number, count: number) => !facades[facade] || (
    !facades[facade].isAdjacent && !facades[facade].isBlankWall && facades[facade].windowCountPerFloor >= count
  );

  if (bedrooms < 1 || bedrooms > 3 || !Number.isInteger(bedrooms)
      || !Number.isFinite(rightOfCore) || !Number.isFinite(coreDepth) || coreDepth < 1.1
      || stairsWidth < 2 || (lifts > 0 && (liftWidth < 0.9 || model.elevatorDepth < 0.9))
      || rightOfCore + 1.1 > width || frontHall < 2.5 || depth - rearRoomStart < 2.5
      || frontWidth < 2.35 || rearWidth < 2.35
      || !hasWindows(0, frontCount) || !hasWindows(2, rearCount)) {
    return null;
  }

  const box = (x: number, y: number, w: number, h: number, fill: string) =>
    <rect x={x} y={y} width={w} height={h} fill={fill} stroke="#334155" strokeWidth={0.055} />;
  const text = (x: number, y: number, label: string, size = 0.25) =>
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={size} fill="#172d39">{label}</text>;
  const door = (x: number, y: number, vertical = false) =>
    <line x1={x-(vertical?0:.41)} y1={y-(vertical?.41:0)} x2={x+(vertical?0:.41)} y2={y+(vertical?.41:0)} stroke="white" strokeWidth={.12} />;

  const room = (x: number, y: number, w: number, h: number, name: string, front: boolean) =>
    <g key={name}>
      {box(x,y,w,h,name === 'Salon + mutfak' ? '#e3f1ec' : '#edf3fa')}
      {text(x+w/2,y+h/2-.16,name)}
      {text(x+w/2,y+h/2+.2,`≈ ${(w*h).toFixed(1)} m²`,.21)}
      <line x1={x+w*.25} x2={x+w*.75} y1={front?0:depth} y2={front?0:depth} stroke="#0284c7" strokeWidth={.11}/>
      {door(x+w/2,front?frontHall:rearRoomStart)}
    </g>;

  return <div className="space-y-2">
    <p className="text-sm font-semibold">Enine çekirdekli yerleşim önerisi</p>
    <p className="text-sm text-slate-600">{width.toFixed(2)} × {depth.toFixed(2)} m · 1 daire · {model.roomType} · Açık mutfak</p>
    <svg viewBox={`-0.3 -0.7 ${width+.6} ${depth+1}`} role="img"
      aria-label="Daire girişi, sahanlık, oda, mutfak ve banyo içeren kat ön planı" className="mx-auto max-h-[560px] w-full">
      {text(width/2,-.35,'Ön cephe')}
      {box(0,0,width,depth,'#f3f1eb')}
      {box(0,0,bathWidth,frontHall,'#dbeafe')}
      {text(bathWidth/2,frontHall/2,'Banyo/WC',.23)}
      {door(bathWidth/2,frontHall)}
      {Array.from({length:frontCount},(_,i)=>room(bathWidth+i*frontWidth,0,frontWidth,frontHall,i===0?'Salon + mutfak':'Oda 1',true))}
      {Array.from({length:rearCount},(_,i)=>room(i*rearWidth,rearRoomStart,rearWidth,depth-rearRoomStart,`Oda ${i+frontCount}`,false))}
      {box(0,coreTop,stairsWidth,coreDepth,'#cbd5e1')}
      {Array.from({length:9},(_,i)=><line key={i} x1={stairsWidth*(i+1)/10} x2={stairsWidth*(i+1)/10}
        y1={coreTop+.12} y2={coreEnd-.12} stroke="#94a3b8" strokeWidth={.045} />)}
      {text(stairsWidth/2,coreTop+coreDepth/2,'Merdiven')}
      {box(stairsWidth,coreTop,landingWidth,coreDepth,'#fff7de')}
      {text(stairsWidth+landingWidth/2,coreTop+coreDepth/2,'Sahanlık',.2)}
      {door(stairsWidth,coreTop+coreDepth/2,true)}
      {door(stairsWidth+landingWidth/2,coreTop)}
      {text(stairsWidth+landingWidth/2,coreTop-.34,'Daire girişi',.21)}
      {lifts > 0 && box(stairsWidth+landingWidth,coreTop,liftWidth,coreDepth,'#e2e8f0')}
      {Array.from({length:lifts},(_,i)=>{
        const shaftTop = coreTop+i*model.elevatorDepth;
        return <g key={i}>
          {box(stairsWidth+landingWidth,shaftTop,liftWidth,model.elevatorDepth,'#d4d4d8')}
          {text(stairsWidth+landingWidth+liftWidth/2,shaftTop+model.elevatorDepth/2,'Asansör',.19)}
          {door(stairsWidth+landingWidth,shaftTop+model.elevatorDepth/2,true)}
        </g>;
      })}
    </svg>
    <p className="text-xs text-slate-600">Ortak sahanlık dairenin iç holüne açılır. Oda alanları yaklaşık, çizim ön taslak niteliğindedir.</p>
  </div>;
}
