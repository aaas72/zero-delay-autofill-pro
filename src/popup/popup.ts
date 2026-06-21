// ─── Popup Controller ──────────────────────────────────────────────────────────
// Bridges the popup UI with the content script and storage layer.
// Handles profile management, theme switching, auto-fill commands, and
// settings form interactions.

import { UserProfile, DEFAULT_PROFILE } from '../shared/types/profile';
import { MessageType, FillResultMessage, StatusResponseMessage } from '../shared/types/messages';
import {
  getAllProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  getActiveProfileId,
  setActiveProfileId,
  getSettings,
  updateSettings,
  isEncryptionEnabled,
  verifyMasterPassword,
  getSessionPassword,
  setSessionPassword,
  setupMasterPassword,
  restoreBackupData,
} from '../shared/storage';
import { generateSecurePassword } from '../shared/crypto';

// ─── DOM References ────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const els = {
  app: $<HTMLDivElement>('app'),
  // Main view
  mainView: $<HTMLElement>('main-view'),
  profileDropdown: $<HTMLSelectElement>('profile-dropdown'),
  statusCard: $<HTMLDivElement>('status-card'),
  statusIcon: $<HTMLDivElement>('status-icon'),
  statusTitle: $<HTMLSpanElement>('status-title'),
  statusDesc: $<HTMLSpanElement>('status-desc'),
  btnFill: $<HTMLButtonElement>('btn-fill'),
  btnRipple: $<HTMLDivElement>('btn-ripple'),
  toast: $<HTMLDivElement>('toast'),
  toastIcon: $<HTMLSpanElement>('toast-icon'),
  toastText: $<HTMLSpanElement>('toast-text'),
  previewName: $<HTMLSpanElement>('preview-name'),
  previewEmail: $<HTMLSpanElement>('preview-email'),
  previewEmailLabel: $<HTMLSpanElement>('preview-email-label'),
  previewPhone: $<HTMLSpanElement>('preview-phone'),
  previewGithub: $<HTMLSpanElement>('preview-github'),
  previewDomain: $<HTMLSpanElement>('preview-domain'),
  rowPreviewName: $<HTMLDivElement>('row-preview-name'),
  rowPreviewEmail: $<HTMLDivElement>('row-preview-email'),
  rowPreviewPhone: $<HTMLDivElement>('row-preview-phone'),
  rowPreviewGithub: $<HTMLDivElement>('row-preview-github'),
  rowPreviewDomain: $<HTMLDivElement>('row-preview-domain'),
  previewEmptyState: $<HTMLDivElement>('preview-empty-state'),
  previewEmptyText: $<HTMLSpanElement>('preview-empty-text'),
  // Header actions
  btnGenerator: $<HTMLButtonElement>('btn-generator'),
  btnSettings: $<HTMLButtonElement>('btn-settings'),
  btnEditActive: $<HTMLButtonElement>('btn-edit-active'),
  btnNewActive: $<HTMLButtonElement>('btn-new-active'),
  profileSelectorLabel: $<HTMLLabelElement>('profile-selector-label'),
  // Tab Controls
  tabBtnProfiles: $<HTMLButtonElement>('tab-btn-profiles'),
  tabBtnLogins: $<HTMLButtonElement>('tab-btn-logins'),
  // Settings view
  settingsView: $<HTMLElement>('settings-view'),
  editorView: $<HTMLElement>('editor-view'),
  generatorView: $<HTMLElement>('generator-view'),
  btnSettingsBack: $<HTMLButtonElement>('btn-settings-back'),
  btnEditorBack: $<HTMLButtonElement>('btn-editor-back'),
  btnGeneratorBack: $<HTMLButtonElement>('btn-generator-back'),
  btnGeneratorCopyBottom: $<HTMLButtonElement>('btn-generator-copy-bottom'),
  btnSaveProfile: $<HTMLButtonElement>('btn-save-profile'),
  btnDeleteProfile: $<HTMLButtonElement>('btn-delete-profile'),
  profileForm: $<HTMLFormElement>('profile-form'),
  // Form inputs
  inputFirstName: $<HTMLInputElement>('input-firstname'),
  inputLastName: $<HTMLInputElement>('input-lastname'),
  inputHeadline: $<HTMLInputElement>('input-headline'),
  inputEmail: $<HTMLInputElement>('input-email'),
  inputPhone: $<HTMLInputElement>('input-phone'),
  inputCity: $<HTMLInputElement>('input-city'),
  inputState: $<HTMLInputElement>('input-state'),
  inputZip: $<HTMLInputElement>('input-zip'),
  inputCountry: $<HTMLInputElement>('input-country'),
  inputAddress: $<HTMLInputElement>('input-address'),
  inputLinkedin: $<HTMLInputElement>('input-linkedin'),
  inputGithub: $<HTMLInputElement>('input-github'),
  inputWebsite: $<HTMLInputElement>('input-website'),
  inputPortfolio: $<HTMLInputElement>('input-portfolio'),
  inputResume: $<HTMLInputElement>('input-resume'),
  inputTechnical: $<HTMLInputElement>('input-technical'),
  inputFrameworks: $<HTMLInputElement>('input-frameworks'),
  inputTools: $<HTMLInputElement>('input-tools'),
  inputLanguages: $<HTMLInputElement>('input-languages'),
  inputCompany: $<HTMLInputElement>('input-company'),
  inputJobTitle: $<HTMLInputElement>('input-jobtitle'),
  inputYears: $<HTMLInputElement>('input-years'),
  inputSchool: $<HTMLInputElement>('input-school'),
  inputDegree: $<HTMLInputElement>('input-degree'),
  inputMajor: $<HTMLInputElement>('input-major'),
  inputBio: $<HTMLTextAreaElement>('input-bio'),
  inputSalary: $<HTMLInputElement>('input-salary'),
  inputAvailability: $<HTMLInputElement>('input-availability'),
  inputWorkAuth: $<HTMLInputElement>('input-workauth'),
  inputProfileName: $<HTMLInputElement>('input-profilename'),
  selectProfileType: $<HTMLSelectElement>('select-profile-type'),
  loginProfileFields: $<HTMLFieldSetElement>('login-profile-fields'),
  fullProfileFields: $<HTMLDivElement>('full-profile-fields'),
  inputLoginEmail: $<HTMLInputElement>('input-login-email'),
  inputLoginPassword: $<HTMLInputElement>('input-login-password'),
  inputLoginDomain: $<HTMLInputElement>('input-login-domain'),
  // Lock view overlay
  lockView: $<HTMLDivElement>('lock-view'),
  lockTitle: $<HTMLHeadingElement>('lock-title'),
  lockDesc: $<HTMLParagraphElement>('lock-desc'),
  lockPassword: $<HTMLInputElement>('lock-password'),
  lockConfirmField: $<HTMLDivElement>('lock-confirm-field'),
  lockPasswordConfirm: $<HTMLInputElement>('lock-password-confirm'),
  btnUnlock: $<HTMLButtonElement>('btn-unlock'),
  btnUnlockText: $<HTMLSpanElement>('btn-unlock-text'),
  lockError: $<HTMLDivElement>('lock-error'),
  // Password Generator Card
  genPasswordInput: $<HTMLInputElement>('gen-password-input'),
  btnCopyPassword: $<HTMLButtonElement>('btn-copy-password'),
  btnRegenPassword: $<HTMLButtonElement>('btn-regen-password'),
  passwordLengthSlider: $<HTMLInputElement>('password-length-slider'),
  passwordLengthVal: $<HTMLSpanElement>('password-length-val'),
  chkUppercase: $<HTMLInputElement>('chk-uppercase'),
  chkLowercase: $<HTMLInputElement>('chk-lowercase'),
  chkNumbers: $<HTMLInputElement>('chk-numbers'),
  chkSymbols: $<HTMLInputElement>('chk-symbols'),
  // Backup & Restore
  btnExportBackup: $<HTMLButtonElement>('btn-export-backup'),
  btnImportTrigger: $<HTMLButtonElement>('btn-import-trigger'),
  inputImportFile: $<HTMLInputElement>('input-import-file'),
  chkAutoBackup: $<HTMLInputElement>('chk-auto-backup'),
  selectAutoBackupInterval: $<HTMLSelectElement>('select-auto-backup-interval'),
  autoBackupIntervalContainer: $<HTMLDivElement>('auto-backup-interval-container'),
  // Prompt Modal
  promptModal: $<HTMLDivElement>('prompt-modal'),
  promptTitle: $<HTMLHeadingElement>('prompt-title'),
  promptDesc: $<HTMLParagraphElement>('prompt-desc'),
  promptInput: $<HTMLInputElement>('prompt-input'),
  btnPromptSubmit: $<HTMLButtonElement>('btn-prompt-submit'),
  btnPromptCancel: $<HTMLButtonElement>('btn-prompt-cancel'),
};

