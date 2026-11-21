import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  getDoc,
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { SavedProjectData, CompanyProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface LicenseInfo {
  email: string;
  status: 'active' | 'suspended';
  expiresAt: string | Timestamp;
  name?: string;
  company?: string;
  createdAt: string;
}

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

interface FirebaseSyncContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  isAuthInitialized: boolean;
  // Projects sync
  saveProjectToCloud: (project: SavedProjectData) => Promise<void>;
  loadProjectsFromCloud: () => Promise<SavedProjectData[]>;
  deleteProjectFromCloud: (projectAddress: string) => Promise<void>;
  // Company profiles sync
  saveCompanyProfileToCloud: (profile: CompanyProfile) => Promise<void>;
  loadCompanyProfilesFromCloud: () => Promise<CompanyProfile[]>;
  deleteCompanyProfileToCloud: (companyName: string) => Promise<void>;
  
  // Active state sync (for cross-device persistence of the current working project)
  saveActiveStateToCloud: (params: any, buildingModel: any, uiState: any) => Promise<void>;
  loadActiveStateFromCloud: () => Promise<{ params: any; buildingModel: any; uiState: any } | null>;
  
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Licensing States
  const [isLicensed, setIsLicensed] = useState<boolean>(false);
  const [licenseLoading, setLicenseLoading] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const isAdmin = Boolean(user?.emailVerified && user.email?.toLowerCase() === 'alpaslan.beyoglu@gmail.com');

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Auth Changes
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.warn("Redirect sign-in result check:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(u);
      } else {
        setUser(null);
      }
      setIsAuthInitialized(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Monitor License Status when user changes
  useEffect(() => {
    const checkLicense = async () => {
      if (!user) {
        setIsLicensed(false);
        setLicenseLoading(false);
        setLicenseInfo(null);
        return;
      }

      // Only the authenticated, email-verified administrator receives the admin license bypass.
      const userEmail = user.email ? user.email.toLowerCase().trim() : '';
      if (user.emailVerified && userEmail === 'alpaslan.beyoglu@gmail.com') {
        setIsLicensed(true);
        setLicenseLoading(false);
        setLicenseInfo({
          email: userEmail,
          status: 'active',
          expiresAt: '2099-12-31T23:59:59.000Z',
          name: 'AB Yapı Yönetim',
          company: 'Admin',
          createdAt: new Date().toISOString()
        });
        return;
      }

      setLicenseLoading(true);
      try {
        const docRef = doc(db, 'licenses', userEmail);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as LicenseInfo;
          const expiresAtDate = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt);
          const isNotExpired = expiresAtDate > new Date();
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
    const isStandalonePWA =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)')?.matches ||
        (window.navigator as any)?.standalone === true);
    const isMobileDevice =
      typeof navigator !== 'undefined' &&
      /iphone|ipad|ipod|android|mobile|wv/i.test(navigator.userAgent);
    const isEmbedded =
      typeof window !== 'undefined' && window.self !== window.top;

    // Redirect is more reliable than popups in mobile browsers and embedded previews.
    if (isStandalonePWA || isMobileDevice || isEmbedded) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    try {
      setUser(null);
      setIsLicensed(false);
      setLicenseInfo(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
  };

  const getFirebaseUserId = async (): Promise<string | null> => {
    return auth.currentUser?.uid || null;
  };

  // Pushes a single project and its associated construction state to the cloud
  const saveProjectToCloud = async (project: SavedProjectData) => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) {
      console.warn("Cloud sync skipped: No active authenticated session.");
      return;
    }
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

      const docRef = doc(db, 'users', userId, 'projects', safeKey);
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
      handleFirestoreError(error, OperationType.WRITE, 'users/' + userId + '/projects');
    }
  };

  // Loads all projects from cloud and hydrates localStorage to preserve app state
  const loadProjectsFromCloud = async (): Promise<SavedProjectData[]> => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return [];
    setSyncStatus('syncing');
    try {
      const colRef = collection(db, 'users', userId, 'projects');
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
      handleFirestoreError(error, OperationType.LIST, 'users/' + userId + '/projects');
      return [];
    }
  };

  const deleteProjectFromCloud = async (projectAddress: string) => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    const safeKey = getSafeProjectKey(projectAddress);
    try {
      const docRef = doc(db, 'users', userId, 'projects', safeKey);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users/' + userId + '/projects/' + safeKey);
    }
  };

  const saveCompanyProfileToCloud = async (profile: CompanyProfile) => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    const safeKey = getSafeProfileKey(profile.companyName);
    try {
      const docRef = doc(db, 'users', userId, 'companyProfiles', safeKey);
      const payload = sanitizeForFirestore(profile);
      await setDoc(docRef, payload, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/' + userId + '/companyProfiles/' + safeKey);
    }
  };

  const loadCompanyProfilesFromCloud = async (): Promise<CompanyProfile[]> => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return [];
    setSyncStatus('syncing');
    try {
      const colRef = collection(db, 'users', userId, 'companyProfiles');
      const snapshot = await getDocs(colRef);
      const profiles: CompanyProfile[] = [];

      snapshot.forEach((docSnapshot) => {
        profiles.push(docSnapshot.data() as CompanyProfile);
      });

      setSyncStatus('synced');
      return profiles;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users/' + userId + '/companyProfiles');
      return [];
    }
  };

  const deleteCompanyProfileToCloud = async (companyName: string) => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    const safeKey = getSafeProfileKey(companyName);
    try {
      const docRef = doc(db, 'users', userId, 'companyProfiles', safeKey);
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users/' + userId + '/companyProfiles/' + safeKey);
    }
  };

  const saveActiveStateToCloud = async (params: any, buildingModel: any, uiState: any) => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'activeState');
      const payload = sanitizeForFirestore({
        params,
        buildingModel,
        uiState,
        updatedAt: new Date().toISOString()
      });
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/' + userId + '/settings/activeState');
    }
  };

  const loadActiveStateFromCloud = async (): Promise<{ params: any; buildingModel: any; uiState: any } | null> => {
    const userId = await getFirebaseUserId();
    if (!userId || !isLicensed) return null;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'activeState');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          params: data.params,
          buildingModel: data.buildingModel,
          uiState: data.uiState
        };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users/' + userId + '/settings/activeState');
    }
    return null;
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
      handleFirestoreError(error, OperationType.LIST, 'licenses');
      return [];
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
      handleFirestoreError(error, OperationType.WRITE, 'licenses/' + licenseData.email);
    }
  };

  const deleteLicense = async (email: string) => {
    if (!isAdmin) return;
    try {
      const emailLower = email.toLowerCase().trim();
      const docRef = doc(db, 'licenses', emailLower);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'licenses/' + email);
    }
  };

  return (
    <FirebaseSyncContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signOut,
      syncStatus,
      isAuthInitialized,
      saveProjectToCloud,
      loadProjectsFromCloud,
      deleteProjectFromCloud,
      saveCompanyProfileToCloud,
      loadCompanyProfilesFromCloud,
      deleteCompanyProfileToCloud,
      saveActiveStateToCloud,
      loadActiveStateFromCloud,
      
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
