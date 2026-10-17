# PRODUCT_SPEC.md — Nocturne

> **Status:** M0 Draft — last updated 2026-10-17  
> **Owner:** Product / Engineering  
> **Stability:** Living document — update alongside implementation.

---

## 1. Vision

**Nocturne — Read deeply. Remember everything. Ask anything.**

Nocturne is a local-first Windows desktop reading environment for technical PDFs. It is not a generic PDF viewer with an AI chat box bolted on. Its core differentiator is **continuity**: when a user reopens the app, it remembers exactly where they stopped, what they marked, which questions remain unresolved, and the relevant reading context — without making unsupported guesses.

---

## 2. Target Users

**Primary: University students** reading dense technical texts — computer science textbooks, research papers, lecture notes, and course materials.

**Personas:**

| Persona | Situation | Job to be done |
|---------|-----------|----------------|
| **Deep-focus student** | Reads a 600-page OS textbook over weeks | Never loses place, quickly finds old highlights, asks about confusing passages |
| **Paper-reader** | Reads 20 research papers per week | Bookmarks key sections, links insights across papers, asks for comparisons |
| **Exam preparer** | Reviewing weeks of annotated material | Searches all notes, generates quiz questions, revisits hard concepts |
| **Note-keeper** | Margins full of written thoughts | Wants digital margin notes tied to exact passages, searchable later |

**Non-primary (out of scope for M0–M2):**
- Collaborative/shared annotation
- Cloud sync or mobile clients
- DRM-protected PDF files
- Scanned handwritten documents with OCR correction

---

## 3. Product Surfaces and Requirements

### 3.1 Landing / Library

**Purpose:** First screen on open; access to all imported documents; continuation of recent reading.

**Requirements:**
- `R-LIB-01` Open PDF button launches native file dialog (single file, .pdf only)
- `R-LIB-02` Drag-and-drop import from Windows Explorer
- `R-LIB-03` Recent documents list (most recent 20) with title, last-read page, progress %, and last-read date
- `R-LIB-04` "Continue reading" shortcut for the most recently open document
- `R-LIB-05` Meaningful empty state: actionable copy, no decorative placeholder
- `R-LIB-06` Import error feedback: invalid file, duplicate, file not found, too large (>500 MB warning)
- `R-LIB-07` Recently saved notes/questions teaser (max 3, with link to Knowledge space)
- `R-LIB-08` Works correctly with 0 documents, 1 document, and 50+ documents

**Non-goals:** Cloud library, multi-user library, folder organization (M0–M2)

---

### 3.2 Reader

**Purpose:** The primary document canvas. Where students spend most of their time.

**Requirements:**
- `R-RDR-01` Render PDF pages at native fidelity using PDF.js (text layer enabled for selection/search)
- `R-RDR-02` Continuous scrolling view with virtual page rendering (only visible ±2 pages eagerly rendered)
- `R-RDR-03` Page navigation: page number input, previous/next page, first/last page
- `R-RDR-04` Zoom: in/out/fit-to-width/fit-to-page, keyboard shortcuts, minimum 50 %, maximum 400 %
- `R-RDR-05` Document outline/TOC panel when outline is present in the PDF; graceful fallback when absent
- `R-RDR-06` Page thumbnail panel (optional, toggleable)
- `R-RDR-07` In-document text search with result highlighting and navigation
- `R-RDR-08` Reading position (page + scroll offset) persisted on navigation and app close; restored on reopen
- `R-RDR-09` Keyboard shortcuts: arrow keys or j/k for page, Ctrl+/-  for zoom, Ctrl+F for search, Escape closes panels
- `R-RDR-10` Distraction-free mode: hide sidebar/toolbar, retain core controls via keyboard
- `R-RDR-11` Preserve original PDF page colors; dark-mode shell surrounds document canvas
- `R-RDR-12` Responsive layout: correct behavior from 800 px to 4K window widths
- `R-RDR-13` Progress indicator: current page / total pages displayed in toolbar

**Error states:**
- File moved or deleted after import: clear error, path to re-link or remove from library
- Password-protected PDF: inform user (encryption not supported in M1)
- Image-only PDF (no text layer): render pages, inform user search/highlight unavailable
- Corrupt/invalid PDF: error screen, do not crash

---

### 3.3 Annotation System

**Purpose:** Durable highlights, notes, and bookmarks anchored to document content.

**Requirements:**
- `R-ANN-01` Text selection triggers highlight toolbar (color picker + create note action)
- `R-ANN-02` Highlight colors: 4 preset colors (amber, teal, violet, rose); color persisted per highlight
- `R-ANN-03` Text note attached to a highlight: up to 4,000 characters; edit and delete
- `R-ANN-04` Margin bookmark: saved on current page with optional label; edit label, delete
- `R-ANN-05` Annotation anchors stored in PDF page coordinate space, normalized; survive zoom/resize
- `R-ANN-06` Annotations visible in reader as colored overlays; hover shows note preview
- `R-ANN-07` Annotation sidebar panel: list by document, filterable by type/color, sorted by page
- `R-ANN-08` Annotation search: keyword match on note text and selected text
- `R-ANN-09` Edit and delete annotations; soft undo within the session where practical
- `R-ANN-10` Annotations persist immediately on commit; survive app restart
- `R-ANN-11` For image-only pages: bookmarks still work; highlights require text layer (clearly communicated)

