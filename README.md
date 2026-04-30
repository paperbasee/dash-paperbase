# dash-paperbase

Merchant dashboard for [Paperbase](https://github.com/paper-base): a [Next.js](https://nextjs.org) app (App Router) that talks to the Paperbase **API backend** (Django REST). This README focuses on how the dashboard connects to that backend and where the **BaaS-style** storefront contract lives.

## Backend (BaaS) overview

| Layer | Role |
| ----- | ---- |
| **Paperbase API** | Django REST API: auth, stores, catalog, orders, shipping, analytics, etc. |
| **This app (dashboard)** | Authenticated operators: JWT access/refresh tokens, `Authorization: Bearer <access>` on API calls via `src/lib/api.ts`. |
| **Storefront / headless clients** | Read-mostly public API under `/api/v1/` using **publishable** API keys (`ak_pk_...`). Secret keys (`ak_sk_...`) are rejected. |

The dashboard and the storefront use the **same API origin**; they differ by **credential type** (user JWT vs publishable key) and which routes each client is allowed to call.

### Environment

Create `.env.local` (not committed) with:

```bash
# Required: origin of the Django API (no trailing slash issues are normalized in code)
# Development default assumed in next.config.ts when unset: http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Production builds should set `NEXT_PUBLIC_API_URL` to your deployed API origin (for example `https://api.example.com`).

### Storefront API contract (BaaS)

For **public** storefront integrations (catalog, checkout, support tickets, etc.), the full contract—base URL `{BACKEND_ORIGIN}/api/v1/`, headers, allowed methods, `public_id` rules, and endpoint list—is documented in:

**[`docs/STOREFRONT_API_FRONTEND_PROMPT.md`](./docs/STOREFRONT_API_FRONTEND_PROMPT.md)**

Use that document as the single source of truth for headless/front-end clients. The dashboard implementation does not replace that spec for storefront work.

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
