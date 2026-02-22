# Rules Data Contract

## File

- `content/rules/index.json`

## Root Shape

Root is an object.

Required keys:

- `updatedAt`: string (`YYYY-MM-DD`)
- `rules`: array of rule link objects

Recommended metadata keys:

- `dataVersion`: string (semver, example `1.0.0`)
- `generatedAt`: string (ISO-8601 datetime)
- `source`: string

## Rule Link Object Shape

Required keys:

- `id`: string (unique within `rules`)
- `title`: string
- `kind`: string, one of `page`, `pdf`, `external`
- `summary`: string
- `source`: string
- `updatedAt`: string (`YYYY-MM-DD`)

Conditional keys:

- `pageId`: required when `kind = page`; must match an `id` in `data/pages.json`
- `url`: required when `kind = pdf` or `kind = external`
