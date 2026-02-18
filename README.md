# Riftbound Hub (GitHub Pages)

Static website for Riftbound players with:

- FAQ list (`data/faqs.json`)
- Rules PDF index (`content/rules/index.json`)
- Online PDF reader (`reader.html`)
- Community pages in Markdown (`content/pages/*.md` + `data/pages.json`)

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. In repository settings, enable **Pages** and choose branch `main` and folder `/ (root)`.
3. Open: `https://<owner>.github.io/<repo>/`

## Content Management

### Option A: Edit files directly

- Add FAQ entries in `data/faqs.json`
- Add/update page records in `data/pages.json`
- Add page Markdown files in `content/pages/`
- Add rule files in `content/rules/files/` and update `content/rules/index.json`

## Notes

- This project is fully static; no backend is required.
- No auto-fetch/sync is enabled by default.

## Convert PDF to Text Page

If you want the rulebook as readable/searchable web text, convert PDF to Markdown:

1. Install dependency:
   `pip install pypdf`
2. Convert:
   `python tools/pdf_to_md.py <input.pdf> content/pages/<page-id>.md --title "<Page Title>"`
3. Add/update the page entry in `data/pages.json`, for example:
   `{ "id": "rulebook-v1", "title": "Rulebook V1", "summary": "...", "file": "content/pages/rulebook-v1.md", "updatedAt": "2026-02-18" }`

Note: If the PDF is image-scanned (not selectable text), text extraction quality may be poor. In that case, OCR is needed.
