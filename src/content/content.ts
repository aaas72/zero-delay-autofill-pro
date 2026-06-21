// ─── Content Script: Zero-Delay Auto-Fill Engine ──────────────────────────────
// Core content script injected into job application pages. Handles:
// 1. Field recognition via regex pattern matching
// 2. Instant value injection with SPA-compatible event dispatch
// 3. Message handling from popup

import { FIELD_PATTERNS, FieldPattern } from './field-patterns';
import { MessageType, FillResultMessage, ExtensionMessage } from '../shared/types/messages';
import { UserProfile } from '../shared/types/profile';
import { generateSecurePassword } from '../shared/crypto';

// ─── Storage Decryption Proxy Helpers ───────────────────────────────────────────

async function fetchActiveProfile(): Promise<{ profile: UserProfile | null; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_PROFILE', hostname: window.location.hostname }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ profile: null, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { profile: null });
      }
    });
  });
}

async function fetchSiteData(hostname: string): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SITE_DATA', hostname }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response?.siteData || null);
      }
    });
  });
}

async function saveSiteDataRemote(hostname: string, fields: Record<string, string>, isLogin?: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SAVE_SITE_DATA', hostname, fields, isLogin }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(!!response?.success);
      }
    });
  });
}

// ─── DOM Value Resolver ────────────────────────────────────────────────────────
// Resolves a dot-notation path (e.g. "contactInfo.email") against a profile object

function resolveProfileValue(profile: UserProfile, path: string): string {
  try {
    // If it's a login profile, restrict auto-fill only to login credentials
    if (profile.type === 'login') {
      if (path === 'contactInfo.email' || path === 'loginInfo.email') {
        return profile.loginInfo?.email || '';
      }
      if (path === 'loginInfo.password') {
        return profile.loginInfo?.password || '';
      }
      return '';
    }

    const parts = path.split('.');
    let current: unknown = profile;

    for (const part of parts) {
      if (current === null || current === undefined) return '';

      // Handle array notation like "experience[0]"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, indexStr] = arrayMatch;
        const arr = (current as Record<string, unknown>)[key];
        if (!Array.isArray(arr)) return '';
        const index = parseInt(indexStr, 10);
        current = arr[index];
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    // Convert arrays to comma-separated string
    if (Array.isArray(current)) {
      return current.join(', ');
    }

    return typeof current === 'string' || typeof current === 'number'
      ? String(current)
      : '';
  } catch {
    return '';
  }
}

// ─── Element Attribute Analyzer ────────────────────────────────────────────────
// Extracts all text signals from an input element for pattern matching

interface ElementSignals {
  name: string;
  id: string;
  placeholder: string;
  ariaLabel: string;
  autocomplete: string;
  labelText: string;
  type: string;
}

function getElementSignals(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): ElementSignals {
  const name = el.getAttribute('name') ?? '';
  const id = el.id ?? '';
  const placeholder = el.getAttribute('placeholder') ?? '';
  const ariaLabel = el.getAttribute('aria-label') ?? '';
  const autocomplete = el.getAttribute('autocomplete') ?? '';
  const type = el.getAttribute('type') ?? 'text';

  // Find associated label text
  let labelText = '';

  // Method 1: <label for="id">
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) labelText = label.textContent?.trim() ?? '';
  }

  // Method 2: Parent <label> wrapping the input
  if (!labelText) {
    const parentLabel = el.closest('label');
    if (parentLabel) {
      labelText = parentLabel.textContent?.trim() ?? '';
    }
  }

  // Method 3: Previous sibling or nearby text
  if (!labelText) {
    const prev = el.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'DIV')) {
      labelText = prev.textContent?.trim() ?? '';
    }
  }

  return { name, id, placeholder, ariaLabel, autocomplete, labelText, type };
}

// ─── Pattern Matching Engine ───────────────────────────────────────────────────

function matchFieldPattern(signals: ElementSignals): FieldPattern | null {
  const textSignals = [
    signals.name,
    signals.id,
    signals.placeholder,
    signals.ariaLabel,
    signals.labelText,
  ].filter(Boolean);

  for (const pattern of FIELD_PATTERNS) {
    // Check autocomplete attribute first (highest confidence)
    if (pattern.autocomplete && signals.autocomplete) {
      if (pattern.autocomplete.includes(signals.autocomplete)) {
        return pattern;
      }
    }

    // Check regex patterns against all text signals
    for (const regex of pattern.patterns) {
      for (const text of textSignals) {
        if (regex.test(text)) {
          return pattern;
        }
      }
    }
  }

  return null;
}

