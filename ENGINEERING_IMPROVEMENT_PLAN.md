# Riftboundoc Engineering Improvement Plan

## 1) Goal and Scope

This document defines a full-stack improvement roadmap for `riftboundoc`, starting from foundations (architecture, data contracts, quality gates, performance) up to product-level UX and operations.

Primary objectives:
- Increase maintainability and development velocity.
- Improve runtime performance and perceived responsiveness.
- Strengthen data correctness and release reliability.
- Keep existing product behavior stable while iterating.

---

## 2) Current State Summary

Strengths:
- Clear product scope and information architecture.
- Good content pipeline (`normalize -> validate -> build`).
- Useful cards filtering/search and reader experience.
- Basic automated tests and CI now in place.

Main bottlenecks:
- Large monolithic frontend runtime logic (`site.js`) increases change risk.
- Heavy client-side processing on cards page (related-doc matching + prefetch patterns).
- Duplicate update entries (rules + page duplicates) create content noise.
- Test coverage is still minimal for complex matching/reader logic.

---

## 3) Engineering Principles

1. **Stability first**: no broad rewrites without migration path.
2. **Data contract first**: content model and schema are the source of truth.
3. **Move cost left**: expensive processing should happen at build time when possible.
4. **Small safe increments**: each phase should be releasable.
5. **Observability over guesswork**: measure before/after for performance and regressions.

---

## 4) Target Architecture (North Star)

### 4.1 Layered Design

- **Content layer (Python tooling)**
  - Source ingestion
  - Normalization
  - Validation
  - Derived artifact generation (indexes, denormalized helpers)

- **Data layer (public artifacts)**
  - Stable JSON contracts (`cards`, `faqs`, `errata`, `rules`, `pages`, derived indexes)
  - Versioned metadata (`dataVersion`, `generatedAt`, source provenance)

- **Presentation layer (Astro + modular JS)**
  - Page-specific entry modules
  - Shared core/render/search utilities
  - Minimal page bootstrap code

- **Quality and release layer**
  - Unit tests + contract tests + smoke checks
  - CI gates for content integrity and build correctness

### 4.2 Build-Time Derived Data

Add generated files to reduce runtime work:
- `public/data/updates-index.json` (already deduplicated and sorted)
- `public/data/card-related-index.json` (cardName -> faq/errata/rule refs)
- `public/data/search-index-lite.json` (optional, for faster startup search)

This shifts expensive text matching from client runtime to tooling stage.

---

## 5) Roadmap by Phase

## Phase 0 (Immediate hardening, 1-2 days)

### Deliverables
- Fix updates duplicate logic via deterministic deduplication.
- Add baseline performance measurement scripts (local Lighthouse or simple timing probes).
- Add repository docs: architecture map + data contracts.

### Acceptance criteria
- Updates page has no duplicate semantic entries.
- Baseline metrics captured for Home, Cards, one Detail page.

---

## Phase 1 (Data and contract strengthening, 2-4 days)

### Deliverables
- Introduce explicit schema docs:
  - `docs/contracts/cards.schema.md`
  - `docs/contracts/faq.schema.md`
  - `docs/contracts/errata.schema.md`
  - `docs/contracts/rules.schema.md`
- Add version metadata for generated data artifacts.
- Add contract tests for required fields and format constraints.

### Acceptance criteria
- CI fails on contract breakage.
- All public data files include predictable metadata/versioning strategy.

---

## Phase 2 (Frontend modularization, 4-7 days)

### Deliverables
- Split `site.js` into page-focused modules:
  - `cards-page.js`
  - `faq-page.js`
  - `errata-page.js`
  - `reader-page.js`
  - `updates-page.js`
- Keep shared utilities in:
  - `core.js`
  - `renderers.js`
  - `search.js`
  - `reading-drawer.js`
- Load only required scripts per page/layout.

### Acceptance criteria
- No behavior regressions.
- Smaller per-page JS payload.
- Easier test targeting for page modules.

---

## Phase 3 (Performance optimization, 4-8 days)

### Deliverables
- Cards page optimizations:
  - Lazy-load heavy related-doc computation.
  - Cache matching results by card ID.
  - Optional prebuilt related index from tooling.
- Search optimizations:
  - Reuse computed normalized fields.
  - Cap expensive operations and debounce UI events.
- Reader/Toc optimization:
  - Avoid unnecessary full re-scan on repeated actions.

### Acceptance criteria
- Significant reduction in cards page time-to-interactive.
- Smooth modal open/close under repeated interactions.

---

## Phase 4 (Quality expansion, 3-6 days)

### Deliverables
- Expand tests:
  - matching edge cases (quotes, mojibake, variant titles)
  - dedup logic for updates
  - rule anchor generation and highlight behavior
- Add smoke E2E checks (Playwright, minimal critical path):
  - open home
  - search keyword
  - open cards modal
  - navigate detail pages

### Acceptance criteria
- Test suite catches common regressions before merge.
- PR confidence significantly improved.

---

## Phase 5 (Product-level UX refinement, ongoing)

### Deliverables
- URL-state persistence for cards filters/search/sort/page.
- Detail page next/previous navigation.
- TOC quick filter for long reader pages.
- Improved empty/error states with recovery actions.

### Acceptance criteria
- Better deep-linking and shareability.
- Reduced user friction in long reading flows.

---

## 6) Operations and Release Strategy

## 6.1 Branching and Environments
- `test`: integration branch for validation.
- `main`: production branch for GitHub Pages deployment.

## 6.2 CI policy (recommended)
- On PR and push (`test`, `main`):
  1. `npm ci`
  2. `npm run content:check`
  3. `npm run test:ci`
  4. `npm run build`

## 6.3 Deployment safety
- Require green checks before merge to `main`.
- Keep rollback plan: revert latest merge commit if production regression appears.

---

## 7) Risks and Mitigations

1. **Risk**: Modularization introduces import/order regressions.
   - **Mitigation**: migrate page-by-page with parity checks.

2. **Risk**: Build-time index generation drifts from runtime behavior.
   - **Mitigation**: shared normalization utilities + snapshot tests.

3. **Risk**: Data source format changes break ingestion scripts.
   - **Mitigation**: strict schema validation + source parser tests.

---

## 8) Suggested Task Backlog (Actionable)

Priority P0:
- [ ] Deduplicate updates output logic.
- [ ] Add architecture + data contract docs folder.
- [ ] Add perf baseline report template.

Priority P1:
- [ ] Split cards logic out of `site.js`.
- [ ] Add build-generated `updates-index.json`.
- [ ] Add URL state for cards filters.

Priority P2:
- [ ] Build-generated card related index.
- [ ] Reader TOC filter and detail prev/next.
- [ ] E2E smoke workflow.

---

## 9) Definition of Done for "Full Improvement"

A release is considered "engineering-upgraded" when:
- Architecture is modular and documented.
- Data contracts are explicit and enforced by CI.
- Expensive runtime processing is minimized or precomputed.
- Core user flows are protected by tests.
- Deployment to GitHub Pages is predictable and low-risk.

---

## 10) Recommended First Execution Slice (Low risk, high impact)

Implement in this order:
1. Updates dedup fix
2. Cards URL-state persistence
3. Cards related-doc lazy/cached strategy
4. `site.js` split for cards module only
5. Extend tests around above changes

This sequence gives strong user-visible improvement without destabilizing the project.
