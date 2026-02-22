# Cards Data Contract

## File

- `data/cards.json`

## Root Shape

Root is an object.

Required keys:

- `source`: string
- `originUrl`: string (URL)
- `updatedAt`: string (`YYYY-MM-DD`)
- `count`: number
- `cards`: array of card objects

Recommended metadata keys:

- `dataVersion`: string (semver, example `1.0.0`)
- `generatedAt`: string (ISO-8601 datetime, example `2026-02-22T08:00:00Z`)

## Card Object Shape

Required keys:

- `id`: string (unique within `cards`)
- `name`: string
- `publicCode`: string
- `collectorNumber`: number
- `set`: string
- `setId`: string
- `domains`: string[]
- `rarity`: string
- `cardTypes`: string[]
- `superTypes`: string[]
- `energy`: string
- `might`: string
- `power`: string
- `tags`: string[]
- `orientation`: string
- `imageUrl`: string (URL)
- `imageAlt`: string
- `abilityText`: string

## Notes

- `count` should match `cards.length`.
- `energy`, `might`, and `power` are strings to preserve source formatting.
