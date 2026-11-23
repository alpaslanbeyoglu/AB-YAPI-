import type { CompanyProfile, SavedProjectData } from '../types';

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function transliterateTurkish(input: string): string {
  const mapped = input.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => TURKISH_CHAR_MAP[ch] ?? ch);
  return mapped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function getLegacySafeKey(raw: string | undefined | null, fallback: string): string {
  return (raw || fallback).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

export function getSafeSlugKey(raw: string | undefined | null, fallback: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return `${fallback}_00000000`;
  }
  const canonical = trimmed.toLocaleLowerCase('tr-TR');
  const slug = transliterateTurkish(trimmed)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 88);
  const safeBase = slug || fallback;
  return `${safeBase}_${fnv1aHex(canonical)}`;
}

export function getSafeProjectKey(address: string): string {
  return getSafeSlugKey(address, 'default_project');
}

export function getLegacySafeProjectKey(address: string): string {
  return getLegacySafeKey(address, 'default_project');
}

export function getSafeProfileKey(name: string): string {
  return getSafeSlugKey(name, 'default_profile');
}

export function getLegacySafeProfileKey(name: string): string {
  return getLegacySafeKey(name, 'default_profile');
}

export const FIRESTORE_MEDIA_CHAR_LIMIT = 800000;
export const FIRESTORE_DOC_BYTE_LIMIT = 950000;

export function getUtf8ByteSize(text: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length;
  }
  return text.length;
}

export interface ProjectProgressKeyInfo {
  primaryKey: string;
  legacyAddressKey: string;
  candidateKeys: string[];
}

const GENERIC_PROJECT_NAMES = new Set([
  '',
  'default_project',
  'varsayılan proje',
  'yeni kentsel dönüşüm projesi',
  'mevcut şantiye',
  'müşteri',
  'musteri',
  'proje adı belirtilmedi',
  'proje adi belirtilmedi',
  'müşteri / proje adı belirtilmedi',
  'musteri / proje adi belirtilmedi',
]);

const PROGRESS_ALIAS_STORAGE_KEY = 'ab_yapi_progress_key_aliases_v1';
const inMemoryIdentityAddressAliases = new Map<string, Set<string>>();

function normalizeIdentityToken(value?: string | null): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (GENERIC_PROJECT_NAMES.has(trimmed.toLocaleLowerCase('tr-TR'))) return '';
  const key = getSafeProjectKey(trimmed);
  return key && key !== 'default_project' ? key : '';
}

function readPersistedAliasMap(): Record<string, string[]> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(PROGRESS_ALIAS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function registerIdentityAddressAliases(identityTokens: string[], addressVariants: string[]): void {
  const validIdentities = identityTokens.filter(Boolean);
  const validAddresses = addressVariants.filter((k) => k && k !== 'default_project');
  if (validIdentities.length === 0 || validAddresses.length === 0) return;

  const persisted = readPersistedAliasMap();
  let changed = false;

  for (const idToken of validIdentities) {
    let memSet = inMemoryIdentityAddressAliases.get(idToken);
    if (!memSet) {
      memSet = new Set<string>(persisted[idToken] || []);
      inMemoryIdentityAddressAliases.set(idToken, memSet);
    }
    for (const addrKey of validAddresses) {
      if (!memSet.has(addrKey)) {
        memSet.add(addrKey);
        changed = true;
      }
    }
    persisted[idToken] = Array.from(memSet);
  }

  if (changed) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PROGRESS_ALIAS_STORAGE_KEY, JSON.stringify(persisted));
      }
    } catch {
      // Ignore storage errors
    }
  }
}

function getRegisteredAddressAliases(identityTokens: string[]): string[] {
  const validIdentities = identityTokens.filter(Boolean);
  if (validIdentities.length === 0) return [];
  const persisted = readPersistedAliasMap();
  const result: string[] = [];

  for (const idToken of validIdentities) {
    const memSet = inMemoryIdentityAddressAliases.get(idToken);
    if (memSet) {
      for (const k of memSet) {
        if (k && !result.includes(k)) result.push(k);
      }
    }
    const storedList = persisted[idToken];
    if (Array.isArray(storedList)) {
      for (const k of storedList) {
        if (k && !result.includes(k)) result.push(k);
      }
    }
  }
  return result;
}

