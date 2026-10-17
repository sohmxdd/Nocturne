# PROGRESS.md — Nocturne

> **Format:** Current milestone, completed work with evidence, known issues, next action.  
> **Update policy:** Update at every task completion and milestone boundary. Never claim something is done without evidence.

---

## Current Milestone: M0 — Discovery and Contracts

**Status:** ✅ COMPLETE  
**Date:** 2026-10-17

---

## M0 Completion Report

### What was done

#### Repository inspection
- Inspected repository root: contained only `AGENT.md` (309 lines, full engineering operating manual)
- No existing code, package.json, src/, or docs/ — clean start
- No git history — initialized empty git repository

#### Environment verification (commands run and output read)

| Check | Command | Result |
|-------|---------|--------|
| Node.js | `node --version` | v24.14.0 ✓ |
| npm | `npm --version` | 11.9.0 ✓ |
| WebView2 | `npx @tauri-apps/cli@latest info` | 155.0.4283.60 ✓ |
| Rust/rustc | `rustc --version` | NOT INSTALLED ✗ |
| Cargo | `cargo --version` | NOT INSTALLED ✗ |
| VS Build Tools | Tauri CLI info | NOT INSTALLED ✗ |

#### Research conducted
- Tauri 2 stable (GA: October 2024); current patches in 2025 cover plugin sync and mobile stability
- pdfjs-dist: current stable v6.4.299; ES module build; worker configured via `import.meta.url`
- tauri-plugin-sql: v2.5.x; synchronized with Tauri 2 core; `sqlite` feature required
- Testing: Vitest (unit/component) + Playwright (E2E); Vitest browser mode supported via Playwright provider

#### Documents created

| File | Status |
|------|--------|
| `docs/PRODUCT_SPEC.md` | ✅ Created |
| `docs/ARCHITECTURE.md` | ✅ Created |
| `docs/DATA_MODEL.md` | ✅ Created |
| `docs/SECURITY.md` | ✅ Created |
| `docs/TEST_PLAN.md` | ✅ Created |
| `docs/DECISIONS.md` | ✅ Created (8 ADRs, 7 open questions) |
| `docs/IMPLEMENTATION_PLAN.md` | ✅ Created |
| `docs/PROGRESS.md` | ✅ This file |

### Decisions made (summary)

| ADR | Decision |
|-----|----------|
| ADR-001 | Rust + VS Build Tools must be installed before M1 (BLOCKING) |
| ADR-002 | npm as package manager; lockfile committed |
| ADR-003 | SQLite via tauri-plugin-sql (not better-sqlite3, not Prisma) |
| ADR-004 | PDF rendering via pdfjs-dist (not WebView2 built-in) |
| ADR-005 | FTS5 keyword search only (no embeddings in M0–M2) |
| ADR-006 | Vanilla CSS + CSS Custom Properties (no Tailwind) |
| ADR-007 | React Context + useReducer (no Redux in M0–M2) |
| ADR-008 | OpenAI-compatible provider adapter first |

### Known issues / blockers

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| B-001 | Rust not installed | **BLOCKING M1** | Developer must install rustup + VS Build Tools before M1 |
| B-002 | VS Build Tools (MSVC) not installed | **BLOCKING M1** | Same action as above |

### Open questions

See `docs/DECISIONS.md` — OQ-01 through OQ-07. Most are deferred to relevant milestones. OQ-03 (scroll position normalization) is pre-decided as page-fraction approach.

### What was NOT done

- No application code written (correct — M0 is documentation only)
- M1 scaffolding has not started (correct — prerequisite blockers noted)
- No tests run (no code to test)
- No visual inspection (no UI to inspect)

---

## Next Action

**IMMEDIATE (before M1 can begin):**

1. Install Microsoft C++ Build Tools:  
   https://aka.ms/vs/17/release/vs_BuildTools.exe  
   Workload: "Desktop development with C++"

2. Install Rust via rustup:  
   https://rustup.rs/  
   Accept defaults (stable, MSVC toolchain)

3. Verify:
   ```powershell
   rustc --version
   cargo --version
   npx @tauri-apps/cli@latest info  # should show all green
   ```

4. Report verification output and proceed to M1-T01.

---

## Milestone History

| Milestone | Status | Date | Evidence |
|-----------|--------|------|---------|
| M0 | ✅ Complete | 2026-10-17 | Environment verified, 8 docs created, 8 ADRs recorded |
| M1 | 🔴 Blocked | — | Waiting for Rust + VS Build Tools installation |
| M2 | ⬜ Not started | — | — |
| M3 | ⬜ Not started | — | — |
| M4 | ⬜ Not started | — | — |
| M5 | ⬜ Not started | — | — |
