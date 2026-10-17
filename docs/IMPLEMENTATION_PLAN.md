# IMPLEMENTATION_PLAN.md — Nocturne

> **Status:** M0 Draft — last updated 2026-10-17  
> **Process:** Each task must be planned, implemented, tested, inspected, and verified before being marked done.  
> **Definition of Done:** See AGENT.md §7.

---

## Prerequisites (Before Any Milestone)

**These must be complete before M1 begins. None are speculative.**

### P-01: Install Rust toolchain (BLOCKING)
- **Action:** Download and run https://rustup.rs/ (`rustup-init.exe`)
- **Accept defaults:** stable, MSVC toolchain
- **Verify:** `rustc --version` and `cargo --version` in a new terminal
- **Risk:** None if using official installer

### P-02: Install Visual Studio Build Tools (BLOCKING)
- **Action:** Download from https://aka.ms/vs/17/release/vs_BuildTools.exe
- **Select workload:** "Desktop development with C++"
- **Ensure:** MSVC v143 and Windows 10/11 SDK are checked
- **Verify:** Tauri info shows no MSVC warning

### P-03: Verify complete environment
- **Command:** `npx @tauri-apps/cli@latest info`
- **Expected:** All green: OS, WebView2, rustc, Cargo, rustup, Rust toolchain, Node, npm
- **Do not proceed to M1 if any red.**

---

## M0: Discovery and Contracts

**Goal:** Establish the documented foundation before any implementation.  
**Status:** ✅ COMPLETE (2026-10-17)

### M0 deliverables
- [x] `AGENT.md` — engineering operating manual (pre-existing)
- [x] `docs/PRODUCT_SPEC.md` — requirements, users, journeys, acceptance criteria
- [x] `docs/ARCHITECTURE.md` — components, data flows, design system tokens, failure modes
- [x] `docs/DATA_MODEL.md` — all entities, coordinate system, migrations, export format
- [x] `docs/SECURITY.md` — threat model, capability config, AI data flow, logging policy
- [x] `docs/TEST_PLAN.md` — all test layers, fixtures, manual checklist
- [x] `docs/DECISIONS.md` — ADRs for all consequential decisions
- [x] `docs/IMPLEMENTATION_PLAN.md` — this file
- [x] `docs/PROGRESS.md` — current milestone ledger

### M0 findings
- Rust toolchain not installed — **blocks M1** (ADR-001)
- VS Build Tools not installed — **blocks M1** (ADR-001)
- WebView2 present ✓
- Node.js 24 / npm 11 present ✓
- No existing code to preserve — clean start
- No git history — initialized empty repo

### M0 known unresolved items
- OQ-01 through OQ-07 in DECISIONS.md — to be addressed in relevant milestones

---

## M1: Working Reader

**Goal:** A working desktop app. Import a PDF, read it, navigate it, close it, reopen it and land on the same page. Nothing faked.

**Acceptance criteria:**
- AC-M1-01: Running `npm run tauri dev` opens the app window
- AC-M1-02: Library screen is shown on launch with correct empty state
- AC-M1-03: "Open PDF" button opens native file dialog filtered to .pdf files
- AC-M1-04: Selecting a PDF opens the reader with the first page visible within 1.5s
- AC-M1-05: Pages render with correct text layer (text selectable)
- AC-M1-06: Next/previous page, page number input, and keyboard navigation all work
- AC-M1-07: Zoom in/out/fit-width work; zoom persists to at least 2 decimal places
- AC-M1-08: Closing the app and reopening it shows the same document at the same page and zoom
- AC-M1-09: Dark mode applied to shell; PDF canvas is white (original page colors preserved)
- AC-M1-10: Light mode works on all surfaces; system mode follows OS setting
- AC-M1-11: Invalid PDF shows error message; app does not crash
- AC-M1-12: Image-only PDF renders pages with clear "no text layer" notice
- AC-M1-13: Large PDF (200+ pages) — page 1 visible within 2s; scrolling is smooth
- AC-M1-14: Window resize does not corrupt page layout
- AC-M1-15: Recent documents list shows imported document; clicking resumes reading

### M1 task breakdown

**T-M1-01: Scaffold Tauri 2 + React + Vite project**
- Run: `npm create tauri-app@latest . -- --template react-ts --manager npm --yes`
- Verify: `npm run tauri dev` launches an empty window
- Files changed: entire scaffold (new files)
- Risk: Rust prerequisites (see P-01, P-02)

