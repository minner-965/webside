# Aster Supply Storefront

A lifestyle general-store storefront with admin operations, checkout, and order handling.

## What is included

- React + Vite storefront
- English storefront with French copy support in data
- Product catalog, cart, checkout, and order lifecycle
- Cart and checkout flow
- Node + Express backend
- File-backed or Postgres-backed product, inventory, and order persistence
- Admin dashboard for stock and order status control

## Local development

Install dependencies:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev:full
```

Services:

- Frontend: `http://localhost:5173`
- Backend/API: `http://localhost:3001`

Useful commands:

```bash
npm run dev
npm run dev:server
npm run dev:full
npm run build
npm run lint
```

## Production-style run

Build the frontend:

```bash
npm run build
```

Start the Node server:

```bash
npm start
```

The Express server serves both:

- `/api/*` for products, orders, admin actions
- `dist/` for the built storefront

## Data storage

This app supports two storage backends:

- File backend (default): `data/store.json`
- Postgres backend (recommended for production): Neon/Supabase via `DATABASE_URL`

Seed/reset source:

- `store.seed.json`

Backend selection logic:

- If `DATABASE_URL` is set, backend uses Postgres.
- If `DATABASE_URL` is not set, backend falls back to file storage.
- You can force file mode with `STORE_BACKEND=file`.

Reset the live store from admin or API:

```bash
POST /api/reset
```

This rewrites the live store from `store.seed.json` and clears runtime orders/pending checkouts.

## Payments and email

Real payment flow is prepared for Flutterwave Hosted Checkout.

Required environment variables:

- `FLW_SECRET_KEY`
- `APP_BASE_URL`
- `API_BASE_URL`

Order emails are prepared with Resend.

Required environment variables:

- `RESEND_API_KEY`
- `ORDER_FROM_EMAIL`
- `SUPPORT_EMAIL`
- `ADMIN_EMAIL`

Copy `.env.example` and fill in your real values before production deployment.

## API endpoints

- `GET /api/health`
- `GET /api/store`
- `POST /api/checkout-session`
- `GET /api/payments/flutterwave/callback`
- `POST /api/payments/flutterwave/webhook`
- `PATCH /api/orders/:id`
- `PATCH /api/products/:id/stock`
- `POST /api/reset`

## Current scope

This project is ready for demo and operational rehearsal:

- Browse products
- Add to cart
- Start a hosted payment session
- Persist orders server-side
- Persist stock server-side
- Update order statuses in admin
- Adjust stock in admin
- Send order emails once Resend is configured
- Deploy as one Node app on Render with `render.yaml`

For a split deployment with Netlify frontend plus external API:

- Deploy the frontend to Netlify from this repo
- Keep the Node API on Render or another Node host
- Set `VITE_API_BASE_URL` in Netlify to your API origin, for example `https://aster-wellness-store.onrender.com`
- Keep the server-side env vars on the API host, not in Netlify
- Set `CORS_ALLOWED_ORIGINS` on the API host if your frontend runs on a different domain

## Next production upgrades

- Real shipping rates and tracking
- Local currencies and tax logic
- Image optimization and SEO metadata
