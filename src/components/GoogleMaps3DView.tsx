import React, { useEffect, useRef, useState } from 'react';
import { BuildingModelParams } from '../types';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'three';
import { MapPin, Info, AlertCircle, X, Search, Navigation, Sparkles } from 'lucide-react';
import { isValidGoogleMapsApiKey } from '../utils/mapsValidation';

interface GoogleMaps3DViewProps {
  params: BuildingModelParams;
  buildingGroup?: THREE.Group | null;
  onClose: () => void;
}

interface LocationState {
  lat: number;
  lng: number;
  altitude?: number;
  address?: string;
}

const DEFAULT_LOCATION: LocationState = { lat: 41.002, lng: 28.932, altitude: 0 };

export const GoogleMaps3DView: React.FC<GoogleMaps3DViewProps> = ({ params, buildingGroup, onClose }) => {
  const Map3D = 'gmp-map-3d' as any;
  const Model3D = 'gmp-model-3d' as any;

  const [location, setLocation] = useState<LocationState>(params.realWorldLocation || DEFAULT_LOCATION);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isKeyValid = isValidGoogleMapsApiKey(apiKey);
  
  const mapRef = useRef<any>(null);
  const modelRef = useRef<any>(null);

  // Export building to GLB when group changes or view opens
  useEffect(() => {
    if (!buildingGroup) return;

    const exportModel = () => {
      setIsExporting(true);
      const exporter = new GLTFExporter();
      
      // We need to clone to avoid side effects and ensure world matrix is correct
      const clone = buildingGroup.clone();
      clone.updateMatrixWorld(true);
      
      exporter.parse(
        clone,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          if (glbUrl) URL.revokeObjectURL(glbUrl);
          const url = URL.createObjectURL(blob);
          setGlbUrl(url);
          setIsExporting(false);
        },
        (error) => {
          console.error('GLTF Export Error:', error);
          setIsExporting(false);
        },
        { binary: true }
      );
    };

    exportModel();
    
    return () => {
      if (glbUrl) URL.revokeObjectURL(glbUrl);
    };
  }, [buildingGroup]);

  // Update model position/orientation on the 3D map
  useEffect(() => {
    if (!modelRef.current || !glbUrl) return;

    const model = modelRef.current;
    model.src = glbUrl;
    model.position = { lat: location.lat, lng: location.lng, altitude: location.altitude || 0 };
    // Google Maps 3D uses different rotation system, we might need to adjust
    model.orientation = { heading: 0, tilt: 0, roll: 0 }; 
    model.scale = 1.0;
    model.altitudeMode = 'CLAMP_TO_GROUND';
  }, [glbUrl, location]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('address') as string;
    if (!query) return;

    // Check if query is coordinates "lat, lng"
    const coordsMatch = query.match(/^([-+]?\d+(\.\d+)?),\s*([-+]?\d+(\.\d+)?)$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[3]);
      setLocation({ lat, lng, altitude: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white w-full h-full rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Navigation className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Photorealistic 3D Tiles Sunumu</h2>
              <p className="text-xs text-slate-500 font-medium">Projenizi Gerçek Dünya Koordinatlarında İnceleyin</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-slate-100">
          {!isKeyValid ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-slate-50 to-indigo-50/30">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 shadow-sm">
                <Sparkles className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Google Photorealistic 3D Tiles</h3>
              <p className="text-slate-600 max-w-md mb-4 text-sm leading-relaxed">
                Google'ın fotogerçekçi 3D şehir haritası üzerinde projenizi gerçek koordinatlarında sergilemek için 
                <span className="font-mono font-bold text-indigo-600 mx-1 bg-indigo-50 px-1.5 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</span>
                anahtarı gereklidir.
              </p>
              {apiKey && !isKeyValid && (
                <div className="mb-4 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5 max-w-md text-left">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mevcut ortamdaki anahtar bir Google Maps anahtarı değildir (Google Cloud API anahtarları &quot;AIza...&quot; ile başlar).</span>
                </div>
              )}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-left space-y-2 mb-6">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Mevcut Proje Koordinatları
                </div>
                <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  Enlem: {location.lat.toFixed(5)} | Boylam: {location.lng.toFixed(5)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Konum: {params.realWorldLocation?.address || 'İstanbul (Varsayılan Koordinatlar)'}
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                3D Modellemeye Geri Dön
              </button>
            </div>
          ) : (
            <div className="w-full h-full relative">
              {/* Search Overlay */}
              <div className="absolute top-4 left-4 z-10 w-full max-w-sm pointer-events-none">
                <form onSubmit={handleSearch} className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl">
                  <div className="flex-1 flex items-center gap-2 px-3">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      name="address"
                      type="text" 
                      placeholder="Adres veya Koordinat Ara..." 
                      defaultValue={params.realWorldLocation?.address || "İstanbul, Fatih"}
                      className="w-full py-1 text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  <button className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* The 3D Map Component (Web Component) */}
              <Map3D
                ref={(el: any) => {
                  if (el) mapRef.current = el;
                }}
                center={{ lat: location.lat, lng: location.lng, altitude: 300 }}
                tilt={65}
                heading={0}
                style={{ width: '100%', height: '100%' }}
                internal-usage-attribution-ids="gmp_mcp_codeassist_v1_aistudio"
              >
                {glbUrl && (
                  <Model3D
                    ref={(el: any) => {
                      if (el) modelRef.current = el;
                    }}
                    src={glbUrl}
                    position={{ lat: location.lat, lng: location.lng, altitude: 0 }}
                    altitude-mode="CLAMP_TO_GROUND"
                    scale={1.0}
                  />
                )}
              </Map3D>

              {/* Map Overlay Info */}
              <div className="absolute bottom-6 left-6 z-10">
                <div className="bg-slate-900/80 backdrop-blur-md text-white px-4 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
                  <div className="p-2 bg-indigo-500/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Konum Bağlamı</div>
                    <div className="text-sm font-semibold">{params.realWorldLocation?.address || 'Kocamustafapaşa, İstanbul'}</div>
                  </div>
                </div>
              </div>
              
              {isExporting && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 border border-slate-100">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="font-bold text-slate-800">3D Model Hazırlanıyor...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attribution Notice */}
        <div className="px-6 py-2 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-100 flex justify-between items-center">
          <span>Google Maps Platform - Photorealistic 3D Tiles Technology</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Veriler gerçek zamanlıdır</span>
            <span className="font-bold">Google Maps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
