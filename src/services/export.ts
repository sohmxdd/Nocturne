// ============================================================
// NOCTURNE — Export / Import Service
// ============================================================

import type { ExportData } from '../types';
import { getAllDocuments } from './db/documents';
import { getDb } from './db/database';

const EXPORT_VERSION = 1 as const;
const APP_VERSION = '0.1.0';

export async function exportAllData(): Promise<ExportData> {
  const db = await getDb();

  const [
    documents,
    readingProgress,
    bookmarks,
    annotations,
    readingSessions,
    agentThreads,
    agentMessages,
    thoughtTrails,
    thoughtTrailItems,
  ] = await Promise.all([
    db.select<Record<string, unknown>>('SELECT * FROM documents'),
    db.select<Record<string, unknown>>('SELECT * FROM reading_progress'),
    db.select<Record<string, unknown>>('SELECT * FROM bookmarks'),
    db.select<Record<string, unknown>>('SELECT * FROM annotations WHERE is_deleted = 0'),
    db.select<Record<string, unknown>>('SELECT * FROM reading_sessions'),
    db.select<Record<string, unknown>>('SELECT * FROM agent_threads'),
    db.select<Record<string, unknown>>('SELECT * FROM agent_messages'),
    db.select<Record<string, unknown>>('SELECT * FROM thought_trails'),
    db.select<Record<string, unknown>>('SELECT * FROM thought_trail_items'),
  ]);

  // Transform snake_case rows to camelCase for export
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    documents: documents.map(snakeToCamel) as ExportData['documents'],
    readingProgress: readingProgress.map(snakeToCamel) as ExportData['readingProgress'],
    bookmarks: bookmarks.map(snakeToCamel) as ExportData['bookmarks'],
    annotations: annotations.map(row => ({
      ...snakeToCamel(row),
      rectsJson: tryParseJson(row['rects_json'] as string),
    })) as ExportData['annotations'],
    readingSessions: readingSessions.map(row => ({
      ...snakeToCamel(row),
      pagesVisited: tryParseJson(row['pages_visited'] as string),
    })) as ExportData['readingSessions'],
    agentThreads: agentThreads.map(snakeToCamel) as ExportData['agentThreads'],
    agentMessages: agentMessages.map(row => ({
      ...snakeToCamel(row),
      sourceRefs: tryParseJson(row['source_refs'] as string),
    })) as ExportData['agentMessages'],
    thoughtTrails: thoughtTrails.map(snakeToCamel) as ExportData['thoughtTrails'],
    thoughtTrailItems: thoughtTrailItems.map(snakeToCamel) as ExportData['thoughtTrailItems'],
  };
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camel] = value;
  }
  return result;
}

function tryParseJson(str: string): unknown {
  try { return JSON.parse(str); } catch { return str; }
}

export function exportToJsonString(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJson(data: ExportData, filename?: string): void {
  const json = exportToJsonString(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `nocturne-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateExportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return d['exportVersion'] === 1 && Array.isArray(d['documents']);
}
