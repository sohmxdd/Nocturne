import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  saveSettings,
  getApiKey,
  setApiKey,
  deleteApiKey,
} from '../../services/settings';
import { createAdapter } from '../../services/beacon/provider';
import { exportAllData, triggerExportDownload } from '../../services/export';
import type { AppTheme, ProviderType, ProviderConfig } from '../../types';
import styles from './Settings.module.css';

export default function Settings() {
  const navigate = useNavigate();
  const { state, setTheme, notify } = useApp();

  const [theme, setLocalTheme] = useState<AppTheme>(state.settings.theme);
  const [providerType, setProviderType] = useState<ProviderType>(
    state.settings.providerConfig.type
  );
  const [ollamaUrl, setOllamaUrl] = useState(
    state.settings.providerConfig.ollamaBaseUrl
  );
  const [ollamaModel, setOllamaModel] = useState(
    state.settings.providerConfig.ollamaModel || 'llama3'
  );
  const [openaiUrl, setOpenaiUrl] = useState(
    state.settings.providerConfig.openaiBaseUrl
  );
  const [openaiModel, setOpenaiModel] = useState(
    state.settings.providerConfig.openaiModel
  );
  const [apiKey, setLocalApiKey] = useState('');
  const [temperature, setTemperature] = useState(
    state.settings.providerConfig.temperature
  );
  const [defaultZoom, setDefaultZoom] = useState(state.settings.defaultZoom);

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // Load existing API key
  useEffect(() => {
    async function loadKey() {
      const key = await getApiKey();
      if (key) setLocalApiKey(key);
    }
    loadKey();
  }, []);

  const handleSave = async () => {
    const nextConfig: ProviderConfig = {
      type: providerType,
      ollamaBaseUrl: ollamaUrl.trim() || 'http://localhost:11434',
      ollamaModel: ollamaModel.trim() || null,
      openaiBaseUrl: openaiUrl.trim() || 'https://api.openai.com/v1',
      openaiModel: openaiModel.trim() || 'gpt-4o-mini',
      temperature,
    };

    saveSettings({
      theme,
      defaultZoom,
      providerConfig: nextConfig,
    });

    setTheme(theme);

    if (apiKey.trim()) {
      await setApiKey(apiKey.trim());
    } else {
      await deleteApiKey();
    }

    notify('Settings saved successfully', 'success');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    const testConfig: ProviderConfig = {
      type: providerType,
      ollamaBaseUrl: ollamaUrl.trim(),
      ollamaModel: ollamaModel.trim(),
      openaiBaseUrl: openaiUrl.trim(),
      openaiModel: openaiModel.trim(),
      temperature,
    };

    try {
      const adapter = createAdapter(testConfig, apiKey.trim());
      const err = await adapter.testConnection();
      if (err) {
        setConnectionResult({ ok: false, msg: err });
      } else {
        setConnectionResult({
          ok: true,
          msg: `Successfully connected to ${providerType.toUpperCase()}!`,
        });
      }
    } catch (e) {
      setConnectionResult({
        ok: false,
        msg: `Connection failed: ${(e as Error).message}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportAllData();
      triggerExportDownload(data);
      notify('Exported full Nocturne backup JSON', 'success');
    } catch (e) {
      notify(`Export failed: ${(e as Error).message}`, 'error');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/')}
          title="Back to Library"
        >
          ← Library
        </button>
        <h1 className={styles.title}>Application Settings</h1>
      </header>

      <main className={styles.mainContent}>
        {/* Appearance Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance & Reading</h2>
          <div className={styles.formRow}>
            <div className={styles.labelGroup}>
              <label className={styles.label}>Color Theme</label>
              <span className={styles.hint}>
                Controls application shell surfaces. PDF canvases remain pure paper.
              </span>
            </div>
            <div className={styles.themeButtons}>
              {(['dark', 'light', 'system'] as const).map(t => (
                <button
                  key={t}
                  className={`${styles.themeBtn} ${theme === t ? styles.activeThemeBtn : ''}`}
                  onClick={() => {
                    setLocalTheme(t);
                    setTheme(t);
                  }}
                >
                  {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '💻 System'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.labelGroup}>
              <label className={styles.label}>Default Zoom Level</label>
              <span className={styles.hint}>
                Initial zoom applied when opening documents without saved progress.
              </span>
            </div>
            <select
              className={styles.select}
              value={defaultZoom}
              onChange={e => setDefaultZoom(parseFloat(e.target.value))}
            >
              <option value={0.75}>75%</option>
              <option value={1.0}>100% (Default)</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
            </select>
          </div>
        </section>

        {/* AI Provider Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Context Beacon AI Provider</h2>
          <p className={styles.sectionDescription}>
            Configure your local or cloud intelligence provider. Nocturne defaults to local
            Ollama for 100% private, offline reading.
          </p>

          <div className={styles.formRow}>
            <div className={styles.labelGroup}>
              <label className={styles.label}>Provider Architecture</label>
            </div>
            <div className={styles.providerToggle}>
              <button
                className={`${styles.providerBtn} ${
                  providerType === 'ollama' ? styles.activeProvider : ''
                }`}
                onClick={() => setProviderType('ollama')}
              >
                🦙 Ollama (Local & Private)
              </button>
              <button
                className={`${styles.providerBtn} ${
                  providerType === 'openai' ? styles.activeProvider : ''
                }`}
                onClick={() => setProviderType('openai')}
              >
                ☁ OpenAI Compatible
              </button>
            </div>
          </div>

          {providerType === 'ollama' ? (
            <>
              <div className={styles.formRow}>
                <div className={styles.labelGroup}>
                  <label className={styles.label}>Ollama Endpoint URL</label>
                  <span className={styles.hint}>Default is http://localhost:11434</span>
                </div>
                <input
                  type="text"
                  className={styles.input}
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.labelGroup}>
                  <label className={styles.label}>Model Tag</label>
                  <span className={styles.hint}>
                    e.g. llama3, mistral, phi3, qwen2.5:7b
                  </span>
                </div>
                <input
                  type="text"
                  className={styles.input}
                  value={ollamaModel}
                  onChange={e => setOllamaModel(e.target.value)}
                  placeholder="llama3"
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formRow}>
                <div className={styles.labelGroup}>
                  <label className={styles.label}>Endpoint Base URL</label>
                  <span className={styles.hint}>
                    OpenAI or compatible proxy (e.g. OpenRouter, vLLM)
                  </span>
                </div>
                <input
                  type="text"
                  className={styles.input}
                  value={openaiUrl}
                  onChange={e => setOpenaiUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.labelGroup}>
                  <label className={styles.label}>Model Name</label>
                  <span className={styles.hint}>
                    e.g. gpt-4o-mini, gpt-4o, claude-3-5-sonnet
                  </span>
                </div>
                <input
                  type="text"
                  className={styles.input}
                  value={openaiModel}
                  onChange={e => setOpenaiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.labelGroup}>
                  <label className={styles.label}>API Key</label>
                  <span className={styles.hint}>
                    Stored securely in OS Credential Manager
                  </span>
                </div>
                <input
                  type="password"
                  className={styles.input}
                  value={apiKey}
                  onChange={e => setLocalApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
            </>
          )}

          <div className={styles.formRow}>
            <div className={styles.labelGroup}>
              <label className={styles.label}>Temperature ({temperature})</label>
              <span className={styles.hint}>
                Lower values ensure strictly grounded responses; higher values encourage creativity.
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              className={styles.range}
              value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.testConnectionRow}>
            <button
              className={styles.testBtn}
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? 'Testing...' : '⚡ Test Connection'}
            </button>
            {connectionResult && (
              <span
                className={`${styles.resultBadge} ${
                  connectionResult.ok ? styles.resultOk : styles.resultErr
                }`}
              >
                {connectionResult.ok ? '✓ ' : '✕ '}
                {connectionResult.msg}
              </span>
            )}
          </div>
        </section>

        {/* Data & Portability */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data & Portability</h2>
          <p className={styles.sectionDescription}>
            All Nocturne data belongs to you. Export a complete JSON archive of all
            documents, bookmarks, annotations, and AI conversations.
          </p>
          <div>
            <button className={styles.backupBtn} onClick={handleExportBackup}>
              📦 Export Full JSON Archive
            </button>
          </div>
        </section>

        {/* Save Bar */}
        <div className={styles.saveBar}>
          <button className={styles.saveButton} onClick={handleSave}>
            Save All Preferences
          </button>
        </div>
      </main>
    </div>
  );
}
