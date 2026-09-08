import React from 'react';
import {
  ProjectParams,
  MunicipalIncentiveConfig,
  MunicipalIncentiveDistrict,
  AppTheme,
} from '../types';
import {
  Gift,
  Building,
  Building2,
  CheckCircle2,
  Info,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Percent,
  Layers,
  MapPin,
} from 'lucide-react';

interface MunicipalIncentivesPanelProps {
  params: ProjectParams;
  onChangeParams: (newParams: ProjectParams) => void;
  theme?: AppTheme;
}

interface DistrictPreset {
  name: string;
  badge: string;
  minParcelCount: number;
  defaultExtraFloors: number;
  defaultMansardRoof: boolean;
  defaultBonusPercent: number;
  summary: string;
  rules: string[];
}

export const DISTRICT_PRESETS: Record<MunicipalIncentiveDistrict, DistrictPreset> = {
  none: {
    name: 'Teşviksiz / Standart İmar',
    badge: 'Standart',
    minParcelCount: 1,
    defaultExtraFloors: 0,
    defaultMansardRoof: false,
    defaultBonusPercent: 0,
    summary: 'Belediye ek kat veya emsal teşviki uygulanmaz, standart plan notları geçerlidir.',
    rules: ['Standart TAKS / KAKS emsal hükümleri geçerlidir.'],
  },
  gungoren: {
    name: 'Güngören Belediyesi Tevhit & Ada Teşviki',
    badge: 'Güngören Modeli (+1/+2 Kat & Mansart)',
    minParcelCount: 2,
    defaultExtraFloors: 1,
    defaultMansardRoof: true,
    defaultBonusPercent: 20,
    summary:
      'Güngören kentsel dönüşüm imar plan notlarına göre: Parsel birleştirmelerinde (tevhit) belirlenen taban alanı ve parsel birleşimi sağlandığında +1 ek normal kat ve mansart çatı bağımsız bölüm hakkı verilir. Ada bazında birleşmelerde +2 kata kadar çıkabilir.',
    rules: [
      'En az 2 parselin veya 2 binanın birleşerek tevhit edilmesi.',
      'Birleşen parsellerde taban oturumu düzenlenerek +1 Ek Normal Kat hakkı verilir.',
      'Mansart (kırma/çatı piyesi) katında tam bağımsız bölüm (ayrı daire) hakkı tanınır.',
      'Emsal inşaat artışı %20-%25 aralığında teşvik olarak uygulanır.',
    ],
  },
  kadikoy: {
    name: 'Kadıköy & Bağdat Caddesi Parsel Tevhit Teşviki',
    badge: 'Kadıköy Tevhit Modeli',
    minParcelCount: 2,
    defaultExtraFloors: 1,
    defaultMansardRoof: true,
    defaultBonusPercent: 25,
    summary:
      'Kadıköy ilçesinde bitişik 2 veya daha fazla riskli parselin tevhidinde ek emsal (%20-25 KAKS) ve çatı piyesi kullanım hakkı sağlanır.',
    rules: [
      '2 veya daha fazla parselin birleştirilmesi.',
      '%20-%25 ek emsal (KAKS) teşvik hakkı.',
      'Çatı piyesinde bağımsız dubleks veya ayrı daire oluşturma izni.',
      'Zemin kat dükkan dönüşümünde genişletilmiş açık teras hakları.',
    ],
  },
  esenler: {
    name: 'Esenler Dönüşüm & Tevhit İmar Plan Notu',
    badge: 'Esenler Modeli (+1 Kat)',
    minParcelCount: 2,
    defaultExtraFloors: 1,
    defaultMansardRoof: true,
    defaultBonusPercent: 15,
    summary:
      'Esenler kentsel dönüşüm alanlarında riskli yapıların parsel birleşimi yapması durumunda +1 kat artışı ve çatı arası bağımsız bölüm teşviki verilir.',
    rules: [
      'En az 2 parsel tevhit edildiğinde +1 normal kat artışı.',
      'Mansart çatı katı bağımsız bölüm izni.',
      'Harç ve ruhsat muafiyetleri ile proje hızlandırma desteği.',
    ],
  },
  zeytinburnu: {
    name: 'Zeytinburnu Ada/Parsel Birleşme Teşviki',
    badge: 'Zeytinburnu Modeli (+1 Kat & Mansart)',
    minParcelCount: 2,
    defaultExtraFloors: 1,
    defaultMansardRoof: true,
    defaultBonusPercent: 20,
    summary:
      'Zeytinburnu riskli alan dönüşümünde parsel tevhidi ile yapı büyüklüğüne göre +1 kat ve mansart çatı katında tam daire oluşturma hakkı tanınır.',
    rules: [
      'Minimum 2 parsel tevhitte +1 Normal Kat.',
      'Mansart çatı tam bağımsız bölüm kullanım izni.',
      'Otopark yönetmeliğinde parsel içi toplu çözüm kolaylığı.',
    ],
  },
  custom: {
    name: 'Özel / Diğer İlçe Belediye Teşviki',
    badge: 'Özel Belediye Plan Notu',
    minParcelCount: 2,
    defaultExtraFloors: 1,
    defaultMansardRoof: true,
    defaultBonusPercent: 20,
    summary: 'İlçe belediyenizin yürürlükteki kentsel dönüşüm plan notuna göre ek kat ve mansart haklarını manuel tanımlayın.',
    rules: ['İlçe belediyesi imar müdürlüğü teyitli özel plan notu şartları uygulanır.'],
  },
};

