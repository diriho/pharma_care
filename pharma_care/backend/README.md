# Pharma Core — Backend

Express API backed by Supabase. Handles authentication and all pharmacy data.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in Supabase URL + keys
```

In the Supabase dashboard, open the SQL editor and run `supabase/schema.sql` once.

## Run

```bash
npm run dev   # auto-reload on file changes
# or
npm start
```

The API listens on `http://localhost:4000`.

## Endpoints

- `POST /api/auth/signup` — `{ email, password, pharmacy: { name, address, commune, province, phone, currency, nif?, rc?, expiryAlertMonths, lowStockAlertLevel } }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/logout` (auth) — invalidates session
- `GET  /api/auth/me` (auth) — returns user + pharmacy settings
- `DELETE /api/auth/account` (auth) — deletes the user and all their data
- `GET/POST/PUT/DELETE /api/data/{medicines|suppliers|patients|sales|restock-orders}` (auth)
- `PUT /api/data/settings` (auth) — update pharmacy settings
- `POST /api/data/sales/checkout` (auth) — records a sale and decrements stock
- `POST /api/data/restock-orders/:id/receive` (auth) — marks order received and increments stock
- `GET /api/data/notifications` (auth) — computed low-stock + expiry alerts
- `GET /api/data/analytics` (auth) — aggregated KPIs
- `GET /api/data/export` (auth) — downloads a full JSON history of the pharmacy
