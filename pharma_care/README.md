# Pharma Core

## Description
**Pharma-Core** is a modern, cloud-based, multi-tenant pharmacy management platform designed specifically for officines in Burundi. It completely digitizes daily pharmacy operations—transforming everything from point-of-sale (POS) and inventory tracking to patient and supplier management into a single, seamless digital experience. By automating stock levels and surfacing intelligent alerts (like low stock or expiring medications), Pharma-Core empowers pharmacies to stop worrying about logistics and start focusing on delivering better patient care, all while guaranteeing complete data isolation and top-tier security.


## ✨ Key Features
- Point of Sale (POS): Fast and comprehensive checkout experience integrated directly with live inventory.
- Smart Inventory Management: Automated, live updates on stock when items are sold or received from restock orders.
- Intelligent Alerts: Automated push notifications in a centralized dashboard bell for low-stock and expiring-soon products based on custom thresholds (seuils).
- Patient & Supplier Tracking: Built-in modular CRM to track patient history and manage local/international suppliers.
- Analytics & Reporting: A real-time data overview to monitor daily sales metrics, alongside one-click full history JSON exports for local audits or external accounting.
- Tailored for Burundi: Supports native business onboarding fields essential for local compliance (Devise FBU, NIF, RC, Commune, Province).
- Multi-Tenant Security: Secure infrastructure ensuring strict Row Level Security (RLS) so that every pharmacy's data is heavily isolated and protected.

## 🌍 Impact for Pharmacies in Burundi
- Eradicating Waste & Stockouts: Expiration and reorder alerts help prevent costly medical waste and ensure that critical medicines are never unexpectedly out of stock.
- Modernizing the Ecosystem: Brings pharmacies away from paper ledgers or expensive, localized legacy software to an affordable, unified, and always-accessible cloud solution.
- Regulatory Readiness: Makes compliance and audits a breeze by standardizing data collection (NIF/RC) and enabling instant data exports.

## Architecture

```
pharma_care/
├── backend/    Express + Supabase (auth, CRUD, notifications, JSON export)
└── frontend/   React + Vite + TypeScript + Tailwind (Home, Auth, Dashboard)
```

- Each authenticated pharmacy gets its own row-scoped data (RLS on every table).
- Authentication, deletion, sales checkout, restock receiving, alerts, and JSON export all live in the backend.
- The frontend talks to the backend at `/api/*` (proxied by Vite in dev).

## How to?

### 1. Start the backend

```bash
cd backend
cp .env.example .env   # paste your Supabase keys
npm install
npm run dev            # http://localhost:4000
```

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev            # http://localhost:5173
```

Visit http://localhost:5173 — sign up to create a pharmacy, then explore the dashboard.

## Features

- **Landing page** — services overview (POS, inventory, patients, suppliers, analytics, alerts) with Pharma Core branding.
- **Signup / Login** — collects all pharmacy onboarding fields (Nom, Adresse, Commune, Province, Téléphone, Devise FBU, NIF, RC, alertes).
- **Dashboard** — per-pharmacy isolated tables for POS, inventory, patients, suppliers, and restock orders. Stocks update live on sale and reception.
- **Alerts** — backend computes low-stock and expiring-soon alerts from your seuils; surfaced in the dashboard bell.
- **JSON export** — full history download from the sidebar or settings page.
- **Logout & Delete account** — both available from the dashboard sidebar.

## Tech Stack
- **Frontend**: React 18.3 (not 19) + Vite + TypeScript + React Compiler.
- **Backend API**: Node 22 
- **Database & Auth**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Routing**: React Router
- **Styling**: Tailwind CSS
