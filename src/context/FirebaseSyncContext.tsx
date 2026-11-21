import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  getDoc,
  getDocFromServer,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { SavedProjectData, CompanyProfile } from '../types';
import {
  getSafeProjectKey,
  getLegacySafeProjectKey,
  getSafeProfileKey,
  getLegacySafeProfileKey,
  resolveProjectProgressKeys,
  getLocalProgressItemByKeys,
  validateCompanyProfileForCloud,
  FIRESTORE_DOC_BYTE_LIMIT,
  getUtf8ByteSize,
} from '../utils/syncKeys';

export { getSafeProjectKey, getSafeProfileKey };

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
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

export interface CloudActiveState {
  params: any;
  buildingModel: any;
  uiState: any;
  updatedAt?: string;
}

interface FirebaseSyncContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  refreshAuthClaims: () => Promise<boolean>;
  signOut: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncError: string | null;
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
  saveActiveStateToCloud: (
    params: any,
    buildingModel: any,
    uiState: any,
    updatedAt?: string
  ) => Promise<void>;
  loadActiveStateFromCloud: () => Promise<CloudActiveState | null>;

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

async function resolveAdminClaim(firebaseUser: User): Promise<boolean> {
  try {
    const tokenResult = await firebaseUser.getIdTokenResult();
    return tokenResult?.claims?.admin === true || tokenResult?.claims?.role === 'admin';
  } catch (err) {
    console.warn('ID token claims check failed:', err);
    return false;
  }
}