let currentEditingProfileId: string | null = null;
let activeTab: 'profiles' | 'logins' = 'profiles';

// ─── Password Generator Card ──────────────────────────────────────────────────

function generatePopupPassword(): void {
  const length = parseInt(els.passwordLengthSlider.value, 10);
  const options = {
    uppercase: els.chkUppercase.checked,
    lowercase: els.chkLowercase.checked,
    numbers: els.chkNumbers.checked,
    symbols: els.chkSymbols.checked,
  };

  try {
    const password = generateSecurePassword(length, options);
    els.genPasswordInput.value = password;
  } catch (error) {
    console.error('[ZeroDelay] Generate password error:', error);
  }
}

async function copyPopupPassword(): Promise<void> {
  const val = els.genPasswordInput.value;
  if (!val || val === 'Click Generate') return;

  try {
    await navigator.clipboard.writeText(val);
    showToast('success', 'Password copied to clipboard!');
  } catch {
    showToast('error', 'Failed to copy to clipboard');
  }
}

function openGenerator(): void {
  els.generatorView.setAttribute('aria-hidden', 'false');
  generatePopupPassword();
}

function closeGenerator(): void {
  els.generatorView.setAttribute('aria-hidden', 'true');
}

function askForPassword(title: string, desc: string): Promise<string | null> {
  return new Promise((resolve) => {
    els.promptTitle.textContent = title;
    els.promptDesc.textContent = desc;
    els.promptInput.value = '';
    els.promptModal.style.display = 'flex';
    els.promptInput.focus();

    const cleanup = () => {
      els.btnPromptSubmit.removeEventListener('click', onSubmit);
      els.btnPromptCancel.removeEventListener('click', onCancel);
      els.promptInput.removeEventListener('keydown', onKey);
      els.promptModal.style.display = 'none';
    };

    const onSubmit = () => {
      cleanup();
      resolve(els.promptInput.value);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onSubmit();
      if (e.key === 'Escape') onCancel();
    };

    els.btnPromptSubmit.addEventListener('click', onSubmit);
    els.btnPromptCancel.addEventListener('click', onCancel);
    els.promptInput.addEventListener('keydown', onKey);
  });
}

