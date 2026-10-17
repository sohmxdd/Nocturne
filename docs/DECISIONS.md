# DECISIONS.md — Nocturne Architecture Decision Records

> **Status:** M0 — last updated 2026-10-17  
> **Format:** Each decision is recorded with date, context, decision, alternatives, consequences, and status.

---

## ADR-001: Rust and Build Tools Not Yet Installed

**Date:** 2026-10-17  
**Status:** OPEN — blocking M1  
**Decider:** Engineering

### Context

On the development machine, `rustc` and `cargo` are not installed. Visual Studio Build Tools with "Desktop development with C++" are also absent. Both are required prerequisites for Tauri 2.

**Verified environment (2026-10-17):**
- OS: Windows 10.0.26200 x86_64
- Node.js: v24.14.0 ✓
- npm: 11.9.0 ✓
- WebView2: 155.0.4283.60 ✓
- Rust/Cargo: NOT installed ✗
- VS Build Tools (MSVC): NOT installed ✗

### Decision

Before beginning M1 implementation, the developer must:

1. Install **Microsoft C++ Build Tools** (free): https://aka.ms/vs/17/release/vs_BuildTools.exe  
   - Select workload: "Desktop development with C++"
   - Ensure MSVC v143 and Windows SDK are included

2. Install **Rust via rustup**: https://rustup.rs/  
   - Accept default settings (stable, MSVC toolchain)
   - Verify: `rustc --version` and `cargo --version` in a new terminal

3. Re-run `npx @tauri-apps/cli@latest info` and confirm all green.

### Alternatives Considered

- Use `cargo-binstall` or pre-compiled Tauri binaries — not viable; Tauri 2 requires compiling the Rust backend for each app.
- Use `gnu` toolchain instead of `msvc` — not recommended by Tauri docs; MSVC is required for Windows packaging.

### Consequences

- M1 scaffolding cannot be tested until prerequisites are installed.
- Documentation (README.md and IMPLEMENTATION_PLAN.md) must include setup steps.

---

## ADR-002: npm as Package Manager

**Date:** 2026-10-17  
**Status:** DECIDED

### Context

The repository has no existing `package.json`, `pnpm-lock.yaml`, or `yarn.lock`. Node.js v24.14.0 comes with npm 11.9.0.

### Decision

Use **npm** as the sole package manager. Commit `package-lock.json`. Do not use pnpm or yarn.

### Rationale

- npm 11 is installed and functional without any additional tooling.
- Tauri 2 scaffolding (create-tauri-app) works with npm.
- Avoids confusion from mixed lock files in a shared repository.
- Simpler contributor onboarding (npm is universally familiar).

### Alternatives Considered

- **pnpm**: faster installs, strict dependency resolution. Not pre-installed; adds onboarding friction.
- **yarn (Berry)**: PnP mode has compatibility issues with some native modules. Extra config needed.

### Consequences

- All install instructions use `npm install`.
- CI must use `npm ci` for reproducible installs.
- If pnpm is desired later, migrate via `pnpm import` and delete `package-lock.json`.

---

## ADR-003: SQLite via tauri-plugin-sql (not better-sqlite3 or Prisma)

**Date:** 2026-10-17  
**Status:** DECIDED

### Context

The app needs a local relational database. Several approaches are possible for a Tauri app.

### Decision

Use **`tauri-plugin-sql`** with the `sqlite` feature.

### Rationale

- Official Tauri plugin; maintained by the Tauri team; synchronized versioning with Tauri 2.
- Runs SQLite in the Rust process (not in Node.js), which is correct for a Tauri app.
- TypeScript bindings (`@tauri-apps/plugin-sql`) match Tauri's capability model.
- No server process required.
- Supports parametrized queries; avoids SQL injection risks.

### Alternatives Considered

- **better-sqlite3**: Node.js native addon. Does not work in a Tauri/WebView2 context; requires a Node.js backend process.
- **Prisma**: ORM with a query engine binary. Overkill for this app; adds ~30MB to bundle; complex Tauri integration.
- **IndexedDB (browser)**: Only accessible from renderer; bypasses Rust security model; no transaction guarantees for our use case.
- **Raw SQL in Rust with rusqlite**: Possible but requires writing the entire TS binding layer manually. tauri-plugin-sql handles this.

### Consequences