/**
 * Resolves a single canonical progress key anchored on projectAddress (matching Firestore
 * `users/{uid}/projects/{projectId}`), while returning ordered backward-compatible fallback
 * keys (legacy address key, projectName keys, proposalNumber keys, and previously associated
 * address keys for the same project identity) so changing projectAddress never loses progress data.
 */
export function resolveProjectProgressKeys(input: {
  projectAddress?: string | null;
  projectName?: string | null;
  proposalNumber?: string | null;
  previousAddress?: string | null;
  additionalCandidateAddresses?: readonly (string | null | undefined)[];
  fallbackId?: string | null;
  registerAliases?: boolean;
}): ProjectProgressKeyInfo {
  const addr = (input.projectAddress || '').trim();
  const name = (input.projectName || '').trim();
  const proposalNo = (input.proposalNumber || '').trim();
  const prevAddr = (input.previousAddress || '').trim();
  const fallbackId = (input.fallbackId || '').trim();

  const normalizedName = name.toLocaleLowerCase('tr-TR');
  const normalizedAddr = addr.toLocaleLowerCase('tr-TR');
  const hasMeaningfulName = Boolean(name) && !GENERIC_PROJECT_NAMES.has(normalizedName);

  const canonicalIdentity =
    addr || (hasMeaningfulName ? name : '') || proposalNo || fallbackId || 'default_project';
  const primaryKey = getSafeProjectKey(canonicalIdentity);
  const legacyAddressKey = getLegacySafeProjectKey(canonicalIdentity);

  const candidateKeys: string[] = [];
  const pushUnique = (k: string) => {
    if (k && !candidateKeys.includes(k)) {
      candidateKeys.push(k);
    }
  };

  const pushVariants = (rawVal?: string | null) => {
    const trimmed = (rawVal || '').trim();
    if (!trimmed) return;
    pushUnique(getSafeProjectKey(trimmed));
    pushUnique(getLegacySafeProjectKey(trimmed));
  };

  pushUnique(primaryKey);
  if (legacyAddressKey && legacyAddressKey !== primaryKey) {
    pushUnique(legacyAddressKey);
  }

  const identityTokens: string[] = [];

  if (hasMeaningfulName) {
    if (normalizedName !== normalizedAddr) {
      pushVariants(name);
    }
    const normName = normalizeIdentityToken(name);
    if (normName) identityTokens.push(normName);
  }

  if (proposalNo) {
    pushVariants(proposalNo);
    const normProposal = normalizeIdentityToken(proposalNo);
    if (normProposal) identityTokens.push(normProposal);
  }

  if (fallbackId) {
    pushUnique(fallbackId);
    pushVariants(fallbackId);
    const normFallback = normalizeIdentityToken(fallbackId);
    if (normFallback) identityTokens.push(normFallback);
  }

  if (prevAddr) {
    pushVariants(prevAddr);
  }

  if (Array.isArray(input.additionalCandidateAddresses)) {
    for (const extraAddr of input.additionalCandidateAddresses) {
      pushVariants(extraAddr);
    }
  }

  // Link and retrieve any previous address keys registered for this project identity
  if (identityTokens.length > 0) {
    const knownAliases = getRegisteredAddressAliases(identityTokens);
    for (const aliasKey of knownAliases) {
      pushUnique(aliasKey);
    }

    const currentAddressVariants: string[] = [];
    if (addr) {
      currentAddressVariants.push(getSafeProjectKey(addr), getLegacySafeProjectKey(addr));
    }
    if (prevAddr) {
      currentAddressVariants.push(getSafeProjectKey(prevAddr), getLegacySafeProjectKey(prevAddr));
    }
    if (input.registerAliases !== false) {
      registerIdentityAddressAliases(identityTokens, currentAddressVariants);
    }
  }

  if (candidateKeys.length === 0) {
    candidateKeys.push('default_project');
  }

  return {
    primaryKey,
    legacyAddressKey,
    candidateKeys,
  };
}