async function importBackupData(data: any): Promise<void> {
  if (typeof data !== 'object' || data === null) {
    showToast('error', 'Invalid backup file format');
    return;
  }

  try {
    let password = undefined;
    if (data.isEncrypted) {
      const pwd = await askForPassword(
        'Encrypted Backup',
        'Please enter the Master Password of the backup to restore:'
      );
      if (!pwd) {
        showToast('error', 'Password is required to restore encrypted backup');
        return;
      }
      password = pwd;
    }

    const success = await restoreBackupData(data, password);
    
    if (success) {
      showToast('success', 'Backup restored successfully!');
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname + '?tab=true';
      }, 1500); // Give user time to see the toast before reloading
    } else {
      showToast('error', 'Failed to restore backup: Incorrect password or data');
    }
  } catch (err: any) {
    console.error('[ZeroDelay] Import error:', err);
    showToast('error', 'Failed to restore backup');
  }
}

async function checkLockStatus(): Promise<boolean> {
  const encrypted = await isEncryptionEnabled();
  
  if (!encrypted) {
    // Setup Vault layout (first-time setup)
    els.lockView.style.display = 'flex';
    els.lockTitle.textContent = 'Setup Vault';
    els.lockDesc.textContent = 'Create a Master Password to encrypt and secure your profiles.';
    els.lockPassword.value = '';
    els.lockPasswordConfirm.value = '';
    els.lockConfirmField.style.display = 'block';
    els.btnUnlockText.textContent = 'Setup Vault';
    els.lockPassword.focus();
    return true;
  }

  const sessionPassword = await getSessionPassword();
  if (sessionPassword) {
    els.lockView.style.display = 'none';
    return false;
  }

  // Vault Locked layout
  els.lockView.style.display = 'flex';
  els.lockTitle.textContent = 'Vault Locked';
  els.lockDesc.textContent = 'Enter your Master Password to access your profiles.';
  els.lockPassword.value = '';
  els.lockPasswordConfirm.value = '';
  els.lockConfirmField.style.display = 'none';
  els.btnUnlockText.textContent = 'Unlock Vault';
  els.lockPassword.focus();
  return true;
}

async function handleUnlock(): Promise<void> {
  const encrypted = await isEncryptionEnabled();
  
  if (!encrypted) {
    // SETUP state
    const password = els.lockPassword.value;
    const confirm = els.lockPasswordConfirm.value;
    
    if (password.length < 8) {
      showLockError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirm) {
      showLockError('Passwords do not match');
      return;
    }
    
    els.btnUnlock.disabled = true;
    els.lockError.style.display = 'none';
    
    try {
      const success = await setupMasterPassword(password);
      if (success) {
        els.lockView.style.display = 'none';
        await initWorkspace();
        showToast('success', 'Master Password set up successfully!');
      } else {
        showLockError('Failed to set up Master Password');
      }
    } catch (error) {
      console.error('[ZeroDelay] Setup vault error:', error);
      showLockError('An error occurred during setup');
    } finally {
      els.btnUnlock.disabled = false;
    }
  } else {
    // UNLOCK state
    const password = els.lockPassword.value;
    if (!password) {
      showLockError('Password cannot be empty');
      return;
    }

    els.btnUnlock.disabled = true;
    els.lockError.style.display = 'none';

    try {
      const isCorrect = await verifyMasterPassword(password);
      if (isCorrect) {
        await setSessionPassword(password);
        els.lockView.style.display = 'none';
        await initWorkspace();
        showToast('success', 'Vault unlocked successfully!');
      } else {
        showLockError('Incorrect master password');
      }
    } catch (error) {
      console.error('[ZeroDelay] Unlock error:', error);
      showLockError('Unlock failed');
    } finally {
      els.btnUnlock.disabled = false;
    }
  }
}

function showLockError(message: string): void {
  els.lockError.textContent = message;
  els.lockError.style.display = 'block';
  els.lockError.style.animation = 'none';
  void els.lockError.offsetWidth;
  els.lockError.style.animation = 'shake 0.4s var(--ease-out)';
}

// ─── Backup & Restore ─────────────────────────────────────────────────────────

async function handleExportBackup(): Promise<void> {
  try {
    const allData = await chrome.storage.local.get(null);
    delete allData.pendingSaveSite; // Remove temp state
    
    const jsonString = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `zero-delay-autofill-backup-${dateStr}.json`;
    
    try {
      // Modern File System Access API (forces Save As dialog)
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Backup File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      showToast('success', 'Backup exported successfully!');
    } catch (err) {
      // Fallback or user cancelled
      if ((err as Error).name === 'AbortError') return;
      
      console.warn('[ZeroDelay] showSaveFilePicker failed, falling back to traditional download', err);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      showToast('success', 'Backup exported successfully!');
    }
  } catch (error) {
    console.error('[ZeroDelay] Export error:', error);
    showToast('error', 'Export failed');
  }
}

function handleImportFileChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const json = event.target?.result as string;
      const data = JSON.parse(json);
      await importBackupData(data);
    } catch (err) {
      console.error('[ZeroDelay] Import error:', err);
      showToast('error', 'Failed to restore backup');
    } finally {
      els.inputImportFile.value = '';
    }
  };
  reader.readAsText(file);
}

// ─── Settings UI ───────────────────────────────────────────────────────────────

async function initSettingsUI(): Promise<void> {
  const settings = await getSettings();
  
  // Theme
  let theme = settings.theme;
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);

  // Auto Backup
  els.chkAutoBackup.checked = settings.autoBackupEnabled;
  els.selectAutoBackupInterval.value = (settings.autoBackupInterval || 1440).toString();
  els.autoBackupIntervalContainer.style.display = settings.autoBackupEnabled ? 'flex' : 'none';
}

