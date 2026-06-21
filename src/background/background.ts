// ─── Background Service Worker ─────────────────────────────────────────────────
// Manifest V3 service worker handling:
// - Extension installation & initialization
// - Context menu integration
// - Message relay between popup and content scripts

import { initializeStorage, getActiveProfile, getSiteData, saveSiteData, saveProfile } from '../shared/storage';
import { UserProfile } from '../shared/types/profile';

// ─── Installation Handler ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ZeroDelay] Extension installed:', details.reason);

  // Seed default profile if storage is empty
  await initializeStorage();

  // Create context menu item
  chrome.contextMenus.create({
    id: 'zero-delay-fill',
    title: '⚡ Auto-Fill This Page',
    contexts: ['page'],
  });
});

// ─── Context Menu Handler ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'zero-delay-fill' && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FORM',
        profileId: 'active',
      });
    } catch (error) {
      console.error('[ZeroDelay] Failed to send fill command:', error);
    }
  }
});

// ─── Startup Handler ───────────────────────────────────────────────────────────

chrome.runtime.onStartup.addListener(async () => {
  console.log('[ZeroDelay] Extension started');
  await initializeStorage();
});

// ─── Content Script Storage / Encryption Proxy ──────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_PROFILE') {
    getActiveProfile()
      .then((profile) => {
        if (profile && profile.type === 'login' && profile.associatedDomain && message.hostname) {
          const cleanPageDomain = message.hostname.toLowerCase().replace(/^www\./, '');
          const cleanProfileDomain = profile.associatedDomain.toLowerCase().replace(/^www\./, '');
          
          if (cleanPageDomain !== cleanProfileDomain && !cleanPageDomain.endsWith('.' + cleanProfileDomain)) {
            sendResponse({ profile: null, error: 'LOCKED_DOMAIN', associatedDomain: profile.associatedDomain });
            return;
          }
        }
        sendResponse({ profile, error: null });
      })
      .catch((err) => {
        console.error('[ZeroDelay] Failed to get active profile:', err);
        sendResponse({ profile: null, error: err.message });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_SITE_DATA') {
    getSiteData(message.hostname)
      .then((siteData) => {
        sendResponse({ siteData, error: null });
      })
      .catch((err) => {
        console.error('[ZeroDelay] Failed to get site data:', err);
        sendResponse({ siteData: null, error: err.message });
      });
    return true;
  }

  if (message.type === 'SAVE_SITE_DATA') {
    (async () => {
      try {
        // 1. Keep the raw form data saved
        await saveSiteData(message.hostname, message.fields);

        // 2. If it is a login form, save it as a UserProfile of type 'login'
        if (message.isLogin) {
          let email = message.fields['_zd_email'] || '';
          let password = message.fields['_zd_password'] || '';

          // Fallback heuristic if explicit fields are missing
          if (!password || !email) {
            for (const [key, val] of Object.entries(message.fields)) {
              if (key === '_zd_email' || key === '_zd_password') continue;
              const keyLower = key.toLowerCase();
              if (!password && (keyLower.includes('pass') || keyLower.includes('pwd'))) {
                password = val as string;
              } else if (!email && (
                keyLower.includes('email') ||
                keyLower.includes('user') ||
                keyLower.includes('login') ||
                keyLower.includes('name') ||
                keyLower.includes('mail')
              )) {
                email = val as string;
              }
            }
          }

          if (password) {
            const newProfile: UserProfile = {
              id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              type: 'login',
              profileName: `${message.hostname} (Login)`,
              associatedDomain: message.hostname,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              loginInfo: {
                email: email || 'user',
                password: password,
              },
              personalInfo: { firstName: '', lastName: '', fullName: '', headline: '' },
              contactInfo: { email: email || '', phone: '', address: '', city: '', state: '', zipCode: '', country: '' },
              portfolioLinks: { linkedin: '', github: '', website: '', portfolio: '', twitter: '', resumeUrl: '' },
              skills: { technical: [], frameworks: [], languages: [], tools: [] },
              education: [],
              experience: [],
              bio: '',
              customFields: [],
            };
            await saveProfile(newProfile);
          }
        }
        sendResponse({ success: true, error: null });
      } catch (err) {
        console.error('[ZeroDelay] Failed to save site data:', err);
        sendResponse({ success: false, error: (err as Error).message });
      }
    })();
    return true;
  }

  return false;
});

console.log('[ZeroDelay] Background service worker loaded');

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoBackup') {
    try {
      console.log('[ZeroDelay] Triggering daily auto-backup...');
      const allData = await chrome.storage.local.get(null);
      delete allData.pendingSaveSite;
      
      const jsonString = JSON.stringify(allData, null, 2);
      
      // Use Base64 encoding since URL.createObjectURL isn't available in Service Workers
      const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
      const dataUrl = `data:application/json;base64,${base64Data}`;
      
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `ZeroDelay_AutoBackups/backup_${dateStr}.json`;
      
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false,
      });
    } catch (err) {
      console.error('[ZeroDelay] Auto-backup failed:', err);
    }
  }
});
