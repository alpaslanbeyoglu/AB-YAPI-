import React, { useState } from 'react';
import { MapPin, Compass, Search, Globe, Sun, Navigation } from 'lucide-react';
import { SolarLocation, TURKEY_PROVINCES } from '../utils/solarCalculations';

interface SolarMapPickerProps {
  currentLocation: SolarLocation;
  onSelectLocation: (loc: SolarLocation) => void;
  theme?: 'light' | 'gray';
}

export const SolarMapPicker: React.FC<SolarMapPickerProps> = ({
  currentLocation,
  onSelectLocation,
  theme = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customLat, setCustomLat] = useState(currentLocation.lat.toString());
  const [customLng, setCustomLng] = useState(currentLocation.lng.toString());
  const [showManualCoords, setShowManualCoords] = useState(false);

  const filteredProvinces = TURKEY_PROVINCES.filter((p) =>
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Approximate Turkey bounding box for SVG projection
  // Lat: 35.8° to 42.2° (South to North)
  // Lng: 25.5° to 45.0° (West to East)
  const mapWidth = 560;
  const mapHeight = 260;

  const projectToMap = (lat: number, lng: number) => {
    const minLng = 25.5;
    const maxLng = 45.0;
    const minLat = 35.8;
    const maxLat = 42.3;

    const x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
    const y = mapHeight - ((lat - minLat) / (maxLat - minLat)) * mapHeight;
    return { x: Math.max(15, Math.min(mapWidth - 15, x)), y: Math.max(15, Math.min(mapHeight - 15, y)) };
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = mapWidth / rect.width;
    const scaleY = mapHeight / rect.height;

    const svgX = clickX * scaleX;
    const svgY = clickY * scaleY;

    // Unproject
    const minLng = 25.5;
    const maxLng = 45.0;
    const minLat = 35.8;
    const maxLat = 42.3;

    const lng = minLng + (svgX / mapWidth) * (maxLng - minLng);
    const lat = minLat + ((mapHeight - svgY) / mapHeight) * (maxLat - minLat);

    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;

    // Find nearest city or label as custom location
    let nearest = TURKEY_PROVINCES[0];
    let minDist = 9999;
    TURKEY_PROVINCES.forEach((p) => {
      const d = Math.hypot(p.lat - roundedLat, p.lng - roundedLng);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    });

    const cityName = minDist < 0.6 ? nearest.city : `Seçilen Konum (${roundedLat.toFixed(2)}°N, ${roundedLng.toFixed(2)}°E)`;
    const newLoc = { city: cityName, lat: roundedLat, lng: roundedLng };
    onSelectLocation(newLoc);
    setCustomLat(roundedLat.toString());
    setCustomLng(roundedLng.toString());
  };

  const currentPos = projectToMap(currentLocation.lat, currentLocation.lng);

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Coğrafi Konum & Şehir Seçimi
            </h4>
            <p className="text-[11px] text-slate-500">
              Harita üzerinden tıklayarak veya şehir listesinden seçim yaparak güneş açılarını belirleyin.
            </p>
          </div>
        </div>

        {/* Selected City Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs">
          <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{currentLocation.city}</span>
          <span className="text-[10px] font-mono text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md">
            {currentLocation.lat.toFixed(2)}°N, {currentLocation.lng.toFixed(2)}°E
          </span>
        </div>
      </div>

      {/* Interactive Map Visual */}
      <div className="relative rounded-2xl overflow-hidden border border-indigo-200 bg-gradient-to-b from-sky-100/60 via-indigo-50/40 to-slate-100 shadow-inner p-3">
        <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-indigo-600" />
            Harita Üzerine Tıklayarak Konum İşaretleyin (Türkiye & Komşu Koordinatlar)
          </span>
          <span className="text-[10px] text-indigo-600 font-mono">
            {currentLocation.lat.toFixed(3)}° K • {currentLocation.lng.toFixed(3)}° D
          </span>
        </div>

        {/* SVG Map of Turkey & Surroundings */}
        <div className="relative w-full h-52 sm:h-60 bg-gradient-to-br from-sky-200/40 to-indigo-100/40 rounded-xl overflow-hidden border border-indigo-200/70 cursor-crosshair">
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-full"
            onClick={handleMapClick}
          >
            {/* Sea background subtle waves */}
            <rect width={mapWidth} height={mapHeight} fill="#e0f2fe" opacity="0.6" />

            {/* Turkey approximate landmass polygon */}
            <path
              d="M 40,95 L 90,85 L 130,90 L 155,75 L 185,80 L 220,70 L 280,68 L 340,65 L 400,60 L 460,70 L 510,95 L 530,130 L 520,180 L 480,200 L 440,210 L 390,205 L 340,215 L 290,210 L 230,225 L 170,220 L 120,200 L 80,180 L 50,150 L 35,120 Z"
              fill="#dcfce7"
              stroke="#86efac"
              strokeWidth="2"
              strokeLinejoin="round"
              className="transition-colors hover:fill-emerald-100"
            />

            {/* Marmara / Black Sea / Mediterranean Coast details */}
            {/* Marmara Sea cutout */}
            <ellipse cx="105" cy="98" rx="20" ry="10" fill="#bae6fd" />
            {/* Van Lake */}
            <ellipse cx="490" cy="140" rx="14" ry="9" fill="#7dd3fc" stroke="#38bdf8" />
            {/* Tuz Lake */}
            <ellipse cx="270" cy="145" rx="16" ry="12" fill="#bae6fd" stroke="#7dd3fc" />

            {/* Grid Latitude / Longitude lines */}
            <line x1="0" y1="65" x2={mapWidth} y2="65" stroke="#94a3b8" strokeDasharray="3,3" opacity="0.4" />
            <line x1="0" y1="130" x2={mapWidth} y2="130" stroke="#94a3b8" strokeDasharray="3,3" opacity="0.4" />
            <line x1="0" y1="195" x2={mapWidth} y2="195" stroke="#94a3b8" strokeDasharray="3,3" opacity="0.4" />
            <line x1="140" y1="0" x2="140" y2={mapHeight} stroke="#94a3b8" strokeDasharray="3,3" opacity="0.4" />
            <line x1="280" y1="0" x2="280" y2={mapHeight} stroke="#94a3b8" strokeDasharray="3,3" opacity="0.4" />
            <line x1="420" y1="0" x2="420" y2={mapHeight} stroke="#94a3b8" strokeDasharray="3,3" opacity="0.4" />

            {/* Major Province Dots */}
            {TURKEY_PROVINCES.map((p) => {
              const pos = projectToMap(p.lat, p.lng);
              const isSelected = p.city === currentLocation.city;
              return (
                <g
                  key={p.city}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLocation(p);
                    setCustomLat(p.lat.toString());
                    setCustomLng(p.lng.toString());
                  }}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 6 : 3.5}
                    fill={isSelected ? '#4f46e5' : '#64748b'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-transform group-hover:scale-125"
                  />
                  {isSelected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="12"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                      className="animate-spin"
                    />
                  )}
                  <text
                    x={pos.x}
                    y={pos.y - 7}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    fill={isSelected ? '#1e1b4b' : '#475569'}
                    className="select-none pointer-events-none drop-shadow-sm font-sans"
                  >
                    {p.city.split(' ')[0]}
                  </text>
                </g>
              );
            })}

            {/* Active User Selected Pin with Ripple */}
            <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
              <circle r="16" fill="#f59e0b" opacity="0.25" className="animate-ping" />
              <circle r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <path
                d="M 0,-18 L -6,-6 L 6,-6 Z"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="0.5"
              />
            </g>
          </svg>

          {/* Compass Rose Mini Overlay */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs p-1.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col items-center pointer-events-none text-[9px] font-bold text-slate-700">
            <span className="text-rose-600">K</span>
            <Compass className="w-4 h-4 text-slate-600 my-0.5" />
            <span>G</span>
          </div>
        </div>
      </div>

      {/* Quick City Presets Grid & Manual Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Şehir veya il ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            {showManualCoords ? 'Enlem/Boylam Gizle' : 'Manuel Koordinat Gir'}
          </button>
        </div>

        {/* Manual Latitude / Longitude Inputs */}
        {showManualCoords && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Kuzey Enlemi (°N):
              </label>
              <input
                type="number"
                step="0.001"
                min="30"
                max="50"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Doğu Boylamı (°E):
              </label>
              <input
                type="number"
                step="0.001"
                min="20"
                max="50"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const lat = parseFloat(customLat) || 41.0;
                const lng = parseFloat(customLng) || 29.0;
                onSelectLocation({
                  city: `Özel Konum (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
                  lat,
                  lng,
                });
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Konumu Uygula
            </button>
          </div>
        )}

        {/* Quick Province Badges */}
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-100">
          {filteredProvinces.map((p) => {
            const isSelected = p.city === currentLocation.city;
            return (
              <button
                key={p.city}
                type="button"
                onClick={() => {
                  onSelectLocation(p);
                  setCustomLat(p.lat.toString());
                  setCustomLng(p.lng.toString());
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200/80'
                }`}
              >
                {p.city}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
