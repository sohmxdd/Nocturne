# ARCHITECTURE.md — Nocturne

> **Status:** M0 Draft — last updated 2026-10-17  
> **Stability:** Living document — update when structure changes.

---

## 1. System Overview

Nocturne is a **local-first single-process desktop application**. There is no background server, no cloud API, and no network dependency for core reading functionality. The AI companion is an optional add-on layer that requires a user-configured provider.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Nocturne Process                            │
│                                                                     │
│  ┌────────────────────────────────┐  ┌────────────────────────────┐ │
│  │     WebView2 (Renderer)        │  │     Rust Core (Tauri)      │ │
│  │                                │  │                            │ │
│  │  React + TypeScript + Vite     │  │  IPC Command Handlers      │ │
│  │  ┌──────────┐ ┌─────────────┐  │  │  File I/O (scoped)         │ │
│  │  │  Library │ │   Reader    │  │  │  SQLite (via plugin-sql)   │ │
│  │  └──────────┘ └─────────────┘  │  │  Credential Store          │ │
│  │  ┌──────────┐ ┌─────────────┐  │  │  Window State              │ │
│  │  │ Beacon   │ │  Knowledge  │  │  │  App Lifecycle             │ │
│  │  └──────────┘ └─────────────┘  │  │                            │ │
│  │  ┌──────────────────────────┐  │  └────────────────────────────┘ │
│  │  │  Services / Repositories │  │                                 │
│  │  │  (TypeScript, typed)     │  │  ┌────────────────────────────┐ │
│  │  └──────────────────────────┘  │  │  AI Provider (optional)    │ │
│  └────────────────────────────────┘  │  OpenAI-compatible HTTP     │ │
│                                      │  Adapter (network, async)   │ │
│  ┌─────────────────────────────────┐ └────────────────────────────┘ │
│  │  SQLite Database               │                                  │
│  │  (app data directory, local)   │                                  │
│  └─────────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
                        │ optional network
                   ┌────▼────────────────┐
                   │  AI Provider API    │
                   │  (OpenAI-compat.)   │
                   └─────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Version (verified 2026-10-17) | Notes |
|-------|-----------|-------------------------------|-------|
| Desktop shell | **Tauri 2** | 2.x stable (Oct 2024 GA) | Windows primary target; WebView2 pre-installed on Win 10/11 |
| Frontend framework | **React 19 + TypeScript** | Latest stable | Strict mode, no any except at typed boundaries |
| Build tool | **Vite** | Latest stable (6.x) | Fast HMR; Tauri uses Vite for frontend dev server |
| PDF rendering | **pdfjs-dist** | 6.4.299 | Text layer enabled; worker configured via ES module URL |
| Native integration | **Rust stable (MSVC)** | 1.8x stable | Must be installed: `rustup.rs` + VS Build Tools |
| Database | **SQLite via tauri-plugin-sql** | 2.5.x | `features = ["sqlite"]`; typed repository layer in TS |
| State management | **React Context + useReducer** | Built-in | For cross-cutting UI state; no Redux until needed |
| Styling | **Vanilla CSS + CSS Custom Properties** | N/A | Design token file; no Tailwind in initial build |
| Unit tests | **Vitest** | Latest stable | `jsdom` environment for component tests |
| E2E tests | **Playwright** | Latest stable | Frontend dev-server mode for M1–M2; binary for M5 |
| Package manager | **npm** (lockfile: `package-lock.json`) | 11.9.0 | Single consistent PM across project |

**Prerequisites for development (Windows):**
1. Node.js ≥ 20 (installed: v24.14.0 ✓)
2. npm ≥ 10 (installed: v11.9.0 ✓)
3. WebView2 (installed: 155.0.4283.60 ✓)
4. Rust stable (MSVC toolchain) — **NOT installed** — see ADR-001
5. Visual Studio Build Tools with "Desktop development with C++" — **NOT installed** — see ADR-001

---

## 3. Module Boundaries

### 3.1 Frontend (src/)

