Cybersecurity News Hub (Modernized)

Features
- Responsive modern UI with Inter font and refined theme
- Dark/light theme toggle with system preference detection
- Search, source filters, and sorting (newest/oldest/source)
- Bookmarks with localStorage, dedicated bookmarks view (#bookmarks)
- Trending keywords section derived from recent headlines
- Skeleton loaders for perceived performance
- Share button (Web Share API with clipboard fallback)
- PWA: manifest + service worker for offline caching of shell assets
- Basic SEO: meta tags, Open Graph and structured data

Local Usage
- Open `index.html` directly in a browser or serve the folder with any static server.
- Service worker requires HTTP(S); for local dev use a static server, e.g. `python3 -m http.server`.
- Bookmarks persist in the browser via localStorage.

Feeds and CORS
- Feeds are fetched in the browser via public CORS proxies (codetabs and allorigins).
- If a feed fails, a toast notification appears; content from other feeds still loads.
- To use your own proxy or a serverless function, update `FEEDS` and/or proxy logic in `assets/app.js`.

Project Structure
- `index.html` — App shell and layout
- `assets/styles.css` — Theme, layout, components
- `assets/app.js` — Client logic: fetching, filtering, sorting, bookmarks, trending
- `manifest.webmanifest` and `sw.js` — PWA shell
- `icons/` — App icons (placeholders; replace with real PNGs)

Deployment
- Host as static files on any provider (Netlify, Vercel, GitHub Pages, S3, Nginx, etc.).
- Ensure the site is served over HTTPS to enable PWA features fully.
- Replace placeholder icons in `icons/` with proper 192x192 and 512x512 PNGs.

Customization
- Add/remove sources: edit the `FEEDS` array in `assets/app.js`.
- Tweak page size (`state.pageSize`) and skeleton count in `buildSkeletons`.
- Styling is CSS-only; no build step required.

