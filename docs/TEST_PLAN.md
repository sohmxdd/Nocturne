# TEST_PLAN.md — Nocturne

> **Status:** M0 Draft — last updated 2026-10-17  
> **Stability:** Living document — update with each milestone.

---

## 1. Testing Philosophy

- Tests exist to verify observable behavior, not to satisfy a coverage number.
- A task is not done because tests pass in CI — it is done when the test output was read and assessed.
- Tests should document intent: a failing test must explain what the product should do.
- Never disable a test to make a build green without documented justification.
- Test at the right level: unit tests for logic, integration tests for persistence, E2E for user journeys.

---

## 2. Test Layers

### 2.1 Unit Tests (Vitest)

**Scope:** Pure TypeScript/React logic. No Tauri IPC, no actual SQLite, no real files.

**Environment:** `jsdom` for DOM-dependent tests; `node` for pure logic.

**What to unit-test:**
- PDF text chunking logic (chunk size, overlap, edge cases)
- Document fingerprint computation (same input → same output; different files → different fingerprints)
- Context assembly pipeline (correct prioritization, token budget trimming)
- Annotation coordinate transforms (PDF space ↔ screen space round-trips)
- Export/import serialization (JSON round-trip fidelity)
- Search query normalization and scoring logic
- Date/time formatting utilities
- Error classification and user-message generation

**What NOT to unit-test:** IPC calls, file system operations, AI provider requests (use integration/mock tests for these).

**Command:** `npm run test:unit`

---

### 2.2 Component Tests (Vitest + jsdom)

**Scope:** React component rendering and interaction without a real backend.

**Mocking strategy:**
- Mock `@tauri-apps/api/core` (invoke) with typed fakes
- Mock `@tauri-apps/plugin-sql` with an in-memory SQLite facade
- Use `@testing-library/react` for rendering; `@testing-library/user-event` for interaction

**What to component-test:**
- Library screen with 0, 1, and 10+ documents — correct rendering and empty states
- Reader toolbar: zoom controls, page number input, keyboard shortcuts
- Highlight toolbar: appears on selection, correct colors, dismiss on click-away
- Annotation sidebar: filter, sort, click to navigate
- Context Beacon panel: open/close, mode switching, message rendering with citations
- Settings panel: theme toggle, key input (masked), export button states
- Error states: file not found, invalid PDF, DB error, AI provider failure

**Command:** `npm run test:component`

---

### 2.3 Integration Tests (Vitest + real SQLite)

**Scope:** Repository layer, migrations, and persistence round-trips using a real (in-memory or temp) SQLite database.

**Setup:** Each test gets a fresh SQLite file in a temp directory; migrations run before tests; file is deleted after.

**What to integration-test:**
- Migration runs correctly from version 0 to latest
- Migration from N to N+1 preserves existing data
- `documents` CRUD: insert, select, update status, fingerprint uniqueness enforcement
- `reading_progress` upsert: correct creation and update behavior
- `bookmarks` CRUD: insert, update label, delete
- `annotations` CRUD: insert with rects_json, soft-delete, restore, hard-delete
- `reading_sessions` open/close lifecycle
- `agent_threads` and `agent_messages` insert and select
- `document_chunks` insertion and FTS5 search
- Export JSON generation: correct structure, all entities present
- Import JSON: round-trip fidelity, ID conflict handling
- Cascade delete: removing a document deletes all dependent entities
- Concurrent reads: WAL mode allows simultaneous reads

**Test fixtures:**
- `tests/fixtures/simple.pdf` — 3-page text PDF with known content; used for all rendering tests
- `tests/fixtures/large.pdf` — 200-page PDF for performance smoke tests
- `tests/fixtures/image_only.pdf` — scanned PDF with no text layer
- `tests/fixtures/corrupt.pdf` — intentionally malformed PDF header
- `tests/fixtures/sample_export.json` — known-good export for import round-trip tests

**Command:** `npm run test:integration`

---

### 2.4 Rust Unit Tests (cargo test)

**Scope:** Native command handlers, fingerprint computation, path validation.

**What to test:**
- `compute_fingerprint`: same file bytes → same hash; different files → different hashes
- `validate_pdf_path`: rejects paths outside allowed scope; accepts valid paths
- `open_file_dialog`: tested via mock (actual dialog requires UI)
- Credential store: mock write/read/delete cycle (actual OS store tested in integration)

**Command:** `cargo test` (run from `src-tauri/`)

---

### 2.5 E2E Tests (Playwright)

**Scope:** Full user journeys against the running application.

**For M1–M4:** Run against the Vite dev server (`localhost:1420`) with mocked Tauri IPC.
**For M5:** Run against the compiled Tauri binary (full desktop E2E).

**Test IDs:** All interactive elements must have `data-testid` attributes for stable Playwright selectors.

**User journey tests:**

