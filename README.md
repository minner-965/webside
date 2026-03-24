# Aster Wellness Storefront

A bilingual adult-wellness storefront MVP for South Africa, Nigeria, and Kenya.

## What is included

- React + Vite storefront
- English main site with French secondary copy
- Age gate
- Product catalog with five launch SKUs
- Cart and checkout flow
- Node + Express backend
- File-backed product, inventory, and order persistence
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

Runtime data is stored in:

- `data/store.json`

Seed/reset data is stored in:

- `data/store.seed.json`

Reset the store from the admin page or with:

```bash
POST /api/reset
```

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

## Next production upgrades

- Auth-protected admin
- Real shipping rates and tracking
- Local currencies and tax logic
- Image optimization and SEO metadata
