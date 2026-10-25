// ============================================================
// NOCTURNE — Tauri IPC Bridge
// Provides typed wrappers over Tauri's invoke() calls.
// In browser-only (non-Tauri) dev/test mode, returns mocks.
// ============================================================

/**
 * Whether we are running inside a Tauri desktop process.
 * In browser-only dev mode (Vite dev server without tauri dev),
 * this will be false and all commands return mocked responses.
 */
export const IS_TAURI = typeof window !== 'undefined' &&
  '__TAURI_INTERNALS__' in window;

// ── Dynamic import of Tauri API ───────────────────────────
let _invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

async function getInvoke() {
  if (!IS_TAURI) return null;
  if (!_invoke) {
    try {
      const tauri = await import('@tauri-apps/api/core');
      _invoke = tauri.invoke as typeof _invoke;
    } catch {
      _invoke = null;
    }
  }
  return _invoke;
}

export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  const invoke = await getInvoke();
  if (!invoke) {
    throw new Error(`Tauri not available. Command: ${command}`);
  }
  return invoke(command, args) as Promise<T>;
}

// ── File dialog ───────────────────────────────────────────
export async function openPdfDialog(): Promise<string | null> {
  if (!IS_TAURI) {
    // Dev mode mock — return a fake path
    return null;
  }
  try {
    const result = await tauriInvoke<string | null>('open_pdf_dialog');
    return result;
  } catch (e) {
    console.error('[IPC] open_pdf_dialog failed:', e);
    return null;
  }
}

// ── Fingerprint ───────────────────────────────────────────
export async function computeFingerprint(filePath: string): Promise<string> {
  if (!IS_TAURI) {
    // Browser mock — use a simple hash of the path
    return `mock-fp-${btoa(filePath).slice(0, 16)}`;
  }
  return tauriInvoke<string>('compute_fingerprint', { filePath });
}

// ── File existence check ──────────────────────────────────
export async function checkFileExists(filePath: string): Promise<boolean> {
  if (!IS_TAURI) return true;
  return tauriInvoke<boolean>('check_file_exists', { filePath });
}

// ── Get file as bytes for PDF.js ──────────────────────────
export async function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  if (!IS_TAURI) {
    throw new Error('Cannot read file in non-Tauri mode without a file object');
  }
  const bytes = await tauriInvoke<number[]>('read_file_bytes', { filePath });
  return new Uint8Array(bytes).buffer;
}

// ── Credential store ──────────────────────────────────────
export async function getCredential(service: string, account: string): Promise<string | null> {
  if (!IS_TAURI) return localStorage.getItem(`cred:${service}:${account}`);
  try {
    return await tauriInvoke<string | null>('get_credential', { service, account });
  } catch {
    return null;
  }
}

export async function setCredential(service: string, account: string, value: string): Promise<void> {
  if (!IS_TAURI) {
    localStorage.setItem(`cred:${service}:${account}`, value);
    return;
  }
  await tauriInvoke('set_credential', { service, account, value });
}

export async function deleteCredential(service: string, account: string): Promise<void> {
  if (!IS_TAURI) {
    localStorage.removeItem(`cred:${service}:${account}`);
    return;
  }
  await tauriInvoke('delete_credential', { service, account });
}

// ── App data directory ────────────────────────────────────
export async function getAppDataDir(): Promise<string> {
  if (!IS_TAURI) return 'browser-local';
  return tauriInvoke<string>('get_app_data_dir');
}
