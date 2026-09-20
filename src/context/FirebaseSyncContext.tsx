import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { SavedProjectData, CompanyProfile } from '../types';

export interface LicenseInfo {
  email: string;
  status: 'active' | 'suspended';
  expiresAt: string; // ISO String
  name?: string;
  company?: string;
  createdAt: string;
}

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

interface FirebaseSyncContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsAdmin: (passcode: string) => boolean;
  signOut: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  // Projects sync
  saveProjectToCloud: (project: SavedProjectData) => Promise<void>;
  loadProjectsFromCloud: () => Promise<SavedProjectData[]>;
  deleteProjectFromCloud: (projectAddress: string) => Promise<void>;
  // Company profiles sync
  saveCompanyProfileToCloud: (profile: CompanyProfile) => Promise<void>;
  loadCompanyProfilesFromCloud: () => Promise<CompanyProfile[]>;
  deleteCompanyProfileToCloud: (companyName: string) => Promise<void>;
  
  // Licensing & SaaS
  isLicensed: boolean;
  licenseLoading: boolean;
  licenseInfo: LicenseInfo | null;
  isAdmin: boolean;
  getAllLicenses: () => Promise<LicenseInfo[]>;
  createOrUpdateLicense: (license: LicenseInfo) => Promise<void>;
  deleteLicense: (email: string) => Promise<void>;
}

const FirebaseSyncContext = createContext<FirebaseSyncContextType | null>(null);

export const getSafeProjectKey = (address: string) => {
  return (address || 'default_project').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
};

export const getSafeProfileKey = (name: string) => {
  return (name || 'default_profile').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
};