export const FirebaseSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Licensing & Custom Claim States
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLicensed, setIsLicensed] = useState<boolean>(false);
  const [licenseLoading, setLicenseLoading] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Remove any legacy local auth cache from earlier builds to prevent client-side session spoofing
  useEffect(() => {
    try {
      localStorage.removeItem('ab_yapi_auth_session');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Test Connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Auth & ID Token / Custom Claims Changes
  useEffect(() => {
    let active = true;

    getRedirectResult(auth).catch((err: any) => {
      if (!active) return;
      console.warn('Redirect sign-in result check:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError(
          'Firebase alan adı yetkilendirme hatası (auth/unauthorized-domain). Bu alan adını Firebase Console Authorized Domains listesine ekleyin.'
        );
      } else if (err?.message) {
        setAuthError(`Google yönlendirme girişi tamamlanamadı: ${err.message}`);
      }
    });

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setIsLicensed(false);
        setLicenseInfo(null);
        setIsAuthInitialized(true);
        setLoading(false);
        return;
      }

      // Reject legacy anonymous sessions so only verified Google accounts can access cloud data
      if (firebaseUser.isAnonymous) {
        try {
          await firebaseSignOut(auth);
        } catch {
          // Ignore sign-out error
        }
        if (!active) return;
        setUser(null);
        setIsAdmin(false);
        setIsLicensed(false);
        setLicenseInfo(null);
        setIsAuthInitialized(true);
        setLoading(false);
        return;
      }

      if (!firebaseUser.emailVerified || !firebaseUser.email) {
        setAuthError(
          'E-posta adresiniz doğrulanmamış. Güvenlik nedeniyle yalnızca doğrulanmış Google hesapları kabul edilmektedir.'
        );
        try {
          await firebaseSignOut(auth);
        } catch {
          // Ignore
        }
        if (!active) return;
        setUser(null);
        setIsAdmin(false);
        setIsLicensed(false);
        setLicenseInfo(null);
        setIsAuthInitialized(true);
        setLoading(false);
        return;
      }

      const hasAdminClaim = await resolveAdminClaim(firebaseUser);
      if (!active) return;

      const verifiedUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
      setUser(verifiedUser);
      setIsAdmin(hasAdminClaim);
      setAuthError(null);
      setIsAuthInitialized(true);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Monitor License Status when verified user or custom admin claim changes
  useEffect(() => {
    let active = true;
    const checkLicense = async () => {
      if (!user || !auth.currentUser || auth.currentUser.isAnonymous || !auth.currentUser.emailVerified) {
        if (!active) return;
        setIsLicensed(false);
        setLicenseLoading(false);
        setLicenseInfo(null);
        return;
      }

      // Verified Firebase Custom Claim admin has guaranteed active license
      if (isAdmin) {
        if (!active) return;
        setIsLicensed(true);
        setLicenseLoading(false);
        setLicenseInfo({
          email: user.email || '',
          status: 'active',
          expiresAt: '2099-12-31T23:59:59.000Z',
          name: user.displayName || 'Yönetici',
          company: 'AB Yapı Yönetim',
          createdAt: new Date().toISOString(),
        });
        return;
      }

      const userEmail = user.email ? user.email.toLowerCase().trim() : '';
      if (!userEmail) {
        if (!active) return;
        setIsLicensed(false);
        setLicenseLoading(false);
        setLicenseInfo(null);
        return;
      }

      setLicenseLoading(true);
      try {
        const docRef = doc(db, 'licenses', userEmail);
        const docSnap = await getDoc(docRef);
        if (!active) return;

        if (docSnap.exists()) {
          const data = docSnap.data() as LicenseInfo;
          const isNotExpired = new Date(data.expiresAt) > new Date();
          const isActive = data.status === 'active';

          setIsLicensed(isActive && isNotExpired);
          setLicenseInfo(data);
        } else {
          setIsLicensed(false);
          setLicenseInfo(null);
        }
      } catch (error) {
        console.error('Error checking license:', error);
        if (!active) return;
        setIsLicensed(false);
      } finally {
        if (active) {
          setLicenseLoading(false);
        }
      }
    };

    checkLicense();
    return () => {
      active = false;
    };
  }, [user, isAdmin]);

  const refreshAuthClaims = useCallback(async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current || current.isAnonymous || !current.emailVerified) {
      setIsAdmin(false);
      return false;
    }
    const tokenResult = await current.getIdTokenResult(true);
    const hasAdmin = tokenResult?.claims?.admin === true || tokenResult?.claims?.role === 'admin';
    setIsAdmin(hasAdmin);
    return hasAdmin;
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const code = error?.code || '';
      const canFallbackToRedirect =
        !isInsideIframe &&
        (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment');

      if (canFallbackToRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      try {
        localStorage.removeItem('ab_yapi_auth_session');
      } catch {
        // Ignore
      }
      setUser(null);
      setIsAdmin(false);
      setIsLicensed(false);
      setLicenseInfo(null);
      setAuthError(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign-Out Error:', error);
    }
  };

  const getFirebaseUserId = (): string | null => {
    const current = auth.currentUser;
    if (!current || current.isAnonymous || !current.emailVerified) {
      return null;
    }
    return current.uid;
  };

  // Pushes a single project, its 3D buildingModelParams, and construction state to the cloud
  const saveProjectToCloud = async (project: SavedProjectData) => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) {
      return;
    }
    setSyncStatus('syncing');
    setLastSyncError(null);
    const progressKeys = resolveProjectProgressKeys({
      projectAddress: project.projectAddress,
      projectName: project.params?.projectName,
    });
    const safeKey = progressKeys.primaryKey;

    try {
      let construction: any = null;
      try {
        const stages = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'stages');
        const logs = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'logs');
        const offerAccepted = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'offer_accepted');
        const contractDate = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'contract_date');
        const targetDate = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'target_date');
        const subcontractors = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'subcontractors');
        const notifHistory = getLocalProgressItemByKeys(progressKeys.candidateKeys, 'notif_history');

        construction = {
          stages: stages ? JSON.parse(stages) : null,
          logs: logs ? JSON.parse(logs) : null,
          isOfferAccepted: offerAccepted ? JSON.parse(offerAccepted) : null,
          contractDate: contractDate || null,
          plannedCompletionDate: targetDate || null,
          subcontractors: subcontractors ? JSON.parse(subcontractors) : null,
          notifHistory: notifHistory ? JSON.parse(notifHistory) : null,
        };
      } catch (err) {
        console.warn('Failed to gather construction states for cloud sync:', err);
      }

      const nowIso = new Date().toISOString();
      const docRef = doc(db, 'users', userId, 'projects', safeKey);
      const payload = sanitizeForFirestore({
        id: safeKey,
        version: project.version || '1.0.0',
        savedAt: project.savedAt || nowIso,
        updatedAt: project.updatedAt || project.savedAt || nowIso,
        projectAddress: (project.projectAddress || 'Varsayılan Proje').slice(0, 300),
        params: project.params || {},
        results: project.results || {},
        buildingModelParams: project.buildingModelParams || null,
        construction: construction || null,
      });

      const payloadBytes = getUtf8ByteSize(JSON.stringify(payload));
      if (payloadBytes > FIRESTORE_DOC_BYTE_LIMIT) {
        throw new Error(
          `Proje verisi (şantiye fotoğrafları dahil) Firestore 1 MB belge sınırını aşıyor (${payloadBytes.toLocaleString('tr-TR')} byte). Lütfen ekli fotoğraf boyutlarını küçültün veya sadeleştirin.`
        );
      }

      await setDoc(docRef, payload);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/projects/${safeKey}`);
    }
  };

  // Loads all projects from cloud and hydrates localStorage safely
  const loadProjectsFromCloud = async (): Promise<SavedProjectData[]> => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return [];
    setSyncStatus('syncing');
    setLastSyncError(null);
    try {
      const colRef = collection(db, 'users', userId, 'projects');
      const snapshot = await getDocs(colRef);
      const cloudProjects: SavedProjectData[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const project: SavedProjectData = {
          version: data.version || '1.0.0',
          savedAt: data.savedAt || new Date().toISOString(),
          updatedAt: data.updatedAt || data.savedAt,
          projectAddress: data.projectAddress,
          params: data.params,
          results: data.results,
          buildingModelParams: data.buildingModelParams || undefined,
        };
        cloudProjects.push(project);

        if (data.construction) {
          const safeKey = resolveProjectProgressKeys({
            projectAddress: data.projectAddress,
            projectName: data.params?.projectName,
            fallbackId: docSnapshot.id,
          }).primaryKey;
          const {
            stages,
            logs,
            isOfferAccepted,
            contractDate,
            plannedCompletionDate,
            subcontractors,
            notifHistory,
          } = data.construction;

          try {
            if (stages) localStorage.setItem(`ab_yapi_progress_${safeKey}_stages`, JSON.stringify(stages));
            if (logs) localStorage.setItem(`ab_yapi_progress_${safeKey}_logs`, JSON.stringify(logs));
            if (isOfferAccepted !== null && isOfferAccepted !== undefined) {
              localStorage.setItem(`ab_yapi_progress_${safeKey}_offer_accepted`, JSON.stringify(isOfferAccepted));
            }
            if (contractDate) localStorage.setItem(`ab_yapi_progress_${safeKey}_contract_date`, contractDate);
            if (plannedCompletionDate) localStorage.setItem(`ab_yapi_progress_${safeKey}_target_date`, plannedCompletionDate);
            if (subcontractors) localStorage.setItem(`ab_yapi_progress_${safeKey}_subcontractors`, JSON.stringify(subcontractors));
            if (notifHistory) localStorage.setItem(`ab_yapi_progress_${safeKey}_notif_history`, JSON.stringify(notifHistory));
          } catch (storageErr) {
            console.warn('Failed to hydrate local construction progress:', storageErr);
          }
        }
      });

      cloudProjects.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

      setSyncStatus('synced');
      return cloudProjects;
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/projects`);
    }
  };

  const deleteProjectFromCloud = async (projectAddress: string) => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    setLastSyncError(null);
    const safeKey = getSafeProjectKey(projectAddress);
    const legacyKey = getLegacySafeProjectKey(projectAddress).slice(0, 128);
    try {
      await deleteDoc(doc(db, 'users', userId, 'projects', safeKey));
      if (legacyKey && legacyKey !== safeKey && /^[a-zA-Z0-9_-]{1,128}$/.test(legacyKey)) {
        await deleteDoc(doc(db, 'users', userId, 'projects', legacyKey)).catch(() => {});
      }
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/projects/${safeKey}`);
    }
  };

  const saveCompanyProfileToCloud = async (profile: CompanyProfile) => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    setLastSyncError(null);
    const safeKey = getSafeProfileKey(profile.companyName);
    try {
      const docRef = doc(db, 'users', userId, 'companyProfiles', safeKey);
      const payload = sanitizeForFirestore({
        ...profile,
        updatedAt: profile.updatedAt || new Date().toISOString(),
      });
      const validation = validateCompanyProfileForCloud(payload);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Firma profili bulut güvenlik kurallarıyla uyumlu değil.');
      }
      await setDoc(docRef, payload);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/companyProfiles/${safeKey}`);
    }
  };

  const loadCompanyProfilesFromCloud = async (): Promise<CompanyProfile[]> => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return [];
    setSyncStatus('syncing');
    setLastSyncError(null);
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
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/companyProfiles`);
    }
  };

  const deleteCompanyProfileToCloud = async (companyName: string) => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    setLastSyncError(null);
    const safeKey = getSafeProfileKey(companyName);
    const legacyKey = getLegacySafeProfileKey(companyName).slice(0, 128);
    try {
      await deleteDoc(doc(db, 'users', userId, 'companyProfiles', safeKey));
      if (legacyKey && legacyKey !== safeKey && /^[a-zA-Z0-9_-]{1,128}$/.test(legacyKey)) {
        await deleteDoc(doc(db, 'users', userId, 'companyProfiles', legacyKey)).catch(() => {});
      }
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/companyProfiles/${safeKey}`);
    }
  };

  const saveActiveStateToCloud = async (
    params: any,
    buildingModel: any,
    uiState: any,
    updatedAt?: string
  ) => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return;
    setSyncStatus('syncing');
    setLastSyncError(null);
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'activeState');
      const payload = sanitizeForFirestore({
        params: params || {},
        buildingModel: buildingModel || null,
        uiState: uiState || null,
        updatedAt: updatedAt || new Date().toISOString(),
      });
      await setDoc(docRef, payload);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/settings/activeState`);
    }
  };

  const loadActiveStateFromCloud = async (): Promise<CloudActiveState | null> => {
    const userId = getFirebaseUserId();
    if (!userId || !isLicensed) return null;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'activeState');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          params: data.params,
          buildingModel: data.buildingModel,
          uiState: data.uiState,
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/activeState`);
    }
  };

  // Admin Licensing Operations (strictly verified via Firebase custom claim `admin`)
  const getAllLicenses = async (): Promise<LicenseInfo[]> => {
    if (!isAdmin || !auth.currentUser) {
      throw new Error('Yetkisiz işlem: Lisans listesi için yönetici custom claim yetkisi gereklidir.');
    }
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
    }
  };

  const createOrUpdateLicense = async (licenseData: LicenseInfo) => {
    if (!isAdmin || !auth.currentUser) {
      throw new Error('Yetkisiz işlem: Lisans düzenleme için yönetici custom claim yetkisi gereklidir.');
    }
    try {
      const emailLower = licenseData.email.toLowerCase().trim();
      const docRef = doc(db, 'licenses', emailLower);
      const payload = sanitizeForFirestore({
        email: emailLower,
        status: licenseData.status,
        expiresAt: licenseData.expiresAt,
        createdAt: licenseData.createdAt || new Date().toISOString(),
        name: licenseData.name || null,
        company: licenseData.company || null,
      });
      await setDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `licenses/${licenseData.email}`);
    }
  };

  const deleteLicense = async (email: string) => {
    if (!isAdmin || !auth.currentUser) {
      throw new Error('Yetkisiz işlem: Lisans silme için yönetici custom claim yetkisi gereklidir.');
    }
    try {
      const emailLower = email.toLowerCase().trim();
      const docRef = doc(db, 'licenses', emailLower);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `licenses/${email}`);
    }
  };

  return (
    <FirebaseSyncContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError,
        signInWithGoogle,
        refreshAuthClaims,
        signOut,
        syncStatus,
        lastSyncError,
        isAuthInitialized,
        saveProjectToCloud,
        loadProjectsFromCloud,
        deleteProjectFromCloud,
        saveCompanyProfileToCloud,
        loadCompanyProfilesFromCloud,
        deleteCompanyProfileToCloud,
        saveActiveStateToCloud,
        loadActiveStateFromCloud,
        isLicensed,
        licenseLoading,
        licenseInfo,
        isAdmin,
        getAllLicenses,
        createOrUpdateLicense,
        deleteLicense,
      }}
    >
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