| Test | Milestone | Steps |
|------|-----------|-------|
| `library-empty-state` | M1 | Launch → library shows empty state with Open PDF CTA |
| `pdf-import` | M1 | Click Open PDF → select simple.pdf → reader opens |
| `page-navigation` | M1 | Open PDF → navigate to page 3 via input → zoom 150% → close → reopen → verify page 3 at 150% |
| `invalid-pdf` | M1 | Import corrupt.pdf → error shown → library intact |
| `image-only-pdf` | M1 | Import image_only.pdf → renders → warning about no text layer |
| `highlight-create` | M2 | Select text on page 1 → choose teal → save → navigate to page 3 → return to page 1 → highlight visible |
| `highlight-persist` | M2 | Create highlight → quit app → relaunch → highlight visible at correct position |
| `bookmark-create` | M2 | Open reader → add bookmark with label → navigate away → bookmark list shows it |
| `bookmark-persist` | M2 | Create bookmark → quit → relaunch → bookmark present |
| `annotation-note` | M2 | Create highlight → add note → save → relaunch → note content intact |
| `annotation-search` | M2 | Create 3 highlights with notes → Knowledge space → search for unique word → correct result |
| `export-import` | M2 | Export data → delete library → import → documents and annotations restored |
| `beacon-open-close` | M3 | Open reader → click Beacon → panel opens → reading position unchanged → close |
| `beacon-ai-failure` | M3 | Open Beacon → configure invalid key → ask question → error shown → reader functional |
| `beacon-citation` | M3 | Ask question → response contains page citation → click citation → navigates to page |
| `dark-light-theme` | M1 | Settings → toggle to Light → verify all surfaces → toggle to Dark → verify |

**Command:** `npm run test:e2e` (dev server mode)

---

### 2.6 Manual Test Checklist (per milestone)

Performed before a milestone is marked complete. These are not automated.

#### Visual and design:
- [ ] Dark mode: every surface is correctly styled with no white/unstyled flashes
- [ ] Light mode: every surface readable with sufficient contrast (WCAG AA minimum)
- [ ] System mode: follows OS appearance setting
- [ ] Empty states: library (0 docs), no annotations, no sessions — all intentional, not blank
- [ ] Error states: file not found, invalid PDF, DB error, AI failure — all have actionable messages
- [ ] Loading states: PDF loading, text extraction, AI streaming — all indicated to user
- [ ] Hover, focus, disabled, and active states for all interactive elements
- [ ] No overflow, clipping, or layout shift at 800px, 1280px, 1920px widths

#### Accessibility:
- [ ] Tab order is logical on all screens
- [ ] All interactive elements have visible focus rings
- [ ] Keyboard-only navigation for: import, navigate reader, create highlight, add note, open Beacon
- [ ] All images and icons have appropriate `aria-label` or `alt`
- [ ] Dialog/modal: focus trapped on open, returned on close, Escape closes
- [ ] Status not conveyed by color alone (use icon + label alongside color)
- [ ] Reduced motion: animations disabled when `prefers-reduced-motion: reduce`

#### PDF rendering:
- [ ] simple.pdf renders correctly at 100%, 150%, 50% zoom
- [ ] large.pdf: page 1 visible within 2s; scrolling stays smooth
- [ ] image_only.pdf: renders; correct warning shown; no crash
- [ ] PDF with outline: TOC panel shows and navigates correctly
- [ ] PDF without outline: TOC panel shows empty state gracefully

#### Data integrity:
- [ ] Highlight survives: restart, zoom change, window resize
- [ ] Bookmark survives restart
- [ ] Export/import round-trip: no annotations lost or corrupted
- [ ] Duplicate import: warning shown, no silent overwrite or crash

---

## 3. Test Fixtures

All test fixtures stored in `tests/fixtures/`. These files are committed to the repository.

| File | Pages | Description | Used in |
|------|-------|-------------|---------|
| `simple.pdf` | 3 | Text-only; known content at known page positions | All rendering and annotation tests |
| `large.pdf` | 200 | Mixed text/images; typical textbook structure | Performance smoke tests |
| `image_only.pdf` | 5 | Scanned pages with no text layer | Text layer fallback tests |
| `corrupt.pdf` | N/A | Invalid PDF header | Error handling tests |
| `sample_export.json` | N/A | Known-good export from simple.pdf with 3 annotations | Import round-trip tests |

Fixtures are minimal — use the smallest file that exercises the behavior under test.

---

## 4. CI/CD Configuration (Target — M5)

Planned for M5 (not yet configured):

```yaml
# Target: GitHub Actions on push to main and PRs
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:component
      - run: npm run test:integration
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: npm run build
      - run: npm run test:e2e
```

---

## 5. Performance Tests

Not automated in M0–M2. Manual checks only.

| Scenario | Pass threshold | Method |
|----------|---------------|--------|
| Cold start to library visible | < 2 seconds | Manual timing |
| simple.pdf page 1 visible | < 500ms after open | Manual timing |
| large.pdf page 1 visible | < 1500ms after open | Manual timing |
| Scroll through 20 pages | No dropped frames visually | Manual observation |
| Text extraction (100 pages) | < 5s, non-blocking | Manual timing + background indicator |
| Create highlight | < 100ms perceived | Manual observation |
| Annotation search (50 items) | < 200ms | Manual timing |

Automated performance regression suite planned for M5 using Playwright's `page.metrics()`.

---

## 6. Security Test Scenarios

Tested before M3 (AI integration) and M5 (release):

| Test | Method |
|------|--------|
| PDF with prompt injection text | Create PDF with "Ignore all previous instructions" in body; verify AI response is grounded |
| Malformed PDF | `corrupt.pdf` → verify no crash, correct error UI |
| Oversized text chunk to AI | Construct context over 32K tokens; verify trimming; verify no crash |
| Path traversal via file dialog | Verify Tauri scope blocks access outside allowed paths |
| API key not in SQLite | Inspect exported JSON; verify no key field |
| API key not in renderer logs | Open DevTools in dev mode; verify no key in console |
| AI provider down | Kill network; verify reader functions normally |
| DB schema migration failure | Introduce version mismatch; verify app fails fast with message |

---

*Next update: M1 — add evidence of tests run, actual command output, and discovered gaps.*
