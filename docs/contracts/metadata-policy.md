# Metadata Policy: `dataVersion`, `generatedAt`, `source`

## Scope

This policy applies to exported JSON datasets used by `riftboundoc`, including:

- `data/cards.json`
- `data/faqs.json`
- `data/errata.json`
- `data/pages.json`
- `content/rules/index.json`

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

## Rollout Guidance

- Object-root datasets should add all three keys now or at the next refresh.
- Array-root datasets (`faqs`, `errata`, `pages`) cannot carry root metadata without a shape change.
- If array-root files are wrapped in an object later, add:
  - `dataVersion`
  - `generatedAt`
  - `source`
  - `items` (existing array payload)
