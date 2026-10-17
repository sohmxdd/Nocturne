# Nocturne

> **Read deeply. Remember everything. Ask anything.**

Nocturne is a local-first Windows desktop reading environment for technical PDFs. Built for university students who read deeply and want their reading context — highlights, notes, questions, and progress — to persist and be searchable.

---

## What it does

- **Premium PDF reader**: Text layer, continuous scroll, virtual rendering, zoom, keyboard navigation, distraction-free mode
- **Durable reading state**: Highlights, notes, margin bookmarks, and reading position survive app restarts
- **Context Beacon**: An AI reading companion that grounds answers in the actual document with page citations — never hallucinated
- **Knowledge space**: Searchable highlights, notes, saved questions, and linked ideas
- **Reading insights**: Session tracking and progress — supportive, not gamified

Everything works offline. AI is optional.

---

## Status

| Milestone | Status |
|-----------|--------|
| M0 — Discovery & contracts | ✅ Complete |
| M1 — Working reader | 🔴 Blocked (Rust not installed) |
| M2 — Reading state | ⬜ Not started |
| M3 — Context Beacon | ⬜ Not started |
| M4 — Knowledge features | ⬜ Not started |
| M5 — Release quality | ⬜ Not started |

See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the current task ledger and evidence.

---

## Development Setup

### Prerequisites

1. **Node.js ≥ 20** (tested with v24.14.0)
2. **npm ≥ 10** (tested with v11.9.0)
3. **Microsoft WebView2** — pre-installed on Windows 10/11; download from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if needed
4. **Microsoft C++ Build Tools** — required by Tauri/Rust:
   - Download: https://aka.ms/vs/17/release/vs_BuildTools.exe
   - Select workload: **Desktop development with C++**
   - Ensure MSVC v143 and Windows SDK are checked
5. **Rust (stable, MSVC toolchain)**:
   - Download and run: https://rustup.rs/
   - Accept defaults (stable, MSVC target)

### Verify environment

```powershell
rustc --version    # Should print: rustc 1.8x.x ...
cargo --version    # Should print: cargo 1.8x.x ...
node --version     # Should print: v24.x.x
npx @tauri-apps/cli@latest info  # Should show all green
```

### Install and run

```powershell
# Clone the repo
git clone <repo-url>
cd Nocturne

# Install JavaScript dependencies
npm install

# Start the development app
npm run tauri dev
```

### Run tests

```powershell
npm run test:unit          # Vitest unit tests
npm run test:component     # Vitest component tests
npm run test:integration   # Vitest integration tests (SQLite)
npm run test:e2e           # Playwright E2E tests (dev server)
cargo test --manifest-path src-tauri/Cargo.toml  # Rust tests
```

---

## Project Documentation

| Document | Purpose |
|----------|---------|
| [`AGENT.md`](AGENT.md) | Engineering operating manual for all contributors and AI agents |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | Requirements, user journeys, acceptance criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Component structure, data flows, design system |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | SQLite schema, coordinate system, migrations |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, capability config, AI data flow |
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Test strategy, fixtures, manual checklists |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture Decision Records |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | Phased task breakdown with acceptance criteria |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Current milestone, task ledger, evidence |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| UI | React 19 + TypeScript + Vite |
| PDF rendering | Mozilla PDF.js (pdfjs-dist) |
| Native integration | Rust (stable, MSVC toolchain) |
| Database | SQLite via tauri-plugin-sql |
| Styling | Vanilla CSS + CSS Custom Properties |
| Tests | Vitest + Playwright + Rust tests |
| Package manager | npm |

---

## Design Principles

- **Dark mode by default** — complete, free, first-class. Also supports light and system.
- **Local-first** — core reading, bookmarks, and annotations work offline; AI is optional.
- **No fake functionality** — every visible control works or is disabled with an explanation.
- **Intentional aesthetics** — calm, editorial, legible. Not generic dashboard chrome.
- **Trust before novelty** — no silent uploads, fake citations, or placeholder success states.

---

## Contributing

Read [`AGENT.md`](AGENT.md) before contributing. Key points:
- Inspect and understand before editing
- Small vertical slices; each PR leaves the project in a working, tested state
- Tests must run and output must be read — not just "it compiles"
- Update `docs/PROGRESS.md` with evidence after each task

---

## License

TBD — to be determined before M5/release.
