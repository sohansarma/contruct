# BuildRun

Quick-commerce for construction and interior materials: cement, plywood, paint, electricals, plumbing, hardware and more, delivered to a site in about an hour.

One React codebase ships as a **website**, an **Android app** and an **iOS app** (via [Capacitor](https://capacitorjs.com)).

| | |
|---|---|
| Frontend | React 19, React Router 7, Vite 8; plain CSS with a light/dark glass design |
| Mobile | Capacitor 8 (`android/`, `ios/`): status bar, haptics, share, geolocation, Android back button |
| Backend | Supabase (Postgres, phone-OTP auth, RLS, SQL functions) |
| Payments | Razorpay (UPI, cards, net banking, wallets) and pay on delivery |

## Features

- **Delivery check:** detect location (GPS + OpenStreetMap reverse-geocode) or enter a pincode; shows the 60–120 min ETA or "not serviceable".
- **Catalog:** 22 categories and ~110 products with variants (sizes, colours, packs), MRP vs. price, discount badges, specs, and returnable/heavy flags.
- **Browse:** home rails, category pages with brand filters and sorting, and a desktop sidebar.
- **Search:** instant suggestions, synonyms ("ply" → plywood), size tokens ("18 mm"), recent and popular searches.
- **Cart:**
  - no minimum order; free-delivery progress bar
  - fees: delivery, handling, per-unit loading for heavy items
  - coupons: percent with cap, flat, free delivery, first-order only
- **Checkout:**
  - phone-OTP login
  - address book that checks each pincode
  - express or scheduled two-hour slot, plus driver instructions
  - payment: UPI, card, net banking, wallet, or pay on delivery (per-pincode COD); credit balance can be applied
  - GSTIN on invoice
- **Orders:**
  - live tracking timeline (placed → confirmed → packed → out for delivery → delivered) and delivery-partner call
  - cancel within 10 min with a countdown
  - return within 24 h, choosing items and a reason; non-returnable items are excluded
  - refunds: online payments go back to the source, cash and credit become wallet credit
  - GST tax invoice (print / save as PDF), reorder, WhatsApp help
- **Account:** profile, business name and GSTIN (validated), saved addresses, credit wallet with transaction history.
- **Content:** FAQ, Terms, Return/Refund, Privacy and Delivery policies, About, an SEO price-list page per category, and a bulk-quote form.
- **Admin (`/admin`):** today's orders and revenue, a "needs action" queue, one-tap status changes (confirm → pack → dispatch → deliver, approve returns, cancel), and bulk-quote leads.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (pricing, coupons, order rules, search, catalog)
npm run build        # production build in dist/
```

With no `.env`, the app runs in **demo mode**:

- Everything is stored on the device.
- The login code is **123456**.
- Orders progress through tracking on their own.
- Log in as **0000000000** to see the admin dashboard.

## Go live

### 1. Backend (Supabase), about 15 minutes

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Under **Authentication → Providers → Phone**, enable phone sign-in and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal). For India, register your DLT template with your SMS provider.
4. Load the catalog, serviceable pincodes and coupons:
   ```bash
   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run seed
   ```
5. Make yourself an admin. After logging in once, run:
   `update profiles set is_admin = true where phone = '91XXXXXXXXXX';`

All prices, the delivery area and coupons are **re-validated on the server** in `place_order`. A customer can't change a price, skip payment, or make themselves an admin.

### 2. Payments (Razorpay)

1. Get API keys from the Razorpay dashboard.
2. Deploy the function and set its secrets:
   ```bash
   supabase functions deploy razorpay
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx
   ```
3. Put the **key id** (not the secret) in `VITE_RAZORPAY_KEY_ID`.

Refunds to cards and UPI are queued in the `refunds` table. Process them by calling the function with `{ "action": "refund" }` as an admin, or from the Razorpay dashboard.

### 3. Environment

```bash
cp .env.example .env   # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_RAZORPAY_KEY_ID, support contacts
```

### 4. Website

Push to GitHub and import the repo in **Vercel** or **Netlify**. Both are pre-configured (`vercel.json` / `netlify.toml` handle SPA routing). Add the same `VITE_*` variables in their dashboards and point your domain at it.

### 5. Mobile apps

```bash
npm run android   # builds, syncs, opens Android Studio → Build → Generate Signed Bundle (AAB) → Play Console
npm run ios       # macOS + Xcode: builds, syncs, opens Xcode → Product → Archive → App Store Connect
```

- The app ID is `co.buildrun.app` in `capacitor.config.json`. Change it before your first store upload, because it can't change afterwards.
- Location permission text is already set for both platforms.
- CI (`.github/workflows/ci.yml`) lints, tests, builds the web app and produces an installable **debug APK** as a workflow artifact on every push.

## Make it yours

| What | Where |
|---|---|
| Name, support phone/email, legal name, GSTIN | `src/config.js` → `brand` |
| Fees, free-delivery threshold, cancel/return windows, ETA, time slots | `src/config.js` → `rules` (and the `settings` table when live) |
| Serviceable pincodes, COD areas | `src/config.js` (and the `pincodes` table when live) |
| Coupons | `src/config.js` (and the `coupons` table when live) |
| Products, prices, images | `src/data/catalog.js`, then `npm run seed`. Set `image` to a URL to replace the icon art. |
| FAQ and policies | `src/data/content.js`. Have a lawyer review them. |
| Colours and design | CSS variables at the top of `src/styles.css` |
| App icon | `public/icon.svg`. Generate native icons with `npx @capacitor/assets generate`. |

## Before you launch

- [ ] Real prices and stock in `products`. The prices shipped here are placeholders.
- [ ] Product photos: set `image` per product.
- [ ] Per-item HSN codes and GST rates on invoices. The invoice currently applies one rate (`rules.gstRate`).
- [ ] Real GSTIN, legal name and address in `brand`.
- [ ] Policies reviewed by counsel.
- [ ] Brand and trademark permissions for any manufacturer names you list.
- [ ] SMS provider and DLT templates approved; Razorpay KYC complete.

## Project layout

```
src/
  config.js            brand + business rules
  data/catalog.js      categories & products (seed)
  data/content.js      FAQ & policies
  lib/api.js           data layer: demo (localStorage) | live (Supabase)
  lib/pricing.js       bill, coupons, GST, serviceability
  lib/orderLogic.js    statuses, cancel/return rules, refunds, tracking simulator
  lib/payments.js      Razorpay checkout
  lib/native.js        Capacitor bridges (haptics, share, geolocation, back button)
  lib/search.js        product search
  components/ui.jsx    header, tab bar, cards, sheets…
  pages/               Shop, Checkout, Orders, Account (+ admin)
supabase/schema.sql    tables, RLS, order functions
supabase/functions/razorpay  payment create/verify/refund
android/ ios/          native projects (Capacitor)
```
