# FRAME — Movie ticket booking frontend

A responsive, dark cinema experience built for the sibling Spring Boot movie-ticket-booking service.

## Run locally

Requires Node.js 22.12+ (use a maintained Node 22 release).

```powershell
cd movie-ticket-booking-frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:5173. Start your backend on port 8080. Vite forwards /api requests to it, preserving the backend's existing authentication rules without a CORS change.

Use **Try the experience** on the homepage for an explicitly labelled, browser-only showcase. The banner switches between customer and admin views. This does not connect to your backend or create real users/payments. Live sign-in always uses the API. Showcase records are stored in sessionStorage; a fresh browser session resets them.

## Included

- Movie search, genre/language filtering, date/city showtimes and cinema discovery.
- Accessible numbered seat maps, availability polling, server-backed holds and expiry countdown.
- Discount validation when creating a booking; authoritative backend totals.
- Payment methods with durable idempotency keys, retry/recovery, booking history, ticket export, cancellation and refund result.
- Signup/signin, shared JWT refresh, route protection and logout.
- Admin catalog, locations, screens, seat-layout generation, scheduling, discount/refund activation and administrator promotion.
- Loading, empty, validation, connection and permission states; responsive layouts and reduced-motion support.
- Original local SVG illustrations, Motion transitions, Zustand session/checkout state, TanStack Query caching, Tailwind 4 and shadcn-style Radix primitives.

## Configuration

| Variable | Purpose |
| --- | --- |
| API_PROXY_TARGET | Backend URL. Used by Vite and the production Node server; default http://localhost:8080. |
| VITE_API_BASE_URL | Keep empty for same-origin proxy. Set only if your separately hosted API has appropriate CORS rules. |
| VITE_CITY_OPTIONS | JSON array of real customer city IDs/names, e.g. [{"id":1,"name":"Bengaluru"}]. The backend exposes no customer city-list endpoint. |
| VITE_CINEMA_TIMEZONE | Timezone used to interpret Java LocalDateTime, default Asia/Kolkata. Must match the backend's clock semantics. |
| VITE_CURRENCY | Display currency, default INR. The backend does not return a currency field. |
| VITE_ENABLE_DEMO | Set false at build time to hide the showcase entry. |

VITE_* values are public build-time configuration: never put secrets in them. Restart Vite after editing .env.local.

Movies have no poster URL field. Configure title-specific artwork in src/lib/artwork.ts and add licensed assets under public/art. Unknown titles use a neutral FRAME cover rather than another movie's poster.

The current payment backend is a **mock processor**, including in live API mode. FRAME states this clearly and collects no card/bank details. Connecting a real provider requires a backend/provider integration.

The API offers create/read for catalog resources, not update/delete. The admin UI follows those operations. There are no invented password-reset, user-directory, refund-preview or poster-upload endpoints.

## Production deployment

The included Node server serves the Vite build, supports SPA deep links and proxies /api to Spring Boot.

```powershell
npm ci
npm run build
$env:API_PROXY_TARGET = "https://your-backend.example"
$env:PORT = "3000"
npm start
```

Set API_PROXY_TARGET and PORT in your hosting provider's environment. Production server configuration comes from the process environment (not automatically from .env.local). Put HTTPS in front of the service. Keep VITE_API_BASE_URL empty for this setup.

Docker:

```sh
docker build -t frame-frontend .
docker run -p 3000:3000 -e API_PROXY_TARGET=https://your-backend.example frame-frontend
```

For Docker, supply --build-arg VITE_ENABLE_DEMO=false to omit the showcase entry. City options and timezone also support build arguments. On a static-only host, configure a /api reverse proxy and route non-file paths to index.html, or configure backend CORS before setting an absolute VITE_API_BASE_URL. The included Node server is the simplest deployment path.

## Verification

```sh
npm test
npm run build
npm audit
```

Tests cover API error mapping, refresh concurrency, logout races, auth forms, timestamp interpretation, payment key persistence and the demo booking lifecycle. See docs/API-COVERAGE.md for endpoint mapping and docs/VERIFICATION.md for the performed walkthrough and remaining integration checks.

Sessions and checkout state persist in sessionStorage for reload recovery. Access/refresh tokens therefore remain accessible to same-origin JavaScript; avoid untrusted scripts and use HTTPS. A production HttpOnly-cookie session design would require backend changes.

## Source map

- src/lib/api.ts / types.ts — typed backend contract.
- src/lib/client.ts — transport, structured errors, token refresh.
- src/lib/payment-attempt.ts — payment retries shared across routes.
- src/store/session.ts — persisted identity and checkout.
- src/pages — customer and administrator flows.
- src/lib/demo.ts — isolated showcase data/behavior.
- public/art — local original SVG assets.
- server.mjs / Dockerfile — production serving and proxy.

## Design references

Editorial cinema layout, warm accents and spacious booking steps informed by [Premium Cinema UI](https://dribbble.com/shots/26996572-Movie-Discovery-Ticket-App-UI-Premium-Cinema) and [Cinema Ticket Booking](https://dribbble.com/shots/27292620-Cinema-Ticket-Booking-Mobile-App). All shipped illustrations and page implementation are original to this frontend.

Setup follows [Tailwind's Vite integration](https://tailwindcss.com/docs/installation/using-vite) and [shadcn's Vite conventions](https://ui.shadcn.com/docs/installation/vite).