**T-M1-02: Establish design system**
- Create `src/index.css` with all design tokens (from ARCHITECTURE.md §8)
- Create `src/components/ui/` base components: Button, Input, IconButton, Tooltip, Badge
- Implement dark/light/system theme toggle via `data-theme` on `<html>`
- Persist theme in localStorage
- Test: component tests for each UI primitive

**T-M1-03: Library screen**
- `src/screens/Library/Library.tsx`
- Empty state, "Open PDF" button, recent documents list
- Mock data for initial render; real data from DB after T-M1-06
- Test: component test with 0, 1, 5 documents

**T-M1-04: Tauri file dialog command**
- `src-tauri/src/commands/file.rs`
- Command: `open_pdf_dialog` → returns file path string
- Capability: `dialog:open`, scoped to `.pdf`
- Test: Rust unit test (mock)

**T-M1-05: SQLite setup and migrations**
- Install `@tauri-apps/plugin-sql` and configure `tauri-plugin-sql`
- `src/services/db/migrations.ts` — schema v1 (documents + reading_progress)
- Run migrations on startup before any query
- Test: integration test — migration runs, schema correct, idempotent on second run

**T-M1-06: Document import service**
- `src/services/db/documents.ts`
- Fingerprint computation (SHA-256 first 64KB + size) — via `src-tauri/src/commands/fingerprint.rs`
- Duplicate detection: query by fingerprint before insert
- Insert document record; update on metadata load
- Test: unit test (fingerprint), integration test (insert/duplicate)

**T-M1-07: PDF.js integration**
- Install `pdfjs-dist@6.4.299`
- Configure Vite to handle worker file
- `src/services/pdf/renderer.ts` — load PDF, render page to canvas, get text layer
- `src/components/reader/PdfCanvas/` — canvas + text layer overlay
- Test: component test with `simple.pdf` fixture

**T-M1-08: Reader screen**
- `src/screens/Reader/Reader.tsx`
- Virtual page list: render current page ± 2 pages
- Toolbar: page nav, zoom controls, progress display
- Keyboard shortcuts: arrow keys, Ctrl+/-, Escape
- Distraction-free mode toggle
- Test: component tests for toolbar; E2E for navigation

**T-M1-09: Reading progress persistence**
- `src/services/db/reading_progress.ts`
- Upsert on: page turn, zoom change (debounced 500ms), app close
- Restore on: document open
- Test: integration test — close, reopen, verify page/zoom restored

**T-M1-10: Recent documents and "Continue reading"**
- Library screen reads documents ordered by `last_opened_at`
- "Continue reading" button → navigate to most recent document at last page
- Test: E2E journey — import, close, reopen, verify resume

**T-M1-11: Error states**
- File not found on open → error UI in reader; option to remove from library
- Invalid PDF → error state; return to library
- Image-only PDF → render pages + informational banner
- Test: E2E with corrupt.pdf; unit test for error classification

**T-M1-12: Responsive layout and window resize**
- Reader layout adjusts for widths 800px–2560px
- Sidebar collapses at narrow widths
- Window resize does not shift page content incorrectly
- Test: manual at 800px, 1280px, 1920px; automated at 1280px

**T-M1-13: README.md**
- Setup instructions (prerequisites, install, dev run, test commands)
- Architecture overview (point to docs/)
- Contributing guidelines

### M1 verification commands
```bash
npm run tauri dev              # Visual inspection
npm run test:unit              # All unit tests pass
npm run test:component         # All component tests pass
npm run test:integration       # DB migrations and document insert pass
cargo test --manifest-path src-tauri/Cargo.toml  # Rust tests pass
npm run test:e2e               # pdf-import, page-navigation, invalid-pdf journeys pass
```

### M1 risks
- Tauri 2 scaffolding changes between CLI versions — run `tauri info` before and after install
- PDF.js worker configuration with Vite — known issue; document workaround
- Virtual page list memory behavior on very large PDFs — test with large.pdf during M1
- Coordinate transform for text layer (needed to overlay annotations in M2) — prototype early

---

## M2: Reading State

**Goal:** Highlights, notes, bookmarks — created, persisted, searchable, surviving restart.

**Acceptance criteria:**
- AC-M2-01: Text selection shows highlight toolbar with 4 color options
- AC-M2-02: Selected text is highlighted with correct color; overlay does not shift on zoom/resize
- AC-M2-03: Note can be added to any highlight; note text persists
- AC-M2-04: Bookmark added on current page; optional label; listed in sidebar
- AC-M2-05: All annotations visible in annotation sidebar; sortable and filterable
- AC-M2-06: Annotation search: keyword in note or selected text returns correct results
- AC-M2-07: Click annotation in sidebar → jump to page → annotation visible
- AC-M2-08: All above survive: app restart, zoom change, window resize
- AC-M2-09: Export all data → JSON → delete library → import → annotations restored at correct positions
- AC-M2-10: Duplicate PDF import shows warning; no silent overwrite
- AC-M2-11: Fingerprint mismatch (replaced PDF) → annotations flagged with clear message