/**
 * Recursively cleans and removes `undefined` properties or converts `undefined` array items to null
 * so Firestore setDoc / updateDoc operations never throw "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (item === undefined) return null;
      return sanitizeForFirestore(item);
    }) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

export const FirebaseSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem('ab_yapi_auth_session');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Failed to load cached auth session:", e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Licensing States
  const [isLicensed, setIsLicensed] = useState<boolean>(false);
  const [licenseLoading, setLicenseLoading] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const isAdmin = user ? (user.email?.toLowerCase() === 'alpaslan.beyoglu@gmail.com') : false;

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(u);
        try {
          localStorage.setItem('ab_yapi_auth_session', JSON.stringify(u));
        } catch (e) {}
      } else {
        // If not in firebase, check if we have a locally saved dev session
        const cached = localStorage.getItem('ab_yapi_auth_session');
        if (!cached) {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Monitor License Status when user changes
  useEffect(() => {
    const checkLicense = async () => {
      if (!user) {
        setIsLicensed(false);
        setLicenseInfo(null);
        return;
      }

      // Admin (Alpaslan) always has active license and bypasses check
      if (user.email === 'alpaslan.beyoglu@gmail.com') {
        setIsLicensed(true);
        setLicenseInfo({
          email: user.email,
          status: 'active',
          expiresAt: '2099-12-31T23:59:59.000Z',
          name: 'Alpaslan Beyoğlu',
          company: 'Admin',
          createdAt: new Date().toISOString()
        });
        return;
      }

      setLicenseLoading(true);
      try {
        const emailLower = user.email ? user.email.toLowerCase().trim() : '';
        const docRef = doc(db, 'licenses', emailLower);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as LicenseInfo;
          const isNotExpired = new Date(data.expiresAt) > new Date();
          const isActive = data.status === 'active';

          if (isActive && isNotExpired) {
            setIsLicensed(true);
            setLicenseInfo(data);
          } else {
            setIsLicensed(false);
            setLicenseInfo(data);
          }
        } else {
          setIsLicensed(false);
          setLicenseInfo(null);
        }
      } catch (error) {
        console.error("Error checking license:", error);
        setIsLicensed(false);
      } finally {
        setLicenseLoading(false);
      }
    };

    checkLicense();
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  const signInAsAdmin = (passcode: string): boolean => {
    // Admin Master Access for Alpaslan Beyoğlu
    if (passcode.trim() === '1987' || passcode.trim().toLowerCase() === 'admin' || passcode.trim() === 'ab2026') {
      const adminUser: AuthUser = {
        uid: 'admin_alpaslan_beyoglu',
        email: 'alpaslan.beyoglu@gmail.com',
        displayName: 'Alpaslan Beyoğlu',
        photoURL: null
      };
      setUser(adminUser);
      setIsLicensed(true);
      setLicenseInfo({
        email: 'alpaslan.beyoglu@gmail.com',
        status: 'active',
        expiresAt: '2099-12-31T23:59:59.000Z',
        name: 'Alpaslan Beyoğlu',
        company: 'AB Yapı Yönetim',
        createdAt: new Date().toISOString()
      });
      try {
        localStorage.setItem('ab_yapi_auth_session', JSON.stringify(adminUser));
      } catch (e) {}
      return true;
    }
    return false;
  };

  const signOut = async () => {
    try {
      try {
        localStorage.removeItem('ab_yapi_auth_session');
      } catch (e) {}
      setUser(null);
      setIsLicensed(false);
      setLicenseInfo(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };

  // Pushes a single project and its associated construction state to the cloud
  const saveProjectToCloud = async (project: SavedProjectData) => {
    if (!user || !isLicensed) return;
    setSyncStatus('syncing');
    try {
      const safeKey = getSafeProjectKey(project.projectAddress);
      
      // Attempt to load associated construction progress details from localStorage to bundle them
      let construction: any = null;
      try {
        const stages = localStorage.getItem(`ab_yapi_progress_${safeKey}_stages`);
        const logs = localStorage.getItem(`ab_yapi_progress_${safeKey}_logs`);
        const offerAccepted = localStorage.getItem(`ab_yapi_progress_${safeKey}_offer_accepted`);
        const contractDate = localStorage.getItem(`ab_yapi_progress_${safeKey}_contract_date`);
        const targetDate = localStorage.getItem(`ab_yapi_progress_${safeKey}_target_date`);
        const subcontractors = localStorage.getItem(`ab_yapi_progress_${safeKey}_subcontractors`);
        const notifHistory = localStorage.getItem(`ab_yapi_progress_${safeKey}_notif_history`);

        construction = {
          stages: stages ? JSON.parse(stages) : null,
          logs: logs ? JSON.parse(logs) : null,
          isOfferAccepted: offerAccepted ? JSON.parse(offerAccepted) : null,
          contractDate: contractDate || null,
          plannedCompletionDate: targetDate || null,
          subcontractors: subcontractors ? JSON.parse(subcontractors) : null,
          notifHistory: notifHistory ? JSON.parse(notifHistory) : null
        };
      } catch (err) {
        console.warn("Failed to gather construction states for cloud sync:", err);
      }

      const docRef = doc(db, 'users', user.uid, 'projects', safeKey);
      const payload = sanitizeForFirestore({
        id: safeKey,
        version: project.version || '1.0.0',
        savedAt: project.savedAt || new Date().toISOString(),
        projectAddress: project.projectAddress || 'Varsayılan Proje',
        params: project.params || {},
        results: project.results || {},
        construction: construction || null
      });

      await setDoc(docRef, payload, { merge: true });

      setSyncStatus('synced');
    } catch (error) {
      console.error("Error saving project to cloud:", error);
      setSyncStatus('error');
      throw error;
    }
  };

  // Loads all projects from cloud and hydrates localStorage to preserve app state
  const loadProjectsFromCloud = async (): Promise<SavedProjectData[]> => {
    if (!user || !isLicensed) return [];
    setSyncStatus('syncing');
    try {
      const colRef = collection(db, 'users', user.uid, 'projects');
      const snapshot = await getDocs(colRef);
      const cloudProjects: SavedProjectData[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const project: SavedProjectData = {
          version: data.version,
          savedAt: data.savedAt,
          projectAddress: data.projectAddress,
          params: data.params,
          results: data.results
        };
        cloudProjects.push(project);

        // Hydrate local storage for construction trackers belonging to this project
        if (data.construction) {
          const safeKey = docSnapshot.id;
          const { stages, logs, isOfferAccepted, contractDate, plannedCompletionDate, subcontractors, notifHistory } = data.construction;
          
          if (stages) localStorage.setItem(`ab_yapi_progress_${safeKey}_stages`, JSON.stringify(stages));
          if (logs) localStorage.setItem(`ab_yapi_progress_${safeKey}_logs`, JSON.stringify(logs));
          if (isOfferAccepted !== null) localStorage.setItem(`ab_yapi_progress_${safeKey}_offer_accepted`, JSON.stringify(isOfferAccepted));
          if (contractDate) localStorage.setItem(`ab_yapi_progress_${safeKey}_contract_date`, contractDate);
          if (plannedCompletionDate) localStorage.setItem(`ab_yapi_progress_${safeKey}_target_date`, plannedCompletionDate);
          if (subcontractors) localStorage.setItem(`ab_yapi_progress_${safeKey}_subcontractors`, JSON.stringify(subcontractors));
          if (notifHistory) localStorage.setItem(`ab_yapi_progress_${safeKey}_notif_history`, JSON.stringify(notifHistory));
        }
      });

      // Sort by savedAt descending
      cloudProjects.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

      setSyncStatus('synced');
      return cloudProjects;
    } catch (error) {
      console.error("Error loading projects from cloud:", error);
      setSyncStatus('error');
      throw error;
    }
  };

  const deleteProjectFromCloud = async (projectAddress: string) => {
    if (!user || !isLicensed) return;
    setSyncStatus('syncing');
    try {
      const safeKey = getSafeProjectKey(projectAddress);
      const docRef = doc(db, 'users', user.uid, 'projects', safeKey);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (error) {
      console.error("Error deleting project from cloud:", error);
      setSyncStatus('error');
      throw error;
    }
  };

  const saveCompanyProfileToCloud = async (profile: CompanyProfile) => {
    if (!user || !isLicensed) return;
    setSyncStatus('syncing');
    try {
      const safeKey = getSafeProfileKey(profile.companyName);
      const docRef = doc(db, 'users', user.uid, 'companyProfiles', safeKey);
      const payload = sanitizeForFirestore(profile);
      await setDoc(docRef, payload, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      console.error("Error saving company profile to cloud:", error);
      setSyncStatus('error');
      throw error;
    }
  };

  const loadCompanyProfilesFromCloud = async (): Promise<CompanyProfile[]> => {
    if (!user || !isLicensed) return [];
    setSyncStatus('syncing');
    try {
      const colRef = collection(db, 'users', user.uid, 'companyProfiles');
      const snapshot = await getDocs(colRef);
      const profiles: CompanyProfile[] = [];

      snapshot.forEach((docSnapshot) => {
        profiles.push(docSnapshot.data() as CompanyProfile);
      });

      setSyncStatus('synced');
      return profiles;
    } catch (error) {
      console.error("Error loading company profiles from cloud:", error);
      setSyncStatus('error');
      throw error;
    }
  };

  const deleteCompanyProfileToCloud = async (companyName: string) => {
    if (!user || !isLicensed) return;
    setSyncStatus('syncing');
    try {
      const safeKey = getSafeProfileKey(companyName);
      const docRef = doc(db, 'users', user.uid, 'companyProfiles', safeKey);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (error) {
      console.error("Error deleting company profile from cloud:", error);
      setSyncStatus('error');
      throw error;
    }
  };

  // Admin Licensing Operations
  const getAllLicenses = async (): Promise<LicenseInfo[]> => {
    if (!isAdmin) return [];
    try {
      const colRef = collection(db, 'licenses');
      const snapshot = await getDocs(colRef);
      const licenses: LicenseInfo[] = [];
      snapshot.forEach((docSnapshot) => {
        licenses.push(docSnapshot.data() as LicenseInfo);
      });
      return licenses;
    } catch (error) {
      console.error("Error loading all licenses:", error);
      throw error;
    }
  };

  const createOrUpdateLicense = async (licenseData: LicenseInfo) => {
    if (!isAdmin) return;
    try {
      const emailLower = licenseData.email.toLowerCase().trim();
      const docRef = doc(db, 'licenses', emailLower);
      const payload = sanitizeForFirestore({
        ...licenseData,
        email: emailLower
      });
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      console.error("Error updating license:", error);
      throw error;
    }
  };

  const deleteLicense = async (email: string) => {
    if (!isAdmin) return;
    try {
      const emailLower = email.toLowerCase().trim();
      const docRef = doc(db, 'licenses', emailLower);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting license:", error);
      throw error;
    }
  };

  return (
    <FirebaseSyncContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signInAsAdmin,
      signOut,
      syncStatus,
      saveProjectToCloud,
      loadProjectsFromCloud,
      deleteProjectFromCloud,
      saveCompanyProfileToCloud,
      loadCompanyProfilesFromCloud,
      deleteCompanyProfileToCloud,
      
      // Licensing & Admin
      isLicensed,
      licenseLoading,
      licenseInfo,
      isAdmin,
      getAllLicenses,
      createOrUpdateLicense,
      deleteLicense
    }}>
      {children}
    </FirebaseSyncContext.Provider>
  );
};

export const useFirebaseSync = () => {
  const context = useContext(FirebaseSyncContext);
  if (!context) {
    throw new Error('useFirebaseSync must be used within a FirebaseSyncProvider');
  }
  return context;
};
