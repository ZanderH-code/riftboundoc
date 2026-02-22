# Errata Data Contract

## File

- `data/errata.json`

## Root Shape

Root is an array of errata objects.

## Errata Object Shape

Required keys:

- `kind`: string, must be `errata`
- `id`: string (unique within file)
- `title`: string
- `summary`: string
- `content`: string (Markdown)
- `source`: string
- `publishedAt`: string (`YYYY-MM-DD` or ISO-8601 datetime)
- `originUrl`: string (URL)
- `updatedAt`: string (`YYYY-MM-DD` or ISO-8601 datetime)

## Recommended Metadata

- Dataset metadata keys `dataVersion` and `generatedAt` are recommended by policy.
- Current file shape is an array, so these keys cannot exist at root without a format change.
- Until a wrapper object is introduced, keep metadata in documentation and generation logs.
