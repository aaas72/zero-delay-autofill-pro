// ─── Storage Controller ────────────────────────────────────────────────────────
// Robust chrome.storage.local wrapper with transparent AES-GCM encryption.
// Decryption key is strictly stored in chrome.storage.session (in-memory only).

import {
  UserProfile,
  ExtensionSettings,
  StorageSchema,
  DEFAULT_SETTINGS,
  DEFAULT_PROFILE,
  SavedSiteData,
} from './types/profile';

import {
  encryptData,
  decryptData,
  verifyPassword,
  generateVerificationToken,
  EncryptedPayload,
} from './crypto';

const STORAGE_KEYS = {
  PROFILES: 'profiles',
  ACTIVE_PROFILE_ID: 'activeProfileId',
  SETTINGS: 'settings',
  SAVED_SITES: 'savedSites',
} as const;

// ─── Session Password Helpers ──────────────────────────────────────────────────

export async function getSessionPassword(): Promise<string | null> {
  try {
    const result = await chrome.storage.session.get('masterPassword');
    return result.masterPassword || null;
  } catch {
    return null;
  }
}

export async function setSessionPassword(password: string | null): Promise<void> {
  try {
    if (password) {
      await chrome.storage.session.set({ masterPassword: password });
    } else {
      await chrome.storage.session.remove('masterPassword');
    }
  } catch (error) {
    console.error('[ZeroDelay] Failed to update session password:', error);
  }
}

export async function isEncryptionEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('isEncrypted');
    return !!result.isEncrypted;
  } catch {
    return false;
  }
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('authCheck');
    const token = result.authCheck as EncryptedPayload;
    if (!token) return false;
    return await verifyPassword(password, token);
  } catch {
    return false;
  }
}

// ─── Encrypted Database Wrapper ────────────────────────────────────────────────

interface DecryptedDb {
  profiles: Record<string, UserProfile>;
  activeProfileId: string | null;
  savedSites: Record<string, SavedSiteData>;
}

async function saveEncryptedDatabase(db: DecryptedDb, password: string): Promise<void> {
  const json = JSON.stringify(db);
  const encrypted = await encryptData(json, password);
  await chrome.storage.local.set({ encryptedDb: encrypted });
}

async function getDecryptedDatabase(password: string): Promise<DecryptedDb | null> {
  try {
    const result = await chrome.storage.local.get('encryptedDb');
    const encrypted = result.encryptedDb as EncryptedPayload;
    if (!encrypted) return null;
    
    const json = await decryptData(encrypted.ciphertext, password, encrypted.salt, encrypted.iv);
    return JSON.parse(json) as DecryptedDb;
  } catch (error) {
    console.error('[ZeroDelay] Failed to decrypt database:', error);
    return null;
  }
}

async function getDecryptedData(): Promise<DecryptedDb> {
  const encrypted = await isEncryptionEnabled();
  if (!encrypted) {
    const p = await chrome.storage.local.get(STORAGE_KEYS.PROFILES);
    const active = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    const sites = await chrome.storage.local.get(STORAGE_KEYS.SAVED_SITES);
    return {
      profiles: p[STORAGE_KEYS.PROFILES] || {},
      activeProfileId: active[STORAGE_KEYS.ACTIVE_PROFILE_ID] || null,
      savedSites: sites[STORAGE_KEYS.SAVED_SITES] || {},
    };
  }

  const password = await getSessionPassword();
  if (!password) {
    throw new Error('LOCKED');
  }

  const db = await getDecryptedDatabase(password);
  if (!db) {
    throw new Error('DECRYPTION_FAILED');
  }

  return db;
}

async function saveDecryptedData(db: DecryptedDb): Promise<void> {
  const encrypted = await isEncryptionEnabled();
  if (!encrypted) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROFILES]: db.profiles,
      [STORAGE_KEYS.ACTIVE_PROFILE_ID]: db.activeProfileId,
      [STORAGE_KEYS.SAVED_SITES]: db.savedSites,
    });
    return;
  }

  const password = await getSessionPassword();
  if (!password) {
    throw new Error('LOCKED');
  }

  await saveEncryptedDatabase(db, password);
}

// ─── Setup / Disable Master Password ───────────────────────────────────────────

export async function setupMasterPassword(password: string): Promise<boolean> {
  try {
    const token = await generateVerificationToken(password);
    
    // Encrypt current database
    const db = await getDecryptedData();
    await saveEncryptedDatabase(db, password);
    
    // Set encryption settings
    await chrome.storage.local.set({
      isEncrypted: true,
      authCheck: token,
    });
    
    // Cache key in session
    await setSessionPassword(password);
    
    // Remove raw profiles/sites from disk
    await chrome.storage.local.remove([
      STORAGE_KEYS.PROFILES,
      STORAGE_KEYS.ACTIVE_PROFILE_ID,
      STORAGE_KEYS.SAVED_SITES,
    ]);
    
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to setup master password:', error);
    return false;
  }
}