```
src/
├── main.tsx                  # React entry point
├── App.tsx                   # Root router / theme provider
├── index.css                 # Design token definitions, global reset
├── screens/
│   ├── Library/              # Landing page and document list
│   ├── Reader/               # PDF canvas, toolbar, sidebar
│   ├── Knowledge/            # Global annotation/note search
│   ├── Insights/             # Reading session stats
│   └── Settings/             # App configuration
├── components/
│   ├── ui/                   # Primitive design system components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Dialog/
│   │   ├── Tooltip/
│   │   └── ...
│   ├── reader/               # PDF-specific components
│   │   ├── PdfCanvas/
│   │   ├── AnnotationLayer/
│   │   ├── TextLayer/
│   │   ├── Toolbar/
│   │   └── PageThumbnail/
│   ├── beacon/               # Context Beacon panel
│   │   ├── BeaconIcon/
│   │   ├── BeaconPanel/
│   │   └── MessageBubble/
│   └── annotations/          # Annotation sidebar, highlight toolbar
├── services/                 # Business logic, all async
│   ├── db/                   # Repository layer (typed SQL)
│   │   ├── documents.ts
│   │   ├── reading_progress.ts
│   │   ├── bookmarks.ts
│   │   ├── annotations.ts
│   │   ├── sessions.ts
│   │   ├── agent_threads.ts
│   │   └── migrations.ts
│   ├── pdf/                  # PDF.js wrapper, text extraction
│   │   ├── renderer.ts
│   │   ├── extractor.ts
│   │   └── fingerprint.ts
│   ├── beacon/               # Context assembly, provider adapter
│   │   ├── context.ts
│   │   ├── retrieval.ts
│   │   └── provider/
│   │       ├── adapter.ts    # Interface definition
│   │       └── openai.ts     # OpenAI-compat implementation
│   └── search/               # Full-text search over annotations + chunks
├── hooks/                    # Custom React hooks
├── types/                    # Shared TypeScript type definitions
└── utils/                    # Pure utility functions
```

### 3.2 Rust Backend (src-tauri/)

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json           # Capabilities, plugins, window config
├── capabilities/
│   └── default.json          # Scoped permission declarations
└── src/
    ├── lib.rs                # Plugin registration, command setup
    ├── commands/
    │   ├── file.rs           # Open file dialog, path resolution
    │   ├── fingerprint.rs    # Document identity (SHA-256 of first 64KB)
    │   └── credentials.rs    # OS credential store read/write
    └── tests/                # Rust unit tests
```

---

## 4. Data Flow: PDF Import

```
User clicks "Open PDF"
        │
        ▼
Tauri command: open_file_dialog (scoped to .pdf)
        │
        ▼
Frontend: receives file path
        │
        ▼
Service: compute fingerprint (SHA-256 of first 64 KB + file size)
        │
        ▼
DB: check for duplicate fingerprint → warn if found
        │
        ▼
DB: insert document record (id, path, title from metadata, fingerprint)
        │
        ▼
PDF.js: load document, extract metadata and outline
        │
        ▼
DB: update document with page count, title, author
        │
        ▼
Background: extract text chunks (chunked, async, cancellable)
        │
        ▼
DB: insert document_chunks (page, text, chunk_index)
        │
        ▼
Reader: navigate to last saved progress (or page 1)
```

---

## 5. Data Flow: Context Beacon Query

```
User selects text + clicks Beacon icon
        │
        ▼
