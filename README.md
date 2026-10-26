# BuildRun

Quick-commerce for construction and interior materials in Bengaluru: cement, plywood, putty and paint, wires, plumbing, hardware and more, delivered to a site in about an hour.

One codebase ships the **website**, the **Android app** and the **iOS app**.

| | |
|---|---|
| App | React 19 + Vite, wrapped with Capacitor 8 for Android/iOS |
| API | Node.js + Express 5 (`server/`) |
| Database | **MongoDB** (Atlas or self-hosted) |
| Payments | Razorpay (UPI, cards, net banking, wallets) + pay on delivery |
| Login | Phone OTP via MSG91 or Twilio, JWT sessions |

## What it does

- **Delivery check:** detect location or enter a pincode; shows the 60–120 min ETA or "not serviceable".
- **Catalogue:**
  - 24 categories and 115 products across the range a Bengaluru construction-materials store carries.
  - Pack sizes, colours and options, with MRP vs. price.
  - **Bulk tier pricing**, for example UltraTech PPC at ₹425, ₹415 from 10 bags, ₹405 from 30.
  - Deals of the week and new arrivals.
  - Each product type has its own illustration.
- **Shopping:**
  - Search with trade synonyms, brand filters and sorting.
  - Quick-quantity buttons (5, 10, 20, 30, 50 bags) and a "add N more to unlock ₹X" nudge.
  - A **material calculator** (plaster cement, wall putty, paint, tile adhesive, house wiring) that adds everything to the cart in one tap.
- **Checkout:**
  - Saved site addresses, checked against the delivery area.
  - Express or scheduled 2-hour slot, plus driver instructions.
  - Coupons and credit wallet.
  - UPI, card, net banking, wallet or pay on delivery.
  - GSTIN on the invoice.
- **Orders:**
  - Live status: placed → confirmed → packed → out for delivery (with delivery partner) → delivered.
  - Cancel within 10 min; returns within 24 h.
  - Refunds go to the original payment method, or to wallet credit for cash orders.
  - GST invoice and reorder.
- **Admin (`/admin`):**
  - Today's orders and revenue, plus a queue of orders that need action.
  - One-tap status updates; delivery-partner details when you dispatch.
  - Approve returns, which refunds automatically.
  - Bulk-quote leads.
  - **Products tab:** edit prices, MRP, bulk tiers and stock.
- Hindi and English, light and dark mode, FAQ and policy pages, and an SEO price-list page per category.

**Server-side rules:** every amount is recomputed on the server from MongoDB using the same pricing code as the app, so a customer can't change a price, reuse a payment, skip payment or overspend credit. All of this is covered by the end-to-end tests.

## About the catalogue and prices

The categories and product range mirror what HomeRun stocks in Bengaluru (brands, product lines and pack sizes). Where HomeRun publishes a Bengaluru price list, that price and its bulk tiers are used, and those products show as "market-checked" in **Admin → Products**. Everything else is an estimate.

Product photos and descriptions are **not** copied, because they're the brands' and HomeRun's copyright. Products use original illustrations. To show real photos, set `image` (a URL) on a product.

**Before launch, set your own selling prices.** In Admin → Products, tick "Only estimated prices" to see the products that still need one. Prices you edit there are kept when you re-seed.

## Run it locally

```bash
npm install
npm run dev               # app only, DEMO mode: data on the device, login code 123456
```

Full stack, with a local MongoDB on 27017 (or set `MONGODB_URI`):

```bash
npm run seed              # load categories, products, bulk tiers
VITE_API_URL= npm run build
ALLOW_MOCK_PAYMENTS=1 ADMIN_PHONES=+919000000000 SMS_PROVIDER=console npm start   # http://localhost:8080
```

Login codes print in the server log when `SMS_PROVIDER=console`.

Tests:

```bash
npm test                                      # unit: pricing, tiers, coupons, order rules, calculator, catalogue
API=http://localhost:8080 npm run test:e2e    # live API + MongoDB, needs the TEST_LOGINS shown in tests/e2e.mjs
```

On every push, CI runs lint, the unit tests and the production build. It then runs the end-to-end suite against a real MongoDB, builds the Android APK, and builds the iOS app (unsigned).

## Go live

### 1. Database: MongoDB Atlas (free tier is fine to start)

Create a cluster in the Mumbai region and a database user, and allow your host's IP (or `0.0.0.0/0`). Copy the connection string into `MONGODB_URI`, then run `MONGODB_URI=... npm run seed`.

### 2. SMS for login codes

The simplest Indian option is **MSG91**:

1. Register your sender ID and an OTP template with DLT. Use the variable `##otp##`.
2. Set `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`.

Twilio is also supported. For App Store and Play Store review, add a reviewer login: `TEST_LOGINS=+919999999999:123456`.

### 3. Payments

Complete Razorpay KYC, then set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. The server creates gateway orders, verifies signatures and issues refunds itself. No other setup is needed.

### 4. Deploy the server and website (one service)

- **Render:** New → Blueprint → this repo (`render.yaml`), then fill in the env vars.
- **Any Docker host:** `docker build -t buildrun . && docker run -p 8080:8080 --env-file .env buildrun`

Point your domain at it. The server refuses to start in production if `JWT_SECRET`, SMS or Razorpay is missing, or if mock payments are on.

### 5. Mobile apps

```bash
VITE_API_URL=https://yourdomain.in npm run android   # → Android Studio → Generate Signed Bundle → Play Console
VITE_API_URL=https://yourdomain.in npm run ios       # → Xcode (macOS) → Archive → App Store Connect
```

Change `appId` in `capacitor.config.json` before your first upload; it can't be changed afterwards.

## Make it yours

| What | Where |
|---|---|
| Name, support contacts, legal name, GSTIN | `src/config.js` → `brand` |
| Fees, free-delivery threshold, cancel/return windows, slots | `src/config.js` → `rules` |
| Serviceable pincodes, COD areas, coupons | `src/config.js` |
| Products, prices, tiers | Admin → Products, or `src/data/catalog.js` + `npm run seed` |
| FAQ and policies | `src/data/content.js` (have a lawyer review them) |
| Colours | CSS variables at the top of `src/styles.css` |

## Project layout

```
src/                 React app (shared by web, Android, iOS)
  config.js          brand + business rules (also used by the server)
  data/catalog.js    categories & products (seed)
  lib/pricing.js     bill, bulk tiers, coupons, GST (shared with server)
  lib/orderLogic.js  statuses, cancel/return rules, refunds (shared with server)
  lib/calc.js        material calculator
  lib/api.js         demo backend (device) | live backend (REST API)
  components/ProductArt.jsx  product illustrations
server/              Express API + MongoDB
  app.js             routes
  orders.js          pricing, payments, cancel, return, refunds
  auth.js / sms.js   phone OTP + JWT
  razorpay.js        gateway orders, signature check, refunds
  seed.js            load catalogue
tests/               unit tests + live end-to-end suite
android/ ios/        Capacitor native projects
```