async function handleAutoBackupToggle(e: Event): Promise<void> {
  const enabled = (e.target as HTMLInputElement).checked;
  els.autoBackupIntervalContainer.style.display = enabled ? 'flex' : 'none';
  
  await updateSettings({ autoBackupEnabled: enabled });
  
  if (enabled) {
    const interval = parseInt(els.selectAutoBackupInterval.value, 10);
    chrome.alarms.create('autoBackup', { periodInMinutes: interval });
    showToast('success', 'Auto-backup enabled');
  } else {
    chrome.alarms.clear('autoBackup');
    showToast('success', 'Auto-backup disabled');
  }
}

async function handleAutoBackupIntervalChange(e: Event): Promise<void> {
  const interval = parseInt((e.target as HTMLSelectElement).value, 10);
  await updateSettings({ autoBackupInterval: interval });
  
  if (els.chkAutoBackup.checked) {
    chrome.alarms.create('autoBackup', { periodInMinutes: interval });
    showToast('success', 'Backup schedule updated');
  }
}

// Theme toggle removed since we are strictly dark mode now.

// ─── Profile Validation ───────────────────────────────────────────────────────

async function validateProfileForCurrentTab(profile: UserProfile | null): Promise<boolean> {
  if (!profile) return true;
  if (profile.type !== 'login') {
    els.btnFill.disabled = false;
    if (els.statusTitle.textContent === 'Restricted') {
      setStatus('ready', 'Connected', 'Profile is ready for auto-fill');
    }
    return true;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && profile.associatedDomain) {
      const hostname = new URL(tab.url).hostname.toLowerCase().replace(/^www\./, '');
      const cleanProfileDomain = profile.associatedDomain.toLowerCase().replace(/^www\./, '');
      
      if (hostname === cleanProfileDomain || hostname.endsWith('.' + cleanProfileDomain)) {
        els.btnFill.disabled = false;
        if (els.statusTitle.textContent === 'Restricted') {
          setStatus('ready', 'Connected', 'Login profile is matched and ready');
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('[ZeroDelay] Validation error:', err);
  }

  // Domain mismatched - but DO NOT disable the button or show error immediately!
  // Return false so executeAutoFill knows it's a mismatch.
  els.btnFill.disabled = false;
  return false;
}

// ─── Profile Dropdown ──────────────────────────────────────────────────────────

async function populateProfiles(): Promise<void> {
  const allProfiles = await getAllProfiles();
  
  // Filter based on active tab
  const profiles = Object.values(allProfiles).filter(p => {
    if (activeTab === 'profiles') return p.type !== 'login';
    return p.type === 'login';
  });

  if (activeTab === 'profiles') {
    els.profileSelectorLabel.textContent = 'Active Profile';
  } else {
    els.profileSelectorLabel.textContent = 'Active Login Account';
  }

  let selectedId: string | null = null;
  
  // Try to find if there is an active profile ID already selected in the filtered set
  const activeProfileId = await getActiveProfileId();
  if (activeProfileId && profiles.some(p => p.id === activeProfileId)) {
    selectedId = activeProfileId;
  }

  // If activeTab is 'logins', check active tab hostname to auto-select matching credentials
  if (activeTab === 'logins') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const hostname = new URL(tab.url).hostname.toLowerCase().replace(/^www\./, '');
        for (const profile of profiles) {
          if (profile.type === 'login' && profile.associatedDomain) {
            const cleanProfileDomain = profile.associatedDomain.toLowerCase().replace(/^www\./, '');
            if (hostname === cleanProfileDomain || hostname.endsWith('.' + cleanProfileDomain)) {
              selectedId = profile.id;
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ZeroDelay] Failed to query active tab for profile selection:', err);
    }
  }

  // If no matching profile was found, select the first available one in the filtered list
  if (!selectedId && profiles.length > 0) {
    selectedId = profiles[0].id;
  }

  els.profileDropdown.innerHTML = '';

  if (profiles.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = activeTab === 'profiles' 
      ? 'No profiles — click + to create one' 
      : 'No credentials — click + to create one';
    els.profileDropdown.appendChild(opt);
    
    updatePreview(null);
    await validateProfileForCurrentTab(null);
    return;
  }

  for (const profile of profiles) {
    const opt = document.createElement('option');
    opt.value = profile.id;
    opt.textContent = profile.profileName || 'Unnamed Profile';
    if (profile.id === selectedId) {
      opt.selected = true;
    }
    els.profileDropdown.appendChild(opt);
  }

  if (selectedId) {
    await setActiveProfileId(selectedId);
    const activeProfile = await getProfile(selectedId);
    updatePreview(activeProfile);
    await validateProfileForCurrentTab(activeProfile);
  }
}

async function onProfileChange(): Promise<void> {
  const selectedId = els.profileDropdown.value;
  if (selectedId) {
    await setActiveProfileId(selectedId);
    const profile = await getProfile(selectedId);
    updatePreview(profile);
    await validateProfileForCurrentTab(profile);
  }
}

function updatePreview(profile: UserProfile | null): void {
  if (!profile) {
    // Hide all rows
    els.rowPreviewName.style.display = 'none';
    els.rowPreviewEmail.style.display = 'none';
    els.rowPreviewPhone.style.display = 'none';
    els.rowPreviewGithub.style.display = 'none';
    els.rowPreviewDomain.style.display = 'none';
    
    // Show empty state
    els.previewEmptyState.style.display = 'flex';
    if (activeTab === 'profiles') {
      els.previewEmptyText.textContent = 'No profiles - click + to create one';
    } else {
      els.previewEmptyText.textContent = 'No credentials - click + to create one';
    }
    return;
  }

  // Hide empty state and show/hide corresponding rows
  els.previewEmptyState.style.display = 'none';

  if (profile.type === 'login') {
    els.rowPreviewName.style.display = 'flex';
    els.rowPreviewEmail.style.display = 'flex';
    els.rowPreviewDomain.style.display = 'flex';
    els.rowPreviewPhone.style.display = 'none';
    els.rowPreviewGithub.style.display = 'none';

    els.previewName.textContent = profile.profileName || 'Login Profile';
    els.previewEmail.textContent = profile.loginInfo?.email || '—';
    els.previewEmailLabel.textContent = 'Username';
    els.previewDomain.textContent = profile.associatedDomain || 'Any Domain';
    return;
  }

  // Full Profile Type
  els.rowPreviewName.style.display = 'flex';
  els.rowPreviewEmail.style.display = 'flex';
  els.rowPreviewPhone.style.display = 'flex';
  els.rowPreviewGithub.style.display = 'flex';
  els.rowPreviewDomain.style.display = 'none';

  els.previewEmailLabel.textContent = 'Email';

  const name = profile.personalInfo.fullName ||
    `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim();
  els.previewName.textContent = name || '—';
  els.previewEmail.textContent = profile.contactInfo.email || '—';
  els.previewPhone.textContent = profile.contactInfo.phone || '—';
  els.previewGithub.textContent = profile.portfolioLinks.github
    ? profile.portfolioLinks.github.replace(/https?:\/\/(www\.)?github\.com\/?/i, '')
    : '—';
}

// ─── Auto-Fill Command ─────────────────────────────────────────────────────────

async function executeAutoFill(): Promise<void> {
  const activeId = await getActiveProfileId();
  if (!activeId) {
    showToast('error', 'No active profile selected');
    return;
  }

  const profile = await getProfile(activeId);
  if (profile) {
    const isDomainValid = await validateProfileForCurrentTab(profile);
    if (!isDomainValid) {
      setStatus('error', 'Restricted', `Only works on ${profile.associatedDomain || 'its saved domain'}`);
      showToast('error', 'Domain mismatch');
      return;
    }
  }

  // Ripple effect
  const rect = els.btnFill.getBoundingClientRect();
  els.btnRipple.style.width = els.btnRipple.style.height = `${Math.max(rect.width, rect.height)}px`;
  els.btnRipple.style.left = '0px';
  els.btnRipple.style.top = '0px';
  els.btnRipple.classList.remove('active');
  void els.btnRipple.offsetWidth; // Force reflow
  els.btnRipple.classList.add('active');

  els.btnFill.disabled = true;
  setStatus('loading', 'Filling...', 'Injecting values into the form');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showToast('error', 'No active tab found');
      setStatus('error', 'Error', 'Could not access the active tab');
      els.btnFill.disabled = false;
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: MessageType.FILL_FORM,
      profileId: activeId,
    }) as FillResultMessage;

    if (response.success) {
      setStatus('success', 'Filled!', `${response.filledCount} of ${response.totalFields} fields filled`);
      showToast('success', `⚡ ${response.filledCount} fields filled instantly!`);
    } else {
      const msg = response.errors.length > 0
        ? response.errors[0]
        : 'No matching fields found on this page';
      setStatus('error', 'No Fields', msg);
      showToast('error', msg);
    }
  } catch (error) {
    console.error('[ZeroDelay] Fill error:', error);
    setStatus('error', 'Error', 'Could not reach the page. Navigate to a job application first.');
    showToast('error', 'Could not reach the page');
  } finally {
    els.btnFill.disabled = false;
  }
}

// ─── Status Card ───────────────────────────────────────────────────────────────

function setStatus(type: 'ready' | 'loading' | 'success' | 'error', title: string, desc: string): void {
  els.statusCard.className = 'status-card';
  els.statusIcon.classList.remove('pulse');

  if (type === 'success') {
    els.statusCard.classList.add('status-card--success');
    els.statusIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'error') {
    els.statusCard.classList.add('status-card--error');
    els.statusIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  } else if (type === 'loading') {
    els.statusIcon.classList.add('pulse');
    els.statusIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 28 28" fill="none"><path d="M16.5 4L8 15.5H13L11.5 24L20 12.5H15L16.5 4Z" fill="currentColor"/></svg>`;
  } else {
    els.statusIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  els.statusTitle.textContent = title;
  els.statusDesc.textContent = desc;
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

function showToast(type: 'success' | 'error', message: string): void {
  if (toastTimeout) clearTimeout(toastTimeout);

  els.toast.className = `toast toast--${type} show`;
  els.toastIcon.textContent = type === 'success' ? '✓' : '✕';
  els.toastText.textContent = message;

  toastTimeout = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3000);
}

// ─── Settings View ─────────────────────────────────────────────────────────────

function openSettings(): void {
  els.settingsView.setAttribute('aria-hidden', 'false');
}

function closeSettings(): void {
  els.settingsView.setAttribute('aria-hidden', 'true');
}

async function openEditor(profileId: string | null): Promise<void> {
  currentEditingProfileId = profileId;
  const titleEl = $('editor-title');

  if (profileId) {
    titleEl.textContent = 'Edit Profile';
    await loadProfileIntoForm(profileId);
  } else {
    titleEl.textContent = 'New Profile';
    clearForm();
    const type = activeTab === 'profiles' ? 'full' : 'login';
    els.selectProfileType.value = type;
    updateProfileTypeFields(type);

    if (type === 'login') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
          els.inputLoginDomain.value = hostname;
        }
      } catch (err) {
        console.warn('[ZeroDelay] Failed to get current tab hostname for auto-fill', err);
      }
    }
  }

  els.editorView.setAttribute('aria-hidden', 'false');
}

