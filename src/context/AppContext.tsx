import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import type { DocumentWithProgress, ReadingProgress, Annotation, Bookmark, AgentThread, AppSettings, AppTheme, ProviderConfig } from '../types';
import { getSettings, saveSettings, setTheme as persistTheme } from '../services/settings';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// ── State ─────────────────────────────────────────────────
export interface AppState {
  settings: AppSettings;
  // Library
  documents: DocumentWithProgress[];
  documentsLoading: boolean;
  // Reader
  currentDocumentId: string | null;
  readingProgress: ReadingProgress | null;
  annotations: Annotation[];
  bookmarks: Bookmark[];
  selectedAnnotation: string | null;
  // Panels
  sidebarOpen: boolean;
  sidebarTab: 'outline' | 'annotations' | 'bookmarks';
  beaconOpen: boolean;
  // Beacon
  activeThreadId: string | null;
  activeThreads: AgentThread[];
  selectedText: string | null;
  // Misc
  isExtracting: boolean;
  extractionProgress: { page: number; total: number } | null;
  notifications: ToastMessage[];
}

// ── Actions ───────────────────────────────────────────────
export type Action =
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_THEME'; payload: AppTheme }
  | { type: 'SET_DOCUMENTS'; payload: DocumentWithProgress[] }
  | { type: 'SET_DOCUMENTS_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_DOCUMENT'; payload: string | null }
  | { type: 'SET_READING_PROGRESS'; payload: ReadingProgress | null }
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: Annotation }
  | { type: 'REMOVE_ANNOTATION'; payload: string }
  | { type: 'SET_BOOKMARKS'; payload: Bookmark[] }
  | { type: 'ADD_BOOKMARK'; payload: Bookmark }
  | { type: 'REMOVE_BOOKMARK'; payload: string }
  | { type: 'SET_SELECTED_ANNOTATION'; payload: string | null }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_SIDEBAR_TAB'; payload: AppState['sidebarTab'] }
  | { type: 'SET_BEACON_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_THREAD'; payload: string | null }
  | { type: 'SET_THREADS'; payload: AgentThread[] }
  | { type: 'SET_SELECTED_TEXT'; payload: string | null }
  | { type: 'SET_EXTRACTING'; payload: { active: boolean; page?: number; total?: number } }
  | { type: 'ADD_NOTIFICATION'; payload: ToastMessage }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_THEME':
      return { ...state, settings: { ...state.settings, theme: action.payload } };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload, documentsLoading: false };
    case 'SET_DOCUMENTS_LOADING':
      return { ...state, documentsLoading: action.payload };
    case 'SET_CURRENT_DOCUMENT':
      return { ...state, currentDocumentId: action.payload };
    case 'SET_READING_PROGRESS':
      return { ...state, readingProgress: action.payload };
    case 'SET_ANNOTATIONS':
      return { ...state, annotations: action.payload };
    case 'ADD_ANNOTATION':
      return { ...state, annotations: [...state.annotations, action.payload] };
    case 'UPDATE_ANNOTATION':
      return { ...state, annotations: state.annotations.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'REMOVE_ANNOTATION':
      return { ...state, annotations: state.annotations.filter(a => a.id !== action.payload) };
    case 'SET_BOOKMARKS':
      return { ...state, bookmarks: action.payload };
    case 'ADD_BOOKMARK':
      return { ...state, bookmarks: [...state.bookmarks, action.payload] };
    case 'REMOVE_BOOKMARK':
      return { ...state, bookmarks: state.bookmarks.filter(b => b.id !== action.payload) };
    case 'SET_SELECTED_ANNOTATION':
      return { ...state, selectedAnnotation: action.payload };
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload };
    case 'SET_SIDEBAR_TAB':
      return { ...state, sidebarTab: action.payload };
    case 'SET_BEACON_OPEN':
      return { ...state, beaconOpen: action.payload };
    case 'SET_ACTIVE_THREAD':
      return { ...state, activeThreadId: action.payload };
    case 'SET_THREADS':
      return { ...state, activeThreads: action.payload };
    case 'SET_SELECTED_TEXT':
      return { ...state, selectedText: action.payload };
    case 'SET_EXTRACTING':
      return {
        ...state,
        isExtracting: action.payload.active,
        extractionProgress: action.payload.active && action.payload.page != null
          ? { page: action.payload.page, total: action.payload.total ?? 0 }
          : null,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications.slice(-4), action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────
export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  setTheme: (theme: AppTheme) => void;
  saveProviderConfig: (config: Partial<ProviderConfig>) => void;
  notify: (message: string, type?: ToastMessage['type']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────
function getInitialState(): AppState {
  const settings = getSettings();
  return {
    settings,
    documents: [],
    documentsLoading: true,
    currentDocumentId: null,
    readingProgress: null,
    annotations: [],
    bookmarks: [],
    selectedAnnotation: null,
    sidebarOpen: true,
    sidebarTab: 'outline',
    beaconOpen: false,
    activeThreadId: null,
    activeThreads: [],
    selectedText: null,
    isExtracting: false,
    extractionProgress: null,
    notifications: [],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  const setTheme = useCallback((theme: AppTheme) => {
    persistTheme(theme);
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const saveProviderConfigFn = useCallback((config: Partial<ProviderConfig>) => {
    const next = saveSettings({ providerConfig: config as ProviderConfig });
    dispatch({ type: 'SET_SETTINGS', payload: { providerConfig: next.providerConfig } });
  }, []);

  const notify = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, type, message } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, 4000);
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setTheme,
        saveProviderConfig: saveProviderConfigFn,
        notify,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      {state.notifications.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          {state.notifications.map(n => (
            <div
              key={n.id}
              style={{
                pointerEvents: 'auto',
                padding: '10px 16px',
                borderRadius: '8px',
                background:
                  n.type === 'error'
                    ? 'rgba(239, 68, 68, 0.95)'
                    : n.type === 'success'
                    ? 'rgba(34, 197, 94, 0.95)'
                    : n.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.95)'
                    : 'var(--color-bg-overlay)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <span>{n.message}</span>
            </div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  );
}