// ─── SPA-Compatible Event Dispatch ─────────────────────────────────────────────
// Triggers native DOM events so React/Angular/Vue register the injected values

function dispatchInputEvents(el: HTMLElement): void {
  // Use native setter for React compatibility
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'value'
  )?.set;
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (el instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(el, el.value);
  } else if (el instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(el, el.value);
  }

  // Dispatch all relevant events
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));

  // Also dispatch keyboard event for extra compatibility
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Unidentified' }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }));
}

// ─── Select Dropdown Handler ───────────────────────────────────────────────────

function fillSelectElement(select: HTMLSelectElement, value: string): boolean {
  const lowerValue = value.toLowerCase();

  for (const option of Array.from(select.options)) {
    const optText = option.textContent?.toLowerCase().trim() ?? '';
    const optValue = option.value.toLowerCase().trim();

    if (optText === lowerValue || optValue === lowerValue ||
        optText.includes(lowerValue) || lowerValue.includes(optText)) {
      select.value = option.value;
      dispatchInputEvents(select);
      return true;
    }
  }
  return false;
}

// ─── Main Fill Engine ──────────────────────────────────────────────────────────

interface FillResult {
  filledCount: number;
  totalFields: number;
  errors: string[];
}

function fillForm(profile: UserProfile): FillResult {
  const result: FillResult = { filledCount: 0, totalFields: 0, errors: [] };

  // Query all form elements in a single DOM pass
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([type="image"]), textarea, select'
  );

  result.totalFields = inputs.length;

  for (const el of inputs) {
    try {
      // Skip already-filled fields, disabled, or readonly
      if (el.disabled) continue;
      if ('readOnly' in el && el.readOnly) continue;
      if (el.value && el.value.trim().length > 0) continue;

      const signals = getElementSignals(el);
      const matched = matchFieldPattern(signals);

      if (!matched) continue;

      const value = resolveProfileValue(profile, matched.profilePath);
      if (!value) continue;

      // Handle different element types
      if (el instanceof HTMLSelectElement) {
        if (fillSelectElement(el, value)) {
          result.filledCount++;
        }
      } else if (el instanceof HTMLInputElement) {
        const type = signals.type.toLowerCase();

        if (type === 'checkbox' || type === 'radio') {
          // For checkboxes/radios, check if label matches value
          const labelLower = signals.labelText.toLowerCase();
          const valueLower = value.toLowerCase();
          if (labelLower.includes(valueLower) || valueLower.includes(labelLower)) {
            el.checked = true;
            dispatchInputEvents(el);
            result.filledCount++;
          }
        } else {
          // Standard text/email/tel/url input
          el.value = value;
          dispatchInputEvents(el);
          result.filledCount++;
        }
      } else if (el instanceof HTMLTextAreaElement) {
        el.value = value;
        dispatchInputEvents(el);
        result.filledCount++;
      }
    } catch (error) {
      result.errors.push(`Failed to fill field: ${(error as Error).message}`);
    }
  }

  return result;
}

// ─── Count Detected Fields (for status) ────────────────────────────────────────

function countDetectedFields(): number {
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
  );
  let count = 0;
  for (const el of inputs) {
    const signals = getElementSignals(el);
    if (matchFieldPattern(signals)) count++;
  }
  return count;
}