### M2 task breakdown

**T-M2-01: Annotation coordinate system (resolve OQ-01)**
- Decide: PDF coordinate rects only, or rects + text offset? (Recommend: both, for resilience)
- Implement PDF ↔ screen coordinate transform in `src/services/pdf/renderer.ts`
- Test: round-trip transform unit tests at 50%, 100%, 150%, 200% zoom

**T-M2-02: Text selection and highlight toolbar**
- Detect text selection in PDF.js text layer
- Compute PDF coordinate rects from selection
- Show `HighlightToolbar` component near selection
- Test: component test for toolbar visibility and color selection

**T-M2-03: Annotation persistence**
- `src/services/db/annotations.ts` — full CRUD
- Insert with rects_json (validated), selected_text, anchor context
- Soft delete support
- Test: integration test for all operations; round-trip export/import

**T-M2-04: Annotation overlay renderer**
- `src/components/reader/AnnotationLayer/` — draws highlight rects on top of PDF canvas
- Listens to zoom/resize; recalculates screen rects from PDF rects on change
- Hover → show note preview tooltip
- Test: component test at different zoom levels

**T-M2-05: Annotation sidebar**
- List all annotations for current document
- Filter by type (highlight, bookmark), color, page range
- Sort by page, date
- Click → navigate to page
- Test: component test; E2E for click-to-navigate

**T-M2-06: Bookmark service and UI**
- `src/services/db/bookmarks.ts`
- Add bookmark via toolbar button; label dialog
- Bookmark list in sidebar
- Test: integration test; E2E bookmark-create journey

**T-M2-07: Annotation note editing**
- Note panel: create, edit, delete note on a highlight
- Undo within session (soft delete + restore)
- Test: component test; E2E annotation-note journey

**T-M2-08: Fingerprint mismatch handling (resolve OQ-02)**
- On document open: verify fingerprint matches stored value
- If mismatch: banner warning + option to re-link or open anyway (annotations flagged)
- Test: integration test with modified fingerprint

**T-M2-09: Export / import**
- `src/services/export.ts` and `src/services/import.ts`
- Export: all entities to JSON
- Import: validate version, detect conflicts, merge with user confirmation
- Settings UI for export/import triggers
- Test: integration test round-trip with sample_export.json fixture

**T-M2-10: DB migrations to v2**
- Add any new columns/tables needed for M2 features
- Migration idempotent; existing data preserved
- Test: integration test — migrate from v1 data, verify v2 reads correctly

### M2 verification commands
```bash
npm run test:unit
npm run test:component
npm run test:integration        # annotation CRUD, export/import round-trip
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:e2e               # highlight-persist, bookmark-persist, annotation-search, export-import
```

---

## M3: Context Beacon

**Goal:** Document text indexing, grounded AI answers with page citations, persistent threads.

**Acceptance criteria:**
- AC-M3-01: Text extraction runs in background after import; progress shown; cancellable
- AC-M3-02: FTS5 search returns relevant chunks for a test query against simple.pdf
- AC-M3-03: Beacon icon visible in reader; clicking opens panel without changing page
- AC-M3-04: All 4 modes available (Explain, Connect, Challenge, Apply)
- AC-M3-05: Privacy preview shown before each AI call; user must confirm
- AC-M3-06: Response contains page citation; clicking citation navigates to that page
- AC-M3-07: Response clearly labels book-sourced vs. additional reasoning
- AC-M3-08: Provider error shows error in Beacon panel; reader unaffected
- AC-M3-09: No document content in logs; API key never visible in UI or logs
- AC-M3-10: Thread saved to DB; browsable in Knowledge space
- AC-M3-11: Confirm that AI key is not present in exported JSON

### M3 task breakdown

**T-M3-01: Text extraction pipeline**
- `src/services/pdf/extractor.ts` — chunked extraction via PDF.js `getTextContent()`
- Store in `document_chunks` + FTS5
- Background worker; progress events to UI; cancellable via AbortController
- Test: unit test chunk logic; integration test DB insert + FTS5 search

**T-M3-02: FTS5 search service**
- `src/services/search/documentSearch.ts`
- BM25 ranking via FTS5 `rank` column
- Return top-K chunks with page index and snippet
- Test: unit test ranking; integration test against known content in simple.pdf

