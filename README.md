# riftboundoc

Live site: https://zanderh-code.github.io/riftboundoc/

`riftboundoc` is a player-friendly website that organizes official Riftbound rules content in one place.

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

1. Switch to `test` and make changes there.
2. Run local checks (`npm run build`) and verify pages/features.
3. Push `test` for review/testing.
4. After validation, merge `test` into `main`.
5. Push `main` to publish stable updates.

Current stable baseline tag: `stable-2026-02-19`.
