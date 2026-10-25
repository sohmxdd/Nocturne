// ============================================================
// NOCTURNE — App Settings Store
// Persists theme, zoom, and provider config in localStorage.
// API key is stored separately via OS credential store (Tauri).
// ============================================================

import { getCredential, setCredential, deleteCredential } from '../lib/tauri';
import type { AppSettings, AppTheme, ProviderConfig } from '../types';
import { DEFAULT_PROVIDER_CONFIG } from '../types';

const SETTINGS_KEY = 'nocturne:settings';
const CRED_SERVICE = 'nocturne';
const CRED_ACCOUNT_OPENAI = 'openai-api-key';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultZoom: 1.0,
  providerConfig: DEFAULT_PROVIDER_CONFIG,
};

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      providerConfig: {
        ...DEFAULT_PROVIDER_CONFIG,
        ...(parsed.providerConfig ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('[Settings] Failed to save:', e);
  }
}

// ── Public API ────────────────────────────────────────────
export function getSettings(): AppSettings {
  return loadFromStorage();
}

export function saveSettings(updates: Partial<AppSettings>): AppSettings {
  const current = loadFromStorage();
  const next: AppSettings = {
    ...current,
    ...updates,
    providerConfig: updates.providerConfig
      ? { ...current.providerConfig, ...updates.providerConfig }
      : current.providerConfig,
  };
  saveToStorage(next);
  return next;
}

export function setTheme(theme: AppTheme): void {
  saveSettings({ theme });
  applyThemeToDocument(theme);
}

export function applyThemeToDocument(theme: AppTheme): void {
  const root = document.documentElement;
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function initTheme(): void {
  const settings = loadFromStorage();
  applyThemeToDocument(settings.theme);

  // Watch for OS theme changes when in system mode
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    const current = loadFromStorage();
    if (current.theme === 'system') applyThemeToDocument('system');
  });
}

// ── API Key (credential store) ────────────────────────────
export async function getOpenAIKey(): Promise<string | null> {
  return getCredential(CRED_SERVICE, CRED_ACCOUNT_OPENAI);
}

export async function setOpenAIKey(key: string): Promise<void> {
  await setCredential(CRED_SERVICE, CRED_ACCOUNT_OPENAI, key);
}

export async function deleteOpenAIKey(): Promise<void> {
  await deleteCredential(CRED_SERVICE, CRED_ACCOUNT_OPENAI);
}

// ── Provider config ───────────────────────────────────────
export function saveProviderConfig(config: Partial<ProviderConfig>): void {
  saveSettings({ providerConfig: config as ProviderConfig });
}
