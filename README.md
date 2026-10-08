# dash-paperbase

Merchant dashboard for [Paperbase](https://github.com/paper-base): a [Next.js](https://nextjs.org) app (App Router) that talks to the Paperbase **API backend** (Django REST). This README focuses on how the dashboard connects to that backend.

## Backend overview

| Layer | Role |
| ----- | ---- |
| **Accounts** (`accounts-paperbase`) | Where everyone signs in and up: passkeys, the email's link and code, "Your Paperbase account". OpenID Connect; the dashboard is its public client (PKCE). |
| **Paperbase API** | Django REST API: stores, catalog, orders, shipping, analytics, etc. It checks Accounts' passes itself. |
| **This app (dashboard)** | Signs people in at Accounts and keeps its 10-minute pass in memory (`src/lib/accounts/`), renewing it there; every API call carries it (`Authorization: Bearer <pass>`) and names the shop (`X-Store-Public-ID`), via `src/lib/api.ts`. |
| **The shop** (`shop-paperbase`) | Django + Liquid. It imports the API's `engine` and reads the database itself, so it calls no API and needs no key. |

The dashboard is the API's only client. The public storefront API and its publishable keys went on 2026-09-27, with the Next storefront that used them.

### Environment

Create `.env.local` (not committed) with:

```bash
# Required: origin of the Django API (no trailing slash issues are normalized in code)
# Development default assumed in next.config.ts when unset: http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
# Required: Accounts, where everyone signs in (accounts-paperbase; locally `pb accounts`)
NEXT_PUBLIC_ACCOUNTS_URL=http://localhost:4400
```

Production builds set `NEXT_PUBLIC_API_URL` to the deployed API origin (for example `https://api.example.com`) and `NEXT_PUBLIC_ACCOUNTS_URL` to Accounts' (`https://accounts.paperbase.me`). Accounts sends people back to `<this dashboard>/auth/callback`, the address it registered for the dashboard. The dashboard must stay on a `paperbase.me` address: renewing the pass relies on Accounts' cookie being same-site.

`public/.well-known/webauthn` lets `accounts.paperbase.me` use the passkeys tied to `dash.paperbase.me` (Related Origin Requests); it names production's Accounts.

### Security and CSP

`next.config.ts` derives the API's and Accounts' origins from `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ACCOUNTS_URL` for Content-Security-Policy `connect-src` / `img-src` (and related rules).

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure the Paperbase API and Accounts are running and `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_ACCOUNTS_URL` point at them.

### Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npx vitest run` | Every test |
| `npm run test:validation` | Vitest validation tests |

---

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying) (e.g. [Vercel](https://vercel.com/new))