// ─── Message Listener ──────────────────────────────────────────────────────────
// Listens for commands from the popup or background script

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === MessageType.FILL_FORM) {
      // Execute fill asynchronously but respond synchronously
      (async () => {
        try {
          const { profile, error } = await fetchActiveProfile();
          if (error === 'LOCKED') {
            const response: FillResultMessage = {
              type: MessageType.FILL_RESULT,
              success: false,
              filledCount: 0,
              totalFields: 0,
              errors: ['Vault is locked. Please unlock the extension.'],
            };
            sendResponse(response);
            return;
          }
          if (error === 'LOCKED_DOMAIN') {
            const response: FillResultMessage = {
              type: MessageType.FILL_RESULT,
              success: false,
              filledCount: 0,
              totalFields: 0,
              errors: ['This login profile is restricted to its saved domain.'],
            };
            sendResponse(response);
            return;
          }
          if (!profile) {
            const response: FillResultMessage = {
              type: MessageType.FILL_RESULT,
              success: false,
              filledCount: 0,
              totalFields: 0,
              errors: ['No active profile found. Please set up a profile in settings.'],
            };
            sendResponse(response);
            return;
          }

          const result = fillForm(profile);
          let filledCount = result.filledCount;
          
          try {
            const hostname = window.location.hostname;
            const siteData = await fetchSiteData(hostname);
            if (siteData && siteData.fields) {
              let siteFilledCount = 0;
              for (const [key, val] of Object.entries(siteData.fields as Record<string, string>)) {
                if (!val) continue;
                const query = `input[name="${CSS.escape(key)}"], input[id="${CSS.escape(key)}"], textarea[name="${CSS.escape(key)}"], textarea[id="${CSS.escape(key)}"], select[name="${CSS.escape(key)}"], select[id="${CSS.escape(key)}"]`;
                const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(query);
                if (el && !el.disabled && !('readOnly' in el && el.readOnly)) {
                  if (el instanceof HTMLSelectElement) {
                    if (fillSelectElement(el, val)) siteFilledCount++;
                  } else {
                    el.value = val;
                    dispatchInputEvents(el);
                    siteFilledCount++;
                  }
                }
              }
              filledCount += siteFilledCount;
            }
          } catch (err) {
            console.error('[ZeroDelay] Error filling site data:', err);
          }

          const response: FillResultMessage = {
            type: MessageType.FILL_RESULT,
            success: filledCount > 0,
            filledCount: filledCount,
            totalFields: result.totalFields,
            errors: result.errors,
          };
          sendResponse(response);
        } catch (error) {
          const response: FillResultMessage = {
            type: MessageType.FILL_RESULT,
            success: false,
            filledCount: 0,
            totalFields: 0,
            errors: [(error as Error).message],
          };
          sendResponse(response);
        }
      })();

      // Return true to indicate async response
      return true;
    }

    if (message.type === MessageType.GET_STATUS) {
      sendResponse({
        type: MessageType.STATUS_RESPONSE,
        ready: true,
        currentUrl: window.location.href,
        detectedFields: countDetectedFields(),
      });
      return true;
    }

    return false;
  }
);

// ─── Floating Autofill Badge & Interceptor Implementation ──────────────────────

let zdBadge: HTMLElement | null = null;
let activeElement: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;

function injectStyles(): void {
  if (document.getElementById('zd-styles')) return;

  const style = document.createElement('style');
  style.id = 'zd-styles';
  style.textContent = `
    #zd-floating-badge {
      transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, opacity 0.15s ease !important;
    }
    #zd-floating-badge:active {
      transform: scale(0.85) !important;
    }
    
    .zd-toast-banner {
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 0;
      background: #282C2D;
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      color: #FFFFFF;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 500;
      transition: top 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
    }
    .zd-toast-banner--success {
      border-left: 4px solid #00D68F;
    }
    .zd-toast-banner--info {
      border-left: 4px solid #00D68F;
    }
    .zd-toast-banner__title {
      margin: 0;
      color: #FFFFFF;
    }
    .zd-toast-banner__btn {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      color: #FFFFFF;
      padding: 6px 12px;
      border-radius: 0;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: background 0.2s ease;
      margin-left: 8px;
    }
    .zd-toast-banner__btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .zd-toast-banner__btn--danger {
      background: rgba(255, 76, 76, 0.18);
      color: #FF7676;
    }
    .zd-toast-banner__btn--danger:hover {
      background: rgba(255, 76, 76, 0.28);
    }
    .zd-toast-banner__close {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
      line-height: 1;
      transition: color 0.2s ease;
    }
    .zd-toast-banner__close:hover {
      color: #FFFFFF;
    }
  `;
  document.head.appendChild(style);
}

function showToastBanner(
  message: string,
  success: boolean,
  action?: { label: string; onClick: () => void }
): void {
  injectStyles();
  
  const existing = document.querySelector('.zd-toast-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = `zd-toast-banner ${success ? 'zd-toast-banner--success' : 'zd-toast-banner--info'}`;
  
  const svgSuccess = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D68F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const svgInfo = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D68F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
  const iconHtml = success ? svgSuccess : svgInfo;

  banner.innerHTML = `
    ${iconHtml}
    <span class="zd-toast-banner__title">${message}</span>
  `;

  if (action) {
    const btn = document.createElement('button');
    btn.className = 'zd-toast-banner__btn zd-toast-banner__btn--danger';
    btn.textContent = action.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
      banner.style.top = '-100px';
      setTimeout(() => banner.remove(), 400);
    });
    banner.appendChild(btn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'zd-toast-banner__close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    banner.style.top = '-100px';
    setTimeout(() => banner.remove(), 400);
  });
  banner.appendChild(closeBtn);

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.style.top = '20px';
  }, 10);

  setTimeout(() => {
    if (banner.parentElement) {
      banner.style.top = '-100px';
      setTimeout(() => banner.remove(), 400);
    }
  }, 5000);
}

