import React, { createContext, useContext, useState } from 'react';
import { CompanyProfile, CompanyProfilePrintOptions } from '../types';

export const DEFAULT_PRINT_OPTIONS: CompanyProfilePrintOptions = {
  showLogo: true,
  showLegalName: true,
  showSlogan: true,
  showTagline: true,
  showTaxInfo: true,
  showTradeRegistry: true,
  showMersis: true,
  showContractorLicence: true,
  showChamberNo: true,
  showFirstAuthorized: true,
  showFirstAuthorizedChamber: true,
  showSecondAuthorized: true,
  showSecondAuthorizedChamber: true,
  showStamp: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showAddress: true,
  showBankInfo: true,
};

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'AB YAPI',
  legalName: 'AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ.',
  slogan: 'Depreme Dayanıklı, Güvenli ve Modern Yaşam Alanları',
  tagline: 'Kentsel Dönüşüm, Statik & Mimari Mühendislik, Kat Karşılığı Projeler',
  authorizedPerson: 'Müh. Alpaslan Beyoğlu',
  authorizedTitle: 'Genel Müdür / İnşaat Mühendisi',
  authorizedChamberNo: 'İMO-74120',
  authorizedPerson2: 'Mimar Zeynep Kaya',
  authorizedTitle2: 'Şantiye Şefi / Mimar',
  authorizedChamberNo2: 'MO-55210',
  phone: '+90 (212) 585 10 20',
  email: 'info@abyapi.com.tr',
  website: 'www.abyapi.com.tr',
  address: 'Kocamustafapaşa Mah. Orgeneral Abdurrahman Nafiz Gürman Cad. No:42 Fatih / İSTANBUL',
  taxOffice: 'Fatih Vergi Dairesi',
  taxNumber: '0010523491',
  tradeRegistryNo: 'İTO-412580',
  mersisNo: '0001052349100012',
  contractorLicenceNo: 'YAMBİS: 0034125890',
  chamberNo: 'İTO Sicil No: 412580',
  iban: 'TR42 0001 0002 1234 5678 9050 01',
  bankName: 'T.C. Ziraat Bankası A.Ş. (Fatih Şubesi)',
  logoBase64: '',
  stampBase64: '',
  printOptions: DEFAULT_PRINT_OPTIONS,
};

const STORAGE_KEY = 'ab_yapi_company_profile';

interface CompanyProfileContextType {
  profile: CompanyProfile;
  updateProfile: (updated: Partial<CompanyProfile>) => void;
  updatePrintOptions: (updatedOptions: Partial<CompanyProfilePrintOptions>) => void;
  togglePrintOption: (key: keyof CompanyProfilePrintOptions) => void;
  setLogo: (base64: string) => void;
  removeLogo: () => void;
  setStamp: (base64: string) => void;
  removeStamp: () => void;
  resetToDefault: () => void;
  importProfile: (imported: CompanyProfile) => void;
}

const CompanyProfileContext = createContext<CompanyProfileContextType>({
  profile: DEFAULT_COMPANY_PROFILE,
  updateProfile: () => {},
  updatePrintOptions: () => {},
  togglePrintOption: () => {},
  setLogo: () => {},
  removeLogo: () => {},
  setStamp: () => {},
  removeStamp: () => {},
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
          printOptions: {
            ...DEFAULT_PRINT_OPTIONS,
            ...(parsed.printOptions || {}),
          },
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
    const next: CompanyProfile = {
      ...profile,
      ...updated,
      printOptions: {
        ...DEFAULT_PRINT_OPTIONS,
        ...(profile.printOptions || {}),
        ...(updated.printOptions || {}),
      },
    };
    saveToStorage(next);
  };

  const updatePrintOptions = (updatedOptions: Partial<CompanyProfilePrintOptions>) => {
    const nextOptions: CompanyProfilePrintOptions = {
      ...DEFAULT_PRINT_OPTIONS,
      ...(profile.printOptions || {}),
      ...updatedOptions,
    };
    updateProfile({ printOptions: nextOptions });
  };

  const togglePrintOption = (key: keyof CompanyProfilePrintOptions) => {
    const currentOptions = profile.printOptions || DEFAULT_PRINT_OPTIONS;
    const currentVal = currentOptions[key] !== false; // Default true
    updatePrintOptions({ [key]: !currentVal });
  };

  const setLogo = (base64: string) => {
    const next = { ...profile, logoBase64: base64 };
    saveToStorage(next);
  };

  const removeLogo = () => {
    const next = { ...profile, logoBase64: '' };
    saveToStorage(next);
  };

  const setStamp = (base64: string) => {
    const next = { ...profile, stampBase64: base64 };
    saveToStorage(next);
  };

  const removeStamp = () => {
    const next = { ...profile, stampBase64: '' };
    saveToStorage(next);
  };

  const resetToDefault = () => {
    saveToStorage(DEFAULT_COMPANY_PROFILE);
  };

  const importProfile = (imported: CompanyProfile) => {
    const merged: CompanyProfile = {
      ...DEFAULT_COMPANY_PROFILE,
      ...imported,
      printOptions: {
        ...DEFAULT_PRINT_OPTIONS,
        ...(imported.printOptions || {}),
      },
    };
    saveToStorage(merged);
  };

  return (
    <CompanyProfileContext.Provider
      value={{
        profile,
        updateProfile,
        updatePrintOptions,
        togglePrintOption,
        setLogo,
        removeLogo,
        setStamp,
        removeStamp,
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

