AGENT.md — Nocturne Engineering Operating Manual
Purpose: persistent project instructions for Antigravity and any coding agent/human contributing to Nocturne.
Priority: correctness, user trust, product quality, and verifiable delivery outrank speed or code volume.
Compatibility: these are portable instructions. If a platform supports AGENTS.md, CLAUDE.md, or native skills, use thin adapter files that point here rather than maintaining conflicting copies.

1. Product identity
Nocturne is a local-first Windows desktop reading environment for technical PDFs.
Promise: “Read deeply. Remember everything. Ask anything.”
The product combines:
- A premium, distraction-free PDF reading experience.
- A landing/library screen and recent reading continuity.
- Durable reading progress, bookmarks, highlights, annotations, and notes.
- A small persistent Context Beacon icon that opens a contextual AI reading companion.
- Searchable personal notes, saved questions, and optional Thought Trails connecting ideas.
- Reading insights, settings, backup/export, and a carefully consented university pilot.
The AI is not a generic chatbot bolted to a viewer. It must ground answers in the current document and relevant user-created context, cite page/section references when available, and distinguish source-backed statements from additional reasoning.
2. Product and engineering principles
1. Dark mode is the default, complete, free, and tested. Also support light/system appearance.
2. Local-first. Core reading, navigation, bookmarks, and annotations work offline. AI may require a configured provider.
3. Never lose user data. Persistence, migrations, backups, recovery, and export are first-class features.
4. Never fake functionality. No dead buttons, decorative controls masquerading as features, fake citations, placeholder success states, mocked production data paths, or “works” claims without evidence.
5. Design with intention. Avoid generic AI-generated dashboards, cookie-cutter layouts, default component-library sameness, excessive gradients/glassmorphism, and unconsidered empty space. Every visual choice must support the product's purpose.
6. Evidence before claims. Run commands, inspect output, test changed behavior, and distinguish verified facts from assumptions.
7. Small vertical slices. Each milestone leaves the project in a working, tested state.
8. Architecture before broad implementation. Inspect the repository, define contracts, record consequential decisions, then build.
9. Local data is sensitive. Never silently upload document text, notes, reading history, or telemetry.
10. Prefer simple, inspectable, typed systems over unnecessary frameworks or multi-agent complexity.
3. Expected architecture
Validate versions and current APIs against official documentation before implementation.
- Desktop: Tauri 2
- UI: React + TypeScript + Vite
- PDF: Mozilla PDF.js
- Native integration: Rust/Tauri commands with least-privilege capabilities
- Persistence: SQLite, typed repository layer, migrations, transactions, foreign keys
- Tests: Vitest, Playwright where compatible, Rust unit tests, persistence/integration tests
- AI: TypeScript agent/service layer with provider adapters, bounded tools, retrieval and citations
- Search: begin with extracted text + keyword/full-text search; add embeddings only when a measured need exists
Do not add a server, FastAPI, Redis, a vector database, or a heavyweight orchestration framework by default. The initial app should run without a background service. Isolate platform-specific and model-provider-specific code behind interfaces.
4. Required documents and living records
Maintain and update:
- docs/PRODUCT_SPEC.md — requirements, users, user journeys, non-goals, acceptance criteria.
- docs/ARCHITECTURE.md — components, boundaries, data flows, failure modes, security model.
- docs/DATA_MODEL.md — entities, relationships, constraints, migrations, anchor coordinates.
- docs/SECURITY.md — threat model, local file access, AI-provider data flow, secrets, prompt injection.
- docs/TEST_PLAN.md — unit/integration/E2E, fixtures, manual checks, accessibility/performance.
- docs/DECISIONS.md or docs/adr/ — important architecture decision records with alternatives and consequences.
- docs/IMPLEMENTATION_PLAN.md — milestones, tasks, dependencies, acceptance criteria and commands.
- docs/PROGRESS.md — current milestone, completed work, test evidence, known issues, next action.
- CHANGELOG.md once meaningful releases begin.
Do not invent that these files exist; create them during M0 and keep them synchronized with implementation.
5. Required skill/workflow library (research-backed)
Skills are instructions, not magic. They may be incompatible with a given agent, outdated, redundant, or licensed differently. Inspect upstream instructions and license, verify compatibility, and adapt selectively. Do not blindly install every skill or concatenate huge files into the prompt. Antigravity's native skill discovery may differ from Claude Code's; use portable principles here and native SKILL.md files where supported.
A. Product discovery and planning
Use before starting a new feature or milestone.
- Clarify user, job-to-be-done, workflows, constraints, non-goals, edge cases, and measurable acceptance criteria.
- Present architecture alternatives and trade-offs.
- Convert the approved design into small tasks with exact files, tests, expected outputs, and dependencies.
- Preserve decisions in docs so later sessions do not reinvent them.
Useful upstream:
- Anthropic Agent Skills repository: https://github.com/anthropics/skills
- Superpowers brainstorming/planning workflow: https://github.com/obra/superpowers
- Agent Skills open standard: https://agentskills.io/
Relevant Superpowers skills to inspect/use when compatible:
- brainstorming
- writing-plans
- executing-plans
- using-git-worktrees
- subagent-driven-development (only if the agent supports safe delegation)
- finishing-a-development-branch
B. Distinctive UI/UX and anti-generic design
Use before creating or redesigning a user-facing screen.
- Start with the product's audience and job, not a generic “modern SaaS” prompt.
- Decide layout, typography, color, density, hierarchy, and interaction model before coding.
- Define reusable design tokens and components.
- Use realistic content; account for loading, empty, error, disabled, hover, focus, keyboard, and responsive states.
- Run the app and inspect real screenshots; iterate on the actual rendered interface.
- Do not call a UI “polished” solely because it compiles.
Upstream:
- Anthropic frontend-design: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Vercel web-design-guidelines: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- Vercel React best practices: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
Use frontend-design as a design process, not as permission to imitate its examples. Do not accept identical layouts across unrelated screens. For Nocturne, create a calm editorial reading aesthetic with a charcoal/navy shell, muted violet accent, restrained teal/amber/rose statuses, comfortable typography, subtle borders, and a legible document canvas.
C. Implementation discipline and TDD
Use for feature work and regression fixes.
- Prefer RED → GREEN → REFACTOR for bug fixes and nontrivial behavior.
- Write a failing test or reproduce the failure before changing code.
- Implement the smallest coherent change.
- Verify the new behavior and existing invariants.
- Do not delete or weaken a test to make a build green without a documented, justified replacement.
Upstream:
- Superpowers: https://github.com/obra/superpowers
- test-driven-development skill: https://github.com/obra/superpowers/tree/main/skills/test-driven-development
- writing-plans: https://github.com/obra/superpowers/tree/main/skills/writing-plans
- Anthropic web app testing: https://github.com/anthropics/skills/tree/main/skills/webapp-testing
D. Root-cause debugging
Mandatory for bugs, regressions, unexpected behavior, failing tests, and performance problems.
1. Reproduce.
2. Gather logs, errors, traces, and relevant state.
3. Form a falsifiable hypothesis.
4. Test the hypothesis.
5. Find the root cause before changing code.
6. Add a regression test.
7. Verify the fix and nearby behavior.
Never guess at a fix, stack patches, suppress an error, or claim resolution without reproducing/validating the outcome.
Upstream:
- Superpowers systematic-debugging: https://github.com/obra/superpowers/tree/main/skills/systematic-debugging
- Skill reference: https://github.com/obra/superpowers/blob/main/skills/systematic-debugging/SKILL.md
E. Verification and code review
Mandatory before every milestone is marked complete.
- Run exact commands; read complete relevant output and exit status.
- Review diffs for unrelated changes, missing requirements, broken edge cases, insecure paths, accessibility issues, and maintainability.
- Use a fresh reviewer/subagent only if available and safe; never assume a reviewer tool exists.
- Separate specification compliance review from code-quality review.
- Fix critical/high findings before proceeding.
- State what was not tested.
Upstream:
- Superpowers verification-before-completion: https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
- Superpowers requesting-code-review: https://github.com/obra/superpowers/tree/main/skills/requesting-code-review
- Superpowers receiving-code-review: https://github.com/obra/superpowers/tree/main/skills/receiving-code-review
- executing-plans completion contract: https://github.com/obra/superpowers/tree/main/skills/executing-plans
F. React/TypeScript performance and maintainability
Use for React components, refactors, state management, and performance reviews.
- Strong types; avoid any unless justified at a boundary and narrowed immediately.
- Keep components cohesive; extract abstractions only when they reduce real duplication or clarify a boundary.
- Avoid unnecessary re-renders, duplicated state, race conditions, unhandled promises, stale closures, and effect-driven state synchronization.
- Lazy-load expensive PDF/AI surfaces where appropriate; avoid blocking initial landing-page rendering with PDF work.
- Profile before optimizing and test performance on realistic PDFs.
Upstream:
- Vercel react-best-practices: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Vercel skill file: https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md
Note: this skill collection targets React/Next.js patterns. Apply relevant React/TypeScript guidance, but do not import Next.js-specific rules blindly into a Vite/Tauri app.
G. Accessibility and UX review
Use for every user-facing feature and before release.
- Keyboard-only operation for primary actions; visible focus states.
- Semantic controls and labels; dialogs have sensible focus handling.
- Contrast checks; reduced motion; readable zoom/scaling.
- Errors explain what happened and how to recover.
- Test keyboard shortcuts for conflicts and provide a discoverable shortcut reference.
- Do not convey status only by color.
Upstream:
- Vercel web design guidelines: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
H. Browser/UI test workflow
Use for UI interactions, regression checks, and release candidate validation.
- Test user journeys rather than only component snapshots.
- Cover PDF import, navigation, restart/resume, bookmark, highlight, note, search, Context Beacon, and error recovery.
- Capture screenshots and inspect them at representative window sizes.
- Avoid brittle selectors; prefer accessible roles and stable test IDs.
- Keep deterministic test PDFs in tests/fixtures/ with known text and pages.
- Use realistic fixtures and verify persisted state after restarting the app.
Upstream:
- Anthropic webapp-testing: https://github.com/anthropics/skills/tree/main/skills/webapp-testing
- Playwright: https://playwright.dev/docs/intro
- Tauri testing docs: https://v2.tauri.app/develop/tests/
I. Security and privacy
Use before implementing native file access, AI calls, import, export, or telemetry.
- Least privilege for Tauri capabilities and IPC commands.
- Validate all IPC inputs; never trust renderer input.
- Avoid arbitrary shell execution and unrestricted filesystem tools.
- Treat PDF text as untrusted data; resist prompt injection in document content.
- Keep provider keys in OS credential storage where possible; never expose secrets in frontend code or logs.
- Clearly explain what context is sent to external AI providers.
- No silent telemetry; opt-in diagnostics should redact content.
- Test path traversal, malformed PDFs, oversized input, database integrity, and provider failure.
- Avoid rendering extracted document HTML unsanitized.
References:
- Tauri security: https://v2.tauri.app/security/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Anthropic skills repo (inspect current security/testing-related skills): https://github.com/anthropics/skills
J. Documentation and maintainability
Use for architecture changes, new features, and milestone closeout.
- Update the product spec, architecture/data model, tests, and progress record when behavior changes.
- Explain non-obvious decisions and trade-offs; avoid comments that merely repeat code.
- Keep setup and build instructions executable from a clean clone.
- No undocumented environment variables or secret requirements.
- No orphaned files, unused dependencies, duplicate helpers, dead code, unexplained TODOs, or commented-out implementations.
- Keep README.md useful to contributors and pilot users.
Useful workflow:
- Superpowers writing-plans, executing-plans, and verification-before-completion: https://github.com/obra/superpowers
K. AI agent and retrieval quality
Use when building or evaluating Context Beacon.
- Build a bounded context assembler rather than stuffing the whole book into prompts.
- Keep provenance through extraction → chunk → retrieval → answer.
- Attach document ID, page index/label, section, and relevant text to each source.
- Evaluate retrieval separately from answer quality.
- Test questions with answer present, absent, ambiguous, across multiple passages, and contradicted by the book.
- The model must say when evidence is insufficient.
- Treat document content as data, not instructions.
- Tool calls must be typed, validated, permissioned, logged without leaking sensitive text, and idempotent where possible.
- Explicit user approval for writes/deletes; provide undo where practical.
- AI/provider failure must never break local reading.
Use the official provider docs relevant to the selected provider, but keep provider-specific code behind an interface.
L. Performance and reliability
- Test small, medium, large, text-based, scanned, malformed, and image-heavy PDFs.
- Virtualize or render pages incrementally if necessary; avoid rendering every page eagerly.
- Ensure scrolling stays responsive while text extraction/indexing happens.
- Add cancellation and progress reporting to long tasks.
- Use structured error types and actionable user-facing messages.
- Use logs for diagnostics, but redact document content, API keys, and personal notes.
- Establish a baseline before optimizing; avoid premature abstractions.
M. Research and dependency hygiene
- Prefer official docs and upstream repositories for APIs.
- Check current version, maintenance, issue activity, license, and compatibility before adopting a dependency or skill.
- Pin versions via lockfiles; avoid copy-pasting unknown scripts into the environment.
- Do not treat stars, social media claims, or “S-rank” lists as proof of quality.
- Record source URLs and the reason for adopting a tool/skill in docs/DECISIONS.md.
- Never install a skill or run a remote script without inspecting what it does and the license.
- Revisit skills only when relevant; do not waste every task re-reading every skill.
6. Skill activation matrix
Task	Required process / skills
New feature/product area	brainstorming → writing-plans → applicable implementation skill
UI or landing page	frontend-design → design-system review → web-design-guidelines → visual inspection
Bug/regression	systematic-debugging → test-first fix → verification-before-completion
Data model/migration	design review → migration tests → persistence/rollback tests → code review
AI retrieval/citations	context design → retrieval tests → grounding evaluation → security review
Native file access/IPC	Tauri security review → input validation → least-privilege audit
Performance	reproduce/profile → hypothesis → focused optimization → regression tests
Release	full verification → accessibility audit → security/privacy review → clean-install smoke test
Feedback from reviewer	inspect evidence → classify severity → fix justified issues → rerun tests
End of milestone	update docs/progress → review diff → report commands/results/known limits