**T-M3-03: Context assembly pipeline**
- `src/services/beacon/context.ts`
- Assemble: immediate context + retrieved chunks + personal annotations
- Token budget management (estimate tokens; trim chunks first, then history)
- Test: unit test trimming logic and priority order

**T-M3-04: Provider adapter interface and OpenAI implementation**
- `src/services/beacon/provider/adapter.ts`
- `src/services/beacon/provider/openai.ts`
- Streaming support; error classification (rate limit, auth, network, server)
- Key retrieved from Rust IPC (never from renderer state)
- Test: unit test with mock HTTP; integration test against Ollama (if available locally)

**T-M3-05: Rust credential store command**
- `src-tauri/src/commands/credentials.rs`
- Read/write/delete via Windows Credential Manager
- Tauri command: `get_credential(service, account)`, `set_credential(...)`, `delete_credential(...)`
- Test: Rust unit test (mock); manual verification with Windows Credential Manager UI

**T-M3-06: Beacon panel UI**
- `src/components/beacon/BeaconPanel/`
- Mode tabs, input, message list, streaming response, citation links
- Privacy preview step before submission
- Error states: no key, provider down, rate limit, timeout
- Test: component test for each state

**T-M3-07: Agent thread persistence**
- `src/services/db/agent_threads.ts` and `agent_messages.ts`
- Create thread on first message; persist all turns
- Test: integration test — create thread, add messages, query

**T-M3-08: Knowledge space — thread view**
- `src/screens/Knowledge/` — list threads by document; view conversation
- Search across message content
- Test: component test with seeded data

**T-M3-09: Prompt injection hardening**
- System prompt template with clear document content fencing
- Test: `tests/security/prompt_injection.test.ts` — known injection payloads; verify response does not follow injected instructions

**T-M3-10: AI provider settings**
- `src/screens/Settings/` — base URL input, model input, masked key input, test connection button
- Save key to credential store; display connection test result
- Test: component test; E2E beacon-ai-failure journey

---

## M4: Knowledge Features

**Goal:** Thought Trails, quiz mode, restrained reading insights, full knowledge search.

**Key tasks (to be detailed in M3 closeout):**
- T-M4-01: Thought Trail data model (already in schema) and creation UI
- T-M4-02: Thought Trail visualization (graph or list)
- T-M4-03: Global knowledge search (unified search across highlights, notes, threads)
- T-M4-04: Quiz generation mode in Beacon (Challenge mode)
- T-M4-05: Reading insights screen (sessions, time, progress — no gamification)
- T-M4-06: Saved questions (mark agent message as "unresolved question"; track status)

---

## M5: Release Quality

**Goal:** Shippable Windows application suitable for a university pilot.

**Key tasks (to be detailed in M4 closeout):**
- T-M5-01: Windows NSIS/MSI installer packaging
- T-M5-02: Accessibility audit and fixes (keyboard, contrast, ARIA)
- T-M5-03: Performance regression tests (Playwright metrics)
- T-M5-04: Full E2E regression suite against binary
- T-M5-05: Onboarding flow (consent, AI setup guide, feature introduction)
- T-M5-06: Security/privacy review (cargo audit, npm audit, credential audit, log review)
- T-M5-07: University pilot materials (pilot guide, feedback form, IRB-compatible data policy)
- T-M5-08: CHANGELOG.md and contributor documentation

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rust prerequisites difficult to install | Medium | High | Document step-by-step; test from clean machine |
| PDF.js worker Vite config issues | Medium | Medium | Use `vite-plugin-pdfjs` or known working config; document |
| Annotation coordinates shift after zoom | Medium | High | Prototype coordinate transform in M1 before committing M2 annotation format |
| SQLite migration data loss | Low | Critical | Migration tests; never modify past migrations; backup before migrate |
| AI prompt injection via PDF content | Medium | High | System prompt fencing; test with known payloads in M3 |
| API key leaking to renderer or logs | Low | Critical | Architecture enforces Rust-only key retrieval; verify in security test |
| Large PDF (>200MB) performance | Medium | Medium | Virtual page list; background extraction; test with large.pdf in M1 |
| WebView2 version compatibility | Low | Medium | Tauri handles WebView2 version requirements; document minimum version |
| FTS5 keyword search insufficient for user needs | Medium | Low | Monitor in pilot; semantic search is a known planned upgrade path |

---

*Next update: M1 kickoff — add specific task assignments, test evidence after each task, and update risks.*