**Anchor durability:** Annotations store: page index, normalized bounding rect in PDF coordinate space, selected text verbatim (capped at 500 chars), and a 200-char surrounding-text anchor. If a PDF is replaced with a changed version, the app notes the fingerprint mismatch and flags potentially stale anchors.

---

### 3.4 Context Beacon

**Purpose:** A reading companion that grounds answers in the open document. AI is optional.

**Requirements:**
- `R-BCN-01` Persistent icon in reader workspace; opens/closes side panel without losing page position
- `R-BCN-02` Panel modes: Explain, Connect, Challenge, Apply
- `R-BCN-03` Immediate context: selected text (if any), current page text, page number
- `R-BCN-04` Document context: extracted text chunks retrieved by relevance
- `R-BCN-05` Personal context: relevant bookmarks and annotation notes retrieved by relevance
- `R-BCN-06` Response must cite page numbers/section labels for book-sourced claims
- `R-BCN-07` Response clearly separates "the document says" from "my interpretation"
- `R-BCN-08` If evidence is absent, say so — never invent quotes, page numbers, or prior conversations
- `R-BCN-09` Provider adapter pattern: initial support for OpenAI-compatible APIs; key stored in OS credential store
- `R-BCN-10` Conversation persisted per document; threads browsable in Knowledge space
- `R-BCN-11` Bounded tools (read-only default): search_document, get_page_context, search_annotations, compare_passages, generate_quiz, create_draft_note
- `R-BCN-12` Write tools require explicit user confirmation before execution
- `R-BCN-13` AI failure must not affect reader, annotations, or navigation
- `R-BCN-14` Privacy controls: user sees what content is sent before each query
- `R-BCN-15` No document content sent without active user invocation

---

### 3.5 Knowledge Space

**Requirements:**
- `R-KNW-01` Global search across highlight text, notes, saved questions, and AI answers
- `R-KNW-02` Filterable by document, annotation type, date range
- `R-KNW-03` Thought Trails: user-created links between annotations, questions, and insights (M4)
- `R-KNW-04` Saved questions list with document reference and resolved/unresolved state
- `R-KNW-05` AI conversation archive per document, browsable and searchable

---

### 3.6 Reading Insights

**Requirements:**
- `R-INS-01` Sessions list: date, document, duration, pages visited
- `R-INS-02` Per-document progress: % read, total time
- `R-INS-03` No streaks, badges, or gamification mechanics (explicitly excluded)

---

### 3.7 Settings

**Requirements:**
- `R-SET-01` Appearance: Dark / Light / System; accent color selector
- `R-SET-02` Reader preferences: default zoom, font size scale, scroll speed
- `R-SET-03` AI provider: configure base URL + model; test connection; key in OS credential store
- `R-SET-04` Privacy: view stored data; export as JSON; import from JSON; delete library
- `R-SET-05` Backup: export SQLite snapshot; restore from backup
- `R-SET-06` Keyboard shortcuts reference panel
- `R-SET-07` Diagnostics (opt-in): version info, DB path, log level; no content in logs

---

## 4. Non-Goals (All Milestones)

- Cloud sync or remote server
- Collaborative/shared annotations
- DRM PDF support
- Mobile or web clients
- Real-time collaboration
- Telemetry without explicit opt-in

---

## 5. Key User Journeys

### Journey 1: First import and read
Launch → empty landing → Open PDF → file picker → import → reader opens at page 1 → read → close → relaunch → resume at exact scroll position.

### Journey 2: Highlight and annotate
Select text → highlight toolbar → choose color → create note → save → navigate away → reopen → highlight visible → annotation sidebar → click → jump to page.

### Journey 3: Context Beacon
Select passage → Context Beacon → Explain mode → see what context is sent → confirm → answer with page citation → click citation → jump to page.

### Journey 4: Export and restore
Settings → Export → JSON saved → fresh install → import → library and annotations restored → annotations at correct positions.

---

## 6. Acceptance Criteria (Summary)

| Surface | Key measurable outcome |
|---------|------------------------|
| Library | Import, display, resume verifiable in automation |
| Reader | PDF renders, navigation works, position restored after restart |
| Annotations | Highlight + note survives restart, zoom, resize |
| Context Beacon | Answer cites real page; failure leaves reader intact |
| Knowledge space | Full-text annotation search returns correct results |
| Settings | Dark/light/system theme applies live; export round-trips without data loss |

---

## 7. Design Direction (Summary)

- Dark-mode first, editorial and calm
- Shell: near-black charcoal/navy (`#11131A` → `#303647`)
- Accent: muted violet `#A78BFA`; teal `#79C9B4`; amber `#E6B873`; rose `#F28B9B`
- Typography: Inter (Google Fonts)
- No glassmorphism, no decorative hero areas, no generic dashboard chrome
- Every empty state is intentional and actionable
- All interactive states designed: hover, focus, disabled, loading, error

---

*Next update: M1 completion — add confirmed acceptance evidence and discovered edge cases.*