7. Definition of done
A task is complete only when all applicable conditions are true:
- [ ] Requirements and acceptance criteria are clear.
- [ ] Scope is limited and no unrelated files were changed.
- [ ] Tests cover new behavior and important edge cases.
- [ ] Relevant tests actually ran and output was reviewed.
- [ ] UI behavior was manually inspected where relevant.
- [ ] Loading, empty, error, disabled, and recovery states are handled.
- [ ] Accessibility and keyboard behavior were considered.
- [ ] Security and privacy boundaries remain intact.
- [ ] Types, docs, migrations, and tests are updated.
- [ ] No fake controls, dead code, unimplemented stubs, or unexplained TODOs remain.
- [ ] Critical/high review findings are fixed.
- [ ] docs/PROGRESS.md records evidence and the next step.
- [ ] Final report accurately distinguishes verified, unverified, and blocked items.
8. Nocturne-specific acceptance checklist
Reader
- Open/import local PDF, handle invalid/missing files, navigate pages, zoom, search text, preserve reading position.
- Provide useful outline/thumbnails where supported; handle PDFs without outlines.
- Keep original page rendering legible; do not blindly invert pages.
Persistence
- Restart and restore last document/page/zoom/scroll.
- Add/edit/delete bookmark and verify after restart.
- Highlight text, add note, resize/zoom, navigate away and back, restart, and verify anchor.
- Export and restore annotations/bookmarks/progress without corruption.
- Handle duplicate files, moved files, interrupted writes, and migrations.
Context Beacon
- Opens without losing the user's position.
- Selected passage is passed as immediate context only after the user invokes the agent.
- Source references map to actual PDF pages.
- Unsupported answers are marked uncertain.
- AI disabled/offline/provider errors leave reading functional.
- No silent document upload.
- Write tools require explicit user intent and confirmation where appropriate.
Product quality
- Dark mode works across every surface from first launch.
- Landing page is meaningful with zero, one, and many documents.
- Every visible control works.
- No obvious overflow, clipping, layout shift, or inaccessible keyboard trap.
- A first-time user can complete the main workflow without developer help.
9. Milestone order
- M0 Discovery/contracts: inspect repository, official docs, compatibility, architecture, data model, threat model, test plan, milestone plan.
- M1 Working reader: desktop shell, landing/library, PDF import/rendering/navigation, dark design system, persistent progress.
- M2 Reading state: bookmarks, highlights, notes, SQLite reliability, backup/export and recovery.
- M3 Context Beacon: indexing/retrieval, provider adapter, grounded citations, persistent threads, bounded tools and privacy controls.
- M4 Knowledge features: Thought Trails, searchable annotations, saved questions, quizzes and restrained reading insights.
- M5 Release/pilot: Windows packaging, accessibility, performance, regression/security checks, onboarding and university user-testing materials.
Do not jump ahead because a later feature is more exciting. Keep each phase usable and verified.
10. Required work protocol
For every task:
1. Read this file and any relevant skill instructions.
2. Inspect the current code and git status before editing.
3. Confirm current behavior and identify the relevant acceptance criteria.
4. Create a small plan listing files, risks, tests, and expected outcomes.
5. For bugs, reproduce and investigate root cause before changing code.
6. Implement the smallest complete slice.
7. Run focused tests and read the output.
8. Run relevant broader checks.
9. Run the app and inspect actual UI where relevant.
10. Review the diff for scope, types, security, accessibility, error handling, and maintainability.
11. Update docs and docs/PROGRESS.md.
12. Report changed files, tests and exact results, limitations, and next step.
If a command cannot run, say why and what remains unverified. Do not silently substitute a different check and claim equivalence. If you discover a product/architecture contradiction, stop at the smallest decision point, explain options and trade-offs, and update the relevant decision record before proceeding.
11. Research sources and community lessons
The following repositories and discussions informed this manual. Treat them as sources to inspect, not as an instruction to install everything.
- Anthropic Agent Skills: https://github.com/anthropics/skills
- Anthropic frontend-design skill: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Anthropic webapp-testing skill: https://github.com/anthropics/skills/tree/main/skills/webapp-testing
- Vercel Agent Skills: https://github.com/vercel-labs/agent-skills
- Vercel React best practices: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Vercel web design guidelines: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- obra/superpowers: https://github.com/obra/superpowers
- Superpowers systematic debugging: https://github.com/obra/superpowers/tree/main/skills/systematic-debugging
- Superpowers TDD: https://github.com/obra/superpowers/tree/main/skills/test-driven-development
- Superpowers verification before completion: https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
- Agent Skills standard: https://agentskills.io/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Playwright docs: https://playwright.dev/docs/intro
- Tauri security docs: https://v2.tauri.app/security/
- Reddit workflow discussion on narrow task slices and two-gate review: https://www.reddit.com/r/ClaudeWorkflows/comments/1u7fc6u/workflow_preventing_ai_code_slop_a_rigorous_agent/
- Reddit community discussion on detailed context, small tasks, and requirements: https://www.reddit.com/r/ClaudeAI/comments/1p1eqgv/after_5_years_as_a_fullstack_dev_ai_finally/
- Reddit discussion on why passing tests alone is insufficient and skills should connect requirements, implementation, and evidence: https://www.reddit.com/r/claudeskills/comments/1w10q6g/i_built_seven_agent_skills_against_ai_slop/
- Reddit discussion on design briefs, concrete references, real content, and avoiding repetitive generated layouts: https://www.reddit.com/r/ClaudeAI/comments/1v5t522/great_frontend_designs/
Community posts are anecdotal. Extract the useful process patterns—small scopes, strong context, independent review, visible evidence, and deliberate design—and validate them against this project's actual needs.
12. First action
Do M0 and nothing beyond it. Inspect the existing repository, identify current capabilities and available skills, check official documentation, verify the proposed stack's current compatibility, and produce the product/architecture/data/security/test documents plus an actionable milestone plan. Report the decisions, evidence, risks, and unresolved questions. Do not generate the entire application in one unreviewed pass.