# riftboundoc

Live site: https://zanderh-code.github.io/riftboundoc/

`riftboundoc` is a community-friendly Riftbound reference site that consolidates official game information into one readable hub.

It brings together:

- Core rules and rules text pages
- Official FAQ entries
- Official card errata entries
- Card Gallery data (card image + key card info)
- Cross-content search and card-level related FAQ/Errata links

The goal is simple: give players one stable link to quickly find current official rulings and card updates.

## What This Site Is For

- Read official FAQ updates in a clean, searchable format
- Read official errata updates by set
- Read core rules online (including text-formatted rule pages)
- Quickly search across FAQ, errata, and rules content
- Give players one stable link to check the latest official clarifications

## Main Sections

- `Home`: latest rules, FAQ, and errata
- `FAQ`: official FAQ entries
- `Errata`: official errata entries
- `Rules`: rulebook resources and rule pages
- `Updates`: recent content updates

## Content Source Notes

- FAQ and Errata content comes from official Riftbound pages
- Rules can include PDF files and text pages
- New entries can be added by updating JSON/Markdown files in this repo

## Release Workflow (Stable + Test)

- `main` = stable production branch (GitHub Pages deploys from this branch)
- `test` = testing branch for new changes

Standard flow:

1. Make all feature/fix changes on `test` first.
2. Run local checks (`npm run build`) and verify pages/features.
3. Push `test` and complete testing/acceptance.
4. Only after approval, merge `test` into `main`.
5. Push `main` to publish stable updates.

Policy:

- Default rule: no direct feature work on `main`.
- `main` is reserved for stable, approved releases.
- Direct `main` changes are allowed only for emergency hotfixes.

Current stable baseline tag: `stable-2026-02-19`.
