import React, { createContext, useContext, useState, useEffect } from 'react';
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
  showSecondAuthorized: false,
  showSecondAuthorizedChamber: false,
  showStamp: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showAddress: true,
  showBankInfo: true,
  showFloorAndFacade: true,
  showLandShareAndSerefiye: true,
};

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'AB YAPI',
  legalName: 'AB YAPI MÜTEAHHİTLİK VE MÜHENDİSLİK TİC. LTD. ŞTİ.',
  slogan: 'Depreme Dayanıklı, Güvenli ve Modern Yaşam Alanları',
  tagline: 'Kentsel Dönüşüm, Statik & Mimari Mühendislik, Kat Karşılığı Projeler',
  authorizedPerson: 'Müh. Alpaslan Beyoğlu',
  authorizedTitle: 'Genel Müdür / İnşaat Mühendisi',
  authorizedChamberNo: 'İMO-74120',
  authorizedPerson2: '',
  authorizedTitle2: '',
  authorizedChamberNo2: '',
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
const LIST_STORAGE_KEY = 'ab_yapi_company_profiles_list';

interface CompanyProfileContextType {
  profile: CompanyProfile;
  profiles: CompanyProfile[];
  updateProfile: (updated: Partial<CompanyProfile>) => void;
  updatePrintOptions: (updatedOptions: Partial<CompanyProfilePrintOptions>) => void;
  togglePrintOption: (key: keyof CompanyProfilePrintOptions) => void;
  setLogo: (base64: string) => void;
  removeLogo: () => void;
  setStamp: (base64: string) => void;
  removeStamp: () => void;
  resetToDefault: () => void;
  importProfile: (imported: CompanyProfile) => void;
  
  // Multi-profile Management
  switchProfile: (companyName: string) => void;
  createNewProfile: (newProfile: CompanyProfile) => void;
  deleteProfile: (companyName: string) => void;
}

const CompanyProfileContext = createContext<CompanyProfileContextType>({
  profile: DEFAULT_COMPANY_PROFILE,
  profiles: [DEFAULT_COMPANY_PROFILE],
  updateProfile: () => {},
  updatePrintOptions: () => {},
  togglePrintOption: () => {},
  setLogo: () => {},
  removeLogo: () => {},
  setStamp: () => {},
  removeStamp: () => {},
  resetToDefault: () => {},
  importProfile: () => {},
  switchProfile: () => {},
  createNewProfile: () => {},
  deleteProfile: () => {},
});

export const CompanyProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initialize Active Profile
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

  // 2. Initialize Profiles List
  const [profiles, setProfiles] = useState<CompanyProfile[]>(() => {
    try {
      const storedList = localStorage.getItem(LIST_STORAGE_KEY);
      if (storedList) {
        const parsedList = JSON.parse(storedList);
        if (Array.isArray(parsedList) && parsedList.length > 0) {
          return parsedList;
        }
      }
    } catch (e) {
      console.warn('Firma profilleri listesi tarayıcı hafızasından okunurken hata oluştu:', e);
    }
    return [DEFAULT_COMPANY_PROFILE];
  });

  // Keep them synced if the list doesn't contain the loaded profile
  useEffect(() => {
    const exists = profiles.some(p => p.companyName === profile.companyName);
    if (!exists) {
      const updatedList = [...profiles, profile];
      setProfiles(updatedList);
      try {
        localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {}
    }
  }, [profile, profiles]);

  // Helper to save both state
  const saveAndSync = (updatedActive: CompanyProfile, updatedList: CompanyProfile[]) => {
    setProfile(updatedActive);
    setProfiles(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActive));
      localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Firma profilleri kaydedilemedi:', e);
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

    // Update in profiles array by matching the old companyName of the active profile
    const updatedList = profiles.map(p => p.companyName === profile.companyName ? next : p);
    if (!profiles.some(p => p.companyName === profile.companyName)) {
      updatedList.push(next);
    }

    saveAndSync(next, updatedList);
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
    const currentVal = currentOptions[key] !== false;
    updatePrintOptions({ [key]: !currentVal });
  };

  const setLogo = (base64: string) => {
    updateProfile({ logoBase64: base64 });
  };

  const removeLogo = () => {
    updateProfile({ logoBase64: '' });
  };

  const setStamp = (base64: string) => {
    updateProfile({ stampBase64: base64 });
  };

  const removeStamp = () => {
    updateProfile({ stampBase64: '' });
  };

  const resetToDefault = () => {
    const updatedList = profiles.map(p => p.companyName === profile.companyName ? DEFAULT_COMPANY_PROFILE : p);
    saveAndSync(DEFAULT_COMPANY_PROFILE, updatedList);
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
    const updatedList = profiles.map(p => p.companyName === profile.companyName ? merged : p);
    if (!profiles.some(p => p.companyName === profile.companyName)) {
      updatedList.push(merged);
    }
    saveAndSync(merged, updatedList);
  };

  // Multi-profile Management functions
  const switchProfile = (companyName: string) => {
    const target = profiles.find(p => p.companyName === companyName);
    if (target) {
      saveAndSync(target, profiles);
    }
  };

  const createNewProfile = (newProf: CompanyProfile) => {
    // Uniqueness boundary check
    const exists = profiles.some(p => p.companyName.trim().toLowerCase() === newProf.companyName.trim().toLowerCase());
    if (exists) {
      alert(`"${newProf.companyName}" adında bir firma zaten mevcut! Lütfen farklı bir isim giriniz.`);
      return;
    }
    const updatedList = [...profiles, newProf];
    saveAndSync(newProf, updatedList);
  };

  const deleteProfile = (companyName: string) => {
    // Size boundary check
    if (profiles.length <= 1) {
      alert("Sistemde en az bir firma profili kalmalıdır! Son firmayı silemezsiniz.");
      return;
    }
    const updatedList = profiles.filter(p => p.companyName !== companyName);
    let nextActive = profile;
    if (profile.companyName === companyName) {
      nextActive = updatedList[0];
    }
    saveAndSync(nextActive, updatedList);
  };

  return (
    <CompanyProfileContext.Provider
      value={{
        profile,
        profiles,
        updateProfile,
        updatePrintOptions,
        togglePrintOption,
        setLogo,
        removeLogo,
        setStamp,
        removeStamp,
        resetToDefault,
        importProfile,
        switchProfile,
        createNewProfile,
        deleteProfile,
      }}
    >
      {children}
    </CompanyProfileContext.Provider>
  );
};

export const useCompanyProfile = () => {
  return useContext(CompanyProfileContext);
};
