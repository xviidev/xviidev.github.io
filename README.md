# XVII Dev

Ismail's personal homepage, built with Astro and Tailwind CSS for https://xvii.dev.
The original XVII Dev logo is preserved in `public/assets/logo.svg`.
Pixerve and Evetry use their official SVG logos. JetBrains Mono is self-hosted via Fontsource.

## Development

Use Node.js 24 LTS (or Node.js >=22.23.4).

```sh
npm ci
npm run dev
```

## Validation and preview

```sh
npm run check
npm run build
npm run preview
```

## Files

- `src/pages/index.astro`: homepage content.
- `src/layouts/BaseLayout.astro`: shared page structure and metadata.
- `src/styles/global.css`: responsive styling.
- `src/pages/404.astro`: custom not-found page.
- `src/pages/utilitas.astro`: placeholder for future utilities.
- `public/`: original logo, favicon, and custom domain.

## Deployment

GitHub Actions checks and builds pull requests. Pushes to `master` also deploy
`dist/` to GitHub Pages. The site generates static HTML without client JavaScript.



