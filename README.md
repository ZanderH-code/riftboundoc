# Riftbound Hub (GitHub Pages)

Static website for Riftbound players with:

- FAQ list (`data/faqs.json`)
- Rules PDF index (`content/rules/index.json`)
- Online PDF reader (`reader.html`)
- Community pages in Markdown (`content/pages/*.md` + `data/pages.json`)
- Browser admin panel (`admin.html`) for uploading PDFs and editing JSON/Markdown via GitHub API

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

### Option B: Use `admin.html`

1. Open `admin.html`.
2. Fill `owner`, `repo`, `branch`, and a GitHub token with `repo` scope.
3. Click `Load Data`.
4. Upload PDFs or edit Markdown/JSON, then save.

## Notes

- This project is fully static; no backend is required.
- No auto-fetch/sync is enabled by default.
