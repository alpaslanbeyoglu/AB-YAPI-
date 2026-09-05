import React, { useState, useRef } from 'react';
import { Cloud, CheckCircle2, AlertCircle, ShieldCheck, FileText, Compass, LayoutGrid, Calendar, Clock, Sparkles, Layers } from 'lucide-react';
import { ProjectParams, CalculationResult, AppTheme } from '../types';
import { saveReportDocumentToDrive } from '../services/drive';
import { generateOfferHtml } from '../utils/reportExport';
import { exportElementToPdf, printHtmlContent } from '../utils/pdfExport';
import { PrintAndPdfButtons } from './PrintAndPdfButtons';
import { Logo } from './Logo';
import { getRoofTypeShortTitle } from '../utils/roofUtils';
import { useCompanyProfile } from '../context/CompanyProfileContext';

interface OfferTabProps {
  params: ProjectParams;
  results: CalculationResult;
  hasToken: boolean;
  onOpenDrivePanel: () => void;
  theme?: AppTheme;
}

// Helper to render front-elevation building schematic (stale)
const staleRenderFrontViewSvg = (floorCount: number, hasShop: boolean, roofType: string, compName: string = 'AB YAPI') => {
  const N = floorCount || 5;
  const floorHeight = 22;
  const shopHeight = 32;
  
  const floors = [];
  let currentY = 190; // Bottom base ground line
  
  for (let f = 0; f < N; f++) {
    const isShop = f === 0 && hasShop;
    const h = isShop ? shopHeight : floorHeight;
    floors.push({
      index: f,
      isShop,
      y: currentY - h,
      h: h
    });
    currentY -= h;
  }
  
  const topY = currentY;
  
  return (
    <svg viewBox="0 0 220 220" className="w-full h-44 md:h-52 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
      <defs>
        <pattern id="gridPattern" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      {/* Background and grid */}
      <rect width="100%" height="100%" fill="#0b1329" />
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
      
      {/* Ground Line */}
      <line x1="10" y1="190" x2="210" y2="190" stroke="#475569" strokeWidth="2.5" />
      
      {/* Building Frame */}
      <g stroke="#38bdf8" strokeWidth="1.2" fill="#1e293b" fillOpacity="0.75">
        {floors.map((fl) => (
          <g key={fl.index}>
            {/* Slab */}
            <rect x="45" y={fl.y} width="130" height={fl.h} rx="1" />
            
            {fl.isShop ? (
              // Ground floor commercial shop windows and door
              <g stroke="#38bdf8" strokeWidth="1" fill="#0f172a" fillOpacity="0.9">
                {/* Store 1 */}
                <rect x="52" y={fl.y + 10} width="34" height="19" rx="1" />
                {/* Store 2 */}
                <rect x="92" y={fl.y + 10} width="36" height="19" rx="1" />
                {/* Store 3 */}
                <rect x="134" y={fl.y + 10} width="34" height="19" rx="1" />
                {/* Divider lines inside shop windows */}
                <line x1="69" y1={fl.y + 10} x2="69" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="110" y1={fl.y + 10} x2="110" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="151" y1={fl.y + 10} x2="151" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                {/* Signboard */}
                <rect x="48" y={fl.y + 2} width="124" height="6" fill="#38bdf8" fillOpacity="0.25" />
                <text x="110" y={fl.y + 7} fill="#38bdf8" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">{compName} TİCARET / TİCARİ MAĞAZA</text>
              </g>
            ) : (
              // Residential window patterns
              <g stroke="#38bdf8" strokeWidth="1" fill="none">
                {/* Window Left */}
                <rect x="54" y={fl.y + 4} width="18" height="12" rx="1" fill="#0f172a" />
                <line x1="63" y1={fl.y + 4} x2="63" y2={fl.y + 16} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="54" y1={fl.y + 10} x2="72" y2={fl.y + 10} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Middle glass or balcony door */}
                <rect x="100" y={fl.y + 4} width="20" height="14" rx="1" fill="#0f172a" />
                <line x1="110" y1={fl.y + 4} x2="110" y2={fl.y + 18} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Window Right */}
                <rect x="148" y={fl.y + 4} width="18" height="12" rx="1" fill="#0f172a" />
                <line x1="157" y1={fl.y + 4} x2="157" y2={fl.y + 16} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="148" y1={fl.y + 10} x2="166" y2={fl.y + 10} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Balcony Railing */}
                {fl.index >= 1 && (
                  <rect x="94" y={fl.y + 11} width="32" height="7" fill="#38bdf8" fillOpacity="0.3" rx="0.5" />
                )}
              </g>
            )}
            
            {/* Label */}
            <text x="20" y={fl.y + fl.h / 2 + 2} fill="#64748b" fontSize="6" stroke="none" fontWeight="semibold">
              {fl.isShop ? "Zemin Kat" : `${fl.index}. Kat`}
            </text>
          </g>
        ))}
        
        {/* Roof rendering based on roofType */}
        {roofType === 'gable' && (
          <g>
            <polygon points={`45,${topY} 110,${topY - 24} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="110" y1={topY - 24} x2="110" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2,2" />
          </g>
        )}
        {roofType === 'flat' && (
          <g fill="#1e293b">
            <rect x="45" y={topY - 4} width="130" height="4" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="60" y1={topY - 4} x2="60" y2={topY} stroke="#38bdf8" strokeWidth="0.5" />
            <line x1="160" y1={topY - 4} x2="160" y2={topY} stroke="#38bdf8" strokeWidth="0.5" />
          </g>
        )}
        {roofType === 'mansard' && (
          <g>
            <polygon points={`45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="65" y1={topY - 18} x2="65" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="155" y1={topY - 18} x2="155" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />
          </g>
        )}
        {roofType === 'duplex' && (
          <g>
            <polygon points={`45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            {/* Dormer Window */}
            <rect x="98" y={topY - 13} width="24" height="10" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <line x1="110" y1={topY - 13} x2="110" y2={topY - 3} stroke="#38bdf8" strokeWidth="0.5" />
            <text x="110" y={topY - 15} fill="#10b981" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">ÇATI DUBLEKSİ</text>
          </g>
        )}
      </g>
      
      {/* Schematic details */}
      <text x="110" y="210" fill="#38bdf8" fontSize="8" textAnchor="middle" stroke="none" fontWeight="bold" letterSpacing="1.5">
        ÖN CEPHE GÖRÜNÜMÜ
      </text>
    </svg>
  );
};

// Helper to render front-elevation building schematic with CAD style dimensions
const renderFrontViewSvg = (
  floorCount: number,
  hasShop: boolean,
  roofType: string,
  baseBuildArea: number = 120,
  compName: string = 'AB YAPI'
) => {
  const N = floorCount || 5;
  const floorHeight = 22;
  const shopHeight = 32;
  const estW = Math.sqrt(baseBuildArea / 1.2);
  
  const floors = [];
  let currentY = 190; // Bottom base ground line
  
  for (let f = 0; f < N; f++) {
    const isShop = f === 0 && hasShop;
    const h = isShop ? shopHeight : floorHeight;
    floors.push({
      index: f,
      isShop,
      y: currentY - h,
      h: h
    });
    currentY -= h;
  }
  
  const topY = currentY;
  const totalHeightM = (N * 3.0 + (hasShop ? 1.5 : 0)).toFixed(2);

  return (
    <svg viewBox="0 0 220 220" className="w-full h-44 md:h-52 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
      <defs>
        <pattern id="gridPattern" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      {/* Background and grid */}
      <rect width="100%" height="100%" fill="#0b1329" />
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
      
      {/* Ground Line */}
      <line x1="10" y1="190" x2="210" y2="190" stroke="#475569" strokeWidth="2.5" />
      
      {/* Building Frame */}
      <g stroke="#38bdf8" strokeWidth="1.2" fill="#1e293b" fillOpacity="0.75">
        {floors.map((fl) => (
          <g key={fl.index}>
            {/* Slab */}
            <rect x="45" y={fl.y} width="130" height={fl.h} rx="1" />
            
            {fl.isShop ? (
              // Ground floor commercial shop windows and door
              <g stroke="#38bdf8" strokeWidth="1" fill="#0f172a" fillOpacity="0.9">
                {/* Store 1 */}
                <rect x="52" y={fl.y + 10} width="34" height="19" rx="1" />
                {/* Store 2 */}
                <rect x="92" y={fl.y + 10} width="36" height="19" rx="1" />
                {/* Store 3 */}
                <rect x="134" y={fl.y + 10} width="34" height="19" rx="1" />
                {/* Divider lines inside shop windows */}
                <line x1="69" y1={fl.y + 10} x2="69" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="110" y1={fl.y + 10} x2="110" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="151" y1={fl.y + 10} x2="151" y2={fl.y + 29} stroke="#38bdf8" strokeWidth="0.5" />
                {/* Signboard */}
                <rect x="48" y={fl.y + 2} width="124" height="6" fill="#38bdf8" fillOpacity="0.25" />
                <text x="110" y={fl.y + 7} fill="#38bdf8" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">{compName} TİCARET / TİCARİ MAĞAZA</text>
              </g>
            ) : (
              // Residential window patterns
              <g stroke="#38bdf8" strokeWidth="1" fill="none">
                {/* Window Left */}
                <rect x="54" y={fl.y + 4} width="18" height="12" rx="1" fill="#0f172a" />
                <line x1="63" y1={fl.y + 4} x2="63" y2={fl.y + 16} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="54" y1={fl.y + 10} x2="72" y2={fl.y + 10} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Middle glass or balcony door */}
                <rect x="100" y={fl.y + 4} width="20" height="14" rx="1" fill="#0f172a" />
                <line x1="110" y1={fl.y + 4} x2="110" y2={fl.y + 18} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Window Right */}
                <rect x="148" y={fl.y + 4} width="18" height="12" rx="1" fill="#0f172a" />
                <line x1="157" y1={fl.y + 4} x2="157" y2={fl.y + 16} stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="148" y1={fl.y + 10} x2="166" y2={fl.y + 10} stroke="#38bdf8" strokeWidth="0.5" />
                
                {/* Balcony Railing */}
                {fl.index >= 1 && (
                  <rect x="94" y={fl.y + 11} width="32" height="7" fill="#38bdf8" fillOpacity="0.3" rx="0.5" />
                )}
              </g>
            )}
            
            {/* Label */}
            <text x="20" y={fl.y + fl.h / 2 + 2} fill="#64748b" fontSize="6" stroke="none" fontWeight="semibold">
              {fl.isShop ? "Zemin Kat" : `${fl.index}. Kat`}
            </text>
          </g>
        ))}
        
        {/* Roof rendering based on roofType */}
        {roofType === 'gable' && (
          <g>
            <polygon points={`45,${topY} 110,${topY - 24} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="110" y1={topY - 24} x2="110" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2,2" />
          </g>
        )}
        {roofType === 'flat' && (
          <g fill="#1e293b">
            <rect x="45" y={topY - 4} width="130" height="4" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="60" y1={topY - 4} x2="60" y2={topY} stroke="#38bdf8" strokeWidth="0.5" />
            <line x1="160" y1={topY - 4} x2="160" y2={topY} stroke="#38bdf8" strokeWidth="0.5" />
          </g>
        )}
        {roofType === 'mansard' && (
          <g>
            <polygon points={`45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            <line x1="65" y1={topY - 18} x2="65" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="155" y1={topY - 18} x2="155" y2={topY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />
          </g>
        )}
        {roofType === 'duplex' && (
          <g>
            <polygon points={`45,${topY} 65,${topY - 18} 155,${topY - 18} 175,${topY}`} fill="#1e293b" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1.2" />
            {/* Dormer Window */}
            <rect x="98" y={topY - 13} width="24" height="10" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <line x1="110" y1={topY - 13} x2="110" y2={topY - 3} stroke="#38bdf8" strokeWidth="0.5" />
            <text x="110" y={topY - 15} fill="#10b981" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">ÇATI DUBLEKSİ</text>
          </g>
        )}
      </g>

      {/* CAD DIMENSION LINES (DIŞ ÖLÇÜLER) */}
      <g stroke="#10b981" strokeWidth="0.8" fill="none">
        {/* Horizontal Width Dimension at Bottom */}
        <line x1="45" y1="205" x2="175" y2="205" />
        <line x1="45" y1="190" x2="45" y2="210" stroke="#475569" strokeWidth="0.5" />
        <line x1="175" y1="190" x2="175" y2="210" stroke="#475569" strokeWidth="0.5" />
        {/* Tick Slashes */}
        <line x1="42" y1="208" x2="48" y2="202" />
        <line x1="172" y1="208" x2="178" y2="202" />
        <text x="110" y="215" fill="#10b981" fontSize="6.5" textAnchor="middle" stroke="none" fontWeight="bold" fontFamily="monospace">GENİŞLİK: {estW.toFixed(2)} m</text>

        {/* Vertical Height Dimension at Right */}
        <line x1="195" y1={topY} x2="195" y2="190" />
        <line x1="175" y1={topY} x2="200" y2={topY} stroke="#475569" strokeWidth="0.5" />
        <line x1="175" y1="190" x2="200" y2="190" stroke="#475569" strokeWidth="0.5" />
        {/* Tick Slashes */}
        <line x1="192" y1={topY + 3} x2="198" y2={topY - 3} />
        <line x1="192" y1="193" x2="198" y2="187" />
        <text x="204" y={(topY + 190) / 2} fill="#10b981" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold" fontFamily="monospace" transform={`rotate(90, 204, ${(topY + 190) / 2})`}>YÜKSEKLİK: {totalHeightM} m</text>
      </g>
      
      {/* Schematic details */}
      <text x="110" y="12" fill="#38bdf8" fontSize="8" textAnchor="middle" stroke="none" fontWeight="bold" letterSpacing="1.5">
        ÖN CEPHE GÖRÜNÜMÜ (ELEVATION)
      </text>
    </svg>
  );
};

// Helper to render CAD style Ground Floor Plan
const renderGroundFloorPlanSvg = (hasShop: boolean, roomType = '3+1', grossArea = 120, netArea = 96, baseBuildArea = 120) => {
  const estW = Math.sqrt(baseBuildArea / 1.2);
  const estD = estW * 1.2;
  const shopGross = Math.round(((baseBuildArea * 0.85) / 2) * 10) / 10;
  const shopNet = Math.round((shopGross * 0.8) * 10) / 10;

  return (
    <svg viewBox="0 0 220 220" className="w-full h-44 md:h-52 bg-[#090f1d] rounded-2xl border border-slate-800 shadow-inner">
      <defs>
        <pattern id="gridPatternCADGround" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#111c30" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#060a13" />
      <rect width="100%" height="100%" fill="url(#gridPatternCADGround)" />

      {/* Building Outer Bounds (CAD Line Style) */}
      <rect x="45" y="45" width="130" height="130" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      <rect x="42" y="42" width="136" height="136" fill="none" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />

      {/* Elevator Shaft (CAD style with diagonal lines) */}
      <g stroke="#f43f5e" strokeWidth="1" fill="none">
        <rect x="98" y="70" width="24" height="24" strokeWidth="1.2" />
        <line x1="98" y1="70" x2="122" y2="94" strokeWidth="0.6" />
        <line x1="122" y1="70" x2="98" y2="94" strokeWidth="0.6" />
        <text x="110" y="84" fill="#f43f5e" fontSize="5" textAnchor="middle" stroke="none" fontWeight="bold">ASANSÖR</text>
      </g>

      {/* Staircase (CAD style with steps and direction line) */}
      <g stroke="#38bdf8" strokeWidth="1" fill="none">
        <rect x="98" y="94" width="24" height="36" strokeWidth="1.2" />
        {/* Split line in the middle */}
        <line x1="110" y1="94" x2="110" y2="130" strokeWidth="0.8" />
        {/* Steps */}
        <line x1="98" y1="100" x2="110" y2="100" />
        <line x1="98" y1="106" x2="110" y2="106" />
        <line x1="98" y1="112" x2="110" y2="112" />
        <line x1="98" y1="118" x2="110" y2="118" />
        <line x1="98" y1="124" x2="110" y2="124" />

        <line x1="110" y1="100" x2="122" y2="100" />
        <line x1="110" y1="106" x2="122" y2="106" />
        <line x1="110" y1="112" x2="122" y2="112" />
        <line x1="110" y1="118" x2="122" y2="118" />
        <line x1="110" y1="124" x2="122" y2="124" />
        
        {/* Direction Arrow */}
        <path d="M 104,126 L 104,98 L 116,98 L 116,115" stroke="#10b981" strokeWidth="0.8" fill="none" />
        <polygon points="114,113 116,117 118,113" fill="#10b981" stroke="none" />
        <text x="110" y="136" fill="#38bdf8" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">MERDİVEN</text>
      </g>

      {/* Independent Unit Boundaries & Labels */}
      {hasShop ? (
        <g stroke="#34d399" strokeWidth="1.2" fill="none">
          {/* Shop 1 boundary on left */}
          <line x1="98" y1="45" x2="98" y2="175" strokeDasharray="3,3" />
          <text x="71" y="105" fill="#34d399" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold">DÜKKAN 01</text>
          <text x="71" y="115" fill="#64748b" fontSize="4.5" textAnchor="middle" stroke="none">BRÜT: ~{shopGross} m²</text>
          <text x="71" y="122" fill="#64748b" fontSize="4" textAnchor="middle" stroke="none">NET: ~{shopNet} m²</text>

          {/* Shop 2 boundary on right */}
          <line x1="122" y1="45" x2="122" y2="175" strokeDasharray="3,3" />
          <text x="148" y="105" fill="#34d399" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold">DÜKKAN 02</text>
          <text x="148" y="115" fill="#64748b" fontSize="4.5" textAnchor="middle" stroke="none">BRÜT: ~{shopGross} m²</text>
          <text x="148" y="122" fill="#64748b" fontSize="4" textAnchor="middle" stroke="none">NET: ~{shopNet} m²</text>
          
          <text x="110" y="58" fill="#10b981" fontSize="5" textAnchor="middle" stroke="none" fontWeight="bold">ORTAK HOL</text>
        </g>
      ) : (
        <g stroke="#a78bfa" strokeWidth="1.2" fill="none">
          {/* Flat 1 on left */}
          <line x1="98" y1="45" x2="98" y2="175" strokeDasharray="3,3" />
          <text x="71" y="105" fill="#a78bfa" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold">DAİRE 01</text>
          <text x="71" y="115" fill="#64748b" fontSize="4.5" textAnchor="middle" stroke="none">BRÜT: ~{grossArea} m²</text>
          <text x="71" y="122" fill="#64748b" fontSize="4" textAnchor="middle" stroke="none">NET: ~{netArea} m²</text>
          <text x="71" y="130" fill="#a78bfa" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">{roomType}</text>

          {/* Flat 2 on right */}
          <line x1="122" y1="45" x2="122" y2="175" strokeDasharray="3,3" />
          <text x="148" y="105" fill="#a78bfa" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold">DAİRE 02</text>
          <text x="148" y="115" fill="#64748b" fontSize="4.5" textAnchor="middle" stroke="none">BRÜT: ~{grossArea} m²</text>
          <text x="148" y="122" fill="#64748b" fontSize="4" textAnchor="middle" stroke="none">NET: ~{netArea} m²</text>
          <text x="148" y="130" fill="#a78bfa" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">{roomType}</text>
          
          <text x="110" y="58" fill="#10b981" fontSize="5" textAnchor="middle" stroke="none" fontWeight="bold">ORTAK HOL</text>
        </g>
      )}

      {/* CAD DIMENSION LINES (DIŞ ÖLÇÜLER) */}
      <g stroke="#e2e8f0" strokeWidth="0.6" fill="none" opacity="0.8">
        {/* Horizontal dimension line at top */}
        <line x1="45" y1="23" x2="175" y2="23" stroke="#10b981" strokeWidth="0.8" />
        {/* Extension lines */}
        <line x1="45" y1="45" x2="45" y2="18" stroke="#475569" strokeWidth="0.5" />
        <line x1="175" y1="45" x2="175" y2="18" stroke="#475569" strokeWidth="0.5" />
        {/* Tick marks */}
        <line x1="42" y1="26" x2="48" y2="20" stroke="#10b981" strokeWidth="0.8" />
        <line x1="172" y1="26" x2="178" y2="20" stroke="#10b981" strokeWidth="0.8" />
        {/* Dimension Text */}
        <text x="110" y="16" fill="#10b981" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold" fontFamily="monospace">{estW.toFixed(2)} m</text>

        {/* Vertical dimension line on left */}
        <line x1="20" y1="45" x2="20" y2="175" stroke="#10b981" strokeWidth="0.8" />
        {/* Extension lines */}
        <line x1="45" y1="45" x2="15" y2="45" stroke="#475569" strokeWidth="0.5" />
        <line x1="45" y1="175" x2="15" y2="175" stroke="#475569" strokeWidth="0.5" />
        {/* Tick marks */}
        <line x1="17" y1="48" x2="23" y2="42" stroke="#10b981" strokeWidth="0.8" />
        <line x1="17" y1="178" x2="23" y2="172" stroke="#10b981" strokeWidth="0.8" />
        {/* Dimension Text */}
        <text x="12" y="113" fill="#10b981" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold" fontFamily="monospace" transform="rotate(-90, 12, 113)">{estD.toFixed(2)} m</text>
      </g>

      <text x="110" y="202" fill="#38bdf8" fontSize="8" textAnchor="middle" stroke="none" fontWeight="bold" letterSpacing="1">
        ZEMİN KAT PLANI
      </text>
    </svg>
  );
};

// Helper to render CAD style Normal Floor Plan
const renderNormalFloorPlanSvg = (roomType = '3+1', grossArea = 120, netArea = 96, baseBuildArea = 120) => {
  const estW = Math.sqrt(baseBuildArea / 1.2);
  const estD = estW * 1.2;

  return (
    <svg viewBox="0 0 220 220" className="w-full h-44 md:h-52 bg-[#090f1d] rounded-2xl border border-slate-800 shadow-inner">
      <defs>
        <pattern id="gridPatternCADNormal" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#111c30" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#060a13" />
      <rect width="100%" height="100%" fill="url(#gridPatternCADNormal)" />

      {/* Building Outer Bounds (CAD Line Style) */}
      <rect x="45" y="45" width="130" height="130" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      <rect x="42" y="42" width="136" height="136" fill="none" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1,2" />

      {/* Elevator Shaft (CAD style with diagonal lines) */}
      <g stroke="#f43f5e" strokeWidth="1" fill="none">
        <rect x="98" y="70" width="24" height="24" strokeWidth="1.2" />
        <line x1="98" y1="70" x2="122" y2="94" strokeWidth="0.6" />
        <line x1="122" y1="70" x2="98" y2="94" strokeWidth="0.6" />
        <text x="110" y="84" fill="#f43f5e" fontSize="5" textAnchor="middle" stroke="none" fontWeight="bold">ASANSÖR</text>
      </g>

      {/* Staircase (CAD style) */}
      <g stroke="#38bdf8" strokeWidth="1" fill="none">
        <rect x="98" y="94" width="24" height="36" strokeWidth="1.2" />
        <line x1="110" y1="94" x2="110" y2="130" strokeWidth="0.8" />
        {/* Steps */}
        <line x1="98" y1="100" x2="110" y2="100" />
        <line x1="98" y1="106" x2="110" y2="106" />
        <line x1="98" y1="112" x2="110" y2="112" />
        <line x1="98" y1="118" x2="110" y2="118" />
        <line x1="98" y1="124" x2="110" y2="124" />

        <line x1="110" y1="100" x2="122" y2="100" />
        <line x1="110" y1="106" x2="122" y2="106" />
        <line x1="110" y1="112" x2="122" y2="112" />
        <line x1="110" y1="118" x2="122" y2="118" />
        <line x1="110" y1="124" x2="122" y2="124" />
        
        {/* Direction Arrow */}
        <path d="M 104,126 L 104,98 L 116,98 L 116,115" stroke="#10b981" strokeWidth="0.8" fill="none" />
        <polygon points="114,113 116,117 118,113" fill="#10b981" stroke="none" />
        <text x="110" y="136" fill="#38bdf8" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">MERDİVEN</text>
      </g>

      {/* Independent Unit Boundaries & Labels (konut katı) */}
      <g stroke="#a78bfa" strokeWidth="1.2" fill="none">
        {/* Flat A on left */}
        <line x1="98" y1="45" x2="98" y2="175" strokeDasharray="3,3" />
        <text x="71" y="105" fill="#a78bfa" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold">DAİRE A (SOL)</text>
        <text x="71" y="115" fill="#64748b" fontSize="4.5" textAnchor="middle" stroke="none">BRÜT: ~{grossArea} m²</text>
        <text x="71" y="122" fill="#64748b" fontSize="4" textAnchor="middle" stroke="none">NET: ~{netArea} m²</text>
        <text x="71" y="130" fill="#a78bfa" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">{roomType}</text>

        {/* Flat B on right */}
        <line x1="122" y1="45" x2="122" y2="175" strokeDasharray="3,3" />
        <text x="148" y="105" fill="#a78bfa" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold">DAİRE B (SAĞ)</text>
        <text x="148" y="115" fill="#64748b" fontSize="4.5" textAnchor="middle" stroke="none">BRÜT: ~{grossArea} m²</text>
        <text x="148" y="122" fill="#64748b" fontSize="4" textAnchor="middle" stroke="none">NET: ~{netArea} m²</text>
        <text x="148" y="130" fill="#a78bfa" fontSize="4.5" textAnchor="middle" stroke="none" fontWeight="bold">{roomType}</text>
        
        <text x="110" y="58" fill="#10b981" fontSize="5" textAnchor="middle" stroke="none" fontWeight="bold">KAT HOLÜ</text>
      </g>

      {/* CAD DIMENSION LINES (DIŞ ÖLÇÜLER) */}
      <g stroke="#e2e8f0" strokeWidth="0.6" fill="none" opacity="0.8">
        {/* Horizontal dimension line at top */}
        <line x1="45" y1="23" x2="175" y2="23" stroke="#10b981" strokeWidth="0.8" />
        {/* Extension lines */}
        <line x1="45" y1="45" x2="45" y2="18" stroke="#475569" strokeWidth="0.5" />
        <line x1="175" y1="45" x2="175" y2="18" stroke="#475569" strokeWidth="0.5" />
        {/* Tick marks */}
        <line x1="42" y1="26" x2="48" y2="20" stroke="#10b981" strokeWidth="0.8" />
        <line x1="172" y1="26" x2="178" y2="20" stroke="#10b981" strokeWidth="0.8" />
        {/* Dimension Text */}
        <text x="110" y="16" fill="#10b981" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold" fontFamily="monospace">{estW.toFixed(2)} m</text>

        {/* Vertical dimension line on left */}
        <line x1="20" y1="45" x2="20" y2="175" stroke="#10b981" strokeWidth="0.8" />
        {/* Extension lines */}
        <line x1="45" y1="45" x2="15" y2="45" stroke="#475569" strokeWidth="0.5" />
        <line x1="45" y1="175" x2="15" y2="175" stroke="#475569" strokeWidth="0.5" />
        {/* Tick marks */}
        <line x1="17" y1="48" x2="23" y2="42" stroke="#10b981" strokeWidth="0.8" />
        <line x1="17" y1="178" x2="23" y2="172" stroke="#10b981" strokeWidth="0.8" />
        {/* Dimension Text */}
        <text x="12" y="113" fill="#10b981" fontSize="6" textAnchor="middle" stroke="none" fontWeight="bold" fontFamily="monospace" transform="rotate(-90, 12, 113)">{estD.toFixed(2)} m</text>
      </g>

      <text x="110" y="202" fill="#38bdf8" fontSize="8" textAnchor="middle" stroke="none" fontWeight="bold" letterSpacing="1">
        NORMAL KAT PLANI
      </text>
    </svg>
  );
};

export const OfferTab: React.FC<OfferTabProps> = ({
  params,
  results,
  hasToken,
  onOpenDrivePanel,
  theme = 'light',
}) => {
  const { profile } = useCompanyProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showDrawingsInReport, setShowDrawingsInReport] = useState(true);
  const offerDocRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!offerDocRef.current) return;
    const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    const fileName = `${safeName}_Musteri_Teklifi_${safeAddr || 'Proje'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await exportElementToPdf(offerDocRef.current, fileName);
  };

  const handlePrint = () => {
    const html = generateOfferHtml(params, results, showDrawingsInReport, profile);
    const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
    printHtmlContent(html, `${safeName}_Musteri_Teklifi_${params.projectAddress || 'Proje'}`);
  };

  // Copy protection side effects and handlers
  React.useEffect(() => {
    const blockShortcuts = (e: KeyboardEvent) => {
      // Blocks Ctrl+C, Ctrl+X, Ctrl+A, Command+C, Command+X, Command+A
      if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockShortcuts);
    return () => window.removeEventListener('keydown', blockShortcuts);
  }, []);

  const handleCopyProtect = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const handleContextMenuProtect = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Upper floor area and physical gross/net area estimation for consistency
  const upperFloorsCount = Math.max(0, params.floorCount - 1);
  let upperFloorArea = params.baseBuildArea;
  if (params.hasCantilever && params.cantileverDepth && params.cantileverDepth > 0) {
    const estW = Math.sqrt(params.baseBuildArea / 1.2);
    const estD = estW * 1.2;
    if (params.cantileverDirection === 'all') {
      upperFloorArea = (estW + 2 * params.cantileverDepth) * (estD + 2 * params.cantileverDepth);
    } else if (params.cantileverDirection === 'front') {
      upperFloorArea = estW * (estD + params.cantileverDepth);
    } else {
      upperFloorArea = estW * (estD + 2 * params.cantileverDepth);
    }
  }
  const residentialFloors = params.hasGroundFloorShop ? Math.max(1, params.floorCount - 1) : params.floorCount;
  const flatsPerFloor = Math.max(1, Math.round(results.flatCount / residentialFloors));
  const physicalGrossArea = Math.round((upperFloorArea / flatsPerFloor) * 10) / 10;
  const physicalNetArea = Math.round((physicalGrossArea * 0.8) * 10) / 10;

  const isGray = theme === 'gray';

  const supportText =
    params.transformationStatus === 'currentSupport'
      ? '2025/2026 Mevcut Model (875 Bin TL Hibe + 875 Bin TL Kredi)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Projeksiyon Modeli (3 Milyon TL Kredi / 180 Ay Vade)'
      : 'Desteksiz / Öz Kaynaklı Yapım';

  const handleSaveToDrive = async () => {
    if (!hasToken) {
      onOpenDrivePanel();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const html = generateOfferHtml(params, results, showDrawingsInReport, profile);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const safeName = (profile.companyName || 'AB_YAPI').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_');
      const fileName = `${safeName}_Teklif_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `${profile.companyName} Müşteri Teklifi - ${params.projectAddress}`
      );
      setSaveStatus({
        type: 'success',
        msg: `Teklif belgesi Google Drive'a başarıyla kaydedildi: "${res.name}"`,
      });
    } catch (err: any) {
      setSaveStatus({ type: 'error', msg: err.message || 'Drive kaydı başarısız oldu.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isContractorShareModel = params.projectModel === 'contractorShare';

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border shadow-sm print:hidden ${
          isGray ? 'bg-slate-100/90 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h3 className={`font-semibold text-sm ${isGray ? 'text-slate-900' : 'text-slate-800'}`}>
            Resmi Müşteri Teklif Çıktısı
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hak sahipleri borçlanma tablosu ve hakediş vadeleri ile hazır teklif belgesi
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <input
              id="toggle-drawings-checkbox"
              type="checkbox"
              checked={showDrawingsInReport}
              onChange={(e) => setShowDrawingsInReport(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="toggle-drawings-checkbox" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
              Şematik CAD Çizimlerini Çıktıda ve Raporlarda Göster
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSaving ? 'Kaydediliyor...' : "Drive'a Kaydet"}</span>
          </button>
          <PrintAndPdfButtons
            onExportPdf={handleExportPdf}
            onPrint={handlePrint}
            theme={theme}
          />
        </div>
      </div>

      {saveStatus && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 print:hidden border ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{saveStatus.msg}</span>
        </div>
      )}

      {/* Offer Document */}
      <div
        ref={offerDocRef}
        onCopy={handleCopyProtect}
        onContextMenu={handleContextMenuProtect}
        onDragStart={(e) => e.preventDefault()}
        className={`relative overflow-hidden select-none copy-protected border rounded-3xl p-6 sm:p-10 shadow-sm print:bg-white print:border-none print:shadow-none print:p-0 print:text-black ${
          isGray ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'
        }`}
      >
        {/* Subtle Diagonal Security Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.025] flex flex-wrap gap-16 justify-center items-center rotate-12 z-0">
          {Array.from({ length: 48 }).map((_, i) => (
            <span key={i} className="text-slate-900 font-extrabold text-[10px] tracking-widest whitespace-nowrap">
              {profile.companyName} - KOPYALANMAZ / DIŞARI PAYLAŞILMAZ
            </span>
          ))}
        </div>

        {/* Title Header with Official Logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <Logo size="lg" variant="full" theme={theme} />
          </div>
          <div className="text-center sm:text-right">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide">
              İNŞAAT TEKLİF VE ÖDEME PLANI
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Teklif No: {(profile.companyName || 'AB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}-{new Date().getFullYear()}-{(results.flatCount || 10).toString().padStart(3, '0')} | Tarih: {new Date().toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        {/* Project Meta Box */}
        <div className="bg-slate-50 border-l-4 border-indigo-600 p-5 rounded-2xl mb-6 text-xs text-slate-700 leading-relaxed space-y-1.5 print:bg-slate-50 print:border-teal-800 print:text-slate-700">
          <h4 className="font-semibold text-slate-900 text-sm mb-2">📍 Yapı & Proje Genel Bilgileri</h4>
          <p>
            <strong className="text-slate-700">Yapı Adresi:</strong>{' '}
            <span className="text-indigo-700 font-bold">{params.projectAddress}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 border-t border-slate-200/60 pt-2 mt-2">
            <p>
              <strong className="text-slate-700">Toplam Kat Sayısı:</strong>{' '}
              <span className="font-semibold text-slate-900">{params.floorCount} Kat</span>
            </p>
            <p>
              <strong className="text-slate-700">Toplam Daire Sayısı:</strong>{' '}
              <span className="font-semibold text-slate-900">{results.flatCount} Adet</span>
            </p>
            <p>
              <strong className="text-slate-700">Bina Oturumu (Taban):</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {results.baseArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Toplam İnşaat Alanı:</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {results.totalArea.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Fiziki Daire Brüt Alanı:</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono text-indigo-600">
                {physicalGrossArea} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Daire Net Alanı (~%80):</strong>{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {physicalNetArea} m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Daire Tipi (Oda+Salon):</strong>{' '}
              <span className="font-semibold text-indigo-600 font-mono">
                {params.roomType || '3+1'}
              </span>
            </p>
            <p>
              <strong className="text-slate-700">İnşaat Hakediş Payı (Daire Başı):</strong>{' '}
              <span className="font-semibold text-slate-600 font-mono text-xs">
                {results.flatResults.length > 0 ? (results.flatResults[0].area) : 0} m² <span className="text-[9px] text-slate-400 font-normal">(Bodrum, Ortak Alan, Dükkan payları dahil)</span>
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Birim İmalat Fiyatı:</strong>{' '}
              <span className="font-mono font-semibold text-slate-900">
                {results.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²
              </span>
            </p>
            <p>
              <strong className="text-slate-700">Dolar Kuru Eşdeğeri:</strong>{' '}
              <span className="font-mono font-semibold text-slate-500">
                {results.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²
              </span>
            </p>
          </div>
          <div className="border-t border-slate-200/60 pt-2 mt-2">
            {params.durationOption !== 'hide' && (
              <p>
                <strong className="text-slate-700">Tahmini Proje ve Teslim Süresi:</strong>{' '}
                <span className="font-semibold text-slate-900">{results.finalMonths} Ay</span>{' '}
                <em className="text-slate-500">
                  {params.durationOption === 'auto'
                    ? '(Proje Çizimi, Ruhsat ve İskân Süreçleri Dahil)'
                    : '(Sözleşmede Kararlaştırılan Süre)'}
                </em>
              </p>
            )}
            <p>
              <strong className="text-slate-700">Kentsel Dönüşüm Destek Modeli:</strong>{' '}
              <span className="font-semibold text-amber-700">{supportText}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Architectural Views Component */}
        <div className={`mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 ${!showDrawingsInReport ? 'print:hidden border-dashed border-slate-300 opacity-80' : ''}`}>
          <h4 className="text-xs font-bold text-indigo-700 mb-4 uppercase tracking-wider flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>📐 Dinamik Mimari Kütle Tasarımı & Şematik CAD Çizimleri</span>
            </span>
            {!showDrawingsInReport && (
              <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/25 px-2.5 py-0.5 rounded-full font-semibold print:hidden">
                Çıktıda Gizlenecek
              </span>
            )}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 bg-[#090f1d]/5 p-3 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="block text-xs font-bold text-indigo-700 tracking-wide uppercase text-center mb-1">
                A. Ön Cephe Görünümü (Elevation)
              </span>
              {renderFrontViewSvg(params.floorCount || 5, !!params.hasGroundFloorShop, params.roofType || 'gable', params.baseBuildArea, profile.companyName)}
              <p className="text-[10px] text-slate-500 text-center italic mt-1">Dış ölçüler (Yükseklik/Genişlik) ve kat seviyeleri gösterilmiştir.</p>
            </div>
            
            <div className="space-y-2 bg-[#090f1d]/5 p-3 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="block text-xs font-bold text-indigo-700 tracking-wide uppercase text-center mb-1">
                B. Zemin Kat Planı (Ground Floor)
              </span>
              {renderGroundFloorPlanSvg(!!params.hasGroundFloorShop, `${params.roomType || '3+1'} ODA`, physicalGrossArea, physicalNetArea, params.baseBuildArea)}
              <p className="text-[10px] text-slate-500 text-center italic mt-1">Daire ve bağımsız bölüm sınırları, asansör, merdiven ve dış ölçüleri içerir.</p>
            </div>
            
            <div className="space-y-2 bg-[#090f1d]/5 p-3 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="block text-xs font-bold text-indigo-700 tracking-wide uppercase text-center mb-1">
                C. Normal Kat Planı (Normal Floor)
              </span>
              {renderNormalFloorPlanSvg(`${params.roomType || '3+1'} ODA`, physicalGrossArea, physicalNetArea, params.baseBuildArea)}
              <p className="text-[10px] text-slate-500 text-center italic mt-1">Normal kat bağımsız bölüm sınırları, merdiven, asansör ve kat holünü gösterir.</p>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 mt-4 text-center italic">
            * Yukarıdaki şematik CAD çizimleri, girdiğiniz kat adedi ({params.floorCount} Kat), zemin ticari alan durumu ({params.hasGroundFloorShop ? "Var" : "Yok"}) ve çatı tipi ({getRoofTypeShortTitle(params.roofType)}) özelliklerine göre dinamik olarak şematize edilmiştir.
          </p>
        </div>

        {/* Detailed Technical / Structural Specifications (Technical Spec Summary) */}
        <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-bold text-indigo-700 mb-3 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>🏢 Yapısal Özellikler & Teknik Şartname Özeti</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900 font-semibold">⚡ Yapı Strüktürü & Betonarme:</strong>
                <br />
                En son deprem yönetmeliğine uygun, deprem yük katsayıları hesaplanmış radye jeneral temel sistemi. İmalatta yüksek dayanımlı <span className="font-semibold text-indigo-700">C30/35 Hazır Beton</span> ve nervürlü demir donatılarla taşıyıcı karkas yapımı. Temel altı membran bohçalama su yalıtımı ve çevre drenajı standarttır.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">🧱 Bölücü Duvarlar & Kaba Yapı:</strong>
                <br />
                Kat bölücü ve dış cephe duvarlarında yüksek ısı ve ses yalıtımlı Kilsan marka kilitli tuğlalar. İç mekanda kaba kara sıva üzeri pürüzsüz saten alçı sıva ve Jotun/Marshall su bazlı antibakteriyel iç boya uygulaması.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">🌡️ Cephe Yalıtımı (Mantolama):</strong>
                <br />
                Isı yalıtım levhaları ile mantolanan karkas cephe elemanları. <span className="font-semibold text-slate-900">Minimum 5 cm kalınlığında Karbonlu EPS mantolama</span>, dış cephe dekoratif kaplamaları ve silikon esaslı nefes alan dış cephe boyası.
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900 font-semibold">🪟 İç & Dış Doğramalar:</strong>
                <br />
                Pimapen, Fıratpen veya Adopen marka PVC pencereler (70'lik seri, çift contalı). Tüm camlar <span className="font-semibold text-slate-900">Isıcam Konfor</span> serisi sinerji özellikli argon gazlı çift cam olacaktır. Monoblok kilitli 1. Sınıf çelik daire kapısı ve ahşap görünümlü lake kapılar.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">🛋️ İç Mekan Kaplamaları:</strong>
                <br />
                Giriş holleri ve mutfak banyo zeminleri 1. sınıf Çanakkale/Ege Seramik. Salon ve yatak odalarında derzli AGT/Çamsan laminat parke. Vitra/Serel asma klozetler, gömme rezervuarlar ve E.C.A. bataryalar ile lüks banyo donanımları.
              </p>
              <p>
                <strong className="text-slate-900 font-semibold">⚙️ Tesisat & Ortak Alanlar:</strong>
                <br />
                Doğalgaz kombili bireysel kalorifer tesisatı ve panel radyatörler. Audio marka renkli görüntülü diafon altyapısı. <span className="font-semibold text-slate-900">TSE ve CE standartlarına uygun</span> tam otomatik paslanmaz çelik kabinli kat kurtaran sistemli asansör.
              </p>
            </div>
          </div>
        </div>

        {/* Table 1: Hak Sahipleri Özet */}
        <h4 className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>1. Hak Sahipleri Ödeme ve Borçlandırma Özeti</span>
        </h4>
        <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 border-b border-slate-200 font-semibold">Daire & Kat No</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Hak Sahibi & TC</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Özellikler (Oda / Alan)</th>
                <th className="p-3 border-b border-slate-200 font-semibold">Daire İmalat Bedeli</th>
                {isContractorShareModel ? (
                  <>
                    <th className="p-3 border-b border-slate-200 font-semibold">Kat Karşılığı İndirimi</th>
                    <th className="p-3 border-b border-slate-200 font-semibold text-indigo-700">Net Malik Borcu</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 border-b border-slate-200 font-semibold">Ödenen Peşinat</th>
                    <th className="p-3 border-b border-slate-200 font-semibold">Dönüşüm Desteği</th>
                    <th className="p-3 border-b border-slate-200 font-semibold text-indigo-700">Kalan Öz Kaynak</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.flatResults.map((flat) => {
                const isContractor = flat.isContractorShare;
                // Calculate approximate floor based on flat id and average flats per floor
                const totalFlats = results.flatCount || 10;
                const totalFloors = params.floorCount || 5;
                const flatsPerFloor = Math.max(1, Math.ceil(totalFlats / totalFloors));
                const floorNo = Math.min(totalFloors, Math.ceil(flat.id / flatsPerFloor));
                
                // Determine room count
                const roomCountText = params.roomType ? `${params.roomType} Oda` : (flat.area < 65 ? '1+1 Oda' : flat.area < 95 ? '2+1 Oda' : flat.area < 135 ? '3+1 Oda' : '4+1 Oda');
                
                return (
                  <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>Daire {flat.id}</div>
                      <div className="text-[10px] text-indigo-600 font-normal">
                        {floorNo}. Kat / {totalFloors} Kat
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{flat.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">TC: {flat.tc}</div>
                    </td>
                    <td className="p-3 text-slate-700">
                      <div className="font-semibold text-slate-800">{roomCountText}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Brüt: {physicalGrossArea} m² <span className="text-[9px] text-slate-400 font-normal">(Pay: {flat.area} m²)</span> | Net: {physicalNetArea} m²
                      </div>
                    </td>
                    <td className="p-3 text-slate-900 font-mono">
                      {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    {isContractorShareModel ? (
                      <>
                        <td className="p-3 text-emerald-700 font-semibold font-mono">
                          -{flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          <span className="block text-[9px] text-slate-500 font-normal">
                            {isContractor ? "Müteahhit Payı Satış" : "Arsa Payı Mahsubu"}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-800 font-mono bg-emerald-50/40">
                          0 TL
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-slate-600 font-mono">
                          -{flat.downPayment.toLocaleString('tr-TR')} TL
                        </td>
                        <td className="p-3 text-indigo-700 font-mono">
                          -{flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                        <td className="p-3 font-bold text-slate-900 font-mono bg-indigo-50/20">
                          {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table 2: Hakediş ve Ödeme Takvimi */}
        <h4 className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            {params.paymentPlanType === 'installments' ? (
              <Calendar className="w-4 h-4 text-emerald-600" />
            ) : params.paymentPlanType === 'hybrid' ? (
              <Sparkles className="w-4 h-4 text-purple-600" />
            ) : (
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
            )}
            <span>
              2.{' '}
              {params.paymentPlanType === 'installments'
                ? `Aylık Eşit Taksitli Ödeme Takvimi (${params.installmentCount || 12} Ay Vadeli)`
                : params.paymentPlanType === 'hybrid'
                ? `Karma Ödeme Takvimi (Peşinat + Ara Ödemeler + ${params.installmentCount || 12} Ay Taksit)`
                : `Fiziki İlerleme Hakediş Takvimi (5 Kademeli Aşama)`}
            </span>
          </div>
          <span className="text-[10px] font-normal text-slate-500 font-mono">
            Model:{' '}
            {params.paymentPlanType === 'installments'
              ? 'Taksitli Ödeme'
              : params.paymentPlanType === 'hybrid'
              ? 'Karma (Hibrit)'
              : 'Fiziki Hakediş'}
          </span>
        </h4>
        
        {isContractorShareModel ? (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 leading-relaxed mb-6">
            <h5 className="font-semibold text-emerald-800 text-xs mb-1">
              🤝 Kat Karşılığı Finansman Beyanı:
            </h5>
            <p>
              Kat Karşılığı Yapım Modelinde, tüm yapı tasarım, ruhsat, malzeme ve yapım bedelleri müteahhite devredilen paylardan ({results.flatResults.filter(f => f.isContractorShare).length} adet Müteahhit Dairesi) finanse edilir. Bu nedenle arsa maliklerinin herhangi bir nakit borçlanma yükümlülüğü veya inşaat fiziki ilerlemesine bağlı hakediş ödeme takvimi bulunmamaktadır. Tüm yapım riski ve finansal yönetim AB YAPI tarafından üstlenilmiştir.
            </p>
          </div>
        ) : params.paymentPlanType === 'installments' ? (
          /* SEÇENEK A: SADECE AYLIK TAKSİT TABLOSU GÖSTERİLİR */
          <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Daire Payı Bedeli</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-indigo-700">Ödenen Peşinat</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-emerald-700">Devlet Desteği</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Kalan Net Borç</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-center">Vade</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-emerald-800 bg-emerald-50/50">
                    Aylık Taksit Tutarı
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.flatResults.map((flat) => (
                  <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      Daire {flat.id} ({flat.name})
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {flat.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-700">
                      -{flat.downPayment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                      {flat.usedCredit > 0 ? `-${flat.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">
                      {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {flat.netRemainingDebt > 0 ? `${params.installmentCount || 12} Ay` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-800 font-mono bg-emerald-50/50">
                      {flat.netRemainingDebt > 0
                        ? `${flat.monthlyInstallment.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay`
                        : '0 TL'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                <tr>
                  <td colSpan={4} className="p-3 text-slate-800">
                    PROJE AYLIK TOPLAM ŞANTİYE KASA GİRİŞİ:
                  </td>
                  <td className="p-3 text-right font-mono text-slate-900">
                    {results.flatResults
                      .reduce((sum, f) => sum + f.netRemainingDebt, 0)
                      .toLocaleString('tr-TR', { maximumFractionDigits: 0 })}{' '}
                    TL
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700">
                    {params.installmentCount || 12} Ay
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-800 text-sm bg-emerald-100/60">
                    {(results.totalMonthlyInstallments || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : params.paymentPlanType === 'hybrid' ? (
          /* SEÇENEK B: SADECE KARMA / HİBRİT TABLOSU GÖSTERİLİR */
          <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Net Kalan Borç</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-indigo-700">1. Ara Ödeme (%25 Kaba)</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-purple-700">2. Ara Ödeme (%15 İskân)</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right">Taksitlendirilen Tutar (%60)</th>
                  <th className="p-3 border-b border-slate-200 font-semibold text-right text-emerald-800 bg-emerald-50/50">
                    Aylık Taksit ({params.installmentCount || 12} Ay)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.flatResults.map((flat) => {
                  const interim1 = Math.round(flat.netRemainingDebt * 0.25);
                  const interim2 = Math.round(flat.netRemainingDebt * 0.15);
                  const remainingToInstallments = Math.max(0, flat.netRemainingDebt - interim1 - interim2);
                  const hybridMonthly = Math.round(remainingToInstallments / Math.max(1, params.installmentCount || 12));

                  return (
                    <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        Daire {flat.id} ({flat.name})
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">
                        {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right text-indigo-700 font-mono">
                        {interim1.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right text-purple-700 font-mono">
                        {interim2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                        {remainingToInstallments.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800 font-mono bg-emerald-50/50">
                        {flat.netRemainingDebt > 0 ? `${hybridMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL / Ay` : '0 TL'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* SEÇENEK C: SADECE 5 KADEMELİ FİZİKİ HAKEDİŞ TABLOSU GÖSTERİLİR */
          <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-semibold">Daire / Malik</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">1. Aşama (%{params.stage1Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">2. Aşama (%{params.stage2Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">3. Aşama (%{params.stage3Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">4. Aşama (%{params.stage4Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">5. Aşama (%{params.stage5Pay})</th>
                  <th className="p-3 border-b border-slate-200 font-semibold">Toplam Malik Borcu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.flatResults.map((flat) => (
                  <tr key={flat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      Daire {flat.id} ({flat.name})
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      {flat.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      {flat.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      {flat.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 font-semibold text-indigo-700 font-mono">
                      {flat.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      {flat.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                    <td className="p-3 font-bold text-slate-900 font-mono">
                      {flat.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notice Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed mb-8">
          <h5 className="font-semibold text-amber-800 text-xs mb-1">
            📌 Önemli Bilgilendirme ve Teslim Koşulları:
          </h5>
          <p>
            Yukarıda belirtilen proje süresine mimari, statik ve altyapı projelerinin hazırlanması, ilgili belediyeden yapı ruhsatı alma ve inşaat bitimi yapı kullanım izin belgesi (iskân) onay süreçleri dahildir. İnşaat imalatı süresince olumsuz hava koşulları, resmi kurum onay/vize süreçlerindeki gecikmeler veya altyapı sağlayıcı kurumlardan (İSKİ, İGDAŞ, BEDAŞ vb.) kaynaklanan firmamız kontrolü dışındaki gecikmeler proje teslim süresine ilave edilir.
          </p>
        </div>

        {/* Signature Blocks */}
        <div className="flex justify-between pt-6 px-6 text-xs text-slate-700">
          <div className="text-center">
            <p className="font-semibold mb-1 text-slate-900">MÜŞTERİ / KAT MALİKİ İMZA</p>
            <p className="text-[11px] text-slate-500 mb-10 leading-tight">Kat Maliki / Hak Sahibi</p>
            <p className="text-slate-400">.... / .... / 2026</p>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-1 text-slate-900">YÜKLENİCİ İMZA / KAŞE</p>
            <p className="text-[11px] text-slate-500 mb-10 leading-tight">
              {profile.legalName}
              {profile.authorizedPerson ? <><br />Yetkili: {profile.authorizedPerson}</> : null}
            </p>
            <p className="text-slate-400">.... / .... / 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