Context Assembler: collect immediate context
  - selected text (user's selection, from renderer)
  - current page index
  - current page extracted text (up to 1500 chars)
        │
        ▼
Context Assembler: retrieve document context
  - search_document(question) → top-K chunks by keyword
  - get_page_context(current_page ± 1)
        │
        ▼
Context Assembler: retrieve personal context
  - search_annotations(question) → relevant notes
        │
        ▼
Context Assembler: trim to token budget (target < 8K tokens)
        │
        ▼
Privacy preview: show user a summary of what will be sent
        │
        ▼ [User confirms]
Provider adapter: POST to configured AI API
        │
        ▼
Response parser: extract citations, separate source/reasoning
        │
        ▼
UI: render response with page-linked citations
        │
        ▼
DB: persist message in agent_threads/agent_messages
```

---

## 6. Security Boundaries

See `docs/SECURITY.md` for full threat model.

Summary of key boundaries:
- **Tauri capabilities**: file access scoped to documents directory; no shell execution; no arbitrary network in renderer
- **IPC validation**: all Tauri commands validate their inputs server-side (Rust); renderer input is untrusted
- **Credential store**: AI provider keys stored in Windows Credential Manager via Tauri; never in SQLite, frontend bundles, or logs
- **Prompt injection**: PDF text treated as data, never as instructions; system prompt explicitly fences document content
- **No telemetry**: no analytics calls, no document content leaving the process except explicit AI invocations

---

## 7. Database Architecture

See `docs/DATA_MODEL.md` for complete entity definitions.

- SQLite file location: `$APPDATA/Nocturne/nocturne.db` (resolved via Tauri app data dir)
- Accessed through `@tauri-apps/plugin-sql` from the renderer; no direct file access from renderer
- Migrations run at startup via `migrations.ts` before any queries
- Foreign keys enabled: `PRAGMA foreign_keys = ON` in connection setup
- WAL mode enabled for concurrent read performance

---

## 8. Design System

### Token Definitions (CSS Custom Properties)

```css
/* Shell backgrounds */
--color-bg-base:    #11131A;   /* outermost shell */
--color-bg-surface: #191C25;   /* cards, panels */
--color-bg-overlay: #242938;   /* modals, overlays */
--color-bg-element: #303647;   /* input fields, code blocks */

/* Borders */
--color-border-subtle:  #303647;
--color-border-default: #404662;

/* Text */
--color-text-primary:   #E8EAF0;
--color-text-secondary: #9CA3AF;
--color-text-muted:     #6B7280;
--color-text-disabled:  #4B5563;

/* Accent */
--color-accent:          #A78BFA;   /* violet — primary action */
--color-accent-hover:    #C4B5FD;
--color-accent-muted:    #2D2150;   /* tinted background */

/* Status */
--color-success:  #79C9B4;   /* teal — saved, confirmed */
--color-warning:  #E6B873;   /* amber — attention, caution */
--color-error:    #F28B9B;   /* rose — error, danger */

/* PDF canvas */
--color-canvas-bg: #FFFFFF;    /* document pages preserve original white */

/* Spacing scale */
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-5: 20px;  --space-6: 24px;
--space-8: 32px; --space-10: 40px; --space-12: 48px;

/* Radii */
--radius-sm: 4px;  --radius-md: 8px;
--radius-lg: 12px; --radius-full: 9999px;

/* Typography */
--font-family: 'Inter', system-ui, -apple-system, sans-serif;
--font-size-xs: 11px;  --font-size-sm: 13px;
--font-size-md: 15px;  --font-size-lg: 18px;
--font-size-xl: 22px;  --font-size-2xl: 28px;
```

---

## 9. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| File moved/deleted | File not found on read attempt | Error screen in reader; option to re-link or remove |
| Corrupt SQLite | Migration or query error on startup | Offer to reset DB; export current state if possible |
| Interrupted write | Transaction rollback; WAL checkpoint | Retry on next access; no partial commits |
| AI provider error | Network timeout, 4xx/5xx response | Show error in Beacon panel; reading unaffected |
| Invalid PDF | PDF.js parse error | Error state in reader; document marked as errored in DB |
| Large file (>500MB) | Size check on import | Warn before importing; no hard block but performance warning |
| Duplicate import | Fingerprint collision check | Warn user; offer to replace or keep both |
| DB migration failure | Version mismatch detected | Fail fast with clear error; never run app on unknown schema |

---

## 10. Performance Targets

| Metric | Target | Approach |
|--------|--------|----------|
| App cold start to library | < 2s | Lazy-load PDF and AI surfaces |
| PDF open (first page visible) | < 1s for typical PDF | Stream PDF.js loading; render page 1 first |
| Page navigation | < 100ms render | Virtualized page list; prerender ±2 pages |
| Search in annotations | < 100ms for 1000 items | SQLite FTS5 index |
| Highlight creation | < 50ms perceived | Optimistic UI + immediate DB commit |
| Text extraction (100-page PDF) | < 5s, non-blocking | Background task with progress; cancellable |

---

## 11. Testing Architecture

See `docs/TEST_PLAN.md` for full strategy.

Summary:
- **Unit tests (Vitest)**: services, repositories, utility functions, PDF text extraction logic
- **Component tests (Vitest + jsdom)**: React component rendering and interaction
- **Integration tests**: DB migrations, repository CRUD, round-trip export/import
- **E2E tests (Playwright)**: user journeys against dev server (M1–M2), against binary (M5)
- **Rust tests**: native command handlers, fingerprint logic, credential isolation
- **Manual checklist**: design states, accessibility, and visual regression before each milestone

---

*Next update: after M1 scaffolding is verified — update with actual file paths and confirmed module structure.*
