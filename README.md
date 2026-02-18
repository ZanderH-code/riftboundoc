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
- Add/update rules in `content/rules/index.json`

Rules index format:

```json
{
  "updatedAt": "2026-02-18",
  "rules": [
    {
      "id": "core-rules-v1-2-text",
      "title": "Riftbound Core Rules v1.2 (Text Version)",
      "kind": "page",
      "pageId": "riftbound-core-rules-v1-2",
      "summary": "Structured text version converted from the official PDF.",
      "source": "Converted from PDF",
      "updatedAt": "2026-02-18"
    },
    {
      "id": "core-rules-v1-2-pdf",
      "title": "Riftbound Core Rules v1.2 (PDF)",
      "kind": "pdf",
      "url": "content/rules/files/riftbound-core-rules-v1-2.pdf",
      "summary": "Original PDF file.",
      "source": "Official release",
      "updatedAt": "2026-02-18"
    },
    {
      "id": "origins-faq",
      "title": "Riftbound Origins FAQ",
      "kind": "external",
      "url": "https://riftbound.leagueoflegends.com/en-us/news/rules-and-releases/riftbound-origins-faq/",
      "summary": "Official web page.",
      "source": "Riftbound Official",
      "updatedAt": "2026-02-18"
    }
  ]
}
```

`kind` meaning:
- `page`: links to `page.html?id=<pageId>`
- `pdf`: links to `reader.html?src=<url>`
- `external`: opens the original URL

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