async function handleTriggerFill(): Promise<void> {
  try {
    const { profile, error } = await fetchActiveProfile();
    if (error === 'LOCKED') {
      showToastBanner('Vault is locked. Open the extension to unlock.', false);
      return;
    }
    if (error === 'LOCKED_DOMAIN') {
      showToastBanner('This login profile is restricted to its saved domain.', false);
      return;
    }
    if (!profile) {
      showToastBanner('No active profile found. Please set up a profile.', false);
      return;
    }

    const profileResult = fillForm(profile);
    let filledCount = profileResult.filledCount;

    const hostname = window.location.hostname;
    const siteData = await fetchSiteData(hostname);
    if (siteData && siteData.fields) {
      let siteFilledCount = 0;
      for (const [key, val] of Object.entries(siteData.fields as Record<string, string>)) {
        if (!val) continue;
        const query = `input[name="${CSS.escape(key)}"], input[id="${CSS.escape(key)}"], textarea[name="${CSS.escape(key)}"], textarea[id="${CSS.escape(key)}"], select[name="${CSS.escape(key)}"], select[id="${CSS.escape(key)}"]`;
        const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(query);
        if (el && !el.disabled && !('readOnly' in el && el.readOnly)) {
          if (el instanceof HTMLSelectElement) {
            if (fillSelectElement(el, val)) siteFilledCount++;
          } else {
            el.value = val;
            dispatchInputEvents(el);
            siteFilledCount++;
          }
        }
      }
      filledCount += siteFilledCount;
    }

    if (filledCount > 0) {
      showToastBanner(`⚡ Auto-filled ${filledCount} fields!`, true);
    } else {
      showToastBanner('No empty matched fields found.', false);
    }
  } catch (err) {
    console.error('[ZeroDelay] Trigger fill error:', err);
    showToastBanner('Error during auto-fill.', false);
  }
}

function isEligibleInput(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (el.disabled || ('readOnly' in el && el.readOnly)) return false;
  
  if (el instanceof HTMLInputElement) {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    const ineligibleTypes = ['hidden', 'submit', 'button', 'reset', 'checkbox', 'radio', 'file', 'image'];
    if (ineligibleTypes.includes(type)) return false;
  }
  
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  return true;
}

function positionBadge(el: HTMLElement): void {
  if (!zdBadge) injectFloatingBadge();
  if (!zdBadge) return;

  const rect = el.getBoundingClientRect();
  const badgeSize = 20;
  const rightOffset = 8;

  // Use fixed viewport coordinates
  const left = rect.left + rect.width - badgeSize - rightOffset;
  const top = rect.top + (rect.height - badgeSize) / 2;

  zdBadge.style.left = `${left}px`;
  zdBadge.style.top = `${top}px`;
  zdBadge.style.display = 'flex';

  // Customize floating badge style and tooltip for password inputs
  if (el instanceof HTMLInputElement && el.type === 'password') {
    zdBadge.title = 'Generate & Autofill Password';
    zdBadge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    `;
  } else {
    zdBadge.title = 'Auto-Fill';
    zdBadge.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
        <path d="M16.5 4L8 15.5H13L11.5 24L20 12.5H15L16.5 4Z" fill="currentColor" />
      </svg>
    `;
  }
}