- The repository layer is in TypeScript using `db.execute()` and `db.select()` methods from the plugin.
- Migrations are implemented as TypeScript-side SQL strings applied at startup.
- Schema changes require a migration version bump; no ORM auto-migration.

---

## ADR-004: PDF Rendering via pdfjs-dist (not native WebView PDF viewer)

**Date:** 2026-10-17  
**Status:** DECIDED

### Context

Windows' WebView2 has a built-in PDF viewer. PDF.js (pdfjs-dist) is an alternative.

### Decision

Use **Mozilla `pdfjs-dist`** (v6.4.299, ES module build).

### Rationale

- Text layer: PDF.js exposes a text layer API for selection, search, and highlight anchoring. The built-in WebView2 viewer provides no text layer access for programmatic use.
- Annotation overlay: PDF.js renders to a canvas; we draw our annotation overlays on top using a positioned `<div>` layer. This is impossible with the built-in viewer.
- Context Beacon integration: text extraction via PDF.js APIs is necessary for document chunk indexing.
- Cross-platform: if we ever support macOS or Linux, PDF.js works identically.
- Mature: used by Firefox, Mozilla actively maintains it.

### Alternatives Considered

- **WebView2 built-in viewer**: No JavaScript API for text layer, selection, or annotation overlay. Cannot use.
- **@pdf-lib/pdf.js**: Unmaintained fork; do not use.
- **pdfium via WASM**: Possible but significantly larger bundle; more complex worker setup; not necessary for our use case.

### Consequences

- PDF.js worker must be configured correctly: `GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()`.
- Vite config must handle the worker file copy via `vite-plugin-pdfjs` or manual copy.
- We own the rendering loop; performance optimization (virtual page list) is our responsibility.
- Scanned/image-only PDFs render pages but have no text layer; this must be communicated to users.

---

## ADR-005: No Embedding / Semantic Search in M0–M2

**Date:** 2026-10-17  
**Status:** DECIDED

### Context

The AGENT.md specifies: "Start document retrieval with extracted-text indexing and keyword search; add embeddings/semantic retrieval only when justified by tests and scale."

### Decision

Begin with **SQLite FTS5** for full-text search over `document_chunks`. Do not add vector embeddings, a vector database, or an embedding API call in M0–M3.

### Rationale

- FTS5 is built into SQLite; zero additional dependencies.
- For documents with a few hundred to a few thousand chunks, FTS5 keyword search is fast and adequate.
- Embedding APIs add latency, cost, privacy concerns (text sent externally during indexing), and complexity.
- Semantic search requires either a local embedding model (adds size) or a cloud call (privacy trade-off).
- The AGENT.md explicitly prohibits vector databases without evidenced need.

### When to revisit

- User research or testing reveals that keyword search produces poor results for the questions users actually ask.
- A local embedding model (e.g., Nomic Embed via ONNX) is available at acceptable size.
- A privacy-preserving solution exists (embeddings computed locally, never uploaded).

### Consequences

- Context Beacon retrieval uses BM25-style keyword matching via FTS5.
- Relevance will be imperfect for semantically related queries with different vocabulary.
- This is an explicit known limitation to be documented and disclosed.

---

## ADR-006: Design System — Vanilla CSS with Custom Properties (no Tailwind)

**Date:** 2026-10-17  
**Status:** DECIDED

### Context

Styling approach for the frontend.

### Decision

Use **vanilla CSS with CSS Custom Properties** for the design token system. Component-level styles using CSS Modules or scoped stylesheets. No Tailwind CSS.

### Rationale

- Tauri bundles a WebView; Tailwind's JIT purging setup adds Vite plugin complexity.
- For a design as intentional as Nocturne's, hand-crafted token definitions provide more control and legibility than utility classes.
- The AGENT.md product principles explicitly call for intentional visual design that avoids generic component-library aesthetics. Tailwind, while powerful, encourages utility-class accumulation that can produce inconsistent results.
- Design tokens as CSS Custom Properties (`--color-accent`, etc.) are inheritable and themeable (light/dark) without JavaScript or class toggling.
- Smaller CSS bundle; no JIT build step.

### Alternatives Considered

- **Tailwind CSS**: Excellent for rapid prototyping; can produce generic results; adds build config.
- **CSS Modules**: Good isolation; will use for component-level styles alongside global token definitions.
- **Styled Components / Emotion**: Runtime CSS-in-JS; unnecessary overhead for a local desktop app.
- **Radix UI with Tailwind**: Pre-built accessible primitives; possible for M4+ if component complexity grows.

