import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'compact';
  theme?: 'light' | 'dark';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'dark',
  className = '',
}) => {
  // Dimensions for the icon mark
  const iconSizes = {
    sm: { w: 32, h: 32, box: 'w-8 h-8' },
    md: { w: 42, h: 42, box: 'w-10 h-10' },
    lg: { w: 56, h: 56, box: 'w-14 h-14' },
    xl: { w: 84, h: 84, box: 'w-20 h-20' },
  };

  const selectedSize = iconSizes[size];
  const isDark = theme === 'dark';

  const markSvg = (
    <svg
      viewBox="0 0 160 190"
      className={`${selectedSize.box} shrink-0 drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Left Tower Gradients */}
        <linearGradient id="logoLeftFront" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="logoLeftSide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="logoLeftRoof" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Center Tower Gradients (Teal) */}
        <linearGradient id="logoCenterFront" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#148995" />
          <stop offset="100%" stopColor="#0f6e77" />
        </linearGradient>
        <linearGradient id="logoCenterSide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0a535a" />
          <stop offset="100%" stopColor="#06383d" />
        </linearGradient>
        <linearGradient id="logoCenterRoof" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#17a2b0" />
          <stop offset="100%" stopColor="#25c6d6" />
        </linearGradient>

        {/* Right Tower Gradients (Amber) */}
        <linearGradient id="logoRightFront" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="logoRightSide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="logoRightRoof" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
      </defs>

      {/* LEFT TOWER (Prism 1) */}
      <g>
        {/* Left facet */}
        <path d="M 12 70 L 12 170 L 32 178 L 32 62 Z" fill="url(#logoLeftFront)" />
        {/* Right facet */}
        <path d="M 32 62 L 32 178 L 52 170 L 52 70 Z" fill="url(#logoLeftSide)" />
        {/* Angled Roof */}
        <path d="M 12 70 L 32 54 L 52 70 L 32 62 Z" fill="url(#logoLeftRoof)" />
      </g>

      {/* CENTER TOWER (Prism 2 - Tallest) */}
      <g>
        {/* Left facet */}
        <path d="M 58 35 L 58 170 L 88 182 L 88 24 Z" fill="url(#logoCenterFront)" />
        {/* Right facet */}
        <path d="M 88 24 L 88 182 L 118 170 L 118 35 Z" fill="url(#logoCenterSide)" />
        {/* Angled Roof Peak */}
        <path d="M 58 35 L 88 14 L 118 35 L 88 24 Z" fill="url(#logoCenterRoof)" />
      </g>

      {/* RIGHT TOWER (Prism 3) */}
      <g>
        {/* Left facet */}
        <path d="M 124 70 L 124 170 L 144 178 L 144 62 Z" fill="url(#logoRightFront)" />
        {/* Right facet */}
        <path d="M 144 62 L 144 178 L 164 170 L 164 70 Z" fill="url(#logoRightSide)" />
        {/* Angled Roof */}
        <path d="M 124 70 L 144 54 L 164 70 L 144 62 Z" fill="url(#logoRightRoof)" />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {markSvg}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {markSvg}
        <div className="leading-none">
          <span
            className={`font-black tracking-tight ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
            } ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            AB YAPI
          </span>
          <span
            className={`block font-mono tracking-widest text-[8px] uppercase mt-0.5 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}
          >
            İnşaat
          </span>
        </div>
      </div>
    );
  }

  // Full Variant with Motto
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {markSvg}
      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight ${
              size === 'sm'
                ? 'text-base'
                : size === 'lg'
                ? 'text-2xl'
                : size === 'xl'
                ? 'text-3xl'
                : 'text-lg sm:text-xl'
            } ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            AB YAPI
          </span>
          <span
            className={`hidden sm:inline-block px-2 py-0.5 text-[9px] font-semibold rounded-full border ${
              isDark
                ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            Kentsel Dönüşüm & Mühendislik
          </span>
        </div>
        <span
          className={`font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-bold mt-0.5 ${
            isDark ? 'text-teal-400/90' : 'text-teal-700'
          }`}
        >
          Güvene Yükselen Yapılar
        </span>
      </div>
    </div>
  );
};
