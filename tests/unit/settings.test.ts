import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  saveSettings,
  setTheme,
  DEFAULT_SETTINGS,
} from '../../src/services/settings';

describe('Settings Service & Theme Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('loads default settings when empty', () => {
    const settings = getSettings();
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(settings.defaultZoom).toBe(1.0);
    expect(settings.providerConfig.type).toBe('ollama');
  });

  it('saves and merges partial settings', () => {
    saveSettings({
      defaultZoom: 1.5,
      providerConfig: {
        ...DEFAULT_SETTINGS.providerConfig,
        type: 'openai',
        openaiModel: 'gpt-4o',
      },
    });

    const retrieved = getSettings();
    expect(retrieved.defaultZoom).toBe(1.5);
    expect(retrieved.providerConfig.type).toBe('openai');
    expect(retrieved.providerConfig.openaiModel).toBe('gpt-4o');
  });

  it('sets theme and applies data-theme attribute to html', () => {
    setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const settings = getSettings();
    expect(settings.theme).toBe('dark');

    setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