function closeEditor(): void {
  els.editorView.setAttribute('aria-hidden', 'true');
  currentEditingProfileId = null;
}

function clearForm(): void {
  els.profileForm.reset();
  els.inputProfileName.value = '';
  els.inputLoginEmail.value = '';
  els.inputLoginPassword.value = '';
  els.inputLoginDomain.value = '';
  els.inputFirstName.value = '';
  els.inputLastName.value = '';
  els.inputHeadline.value = '';
  els.inputEmail.value = '';
  els.inputPhone.value = '';
  els.inputCity.value = '';
  els.inputState.value = '';
  els.inputZip.value = '';
  els.inputCountry.value = '';
  els.inputAddress.value = '';
  els.inputLinkedin.value = '';
  els.inputGithub.value = '';
  els.inputWebsite.value = '';
  els.inputPortfolio.value = '';
  els.inputResume.value = '';
  els.inputTechnical.value = '';
  els.inputFrameworks.value = '';
  els.inputTools.value = '';
  els.inputLanguages.value = '';
  els.inputBio.value = '';
  els.inputSalary.value = '';
  els.inputAvailability.value = '';
  els.inputWorkAuth.value = '';
  els.inputCompany.value = '';
  els.inputJobTitle.value = '';
  els.inputYears.value = '';
  els.inputSchool.value = '';
  els.inputDegree.value = '';
  els.inputMajor.value = '';
}

