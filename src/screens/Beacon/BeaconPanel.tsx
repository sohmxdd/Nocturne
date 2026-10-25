import { useState, useEffect, useRef } from 'react';
import type { Document, AgentThread, AgentMessage, BeaconMode } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  createThread,
  getThreadsForDocument,
  getMessagesForThread,
  createMessage,
} from '../../services/db/agent-threads';
import { sendBeaconRequest } from '../../services/beacon/provider';
import styles from './BeaconPanel.module.css';

interface Props {
  documentId: string;
  currentPage: number;
  selectedText: string | null;
  onClose: () => void;
  doc: Document;
}

const MODES: { id: BeaconMode; label: string; icon: string }[] = [
  { id: 'explain', label: 'Explain', icon: '💡' },
  { id: 'summarize', label: 'Summarize', icon: '📝' },
  { id: 'quiz', label: 'Quiz', icon: '🎯' },
  { id: 'freeform', label: 'Ask Anything', icon: '💬' },
];

const QUICK_ACTIONS = [
  'Explain the main concept on this page in simple terms',
  'Summarize the key formulas or takeaways here',
  'What prerequisites are needed to understand this section?',
  'Generate 3 practice questions with answers for this page',
];

export default function BeaconPanel({
  documentId,
  currentPage,
  selectedText,
  onClose,
  doc,
}: Props) {
  const { state, dispatch, notify } = useApp();
  const [thread, setThread] = useState<AgentThread | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<BeaconMode>('explain');
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or load active thread
  useEffect(() => {
    let active = true;

    async function initThread() {
      const existing = await getThreadsForDocument(documentId);
      if (!active) return;

      if (existing.length > 0) {
        setThread(existing[0]);
        const msgs = await getMessagesForThread(existing[0].id);
        if (active) setMessages(msgs);
      } else {
        const newThread = await createThread({
          documentId,
          title: `Reading session — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          mode: 'explain',
        });
        if (active) {
          setThread(newThread);
          setMessages([]);
        }
      }
    }

    initThread();
    return () => {
      active = false;
    };
  }, [documentId]);

  // Scroll to bottom on new message or stream chunk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || !thread || isGenerating) return;

    if (!customPrompt) setInput('');

    // Save user message to DB & state
    const userMsg = await createMessage({
      threadId: thread.id,
      role: 'user',
      content: textToSend,
      sourceRefs: selectedText ? [{ pageIndex: currentPage, textSnippet: selectedText, confidence: 1.0 }] : [],
    });
    setMessages(prev => [...prev, userMsg]);

    setIsGenerating(true);
    setStreamingResponse('');

    try {
      let accumulated = '';
      await sendBeaconRequest({
        request: {
          threadId: thread.id,
          userMessage: textToSend,
          mode,
          context: {
            selectedText: selectedText || null,
            currentPageIndex: currentPage,
            currentPageText: `Page ${currentPage + 1} of document "${doc.title || 'Untitled'}"`,
            retrievedChunks: [],
            relevantAnnotations: state.annotations.filter(
              a => a.pageIndex === currentPage && !a.isDeleted
            ),
            recentMessages: messages
              .slice(-4)
              .filter((m): m is AgentMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
              .map(m => ({ role: m.role, content: m.content })),
          },
        },
        config: state.settings.providerConfig,
        onToken: (token: string) => {
          accumulated += token;
          setStreamingResponse(accumulated);
        },
        onComplete: async (fullText: string) => {
          const assistantMsg = await createMessage({
            threadId: thread.id,
            role: 'assistant',
            content: fullText,
          });
          setMessages(prev => [...prev, assistantMsg]);
          setStreamingResponse('');
          setIsGenerating(false);
        },
        onError: (err: Error) => {
          console.error('[Beacon] Streaming error:', err);
          notify(`AI generation failed: ${err.message}`, 'error');
          setIsGenerating(false);
        },
      });
    } catch (err: unknown) {
      const e = err as Error;
      notify(`Beacon error: ${e.message}`, 'error');
      setIsGenerating(false);
    }
  };

  const handleNewThread = async () => {
    const newThread = await createThread({
      documentId,
      title: `Beacon thread · ${new Date().toLocaleDateString()}`,
      mode,
    });
    setThread(newThread);
    setMessages([]);
    setStreamingResponse('');
    notify('Started new Beacon conversation', 'info');
  };

  return (
    <aside className={styles.beaconDrawer} aria-label="Context Beacon AI companion">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.beaconGlowIcon}>✦</span>
          <div>
            <h2 className={styles.title}>Context Beacon</h2>
            <div className={styles.contextSub}>
              Active on Page {currentPage + 1}
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={handleNewThread}
            title="Start new conversation"
            aria-label="New conversation"
          >
            + New
          </button>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            title="Close Beacon (Esc)"
            aria-label="Close Beacon"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Selected Quote Banner */}
      {selectedText && (
        <div className={styles.quoteBanner}>
          <div className={styles.quoteHeader}>Focused Selection:</div>
          <div className={styles.quoteContent}>“{selectedText}”</div>
        </div>
      )}

      {/* Mode Pills */}
      <div className={styles.modeTabs} role="tablist">
        {MODES.map(m => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={`${styles.modeTab} ${mode === m.id ? styles.activeModeTab : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className={styles.messageList}>
        {messages.length === 0 && !streamingResponse && (
          <div className={styles.emptyBeacon}>
            <div className={styles.sparkleIcon}>✨</div>
            <h3>Context-Aware AI Assistant</h3>
            <p>
              Beacon reads alongside you. Ask questions about the current page, request
              intuition-building explanations, or generate practice questions.
            </p>
            <div className={styles.quickActionGroup}>
              <div className={styles.quickActionTitle}>Suggested questions:</div>
              {QUICK_ACTIONS.map((q, idx) => (
                <button
                  key={idx}
                  className={styles.quickActionBtn}
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div
            key={m.id}
            className={`${styles.messageRow} ${
              m.role === 'user' ? styles.userRow : styles.assistantRow
            }`}
          >
            <div className={styles.messageBubble}>
              <div className={styles.messageMeta}>
                {m.role === 'user' ? 'You' : 'Beacon'}
              </div>
              <div className={styles.messageContent}>{m.content}</div>
            </div>
          </div>
        ))}

        {/* Streaming message bubble */}
        {streamingResponse && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.messageBubble}>
              <div className={styles.messageMeta}>Beacon (thinking...)</div>
              <div className={styles.messageContent}>
                {streamingResponse}
                <span className={styles.blinkingCursor}>▍</span>
              </div>
            </div>
          </div>
        )}

        {isGenerating && !streamingResponse && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.messageBubble}>
              <div className={styles.typingIndicator}>
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask about page ${currentPage + 1} or document...`}
            rows={2}
            disabled={isGenerating}
            aria-label="Ask Beacon a question"
          />
          <button
            className={styles.sendButton}
            onClick={() => handleSend()}
            disabled={!input.trim() || isGenerating}
            aria-label="Send query"
          >
            ▲
          </button>
        </div>
      </div>
    </aside>
  );
}