export async function disableMasterPassword(): Promise<boolean> {
  try {
    const password = await getSessionPassword();
    if (!password) return false;

    const db = await getDecryptedDatabase(password);
    if (!db) return false;

    // Save database back to plain text
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROFILES]: db.profiles,
      [STORAGE_KEYS.ACTIVE_PROFILE_ID]: db.activeProfileId,
      [STORAGE_KEYS.SAVED_SITES]: db.savedSites,
      isEncrypted: false,
    });

    // Remove encryption headers
    await chrome.storage.local.remove(['authCheck', 'encryptedDb']);
    await setSessionPassword(null);

    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to disable master password:', error);
    return false;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function isValidProfile(data: unknown): data is UserProfile {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;
  
  if (p.type === 'login') {
    return (
      typeof p.id === 'string' &&
      typeof p.profileName === 'string' &&
      typeof p.loginInfo === 'object' &&
      p.loginInfo !== null
    );
  }
  
  return (
    typeof p.id === 'string' &&
    typeof p.profileName === 'string' &&
    typeof p.personalInfo === 'object' &&
    p.personalInfo !== null &&
    typeof p.contactInfo === 'object' &&
    p.contactInfo !== null
  );
}

// ─── Storage Operations ────────────────────────────────────────────────────────

export async function getAllProfiles(): Promise<Record<string, UserProfile>> {
  try {
    const db = await getDecryptedData();
    // Validate each profile
    const validated: Record<string, UserProfile> = {};
    for (const [key, value] of Object.entries(db.profiles)) {
      if (isValidProfile(value)) {
        validated[key] = value;
      }
    }
    return validated;
  } catch (error) {
    console.error('[ZeroDelay] Failed to get profiles:', error);
    return {};
  }
}

export async function getProfile(id: string): Promise<UserProfile | null> {
  try {
    const profiles = await getAllProfiles();
    const profile = profiles[id];
    return profile && isValidProfile(profile) ? profile : null;
  } catch (error) {
    console.error('[ZeroDelay] Failed to get profile:', error);
    return null;
  }
}

