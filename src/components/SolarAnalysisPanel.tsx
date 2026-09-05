import React, { useState, useEffect } from 'react';
import {
  Sun,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Clock,
  MapPin,
  Flame,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  SolarLocation,
  SOLAR_SEASONS,
  calculateSolarPosition,
  calculateBuildingFacadeExposures,
  getCompassLabel,
} from '../utils/solarCalculations';
import { SolarMapPicker } from './SolarMapPicker';

interface SolarAnalysisPanelProps {
  location: SolarLocation;
  onChangeLocation: (loc: SolarLocation) => void;
  selectedSeasonId: string;
  onChangeSeasonId: (id: string) => void;
  timeHour: number; // 6 - 20
  onChangeTimeHour: (h: number) => void;
  buildingRotation: number; // 0 - 360
  onChangeBuildingRotation: (rot: number) => void;
  isSolarHeatmap: boolean;
  onChangeSolarHeatmap: (v: boolean) => void;
  theme?: 'light' | 'gray';
}

export const SolarAnalysisPanel: React.FC<SolarAnalysisPanelProps> = ({
  location,
  onChangeLocation,
  selectedSeasonId,
  onChangeSeasonId,
  timeHour,
  onChangeTimeHour,
  buildingRotation,
  onChangeBuildingRotation,
  isSolarHeatmap,
  onChangeSolarHeatmap,
  theme = 'light',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulation' | 'map' | 'report'>('simulation');

  const selectedSeason =
    SOLAR_SEASONS.find((s) => s.id === selectedSeasonId) || SOLAR_SEASONS[0];

  // Continuous play animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onChangeTimeHour((prev) => {
        const next = prev + 0.15;
        if (next > 20.0) return 6.0;
        return Math.round(next * 100) / 100;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isPlaying, onChangeTimeHour]);

  const solarPos = calculateSolarPosition(
    location.lat,
    selectedSeason.dayOfYear,
    timeHour
  );

  const facadeExposures = calculateBuildingFacadeExposures(
    location.lat,
    selectedSeason.dayOfYear,
    buildingRotation
  );

  // Format decimal hour to HH:MM
  const formatTime = (decimalHour: number) => {
    const hours = Math.floor(decimalHour);
    const minutes = Math.floor((decimalHour - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Top Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'simulation'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Güneş & Gölge Simülasyonu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'map'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-rose-500" />
          <span>Haritadan Konum Seç ({location.city})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'report'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Cephe Güneş Analiz Raporu</span>
        </button>
      </div>

      {/* Tab 1: Simulation & Controls */}
      {activeTab === 'simulation' && (
        <div className="space-y-4">
          {/* Main Solar Status Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                Güneş Saati
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-amber-950 font-mono">
                  {formatTime(timeHour)}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {solarPos.isSunUp ? '☀️ Gündüz' : '🌙 Gece/Alacakaranlık'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-indigo-50 to-sky-50/50 rounded-2xl border border-indigo-200 shadow-xs">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                Güneş Yüksekliği (Açı)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-indigo-950 font-mono">
                  {solarPos.altitude > 0 ? `+${solarPos.altitude.toFixed(1)}°` : `${solarPos.altitude.toFixed(1)}°`}
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold">
                  {solarPos.altitude > 45 ? 'Çok Dik' : solarPos.altitude > 20 ? 'Orta Açı' : 'Yatık / Uzun Gölge'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Güneş Azimut Yönü
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-emerald-950 font-mono">
                  {solarPos.azimuth.toFixed(0)}°
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {getCompassLabel(solarPos.azimuth)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-2xl border border-purple-200 shadow-xs">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                Bina Ön Cephe Yönü
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-purple-950 font-mono">
                  {buildingRotation}°
                </span>
                <span className="text-[10px] text-purple-700 font-semibold">
                  {getCompassLabel(180 + buildingRotation)}
                </span>
              </div>
            </div>
          </div>

          {/* Time of Day Slider & Play / Pause Button */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Günün Saati & Gölge Hareketi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Durdur</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Güneş Akışını Oynat</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTimeHour(12.0)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  title="Öğle Vakti (12:00)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="5.5"
                max="20.5"
                step="0.05"
                value={timeHour}
                onChange={(e) => onChangeTimeHour(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                <span>06:00 (Gündoğumu)</span>
                <span>09:00</span>
                <span className="text-amber-600 font-bold">12:00 (Tam Öğle)</span>
                <span>15:00</span>
                <span>18:00</span>
                <span>20:00 (Günbatımı)</span>
              </div>
            </div>
          </div>

          {/* Season / Solstice / Equinox Selector */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Mevsim & Tarih (Gündönümü / Ekinoks)
                </span>
              </div>
              <span className="text-xs font-bold text-indigo-600">
                {selectedSeason.dateLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {SOLAR_SEASONS.map((s) => {
                const isSelected = s.id === selectedSeasonId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChangeSeasonId(s.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{s.name.split('(')[0]}</span>
                      <span className="text-[10px] font-mono font-semibold text-indigo-600">
                        {s.dateLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                      {s.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Building Rotation / Compass Angle */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-slate-800">
                  Yapı Parsel Yönlenimi & Cephe Açısı (Kuzey Rotasyonu)
                </span>
              </div>
              <span className="text-xs font-bold text-rose-600 font-mono">
                {buildingRotation}° ({getCompassLabel(180 + buildingRotation)})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full space-y-1">
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="1"
                  value={buildingRotation}
                  onChange={(e) => onChangeBuildingRotation(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                  <span>0° (Ön=Güney)</span>
                  <span>90° (Ön=Batı)</span>
                  <span>180° (Ön=Kuzey)</span>
                  <span>270° (Ön=Doğu)</span>
                </div>
              </div>

              {/* Quick Cardinal Direction Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {[
                  { label: 'Güney (0°)', val: 0 },
                  { label: 'Doğu (270°)', val: 270 },
                  { label: 'Batı (90°)', val: 90 },
                  { label: 'Kuzey (180°)', val: 180 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => onChangeBuildingRotation(btn.val)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      buildingRotation === btn.val
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Map Selection */}
      {activeTab === 'map' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <SolarMapPicker
            currentLocation={location}
            onSelectLocation={onChangeLocation}
            theme={theme}
          />
        </div>
      )}

      {/* Tab 3: Detailed Facade Solar Insolation Report */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{location.city} İçin Yıllık & Mevsimsel Cephe Güneş Alma Raporu</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Seçili {selectedSeason.dateLabel} tarihinde binanın cephelerine düşen doğrudan güneş saatleri ve mimari öneriler.
                </p>
              </div>
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-mono font-semibold border border-white/20">
                {location.lat.toFixed(2)}° K • {location.lng.toFixed(2)}° D
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facadeExposures.map((facade) => {
              const scoreBadge =
                facade.solarExposureScore === 'CokYuksek'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : facade.solarExposureScore === 'Yuksek'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : facade.solarExposureScore === 'Orta'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-sky-100 text-sky-800 border-sky-300';

              return (
                <div
                  key={facade.facadeName}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-indigo-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">
                        {facade.facadeName}
                      </h5>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Yön: <strong className="text-indigo-600">{facade.directionLabel}</strong> ({facade.compassBearing}°)
                      </span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${scoreBadge}`}>
                      {facade.directSunHours} Saat/Gün
                    </span>
                  </div>

                  {/* Progress Sun Exposure bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Günlük Doğrudan Işık:</span>
                      <span className="font-mono text-slate-700">%{facade.insolationPercent}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          facade.solarExposureScore === 'CokYuksek'
                            ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                            : facade.solarExposureScore === 'Yuksek'
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                            : facade.solarExposureScore === 'Orta'
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                            : 'bg-gradient-to-r from-sky-400 to-indigo-500'
                        }`}
                        style={{ width: `${Math.max(5, facade.insolationPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1">
                    <p>
                      <strong>İklim Değerlendirmesi:</strong> {facade.comfortRating}
                    </p>
                    <p className="text-indigo-800 font-medium">
                      <strong>Mimari Tavsiye:</strong> {facade.recommendation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
