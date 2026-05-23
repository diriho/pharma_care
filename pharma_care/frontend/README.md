# Pharma Core — Frontend

React + Vite + TypeScript + Tailwind. Talks to the Express backend via the `/api` proxy.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # fill in Supabase URL + anon key (optional, only for client session)
```

## Run

```bash
npm run dev    # http://localhost:5173, proxies /api to http://localhost:4000
npm run build  # production bundle
```

The backend (`../backend`) must be running for auth and data calls to succeed.

## Routes

- `/` — Landing page presenting Pharma Core's services
- `/login` — Sign in (public)
- `/signup` — Create a pharmacy account with the full onboarding form
- `/dashboard` — Authenticated app (Overview, POS, Inventory, Patients, Suppliers, Analytics, Settings)