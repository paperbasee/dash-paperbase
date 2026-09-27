# dash-paperbase

Merchant dashboard for [Paperbase](https://github.com/paper-base): a [Next.js](https://nextjs.org) app (App Router) that talks to the Paperbase **API backend** (Django REST). This README focuses on how the dashboard connects to that backend.

## Backend overview

| Layer | Role |
| ----- | ---- |
| **Paperbase API** | Django REST API: auth, stores, catalog, orders, shipping, analytics, etc. |
| **This app (dashboard)** | Authenticated operators: JWT access/refresh tokens, `Authorization: Bearer <access>` on API calls via `src/lib/api.ts`. |
| **The shop** (`shop-paperbase`) | Django + Liquid. It imports the API's `engine` and reads the database itself, so it calls no API and needs no key. |

The dashboard is the API's only client. The public storefront API and its publishable keys went on 2026-09-27, with the Next storefront that used them.

### Environment

Create `.env.local` (not committed) with:

```bash
# Required: origin of the Django API (no trailing slash issues are normalized in code)
# Development default assumed in next.config.ts when unset: http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Production builds should set `NEXT_PUBLIC_API_URL` to your deployed API origin (for example `https://api.example.com`).

### Security and CSP

`next.config.ts` derives the API origin from `NEXT_PUBLIC_API_URL` for Content-Security-Policy `connect-src` / `img-src` (and related rules). Cloudflare Turnstile domains are included where the auth flows use the widget.

---

## Supported banner placements

Only the following banner placement values are supported:

- `home_top`: Top of homepage
- `home_bottom`: Bottom section of homepage

Any other placement value is invalid and will be rejected.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure the Paperbase API is running and `NEXT_PUBLIC_API_URL` points at it.

### Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run test:validation` | Vitest validation tests |

---

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying) (e.g. [Vercel](https://vercel.com/new))
