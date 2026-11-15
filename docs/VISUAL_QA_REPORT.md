# Visual QA report

Updated: 2026-10-29

## Outcome

The production build renders the intended premium dark NOIR & NEON interface in a real Chromium browser. Tailwind utilities, custom fonts, global design tokens, images, controls, forms, cards, navigation, the admin login, and the footer are active. The latest Playwright run passed all 14 assertions across 66 route/viewport combinations and captured ten production screenshots.

## Root cause of the unstyled browser output

The source CSS pipeline was not a Tailwind v3/v4 mismatch. The project uses Tailwind CSS 3.4.19 with the correct v3 directives, `tailwindcss` PostCSS plugin, source paths, and root-layout import. The original archive contains the same valid configuration.

The failure was a stale mixed Next.js runtime:

- The shell wrapper for `next dev` exited, but its child `start-server.js` process remained alive on port 3000.
- That orphan continued using `.next` while `next build` replaced the same manifests and assets.
- The listening process became unresponsive or served HTML referencing assets from a different build state, which explains the default Times-like text, white background, native controls, and blue underlined links.
- During investigation, the stale listener accepted connections but returned no bytes for 20 seconds. Later, the wrapper exited again while child PID 26740 still held port 3000. This reproduced the process-lifecycle problem directly.

## Corrections

- Stopped the verified orphan processes and rebuilt with no development server writing to production artifacts.
- Added phase-aware Next.js output directories: `.next-dev` for `next dev`, `.next` for production build/start.
- Added `.next-dev` to `.gitignore`.
- Kept the valid Tailwind v3/PostCSS/global-CSS configuration intact.
- Made reveal content visible in its initial rendered state while retaining restrained vertical motion. Content no longer disappears in no-JS, reduced-motion, full-page capture, or slow-hydration states.
- Replaced the final hardcoded menu-card charcoal with the centralized `surface` token.
- Strengthened visual QA to wait for hydration, scroll and load lazy imagery, seed a persisted cart, and close the browser after failures.

## Browser verification

Routes checked: `/`, `/menu`, `/menu/midnight-cortado`, `/order`, `/reservations`, `/about`, `/gallery`, `/contact`, `/privacy`, `/terms`, and `/admin/login`, plus the unauthenticated `/admin` redirect.

Viewports checked: 1440×900, 1280×800, 1024×768, 768×1024, 390×844, and 375×812.

- Production stylesheet returned HTTP 200 as `text/css`.
- Body background computed to `rgb(8, 10, 15)`.
- Manrope body font and Bebas Neue display font were active.
- Header was fixed and custom styled; CTA, product cards, form fields, and footer were not browser defaults.
- All 66 route/viewport responses were successful with zero horizontal overflow.
- Unauthenticated `/admin` access redirected to the styled `/admin/login` page.
- All rendered images loaded; no browser console or page errors occurred.
- Four recorded `ERR_ABORTED` requests are expected cancelled Next.js RSC prefetches during rapid automated navigation, not failed page, CSS, or image requests.
- Mobile menu, menu search, cart persistence, checkout/contact validation, and gallery open/ArrowRight/Escape interactions passed.

## Screenshots

Production screenshots are in `docs/visual-qa/screenshots/`:

- `home-desktop.png`
- `home-mobile.png`
- `menu-desktop.png`
- `menu-mobile.png`
- `reservations-desktop.png`
- `order-checkout.png`
- `about-desktop.png`
- `gallery-desktop.png`
- `contact-desktop.png`
- `admin-login-desktop.png`

Machine-readable results are in `docs/visual-qa/results.json`.

## Command results

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; Prisma 6.19.3 generated, 49 pages produced, all routes compiled |
| `npm run verify:frontend` | Passed 9/9 |
| `npm run qa:visual` | Passed 14/14; 10 screenshots and 66 responsive route checks |

## Remaining visual limitations

- Authentic address, hours, phone, map, and social profiles remain intentionally marked as launch configuration.
- Menu records currently share the centrally managed sample drink image; replace it with authentic item photography before launch.
- Backend-dependent success states cannot be integration-tested without real service credentials and remain honest setup-required states.