export function getLocalProgressItemByKeys(
  candidateKeys: readonly string[],
  suffix: string
): string | null {
  try {
    for (const key of candidateKeys) {
      if (!key) continue;
      const value = localStorage.getItem(`ab_yapi_progress_${key}_${suffix}`);
      if (value !== null) {
        return value;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function setLocalProgressItemByKeys(
  primaryKey: string,
  mirrorKeys: readonly string[],
  suffix: string,
  value: string
): void {
  try {
    if (primaryKey) {
      localStorage.setItem(`ab_yapi_progress_${primaryKey}_${suffix}`, value);
    }
    for (const mKey of mirrorKeys) {
      if (mKey && mKey !== 'default_project' && mKey !== primaryKey) {
        localStorage.setItem(`ab_yapi_progress_${mKey}_${suffix}`, value);
      }
    }
  } catch {
    // Ignore storage access errors
  }
}

export function getLocalProgressItem(
  safeKey: string,
  legacyKey: string,
  suffix: string
): string | null {
  return getLocalProgressItemByKeys(
    legacyKey && legacyKey !== safeKey ? [safeKey, legacyKey] : [safeKey],
    suffix
  );
}

export function parseTimestampMs(iso?: string | null): number {
  if (!iso || typeof iso !== 'string') return 0;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function shouldApplyCloudActiveState(
  localUpdatedAt?: string | null,
  cloudUpdatedAt?: string | null
): boolean {
  const cloudMs = parseTimestampMs(cloudUpdatedAt);
  const localMs = parseTimestampMs(localUpdatedAt);
  if (cloudMs === 0 && localMs === 0) return true;
  return cloudMs >= localMs;
}

function normalizeAddressKey(address?: string | null): string {
  return (address || '').trim().toLocaleLowerCase('tr-TR');
}

export function mergeProjectLists(
  localList: SavedProjectData[],
  cloudList: SavedProjectData[]
): { merged: SavedProjectData[]; toUpload: SavedProjectData[] } {
  const byKey = new Map<string, SavedProjectData>();
  const toUploadMap = new Map<string, SavedProjectData>();

  for (const cloudProj of cloudList) {
    const key = normalizeAddressKey(cloudProj.projectAddress);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, cloudProj);
    } else {
      const existingMs = Math.max(parseTimestampMs(existing.updatedAt), parseTimestampMs(existing.savedAt));
      const candidateMs = Math.max(parseTimestampMs(cloudProj.updatedAt), parseTimestampMs(cloudProj.savedAt));
      if (candidateMs >= existingMs) {
        byKey.set(key, {
          ...existing,
          ...cloudProj,
          buildingModelParams: cloudProj.buildingModelParams || existing.buildingModelParams,
        });
      }
    }
  }

  for (const localProj of localList) {
    const key = normalizeAddressKey(localProj.projectAddress);
    if (!key) continue;
    const cloudProj = byKey.get(key);
    if (!cloudProj) {
      byKey.set(key, localProj);
      toUploadMap.set(key, localProj);
      continue;
    }

    const localMs = Math.max(parseTimestampMs(localProj.updatedAt), parseTimestampMs(localProj.savedAt));
    const cloudMs = Math.max(parseTimestampMs(cloudProj.updatedAt), parseTimestampMs(cloudProj.savedAt));

    if (localMs > cloudMs) {
      const winner: SavedProjectData = {
        ...cloudProj,
        ...localProj,
        buildingModelParams: localProj.buildingModelParams || cloudProj.buildingModelParams,
      };
      byKey.set(key, winner);
      toUploadMap.set(key, winner);
    } else {
      const mergedItem: SavedProjectData = {
        ...localProj,
        ...cloudProj,
        buildingModelParams: cloudProj.buildingModelParams || localProj.buildingModelParams,
      };
      byKey.set(key, mergedItem);
      if (!cloudProj.buildingModelParams && localProj.buildingModelParams) {
        toUploadMap.set(key, mergedItem);
      }
    }
  }

  const merged = Array.from(byKey.values()).sort(
    (a, b) =>
      Math.max(parseTimestampMs(b.updatedAt), parseTimestampMs(b.savedAt)) -
      Math.max(parseTimestampMs(a.updatedAt), parseTimestampMs(a.savedAt))
  );

  return {
    merged,
    toUpload: Array.from(toUploadMap.values()),
  };
}

export function mergeCompanyProfiles(
  localList: CompanyProfile[],
  cloudList: CompanyProfile[]
): { merged: CompanyProfile[]; toUpload: CompanyProfile[] } {
  const byName = new Map<string, CompanyProfile>();
  const toUploadMap = new Map<string, CompanyProfile>();

  const normName = (name?: string) => (name || '').trim().toLocaleLowerCase('tr-TR');

  for (const cp of cloudList) {
    const key = normName(cp.companyName);
    if (!key) continue;
    const prev = byName.get(key);
    if (!prev || parseTimestampMs(cp.updatedAt) >= parseTimestampMs(prev.updatedAt)) {
      byName.set(key, cp);
    }
  }

  for (const lp of localList) {
    const key = normName(lp.companyName);
    if (!key) continue;
    const cp = byName.get(key);
    if (!cp) {
      byName.set(key, lp);
      toUploadMap.set(key, lp);
      continue;
    }
    const localMs = parseTimestampMs(lp.updatedAt);
    const cloudMs = parseTimestampMs(cp.updatedAt);
    if (localMs > cloudMs) {
      byName.set(key, lp);
      toUploadMap.set(key, lp);
    }
  }

  return {
    merged: Array.from(byName.values()),
    toUpload: Array.from(toUploadMap.values()),
  };
}

export interface CompanyProfileCloudValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a CompanyProfile against firestore.rules constraints before attempting cloud writes
 * so oversized media (>800,000 chars) or missing required titles never cause permission-denied errors.
 */
export function validateCompanyProfileForCloud(
  profile: CompanyProfile
): CompanyProfileCloudValidationResult {
  const companyName = typeof profile.companyName === 'string' ? profile.companyName.trim() : '';
  const legalName = typeof profile.legalName === 'string' ? profile.legalName.trim() : '';

  if (!companyName) {
    return {
      valid: false,
      reason: 'Kısa Firma Adı (Marka) boş bırakılamaz. Lütfen kısa firma adını giriniz.',
    };
  }
  if (companyName.length > 100) {
    return {
      valid: false,
      reason: 'Kısa Firma Adı en fazla 100 karakter olabilir.',
    };
  }
  if (!legalName) {
    return {
      valid: false,
      reason: 'Tam Ticari Ünvan (Resmî Şirket Adı) boş bırakılamaz. Lütfen şirket unvanını giriniz.',
    };
  }
  if (legalName.length > 250) {
    return {
      valid: false,
      reason: 'Tam Ticari Ünvan en fazla 250 karakter olabilir.',
    };
  }

  const logoLen = typeof profile.logoBase64 === 'string' ? profile.logoBase64.length : 0;
  if (logoLen > FIRESTORE_MEDIA_CHAR_LIMIT) {
    return {
      valid: false,
      reason: `Kurumsal logo boyutu bulut güvenlik sınırını aşıyor (${logoLen.toLocaleString('tr-TR')} / ${FIRESTORE_MEDIA_CHAR_LIMIT.toLocaleString('tr-TR')} karakter). Yerel profiliniz korundu; buluta yedeklemek için lütfen daha küçük boyutlu bir logo yükleyin.`,
    };
  }

  const stampLen = typeof profile.stampBase64 === 'string' ? profile.stampBase64.length : 0;
  if (stampLen > FIRESTORE_MEDIA_CHAR_LIMIT) {
    return {
      valid: false,
      reason: `Resmî kaşe/imza görseli boyutu bulut güvenlik sınırını aşıyor (${stampLen.toLocaleString('tr-TR')} / ${FIRESTORE_MEDIA_CHAR_LIMIT.toLocaleString('tr-TR')} karakter). Yerel profiliniz korundu; buluta yedeklemek için lütfen daha küçük boyutlu bir kaşe görseli yükleyin.`,
    };
  }

  const stampUrlLen = typeof profile.stampUrl === 'string' ? profile.stampUrl.length : 0;
  if (stampUrlLen > FIRESTORE_MEDIA_CHAR_LIMIT) {
    return {
      valid: false,
      reason: `Kaşe URL/veri alanı bulut güvenlik sınırını aşıyor (${stampUrlLen.toLocaleString('tr-TR')} / ${FIRESTORE_MEDIA_CHAR_LIMIT.toLocaleString('tr-TR')} karakter).`,
    };
  }

  const totalBytes = getUtf8ByteSize(JSON.stringify(profile));
  if (totalBytes > FIRESTORE_DOC_BYTE_LIMIT) {
    return {
      valid: false,
      reason: `Firma profili (logo ve kaşe dahil) Firestore 1 MB belge sınırını aşıyor (${totalBytes.toLocaleString('tr-TR')} byte). Yerel profiliniz korundu; buluta yedeklemek için lütfen daha küçük görseller kullanın.`,
    };
  }

  return { valid: true };
}

