# Metadata Policy: `dataVersion`, `generatedAt`, `source`

## Scope

This policy applies to exported JSON datasets used by `riftboundoc`, including:

- `data/cards.json`
- `data/faqs.json`
- `data/errata.json`
- `data/pages.json`
- `content/rules/index.json`
- `data/updates-index.json`
- `data/card-related-index.json`
- `data/search-index-lite.json`
- Array-root sidecars:
  - `data/faqs.meta.json`
  - `data/errata.meta.json`
  - `data/pages.meta.json`

## Required Meanings

- `dataVersion`: semantic version of the data contract the file follows.
- `generatedAt`: UTC timestamp indicating when the file was generated.
- `source`: human-readable source attribution for the dataset.

## Format Rules

- `dataVersion`: semver string (`MAJOR.MINOR.PATCH`), example `1.0.0`.
- `generatedAt`: ISO-8601 datetime string in UTC, example `2026-02-22T08:00:00Z`.
- `source`: non-empty English string.

## Compatibility Rules

- Existing consumers must not break when metadata keys are absent.
- Validators should treat missing metadata as warnings, not hard failures.
- Hard failures remain reserved for schema-breaking issues (missing required content keys, invalid IDs, invalid required date fields).
- Array-root datasets stay backward-compatible as arrays. Metadata is carried in sidecar files (`*.meta.json`) instead of wrapping arrays.

## Rollout Guidance

- Object-root datasets are auto-injected in `tools/build_runtime_indexes.py`.
- Array-root datasets (`faqs`, `errata`, `pages`) are paired with sidecars:
  - `faqs.meta.json`
  - `errata.meta.json`
  - `pages.meta.json`
- Sidecar shape:
  - `dataVersion`
  - `generatedAt`
  - `source`
  - `count`
  - `itemsPath`
