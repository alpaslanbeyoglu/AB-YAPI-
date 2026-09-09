import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useCompanyProfile } from '../context/CompanyProfileContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'compact';
  theme?: 'light' | 'gray' | 'dark';
  className?: string;
  customLogo?: string;
  customName?: string;
  customSlogan?: string;
  customTagline?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  className = '',
  customLogo,
  customName,
  customSlogan,
  customTagline,
}) => {
  const { profile } = useCompanyProfile();
  const [imageError, setImageError] = useState(false);

  // Single source of truth from Company Profile
  const activeLogo = customLogo !== undefined ? customLogo : profile?.logoBase64;
  const activeName = customName || profile?.companyName || 'AB YAPI';
  const activeSlogan = customSlogan || profile?.slogan || 'Güvene Yükselen Yapılar';
  const activeTagline = customTagline || profile?.tagline || 'Kentsel Dönüşüm & Danışmanlık';

  // Extract initials dynamically from company name (e.g. "AB YAPI" -> "AB")
  const getInitials = (name: string) => {
    if (!name) return 'AB';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
  };

  const initials = getInitials(activeName);

  // Responsive dimensions
  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-xs', icon: 'w-4 h-4', title: 'text-sm', slogan: 'text-[9px]' },
    md: { box: 'w-10 h-10', text: 'text-sm', icon: 'w-5 h-5', title: 'text-base sm:text-lg', slogan: 'text-[10px]' },
    lg: { box: 'w-12 h-12 sm:w-14 sm:h-14', text: 'text-base sm:text-lg font-black', icon: 'w-6 h-6', title: 'text-xl sm:text-2xl', slogan: 'text-xs' },
    xl: { box: 'w-16 h-16 sm:w-20 sm:h-20', text: 'text-xl sm:text-2xl font-black', icon: 'w-8 h-8', title: 'text-2xl sm:text-3xl', slogan: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const isGray = theme === 'gray';
  const isDark = theme === 'dark';

  // Fallback badge when no logo is uploaded in company profile
  const fallbackBadge = (
    <div
      className={`${currentSize.box} shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black flex items-center justify-center shadow-xs border border-indigo-500/20 select-none`}
    >
      {initials ? (
        <span className={`${currentSize.text} tracking-wider font-mono`}>{initials}</span>
      ) : (
        <Building2 className={currentSize.icon} />
      )}
    </div>
  );

  const markGraphic = activeLogo && !imageError ? (
    <div className={`${currentSize.box} shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white/5`}>
      <img
        src={activeLogo}
        alt={activeName}
        onError={() => setImageError(true)}
        className="w-full h-full object-contain drop-shadow-xs"
        referrerPolicy="no-referrer"
      />
    </div>
  ) : (
    fallbackBadge
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {markGraphic}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {markGraphic}
        <div className="leading-none">
          <span
            className={`font-black tracking-tight ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
            } ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            {activeName}
          </span>
          {activeTagline && (
            <span
              className={`block font-mono tracking-widest text-[8px] uppercase mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}
            >
              {activeTagline}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full Variant with Motto / Slogan
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {markGraphic}
      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight ${currentSize.title} ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {activeName}
          </span>
          {activeTagline && (
            <span
              className={`hidden sm:inline-block px-2 py-0.5 text-[9px] font-semibold rounded-full border ${
                isDark
                  ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                  : isGray
                  ? 'bg-white/80 text-slate-800 border-slate-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              {activeTagline}
            </span>
          )}
        </div>
        {activeSlogan && (
          <span
            className={`hidden sm:block font-mono ${currentSize.slogan} tracking-[0.15em] uppercase font-bold mt-0.5 truncate max-w-[280px] lg:max-w-none ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}
          >
            {activeSlogan}
          </span>
        )}
      </div>
    </div>
  );
};