function updateProfileTypeFields(type: 'full' | 'login'): void {
  if (type === 'login') {
    els.loginProfileFields.style.display = 'block';
    els.fullProfileFields.style.display = 'none';
  } else {
    els.loginProfileFields.style.display = 'none';
    els.fullProfileFields.style.display = 'block';
  }
}

async function loadProfileIntoForm(profileId: string): Promise<void> {
  const profile = await getProfile(profileId);
  if (!profile) return;

  currentEditingProfileId = profile.id;

  // Set Profile Type
  const profileType = profile.type || 'full';
  els.selectProfileType.value = profileType;
  updateProfileTypeFields(profileType);

  if (profileType === 'login' && profile.loginInfo) {
    els.inputLoginEmail.value = profile.loginInfo.email || '';
    els.inputLoginPassword.value = profile.loginInfo.password || '';
    els.inputLoginDomain.value = profile.associatedDomain || '';
  } else {
    els.inputLoginEmail.value = '';
    els.inputLoginPassword.value = '';
    els.inputLoginDomain.value = '';
  }

  // Populate form
  els.inputProfileName.value = profile.profileName || '';
  els.inputFirstName.value = profile.personalInfo?.firstName || '';
  els.inputLastName.value = profile.personalInfo?.lastName || '';
  els.inputHeadline.value = profile.personalInfo?.headline || '';
  els.inputEmail.value = profile.contactInfo?.email || '';
  els.inputPhone.value = profile.contactInfo?.phone || '';
  els.inputCity.value = profile.contactInfo?.city || '';
  els.inputState.value = profile.contactInfo?.state || '';
  els.inputZip.value = profile.contactInfo?.zipCode || '';
  els.inputCountry.value = profile.contactInfo?.country || '';
  els.inputAddress.value = profile.contactInfo?.address || '';
  els.inputLinkedin.value = profile.portfolioLinks?.linkedin || '';
  els.inputGithub.value = profile.portfolioLinks?.github || '';
  els.inputWebsite.value = profile.portfolioLinks?.website || '';
  els.inputPortfolio.value = profile.portfolioLinks?.portfolio || '';
  els.inputResume.value = profile.portfolioLinks?.resumeUrl || '';
  els.inputTechnical.value = (profile.skills?.technical || []).join(', ');
  els.inputFrameworks.value = (profile.skills?.frameworks || []).join(', ');
  els.inputTools.value = (profile.skills?.tools || []).join(', ');
  els.inputLanguages.value = (profile.skills?.languages || []).join(', ');
  els.inputBio.value = profile.bio || '';
  els.inputSalary.value = profile.salary ?? '';
  els.inputAvailability.value = profile.availability ?? '';
  els.inputWorkAuth.value = profile.workAuthorization ?? '';

  // Experience (first entry)
  if (profile.experience && profile.experience.length > 0) {
    els.inputCompany.value = profile.experience[0].company || '';
    els.inputJobTitle.value = profile.experience[0].title || '';
    els.inputYears.value = profile.experience[0].yearsOfExperience || '';
  } else {
    els.inputCompany.value = '';
    els.inputJobTitle.value = '';
    els.inputYears.value = '';
  }

  // Education (first entry)
  if (profile.education && profile.education.length > 0) {
    els.inputSchool.value = profile.education[0].school || '';
    els.inputDegree.value = profile.education[0].degree || '';
    els.inputMajor.value = profile.education[0].fieldOfStudy || '';
  } else {
    els.inputSchool.value = '';
    els.inputDegree.value = '';
    els.inputMajor.value = '';
  }
}

