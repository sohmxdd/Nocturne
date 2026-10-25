// ============================================================
// NOCTURNE — Core Type Definitions
// ============================================================

// ── Document ─────────────────────────────────────────────
export type ImportStatus = 'pending' | 'ready' | 'error' | 'fingerprint_mismatch';

export interface Document {
  id: string;
  filePath: string;
  fileSizeBytes: number;
  fingerprint: string;
  title: string | null;
  author: string | null;
  pageCount: number | null;
  importStatus: ImportStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithProgress extends Document {
  lastOpenedAt: string | null;
  currentPage: number;
  scrollTop: number;
  zoomLevel: number;
}

// ── Reading Progress ──────────────────────────────────────
export type ReadingMode = 'default' | 'focus';

export interface ReadingProgress {
  documentId: string;
  pageIndex: number;
  scrollTop: number;    // 0.0–1.0 fractional position
  zoomLevel: number;    // 1.0 = 100%
  readingMode: ReadingMode;
  lastOpenedAt: string;
  updatedAt: string;
}

// ── Bookmark ──────────────────────────────────────────────
export interface Bookmark {
  id: string;
  documentId: string;
  pageIndex: number;
  scrollTop: number;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Annotation ────────────────────────────────────────────
export type HighlightColor = 'amber' | 'teal' | 'violet' | 'rose';

export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  documentId: string;
  pageIndex: number;
  rectsJson: AnnotationRect[];   // PDF coordinate space
  selectedText: string;          // max 500 chars
  anchorPrefix: string | null;
  anchorSuffix: string | null;
  color: HighlightColor;
  noteContent: string | null;    // max 4000 chars
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Reading Session ───────────────────────────────────────
export interface ReadingSession {
  id: string;
  documentId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  firstPage: number;
  lastPage: number;
  pagesVisited: number[];
}

// ── Agent / AI ────────────────────────────────────────────
export type BeaconMode = 'explain' | 'connect' | 'challenge' | 'apply';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'streaming' | 'complete' | 'error';

export interface SourceReference {
  pageIndex: number;
  textSnippet: string;
  confidence: number;
}

export interface AgentThread {
  id: string;
  documentId: string;
  title: string | null;
  mode: BeaconMode;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  sourceRefs: SourceReference[];
  status: MessageStatus;
  createdAt: string;
}

// ── Document Chunk ────────────────────────────────────────
export interface DocumentChunk {
  id: string;
  documentId: string;
  pageIndex: number;
  chunkIndex: number;
  content: string;
  charCount: number;
  createdAt: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  snippet: string;
}

// ── Thought Trails ────────────────────────────────────────
export type TrailItemType = 'annotation' | 'message' | 'bookmark';

export interface ThoughtTrail {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThoughtTrailItem {
  id: string;
  trailId: string;
  itemType: TrailItemType;
  itemId: string;
  position: number;
  note: string | null;
  createdAt: string;
}

// ── AI Provider ───────────────────────────────────────────
export type ProviderType = 'ollama' | 'openai';

export interface OllamaModelDetails {
  parentModel: string;
  format: string;
  family: string;
  families: string[];
  parameterSize: string;
  quantizationLevel: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modifiedAt: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

export type OllamaConnectionStatus = 'connected' | 'disconnected' | 'loading' | 'error';

export interface ProviderConfig {
  type: ProviderType;
  ollamaBaseUrl: string;
  ollamaModel: string | null;
  openaiBaseUrl: string;
  openaiModel: string;
  temperature: number;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  type: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: null,
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  temperature: 0.3,
};

// ── Context Assembly ─────────────────────────────────────
export interface BeaconContext {
  selectedText: string | null;
  currentPageIndex: number;
  currentPageText: string;
  retrievedChunks: SearchResult[];
  relevantAnnotations: Annotation[];
  recentMessages: AgentMessage[];
}

export interface BeaconRequest {
  threadId: string;
  userMessage: string;
  mode: BeaconMode;
  context: BeaconContext;
}

// ── App Settings ──────────────────────────────────────────
export type AppTheme = 'dark' | 'light' | 'system';

export interface AppSettings {
  theme: AppTheme;
  defaultZoom: number;
  providerConfig: ProviderConfig;
}

// ── Error types ───────────────────────────────────────────
export type NocturneErrorCode =
  | 'FILE_NOT_FOUND'
  | 'INVALID_PDF'
  | 'DUPLICATE_IMPORT'
  | 'FINGERPRINT_MISMATCH'
  | 'DB_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_NO_KEY'
  | 'AI_RATE_LIMIT'
  | 'AI_TIMEOUT'
  | 'AI_NO_MODEL'
  | 'EXPORT_ERROR'
  | 'IMPORT_ERROR'
  | 'UNKNOWN';

export interface NocturneError {
  code: NocturneErrorCode;
  message: string;
  detail?: string;
}

// ── Export format ─────────────────────────────────────────
export interface ExportData {
  exportVersion: 1;
  exportedAt: string;
  appVersion: string;
  documents: Document[];
  readingProgress: ReadingProgress[];
  bookmarks: Bookmark[];
  annotations: Annotation[];
  readingSessions: ReadingSession[];
  agentThreads: AgentThread[];
  agentMessages: AgentMessage[];
  thoughtTrails: ThoughtTrail[];
  thoughtTrailItems: ThoughtTrailItem[];
}
