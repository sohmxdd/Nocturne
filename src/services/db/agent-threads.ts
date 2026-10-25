// ============================================================
// NOCTURNE — Agent Threads + Messages Repository
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, nowIso } from './database';
import type { AgentThread, AgentMessage, BeaconMode, MessageRole, MessageStatus, SourceReference } from '../../types';

// ── Threads ───────────────────────────────────────────────
type ThreadRow = {
  id: string;
  document_id: string;
  title: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
};

function rowToThread(row: ThreadRow): AgentThread {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    mode: row.mode as BeaconMode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createThread(params: {
  documentId: string;
  mode: BeaconMode;
  title?: string | null;
}): Promise<AgentThread> {
  const db = await getDb();
  const id = uuidv4();
  const now = nowIso();
  await db.execute(
    `INSERT INTO agent_threads (id, document_id, title, mode, created_at, updated_at)
     VALUES (?,?,?,?,?,?)`,
    [id, params.documentId, params.title ?? null, params.mode, now, now]
  );
  const rows = await db.select<ThreadRow>(
    `SELECT * FROM agent_threads WHERE id = ?`, [id]
  );
  return rowToThread(rows[0]);
}

export async function getThreadsForDocument(documentId: string): Promise<AgentThread[]> {
  const db = await getDb();
  const rows = await db.select<ThreadRow>(
    `SELECT * FROM agent_threads
     WHERE document_id = ?
     ORDER BY updated_at DESC`,
    [documentId]
  );
  return rows.map(rowToThread);
}

export async function updateThreadTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE agent_threads SET title = ?, updated_at = ? WHERE id = ?`,
    [title, nowIso(), id]
  );
}

export async function touchThread(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE agent_threads SET updated_at = ? WHERE id = ?`,
    [nowIso(), id]
  );
}

// ── Messages ──────────────────────────────────────────────
type MessageRow = {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  source_refs: string;
  status: string;
  created_at: string;
};

function rowToMessage(row: MessageRow): AgentMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role as MessageRole,
    content: row.content,
    sourceRefs: JSON.parse(row.source_refs) as SourceReference[],
    status: row.status as MessageStatus,
    createdAt: row.created_at,
  };
}

export async function createMessage(params: {
  threadId: string;
  role: MessageRole;
  content: string;
  sourceRefs?: SourceReference[];
  status?: MessageStatus;
}): Promise<AgentMessage> {
  const db = await getDb();
  const id = uuidv4();
  const now = nowIso();
  const sourceRefs = JSON.stringify(params.sourceRefs ?? []);
  await db.execute(
    `INSERT INTO agent_messages (id, thread_id, role, content, source_refs, status, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [id, params.threadId, params.role, params.content,
     sourceRefs, params.status ?? 'complete', now]
  );
  const rows = await db.select<MessageRow>(
    `SELECT * FROM agent_messages WHERE id = ?`, [id]
  );
  return rowToMessage(rows[0]);
}

export async function updateMessageContent(
  id: string,
  content: string,
  sourceRefs: SourceReference[],
  status: MessageStatus
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE agent_messages SET content = ?, source_refs = ?, status = ? WHERE id = ?`,
    [content, JSON.stringify(sourceRefs), status, id]
  );
}

export async function getMessagesForThread(threadId: string): Promise<AgentMessage[]> {
  const db = await getDb();
  const rows = await db.select<MessageRow>(
    `SELECT * FROM agent_messages
     WHERE thread_id = ?
     ORDER BY created_at ASC`,
    [threadId]
  );
  return rows.map(rowToMessage);
}