async function handlePasswordGeneration(): Promise<void> {
  if (!activeElement || !(activeElement instanceof HTMLInputElement)) return;

  try {
    const password = generateSecurePassword(16, {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true
    });

    activeElement.value = password;
    dispatchInputEvents(activeElement);

    let confirmFieldsFilled = 0;
    const parentForm = activeElement.closest('form');
    const queryScope = parentForm || document;
    
    const otherPassFields = queryScope.querySelectorAll<HTMLInputElement>('input[type="password"]');
    for (const field of otherPassFields) {
      if (field !== activeElement && !field.disabled && !field.readOnly) {
        const idLower = (field.id || '').toLowerCase();
        const nameLower = (field.getAttribute('name') || '').toLowerCase();
        const placeholderLower = (field.getAttribute('placeholder') || '').toLowerCase();
        
        if (
          idLower.includes('confirm') || idLower.includes('repeat') || idLower.includes('check') || idLower.includes('retry') || idLower.includes('match') ||
          nameLower.includes('confirm') || nameLower.includes('repeat') || nameLower.includes('check') || nameLower.includes('retry') || nameLower.includes('match') ||
          placeholderLower.includes('confirm') || placeholderLower.includes('repeat') || placeholderLower.includes('check') || placeholderLower.includes('type again')
        ) {
          field.value = password;
          dispatchInputEvents(field);
          confirmFieldsFilled++;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(password);
      const msg = confirmFieldsFilled > 0 
        ? 'Password generated & autofilled (confirm fields matched, copied to clipboard)!'
        : 'Password generated & autofilled (copied to clipboard)!';
      showToastBanner(msg, true);
    } catch (clipboardErr) {
      const msg = confirmFieldsFilled > 0
        ? 'Password generated & autofilled (confirm fields matched)!'
        : 'Password generated & autofilled!';
      showToastBanner(msg, true);
    }
  } catch (err) {
    console.error('[ZeroDelay] Password generation error:', err);
    showToastBanner('Error generating secure password.', false);
  }
}

// Global variable to keep track of mouse coordinate inside page
let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}, { passive: true });

function hideBadge(): void {
  if (zdBadge) {
    // If the mouse is currently hovering over the badge, don't hide it immediately
    const rect = zdBadge.getBoundingClientRect();
    if (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    ) {
      return;
    }
    zdBadge.style.display = 'none';
  }
}

function injectFloatingBadge(): void {
  if (document.getElementById('zd-floating-badge')) return;

  const badge = document.createElement('div');
  badge.id = 'zd-floating-badge';
  badge.title = 'Auto-Fill';
  badge.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  document.body.appendChild(badge);

  badge.style.position = 'fixed';
  badge.style.zIndex = '2147483647';
  badge.style.display = 'none';
  badge.style.alignItems = 'center';
  badge.style.justifyContent = 'center';
  badge.style.width = '20px';
  badge.style.height = '20px';
  badge.style.borderRadius = '0px';
  badge.style.cursor = 'pointer';
  badge.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
  badge.style.background = '#00D68F';
  badge.style.color = '#FFFFFF';
  badge.style.pointerEvents = 'auto';

  badge.addEventListener('mouseenter', () => {
    badge.style.transform = 'scale(1.15)';
    badge.style.background = '#00B87A';
  });
  badge.addEventListener('mouseleave', () => {
    badge.style.transform = 'scale(1)';
    badge.style.background = '#00D68F';
  });

  badge.addEventListener('mousedown', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeElement) {
      if (activeElement instanceof HTMLInputElement && activeElement.type === 'password') {
        await handlePasswordGeneration();
      } else {
        await handleTriggerFill();
      }
    }
  });

  zdBadge = badge;
}

// ─── Input Focus Event Listeners ───────────────────────────────────────────────

document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    if (isEligibleInput(target)) {
      activeElement = target;
      positionBadge(target);
    } else {
      hideBadge();
    }
  } else {
    hideBadge();
  }
});

document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (document.activeElement !== activeElement && document.activeElement?.id !== 'zd-floating-badge') {
      hideBadge();
    }
  }, 250);
});