export async function findLoginProfileForDomain(domain: string): Promise<UserProfile | null> {
  try {
    const profiles = await getAllProfiles();
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
    
    for (const profile of Object.values(profiles)) {
      if (profile.type === 'login' && profile.associatedDomain) {
        const cleanProfileDomain = profile.associatedDomain.toLowerCase().replace(/^www\./, '');
        if (cleanDomain === cleanProfileDomain || cleanDomain.endsWith('.' + cleanProfileDomain)) {
          return profile;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('[ZeroDelay] Failed to find login profile for domain:', error);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<boolean> {
  try {
    const db = await getDecryptedData();
    if (!profile.id) {
      profile.id = generateId();
    }
    profile.updatedAt = Date.now();
    if (!profile.createdAt) {
      profile.createdAt = Date.now();
    }
    db.profiles[profile.id] = profile;
    await saveDecryptedData(db);
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to save profile:', error);
    return false;
  }
}

export async function updateProfile(
  id: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    const db = await getDecryptedData();
    const existing = db.profiles[id];
    if (!existing) {
      console.warn('[ZeroDelay] Profile not found for update:', id);
      return false;
    }
    db.profiles[id] = {
      ...existing,
      ...updates,
      id, // Prevent ID override
      updatedAt: Date.now(),
    };
    await saveDecryptedData(db);
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to update profile:', error);
    return false;
  }
}

export async function deleteProfile(id: string): Promise<boolean> {
  try {
    const db = await getDecryptedData();
    if (!db.profiles[id]) return false;
    delete db.profiles[id];

    if (db.activeProfileId === id) {
      const remaining = Object.keys(db.profiles);
      db.activeProfileId = remaining.length > 0 ? remaining[0] : null;
    }
    await saveDecryptedData(db);
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to delete profile:', error);
    return false;
  }
}

// ─── Active Profile ────────────────────────────────────────────────────────────

export async function getActiveProfileId(): Promise<string | null> {
  try {
    const db = await getDecryptedData();
    return db.activeProfileId;
  } catch (error) {
    console.error('[ZeroDelay] Failed to get active profile ID:', error);
    return null;
  }
}

export async function setActiveProfileId(id: string | null): Promise<boolean> {
  try {
    const db = await getDecryptedData();
    db.activeProfileId = id;
    await saveDecryptedData(db);
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to set active profile ID:', error);
    return false;
  }
}

export async function getActiveProfile(): Promise<UserProfile | null> {
  const id = await getActiveProfileId();
  if (!id) return null;
  return getProfile(id);
}

// ─── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = result[STORAGE_KEYS.SETTINGS];
    if (!settings || typeof settings !== 'object') return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error('[ZeroDelay] Failed to get settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(
  updates: Partial<ExtensionSettings>
): Promise<boolean> {
  try {
    const current = await getSettings();
    const merged = { ...current, ...updates };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to update settings:', error);
    return false;
  }
}

// ─── Saved Sites (Form Credentials / Auto-Save Data) ──────────────────────────

export async function getAllSavedSites(): Promise<Record<string, SavedSiteData>> {
  try {
    const db = await getDecryptedData();
    return db.savedSites;
  } catch (error) {
    console.error('[ZeroDelay] Failed to get saved sites:', error);
    return {};
  }
}

export async function getSiteData(hostname: string): Promise<SavedSiteData | null> {
  try {
    const sites = await getAllSavedSites();
    return sites[hostname] || null;
  } catch (error) {
    console.error('[ZeroDelay] Failed to get site data:', error);
    return null;
  }
}

export async function saveSiteData(hostname: string, fields: Record<string, string>): Promise<boolean> {
  try {
    const db = await getDecryptedData();
    const existing = db.savedSites[hostname]?.fields || {};
    
    // Filter out completely empty strings before merging
    const cleanedFields = { ...existing };
    let hasData = Object.keys(cleanedFields).length > 0;
    
    for (const [k, v] of Object.entries(fields)) {
      if (v && v.trim() !== '') {
        cleanedFields[k] = v;
        hasData = true;
      }
    }

    if (!hasData) return false;

    const mergedFields = cleanedFields;

    db.savedSites[hostname] = {
      hostname,
      fields: mergedFields,
      updatedAt: Date.now(),
    };
    await saveDecryptedData(db);
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to save site data:', error);
    return false;
  }
}

export async function deleteSiteData(hostname: string): Promise<boolean> {
  try {
    const db = await getDecryptedData();
    if (!db.savedSites[hostname]) return false;
    delete db.savedSites[hostname];
    await saveDecryptedData(db);
    return true;
  } catch (error) {
    console.error('[ZeroDelay] Failed to delete site data:', error);
    return false;
  }
}

// ─── Backup Restore ────────────────────────────────────────────────────────────

export async function restoreBackupData(data: any, backupPassword?: string): Promise<boolean> {
  if (!data || typeof data !== 'object') return false;

  try {
    const currentPassword = await getSessionPassword();
    if (!currentPassword) throw new Error('Vault must be unlocked to import backup');

    const currentDb = await getDecryptedData();
    let incomingDb: Partial<DecryptedDb> = {};

    if (data.isEncrypted) {
      if (!backupPassword || !data.authCheck || !data.encryptedDb) return false;
      const isCorrect = await verifyPassword(backupPassword, data.authCheck);
      if (!isCorrect) return false;

      // Decrypt the incoming backup payload
      const encrypted = data.encryptedDb as EncryptedPayload;
      const json = await decryptData(encrypted.ciphertext, backupPassword, encrypted.salt, encrypted.iv);
      incomingDb = JSON.parse(json) as DecryptedDb;
    } else {
      // Unencrypted backup data is at the root
      incomingDb = data;
    }

    // Smart Merge: Merge profiles (keeping existing ones if IDs differ, overwriting if IDs match)
    const incomingProfiles = incomingDb.profiles || {};
    for (const id in incomingProfiles) {
      currentDb.profiles[id] = incomingProfiles[id];
    }
    
    if (incomingDb.activeProfileId && currentDb.profiles[incomingDb.activeProfileId]) {
      currentDb.activeProfileId = incomingDb.activeProfileId;
    }
    
    // Smart Merge: Merge saved sites
    const incomingSites = incomingDb.savedSites || {};
    for (const domain in incomingSites) {
      currentDb.savedSites[domain] = incomingSites[domain];
    }

    // Save the merged database using the CURRENT password
    await saveDecryptedData(currentDb);

    // Merge settings if present
    if (data.settings) {
      const mergedSettings = { ...(await getSettings()), ...data.settings };
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: mergedSettings });
    }

    return true;
  } catch (error) {
    console.error('[ZeroDelay] Restore error:', error);
    return false;
  }
}

// ─── Initialization ────────────────────────────────────────────────────────────

export async function initializeStorage(): Promise<void> {
  try {
    const encrypted = await isEncryptionEnabled();
    if (!encrypted) {
      const profiles = await chrome.storage.local.get(STORAGE_KEYS.PROFILES);
      if (!profiles[STORAGE_KEYS.PROFILES] || Object.keys(profiles[STORAGE_KEYS.PROFILES]).length === 0) {
        // Seed with a default empty profile
        const defaultProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          id: generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveProfile(defaultProfile);
        await setActiveProfileId(defaultProfile.id);
      }
    }
    // Ensure settings exist
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    if (!result[STORAGE_KEYS.SETTINGS]) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
      });
    }
  } catch (error) {
    console.error('[ZeroDelay] Failed to initialize storage:', error);
  }
}

// ─── Full Storage Export (for debugging) ───────────────────────────────────────

export async function exportAllData(): Promise<StorageSchema> {
  const profiles = await getAllProfiles();
  const activeProfileId = await getActiveProfileId();
  const settings = await getSettings();
  const savedSites = await getAllSavedSites();
  return { profiles, activeProfileId, settings, savedSites };
}