function parseCommaSeparated(value: string): string[] {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function cleanDomain(input: string): string | undefined {
  const val = input.trim().toLowerCase();
  if (!val) return undefined;
  try {
    const url = new URL(val.includes('://') ? val : `http://${val}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return val.replace(/^www\./, '');
  }
}

function validateRealisticData(profileType: 'full' | 'login'): string | null {
  if (profileType === 'login') {
    const domain = els.inputLoginDomain.value.trim();
    if (domain && domain.includes(' ')) {
      return 'Domain should not contain spaces.';
    }
  } else {
    const email = els.inputEmail.value.trim();
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    }

    const phone = els.inputPhone.value.trim();
    if (phone) {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{4,20}$/;
      if (!phoneRegex.test(phone)) return 'Please enter a realistic phone number.';
    }

    const years = els.inputYears.value.trim();
    if (years) {
      const numYears = parseFloat(years);
      if (!isNaN(numYears) && (numYears < 0 || numYears > 100)) {
        return 'Years of experience must be realistic (0-100).';
      }
    }

    // URL validation
    const urls = [
      { name: 'LinkedIn', value: els.inputLinkedin.value.trim() },
      { name: 'GitHub', value: els.inputGithub.value.trim() },
      { name: 'Website', value: els.inputWebsite.value.trim() },
      { name: 'Portfolio', value: els.inputPortfolio.value.trim() },
    ];

    for (const url of urls) {
      if (url.value && url.value.includes(' ')) {
        return `${url.name} URL should not contain spaces.`;
      }
      if (url.value && !url.value.includes('.') && !url.value.startsWith('http')) {
        return `${url.name} must be a valid URL or link.`;
      }
    }
  }
  return null; // Null means no errors
}

async function saveCurrentProfile(): Promise<void> {
  const profileId = currentEditingProfileId || `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const existing = await getProfile(profileId);
  const base = existing || { ...DEFAULT_PROFILE };
  const profileType = els.selectProfileType.value as 'full' | 'login';

  const validationError = validateRealisticData(profileType);
  if (validationError) {
    showToast('error', validationError);
    return;
  }

  let profile: UserProfile;

  if (profileType === 'login') {
    const email = els.inputLoginEmail.value.trim();
    const password = els.inputLoginPassword.value.trim();
    const domain = els.inputLoginDomain.value.trim();
    
    if (!email && !password && !domain) {
      showToast('error', 'Cannot save completely empty login profile');
      return;
    }

    profile = {
      ...base,
      id: profileId,
      type: 'login',
      profileName: els.inputProfileName.value.trim() || 'My Login Profile',
      associatedDomain: cleanDomain(domain),
      updatedAt: Date.now(),
      loginInfo: {
        email,
        password,
      },
    };
  } else {
    const firstName = els.inputFirstName.value.trim();
    const lastName = els.inputLastName.value.trim();
    
    const allText = firstName + lastName + els.inputEmail.value + els.inputPhone.value + els.inputHeadline.value + els.inputCity.value + els.inputState.value + els.inputZip.value + els.inputCountry.value + els.inputAddress.value + els.inputLinkedin.value + els.inputGithub.value + els.inputWebsite.value + els.inputPortfolio.value + els.inputResume.value + els.inputTechnical.value + els.inputFrameworks.value + els.inputTools.value + els.inputLanguages.value + els.inputCompany.value + els.inputJobTitle.value + els.inputYears.value + els.inputSchool.value + els.inputDegree.value + els.inputMajor.value + els.inputBio.value + els.inputSalary.value + els.inputAvailability.value + els.inputWorkAuth.value;
    
    if (!allText.trim()) {
      showToast('error', 'Cannot save completely empty profile');
      return;
    }

    profile = {
      ...base,
      id: profileId,
      type: 'full',
      profileName: els.inputProfileName.value.trim() || 'My Profile',
      updatedAt: Date.now(),
      personalInfo: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        headline: els.inputHeadline.value.trim(),
      },
      contactInfo: {
        email: els.inputEmail.value.trim(),
        phone: els.inputPhone.value.trim(),
        city: els.inputCity.value.trim(),
        state: els.inputState.value.trim(),
        zipCode: els.inputZip.value.trim(),
        country: els.inputCountry.value.trim(),
        address: els.inputAddress.value.trim(),
      },
      portfolioLinks: {
        linkedin: els.inputLinkedin.value.trim(),
        github: els.inputGithub.value.trim(),
        website: els.inputWebsite.value.trim(),
        portfolio: els.inputPortfolio.value.trim(),
        twitter: base.portfolioLinks?.twitter || '',
        resumeUrl: els.inputResume.value.trim(),
      },
      skills: {
        technical: parseCommaSeparated(els.inputTechnical.value),
        frameworks: parseCommaSeparated(els.inputFrameworks.value),
        tools: parseCommaSeparated(els.inputTools.value),
        languages: parseCommaSeparated(els.inputLanguages.value),
      },
      experience: [{
        company: els.inputCompany.value.trim(),
        title: els.inputJobTitle.value.trim(),
        yearsOfExperience: els.inputYears.value.trim(),
        startDate: base.experience[0]?.startDate ?? '',
        endDate: base.experience[0]?.endDate ?? '',
        description: base.experience[0]?.description ?? '',
        current: true,
      }],
      education: [{
        school: els.inputSchool.value.trim(),
        degree: els.inputDegree.value.trim(),
        fieldOfStudy: els.inputMajor.value.trim(),
        startDate: base.education[0]?.startDate ?? '',
        endDate: base.education[0]?.endDate ?? '',
      }],
      bio: els.inputBio.value.trim(),
      salary: els.inputSalary.value.trim() || undefined,
      availability: els.inputAvailability.value.trim() || undefined,
      workAuthorization: els.inputWorkAuth.value.trim() || undefined,
      customFields: base.customFields || [],
    };
  }

  const success = await saveProfile(profile);
  if (success) {
    showToast('success', 'Profile saved!');
    await setActiveProfileId(profileId);
    await populateProfiles();
    closeEditor();
  } else {
    showToast('error', 'Failed to save profile');
  }
}

async function deleteCurrentProfile(): Promise<void> {
  if (!currentEditingProfileId) return;

  const profiles = await getAllProfiles();
  if (Object.keys(profiles).length <= 1) {
    showToast('error', 'Cannot delete the last profile');
    return;
  }

  const success = await deleteProfile(currentEditingProfileId);
  if (success) {
    showToast('success', 'Profile deleted');
    await populateProfiles();
    closeEditor();
  }
}

// ─── Page Status Check ─────────────────────────────────────────────────────────

async function checkPageStatus(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus('ready', 'Ready', 'Navigate to a job application to begin');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: MessageType.GET_STATUS,
    }) as StatusResponseMessage;

    if (response.ready) {
      const hostname = new URL(response.currentUrl).hostname.replace(/^www\./, '');
      setStatus('ready', 'Connected', `${response.detectedFields} fields detected on ${hostname}`);
    }
  } catch {
    setStatus('ready', 'Ready', 'Navigate to a job application to begin');
  }
}

