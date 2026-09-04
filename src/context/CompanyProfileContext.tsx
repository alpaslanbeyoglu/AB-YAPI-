import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanyProfile } from '../types';

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'AB YAPI',
  legalName: 'AB YAPI MÜTEAHHİTLİK LİMİTED ŞİRKETİ',
  slogan: 'Güvene Yükselen Yapılar',
  tagline: 'Kentsel Dönüşüm & Danışmanlık',
  authorizedPerson: 'Müh. Alpaslan Beyoğlu',
  authorizedTitle: 'Müteahhit / Genel Müdür',
  phone: '+90 (212) 585 10 20',
  email: 'info@abyapi.com.tr',
  website: 'www.abyapi.com.tr',
  address: 'Fatih Kocamustafapaşa Mah. İstanbul',
  taxOffice: 'Fatih V.D.',
  taxNumber: '0010523491',
  tradeRegistryNo: 'İTO-412580',
  mersisNo: '0001052349100012',
  iban: 'TR42 0001 0002 1234 5678 9050 01',
  bankName: 'Ziraat Bankası A.Ş.',
  logoBase64: '',
};

const STORAGE_KEY = 'ab_yapi_company_profile';

interface CompanyProfileContextType {
  profile: CompanyProfile;
  updateProfile: (updated: Partial<CompanyProfile>) => void;
  setLogo: (base64: string) => void;
  removeLogo: () => void;
  resetToDefault: () => void;
  importProfile: (imported: CompanyProfile) => void;
}

const CompanyProfileContext = createContext<CompanyProfileContextType>({
  profile: DEFAULT_COMPANY_PROFILE,
  updateProfile: () => {},
  setLogo: () => {},
  removeLogo: () => {},
  resetToDefault: () => {},
  importProfile: () => {},
});

export const CompanyProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_COMPANY_PROFILE,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Firma profili tarayıcı hafızasından okunurken hata oluştu:', e);
    }
    return DEFAULT_COMPANY_PROFILE;
  });

  const saveToStorage = (newProfile: CompanyProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.error('Firma profili localStorage kaydedilemedi:', e);
    }
  };

  const updateProfile = (updated: Partial<CompanyProfile>) => {
    const next = { ...profile, ...updated };
    saveToStorage(next);
  };

  const setLogo = (base64: string) => {
    const next = { ...profile, logoBase64: base64 };
    saveToStorage(next);
  };

  const removeLogo = () => {
    const next = { ...profile, logoBase64: '' };
    saveToStorage(next);
  };

  const resetToDefault = () => {
    saveToStorage(DEFAULT_COMPANY_PROFILE);
  };

  const importProfile = (imported: CompanyProfile) => {
    const merged = { ...DEFAULT_COMPANY_PROFILE, ...imported };
    saveToStorage(merged);
  };

  return (
    <CompanyProfileContext.Provider
      value={{
        profile,
        updateProfile,
        setLogo,
        removeLogo,
        resetToDefault,
        importProfile,
      }}
    >
      {children}
    </CompanyProfileContext.Provider>
  );
};

export const useCompanyProfile = () => {
  return useContext(CompanyProfileContext);
};
