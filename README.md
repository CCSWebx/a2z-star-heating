# A2Z Star Heating & Plumbing Solutions — website

Static single-page website (approved v0 concept, productionised). Plain HTML, CSS and JavaScript with local images. No framework, no build step, no runtime dependencies.

**Status: demo. Not live. Set to `noindex, nofollow`.**

## Structure

```
index.html   page markup, metadata
style.css    all styles (tokens in :root; breakpoints 1600 / 1150 / 950 / 700 / 380 / 350)
script.js    mobile menu, demo form validation, service preselection, privacy dialog
assets/      boiler / hob photography (+ smaller srcset variants), favicon.svg
scripts/     serve.js (local server), check.js (static checks)
tests/       smoke.js (browser smoke tests)
```

## Run locally

```
npm run serve     # http://localhost:8080
npm run check     # static checks, no dependencies
npm test          # browser smoke tests
```

`npm test` needs Playwright and Chromium: `npm install && npx playwright install chromium`.

`check` covers duplicate IDs, internal anchors, local assets, alt text, image dimensions, external-link `rel`, `tel:` links, service/option matching, JS syntax, a privacy guard (no network, storage or logging in `script.js`) and a scan for unverified claims.
`test` covers console errors, horizontal overflow at 1440 / 1280 / 1024 / 950 / 768 / 430 / 390 / 375 / 350 px, CTA service preselection, form validation and focus, menu and dialog keyboard behaviour, and the mobile bar versus focused fields.

## Content rules

Only supported information is used: business name, phone 07403 556650, Oldbury (West Midlands), the public service categories, and the MyBuilder rating (5.0 / 5, 554 reviews) with genuine review excerpts attributed to MyBuilder. No prices, guarantees, availability promises, qualifications, service-area list, schema ratings or other claims. Photography is illustrative and labelled as such.

## Demo form

The quote form validates in the browser only. It never sends, stores or logs entries (no request, cookie, storage or analytics), and the success message states that nothing was sent.

## Fonts

Barlow Condensed and DM Sans load from Google Fonts with `display=swap` and local fallbacks. Self-hosting is a possible later optimisation (removes the third-party request and a render-blocking stylesheet).

## Pending client confirmation

Final domain · canonical URL, Open Graph URL/image, sitemap and indexing (remove `noindex`) · confirmed service areas · Gas Safe or other registration (if to be stated) · final privacy/legal wording · final business photography · real form endpoint · analytics choice · hosting configuration · final review count.