// ─── Event Listeners ───────────────────────────────────────────────────────────

function bindEvents(): void {
  els.btnSettings.addEventListener('click', openSettings);
  els.btnSettingsBack.addEventListener('click', closeSettings);
  els.btnEditorBack.addEventListener('click', closeEditor);
  els.btnEditActive.addEventListener('click', () => openEditor(els.profileDropdown.value || null));
  els.btnNewActive.addEventListener('click', () => openEditor(null));
  
  els.btnFill.addEventListener('click', executeAutoFill);
  els.btnSaveProfile.addEventListener('click', saveCurrentProfile);
  els.btnDeleteProfile.addEventListener('click', deleteCurrentProfile);
  els.profileDropdown.addEventListener('change', onProfileChange);
  els.selectProfileType.addEventListener('change', () => {
    updateProfileTypeFields(els.selectProfileType.value as 'full' | 'login');
  });

  // Tab Controls listeners
  els.tabBtnProfiles.addEventListener('click', async () => {
    if (activeTab === 'profiles') return;
    activeTab = 'profiles';
    els.tabBtnProfiles.classList.add('active');
    els.tabBtnLogins.classList.remove('active');
    await populateProfiles();
  });

  els.tabBtnLogins.addEventListener('click', async () => {
    if (activeTab === 'logins') return;
    activeTab = 'logins';
    els.tabBtnLogins.classList.add('active');
    els.tabBtnProfiles.classList.remove('active');
    await populateProfiles();
  });

  // Lock view listeners
  els.btnUnlock.addEventListener('click', handleUnlock);
  els.lockPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  });
  els.lockPasswordConfirm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  });

  // Password Generator listeners
  els.passwordLengthSlider.addEventListener('input', () => {
    els.passwordLengthVal.textContent = els.passwordLengthSlider.value;
    generatePopupPassword();
  });
  els.chkUppercase.addEventListener('change', generatePopupPassword);
  els.chkLowercase.addEventListener('change', generatePopupPassword);
  els.chkNumbers.addEventListener('change', generatePopupPassword);
  els.chkSymbols.addEventListener('change', generatePopupPassword);
  els.btnRegenPassword.addEventListener('click', generatePopupPassword);
  els.btnCopyPassword.addEventListener('click', copyPopupPassword);

  // Backup & Restore listeners
  els.btnExportBackup.addEventListener('click', handleExportBackup);
  els.chkAutoBackup.addEventListener('change', handleAutoBackupToggle);
  els.selectAutoBackupInterval.addEventListener('change', handleAutoBackupIntervalChange);
  els.btnImportTrigger.addEventListener('click', () => {
    // If we are in a popup, open a new tab to avoid the file picker closing the popup
    if (!window.location.search.includes('tab=true')) {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=true&action=import') });
      window.close();
    } else {
      els.inputImportFile.click();
    }
  });
  els.inputImportFile.addEventListener('change', handleImportFileChange);

  // Standalone Generator button listeners
  els.btnGenerator.addEventListener('click', openGenerator);
  els.btnGeneratorBack.addEventListener('click', closeGenerator);
  els.btnGeneratorCopyBottom.addEventListener('click', copyPopupPassword);

  // Drag and drop listeners on body to allow importing backups by dragging & dropping them
  document.body.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.add('drag-over');
  });

  document.body.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.remove('drag-over');
  });

  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.remove('drag-over');

    const file = e.dataTransfer?.files?.[0];
    if (file && (file.type === "application/json" || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          const data = JSON.parse(json);
          await importBackupData(data);
        } catch (err) {
          console.error('[ZeroDelay] Drop import error:', err);
          showToast('error', 'Failed to restore backup');
        }
      };
      reader.readAsText(file);
    } else {
      showToast('error', 'Invalid file type. Please drop a .json file.');
    }
  });
}

// ─── Initialize ────────────────────────────────────────────────────────────────

async function initWorkspace(): Promise<void> {
  await populateProfiles();
  await checkPageStatus();
  generatePopupPassword();

  const selectedId = els.profileDropdown.value;
  if (selectedId) {
    const profile = await getProfile(selectedId);
    await validateProfileForCurrentTab(profile);
  }
}

async function init(): Promise<void> {
  if (window.location.search.includes('tab=true')) {
    document.body.classList.add('is-tab');
  }
  await initSettingsUI();
  bindEvents();
  const locked = await checkLockStatus();
  if (!locked) {
    await initWorkspace();
  }

  // Handle URL actions (specifically triggered from full tab redirection)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'import') {
    openSettings();
    setTimeout(() => {
      els.inputImportFile.click();
    }, 400); // Small timeout to ensure browser is ready to trigger the file dialog
  }

  // Populate extension ID info
  const idInfo = document.getElementById('extension-id-info');
  if (idInfo) {
    idInfo.textContent = `ID: ${chrome.runtime.id}`;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