export const MunicipalIncentivesPanel: React.FC<MunicipalIncentivesPanelProps> = ({
  params,
  onChangeParams,
  theme = 'light',
}) => {
  const isGray = theme === 'gray';
  const textTitle = isGray ? 'text-gray-100' : 'text-slate-900';
  const textMuted = isGray ? 'text-gray-400' : 'text-slate-500';
  const cardBg = isGray ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90 shadow-xs';
  const innerCardBg = isGray ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50/80 border-slate-200/80';
  const inputBg = isGray
    ? 'bg-slate-900 text-gray-100 border-slate-700 focus:border-indigo-500'
    : 'bg-white text-slate-900 border-slate-200 focus:border-indigo-500';

  const incentives = params.municipalIncentives || {
    enabled: false,
    district: 'none',
    grantedExtraFloors: 0,
    grantedMansardRoof: false,
    grantedFloorAreaBonusPercent: 0,
  };

  const activeDistrict = incentives.district || 'none';
  const currentPreset = DISTRICT_PRESETS[activeDistrict] || DISTRICT_PRESETS.none;

  // Parsel ve mevcut bina durumu
  const existingBuildingCount = params.existingBuildings?.length || 1;
  const satisfiesParcelCount = existingBuildingCount >= (currentPreset.minParcelCount || 1);
  const isEligible = satisfiesParcelCount || activeDistrict === 'custom';

  // Apply district preset
  const handleSelectDistrict = (district: MunicipalIncentiveDistrict) => {
    const preset = DISTRICT_PRESETS[district];
    if (district === 'none') {
      onChangeParams({
        ...params,
        municipalIncentives: {
          enabled: false,
          district: 'none',
          grantedExtraFloors: 0,
          grantedMansardRoof: false,
          grantedFloorAreaBonusPercent: 0,
        },
      });
      return;
    }

    const updatedIncentives: MunicipalIncentiveConfig = {
      enabled: true,
      district,
      customDistrictName: district === 'custom' ? (incentives.customDistrictName || 'İlçe Belediyesi') : undefined,
      minMergingParcelCount: preset.minParcelCount,
      grantedExtraFloors: preset.defaultExtraFloors,
      grantedMansardRoof: preset.defaultMansardRoof,
      grantedFloorAreaBonusPercent: preset.defaultBonusPercent,
      description: preset.summary,
    };

    // Otomatik olarak çatı tipini mansart'a veya kat sayısını güncelleme önerisi
    const newRoofType = preset.defaultMansardRoof ? 'mansard' : (params.roofType || 'gable');

    onChangeParams({
      ...params,
      municipalIncentives: updatedIncentives,
      roofType: newRoofType,
    });
  };

  const handleApplyExtraFloorsToProject = () => {
    if (!incentives.enabled || incentives.grantedExtraFloors <= 0) return;
    const currentFloors = params.floorCount || 5;
    const newFloors = currentFloors + incentives.grantedExtraFloors;
    const resFloors = params.hasGroundFloorShop ? Math.max(1, newFloors - 1) : newFloors;
    const flatsPerFloor = params.flatsPerFloor || 2;
    const newFlatCount = resFloors * flatsPerFloor;

    onChangeParams({
      ...params,
      floorCount: newFloors,
      flatCount: newFlatCount,
    });
  };

  const handleApplyMansardRoofToProject = () => {
    const resFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
    const normalFlats = resFloors * (params.flatsPerFloor || 2);
    const mansardBonus = params.flatsPerFloor || 2;

    onChangeParams({
      ...params,
      roofType: 'mansard',
      mansardFlatCount: mansardBonus,
      flatCount: normalFlats + mansardBonus,
    });
  };

  return (
    <div className={`${cardBg} rounded-2xl p-6 border shadow-xs space-y-5`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base sm:text-lg font-bold ${textTitle}`}>
                Belediye İmar Teşvikleri & Tevhit Kat/Mansart Bonusları
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Güngören / Tevhit Modeli
              </span>
            </div>
            <p className={`text-xs ${textMuted}`}>
              Güngören ve diğer ilçelerde parsel birleştiren (tevhit) yapılara tanınan ek kat (+1/+2 Kat),
              mansart çatı bağımsız bölüm hakkı ve emsal artışlarını yönetin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!incentives.enabled}
              onChange={(e) => {
                const checked = e.target.checked;
                if (!checked) {
                  handleSelectDistrict('none');
                } else {
                  handleSelectDistrict(activeDistrict === 'none' ? 'gungoren' : activeDistrict);
                }
              }}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
            />
            <span className="text-xs font-bold text-amber-950">
              {incentives.enabled ? 'Teşvik Sistemi Aktif' : 'Belediye Teşviki Uygula'}
            </span>
          </label>
        </div>
      </div>

      {/* District Preset Selectors */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700">İlçe ve İmar Teşvik Modeli Seçimi:</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(Object.keys(DISTRICT_PRESETS) as MunicipalIncentiveDistrict[]).map((distKey) => {
            const preset = DISTRICT_PRESETS[distKey];
            const isSelected = incentives.enabled && activeDistrict === distKey;
            const isNone = distKey === 'none';

            return (
              <button
                key={distKey}
                type="button"
                onClick={() => handleSelectDistrict(distKey)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                    : isNone && !incentives.enabled
                    ? 'bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                    {preset.name.split(' ')[0]}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      Seçildi
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2">{preset.summary}</div>
                {!isNone && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] font-mono font-bold text-amber-800">
                    <span>+{preset.defaultExtraFloors} Ek Kat</span>
                    <span>•</span>
                    <span>{preset.defaultMansardRoof ? '🏛️ Mansart Var' : 'Düz'}</span>
                    <span>•</span>
                    <span>+%{preset.defaultBonusPercent} Emsal</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Incentive Detail & Eligibility Check */}
      {incentives.enabled && (
        <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                {currentPreset.name} Şartları ve Tevhit Uygunluk Durumu
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isEligible ? (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tevhit Teşvik Şartları Sağlandı ({existingBuildingCount} Parsel/Bina)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  <Info className="w-3.5 h-3.5" />
                  Min. {currentPreset.minParcelCount} Parsel Tevhit Gerekir
                </span>
              )}
            </div>
          </div>

          {/* Rule List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            {currentPreset.rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-snug">{rule}</span>
              </div>
            ))}
          </div>

          {/* Incentive Numeric Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Verilen Ek Normal Kat Sayısı:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={incentives.grantedExtraFloors === 0 ? '' : incentives.grantedExtraFloors}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeParams({
                      ...params,
                      municipalIncentives: {
                        ...incentives,
                        grantedExtraFloors: val === '' ? 0 : parseInt(val) || 0,
                      },
                    });
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 0) {
                      onChangeParams({
                        ...params,
                        municipalIncentives: {
                          ...incentives,
                          grantedExtraFloors: 0,
                        },
                      });
                    }
                  }}
                  className="w-full text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/30"
                />
                <button
                  type="button"
                  onClick={handleApplyExtraFloorsToProject}
                  className="px-2.5 py-1.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
                  title="Proje kat sayısına ekstra kat ekle"
                >
                  Projeye Ekle
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Örn: Bölgesel imar veya parsel birleşme artışı ile kat kazanımı.
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Mansart / Çatı Katı Teşviki:
              </label>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incentives.grantedMansardRoof}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChangeParams({
                        ...params,
                        municipalIncentives: {
                          ...incentives,
                          grantedMansardRoof: checked,
                        },
                        roofType: checked ? 'mansard' : params.roofType,
                      });
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                  />
                  <span className="text-xs font-bold text-slate-800">Mansart Ayrı Daire</span>
                </label>

                {params.roofType !== 'mansard' && incentives.grantedMansardRoof && (
                  <button
                    type="button"
                    onClick={handleApplyMansardRoofToProject}
                    className="px-2 py-1 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Çatıyı Mansart Yap
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Çatı piyesi bağımsız bölüm olarak iskan alır ve satılabilir.
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Emsal / KAKS Artış Bonusu (%):
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={incentives.grantedFloorAreaBonusPercent === 0 ? '' : incentives.grantedFloorAreaBonusPercent}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeParams({
                    ...params,
                    municipalIncentives: {
                      ...incentives,
                      grantedFloorAreaBonusPercent: val === '' ? 0 : parseFloat(val) || 0,
                    },
                  });
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (isNaN(val) || val < 0) {
                    onChangeParams({
                      ...params,
                      municipalIncentives: {
                        ...incentives,
                        grantedFloorAreaBonusPercent: 0,
                      },
                    });
                  }
                }}
                className="w-full text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/30"
              />
              <span className="text-[10px] text-slate-400 block">
                Toplam inşaat alanına +%{incentives.grantedFloorAreaBonusPercent} ek emsal katkısı.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
