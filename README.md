# riftboundoc

Live site: https://zanderh-code.github.io/riftboundoc/

## Project Overview

`riftboundoc` is a Riftbound reference site that consolidates official FAQs, errata, rules, and card data into one searchable hub.

## Features

- FAQ list and detail pages
- Errata list and detail pages
- Rules pages (including converted text rules)
- Card gallery with filters and card detail modal
- Card detail related links (Related FAQ / Errata / Rules)
- Cross-content search (FAQ, Errata, Rules, Cards)
- Updates page for recent changes

## Testing and CI

- `npm run test`: run Vitest locally.
- `npm run test:ci`: run Vitest once for CI.
- `npm run content:check`: run content normalization and schema validation.
- GitHub Actions `QA` runs on pull requests and pushes to `test` and `main`, and executes:
  - `npm ci`
  - `npm run content:check`
  - `npm run test:ci`
  - `npm run build`