window.addEventListener('scroll', () => {
  if (activeElement && zdBadge && zdBadge.style.display !== 'none') {
    positionBadge(activeElement);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (activeElement && zdBadge && zdBadge.style.display !== 'none') {
    positionBadge(activeElement);
  }
}, { passive: true });

// ─── Form Submission Interception ──────────────────────────────────────────────

function showConfirmBanner(
  message: string,
  hostname: string,
  fields: Record<string, string>,
  isLogin?: boolean
): void {
  injectStyles();
  
  const existing = document.querySelector('.zd-toast-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = `zd-toast-banner zd-toast-banner--info`;
  
  const svgInfo = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D68F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
  banner.innerHTML = `
    ${svgInfo}
    <span class="zd-toast-banner__title">${message}</span>
  `;

  // Save Button
  const saveBtn = document.createElement('button');
  saveBtn.className = 'zd-toast-banner__btn';
  saveBtn.style.background = '#00D68F';
  saveBtn.style.color = '#FFFFFF';
  saveBtn.style.border = 'none';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const success = await saveSiteDataRemote(hostname, fields, isLogin);
    
    banner.style.top = '-100px';
    setTimeout(() => {
      banner.remove();
      if (success) {
        chrome.storage.local.remove('pendingSaveSite');
        showToastBanner('Saved successfully!', true);
      } else {
        showToastBanner('Failed to save. Please unlock the extension vault first.', false);
      }
    }, 400);
  });
  banner.appendChild(saveBtn);

  // Ignore Button
  const ignoreBtn = document.createElement('button');
  ignoreBtn.className = 'zd-toast-banner__btn zd-toast-banner__btn--danger';
  ignoreBtn.textContent = 'Ignore';
  ignoreBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await chrome.storage.local.remove('pendingSaveSite');
    banner.style.top = '-100px';
    setTimeout(() => banner.remove(), 400);
  });
  banner.appendChild(ignoreBtn);

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.style.top = '20px';
  }, 10);

  // Let it stay longer so the user has time to read and click
  setTimeout(() => {
    if (banner.parentElement) {
      banner.style.top = '-100px';
      setTimeout(() => banner.remove(), 400);
    }
  }, 15000);
}

document.addEventListener('submit', async (e) => {
  const form = e.target as HTMLFormElement;
  if (!form) return;

  const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
  );

  const fields: Record<string, string> = {};
  let hasPassword = false;
  let hasText = false;
  let detectedEmail = '';
  let detectedPassword = '';

  for (const el of inputs) {
    const val = el.value?.trim();
    if (!val) continue;

    if (el instanceof HTMLInputElement && el.type === 'password') {
      if (val.length >= 4) {
        hasPassword = true;
        detectedPassword = val;
      }
    } else if (el instanceof HTMLInputElement && (el.type === 'text' || el.type === 'email')) {
      hasText = true;
      if (!detectedEmail) detectedEmail = val;
    }

    const key = el.getAttribute('name') || el.id;
    if (key) {
      fields[key] = val;
    }
  }

  // Only prompt for form inputs if there's text or password fields filled
  if (Object.keys(fields).length > 0) {
    const hostname = window.location.hostname;
    
    // Save to pending storage
    await chrome.storage.local.set({
      pendingSaveSite: {
        hostname,
        fields,
        detectedEmail,
        detectedPassword,
        timestamp: Date.now()
      }
    });

    const isLogin = hasPassword && hasText;
    const msg = isLogin
      ? `Save credentials for ${hostname}?`
      : `Save inputs for ${hostname}?`;

    // Show confirm banner after a short delay
    // If the page navigates immediately (traditional login), this timeout won't fire,
    // and the banner will be shown cleanly on the next page via checkPendingSaveSiteNotification.
    // If it's an SPA (no navigation), it shows up after 1 second.
    setTimeout(() => {
      showConfirmBanner(msg, hostname, fields, isLogin);
    }, 1000);
  }
});

// ─── Post-Reload Pending Save Check ────────────────────────────────────────────

async function checkPendingSaveSiteNotification(): Promise<void> {
  try {
    const result = await chrome.storage.local.get('pendingSaveSite');
    if (result && result.pendingSaveSite) {
      const { hostname, fields, detectedEmail, detectedPassword, timestamp } = result.pendingSaveSite;
      
      const currentHost = window.location.hostname.replace(/^www\./, '');
      const savedHost = hostname.replace(/^www\./, '');
      // Match if they are the same, or one is a subdomain of the other (e.g., login.site.com -> app.site.com)
      const rootMatch = currentHost.includes(savedHost) || savedHost.includes(currentHost) || currentHost === savedHost;
      
      if (rootMatch && Date.now() - timestamp < 60000) {
        const isLogin = !!(detectedPassword && detectedEmail);
        const msg = isLogin
          ? `Save credentials for ${hostname}?`
          : `Save inputs for ${hostname}?`;

        showConfirmBanner(msg, hostname, { ...fields, _zd_email: detectedEmail, _zd_password: detectedPassword }, isLogin);
      } else if (Date.now() - timestamp >= 60000) {
        // Only clear if it's expired, so it persists across multiple rapid redirects
        await chrome.storage.local.remove('pendingSaveSite');
      }
    }
  } catch (err) {
    console.error('[ZeroDelay] Error checking pending save notification:', err);
  }
}

// Initialize
injectStyles();
checkPendingSaveSiteNotification();

console.log('[ZeroDelay] Content script loaded on:', window.location.hostname);
