# Performance Baseline Workflow

Use this workflow to capture a lightweight baseline and compare before/after changes.

## Generate baseline

```bash
npm run perf:baseline
```

This command:

1. Builds the site.
2. Measures built JS/CSS bundle sizes.
3. Runs simple HTTP probes for key pages:
   - `/`
   - `/cards/`
   - `/faq-detail/` (first FAQ item)
   - `/updates/`
4. Writes reports:
   - `docs/perf/baseline-latest.json`
   - `docs/perf/baseline-latest.md`

## Compare with a previous baseline

```bash
node tools/perf_baseline.mjs --compare docs/perf/baseline-latest.json
```

Pass any prior JSON report path to include byte deltas in the markdown output.

## What to track

- Total JS+CSS bytes
- Top individual bundles
- Per-page probe latency and HTML payload size
- Script and stylesheet tag counts