### Consequences

- `src/index.css` defines all design tokens.
- Component files use CSS Modules (`Button.module.css`) for scoped styles.
- Theme switching (dark/light/system) implemented via `data-theme` attribute on `<html>` and `prefers-color-scheme` media query.

---

## ADR-007: State Management — React Context + useReducer (no Redux)

**Date:** 2026-10-17  
**Status:** DECIDED

### Context

Global state needs: current document, reading progress, theme, annotation selection, Beacon state.

### Decision

Use **React Context + useReducer** for cross-cutting UI state. Add Zustand or Redux only if Context causes measurable performance problems.

### Rationale

- React 19 Context with `useReducer` is sufficient for the state complexity of M1–M2.
- No additional dependency.
- Easier to reason about than Redux for a team or contributor unfamiliar with the codebase.
- The AGENT.md principle: "No speculative complexity: add dependencies and infrastructure only when they solve an evidenced need."

### When to revisit

- Profiling shows excessive re-renders from Context propagation.
- State shape becomes complex enough that Redux DevTools would significantly aid debugging.

### Consequences

- `AppContext` provides: `currentDocument`, `readingProgress`, `theme`, `openPanels`.
- `AnnotationContext` provides: current page annotations, selected annotation, highlight creation state.
- Business logic remains in service functions, not in reducers.

---

## ADR-008: AI Provider Adapter — OpenAI-Compatible First

**Date:** 2026-10-17  
**Status:** DECIDED (initial), OPEN for M3 revision

### Context

The Context Beacon needs to call an AI language model. Multiple providers exist (OpenAI, Anthropic, local Ollama, etc.).

### Decision

Design a typed **ProviderAdapter interface** in TypeScript. Implement the **OpenAI-compatible REST API** as the first concrete adapter. The base URL, model name, and key are user-configurable — this means the same adapter supports: OpenAI, Azure OpenAI, Ollama (locally hosted), and any OpenAI-compatible endpoint.

### Rationale

- OpenAI API format is de facto standard; most providers support it or plan to.
- Configuring a base URL (e.g., `http://localhost:11434/v1` for Ollama) allows local, fully offline AI without any external call.
- Single adapter covers the widest range of user setups.
- Anthropic API format differs (Messages API, different streaming format); add as a second adapter in M3 if warranted.

### Consequences

- `src/services/beacon/provider/adapter.ts` defines `ProviderAdapter` interface.
- `src/services/beacon/provider/openai.ts` implements it.
- Adapter is injected via a factory function; easy to swap in tests with a mock.
- Keys go to Rust credential store; the adapter receives them from an IPC call, not from local state.

---

## OPEN Questions (Unresolved as of M0)

| # | Question | Priority | Notes |
|---|----------|----------|-------|
| OQ-01 | Should highlight anchoring use text offset (char index) in addition to PDF coordinate rects? | Medium | Text offsets survive zoom perfectly; rects are more universal. Both could be stored. Decide in M2. |
| OQ-02 | How should fingerprint mismatch (moved/modified PDF) be handled in the UI? | High | Options: flag annotations as "unverified", hide them, or show all with warning. Decide before M2 annotation work. |
| OQ-03 | Should reading position use page-fraction or pixel scroll offset? | High | Fraction is zoom-independent; pixel offset is simpler. Decide before M1 scroll restoration. **Current plan: page-fraction (scroll_top as 0.0–1.0)** |
| OQ-04 | What is the maximum context size sent to the AI, and how is trimming prioritized? | Medium | Depends on chosen model's context window. Plan for M3. Target: < 8K tokens; selected text first, then retrieved chunks. |
| OQ-05 | What happens to agent threads if the user deletes a document? | Medium | CASCADE DELETE on document removes threads. Could lose valuable saved answers. Offer "detach thread" instead? Decide in M3. |
| OQ-06 | How should the app handle very large PDFs (>500 pages, >100MB)? | Medium | Text extraction must be chunked and cancellable. Streaming page render via virtual list. Test in M1 before committing to approach. |
| OQ-07 | Is SQLite encryption (SQLCipher) needed for the university pilot? | Low | Depends on university IRB requirements. Evaluate in M5 during pilot preparation. |

---

*Next update: M1 — close OQ-03 with verified implementation; address OQ-02 design decision before annotation work begins.*
