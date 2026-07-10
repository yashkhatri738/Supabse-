# ⚡ Supabase Forever

A modern, secure, and beautiful dashboard to prevent your free-tier Supabase projects from automatically pausing. Keep your databases active, responsive, and always running.

---

## 🔍 The Problem

Supabase free-tier projects automatically pause after **1 week of inactivity**. This causes issues for pet projects, portfolios, staging environments, and low-traffic applications where the first request after a long time suffers from severe cold starts, or fails entirely due to the project being paused.

## 🚀 The Solution: Supabase Forever

**Supabase Forever** acts as a heartbeat service. It establishes connection to your registered Supabase projects via PostgreSQL (supporting both Connection Pooler and direct ports) and performs a lightweight upsert operation on a dedicated `keep_alive` table.

This periodic activity signals to Supabase that the database is active, **preventing auto-pausing forever**.

---

## ✨ Features

- **📂 Multi-Project Dashboard**: Manage and monitor all your Supabase projects in one place.
- **🛡️ Secure Credential Storage**: Row-Level Security (RLS) is enabled automatically. Credentials are only accessible by authorized administrators.
- **🔄 Dual Connection Modes**: Connects using the Postgres transaction pooler (`6543`) with automatic fallback to direct connections (`5432`) if pooler access is blocked or restricted.
- **⏰ Built-In Scheduler**: Automatic 12-hour background loop triggers heartbeat pings out-of-the-box.
- **🌐 REST API Endpoint**: `/api/cron` route protected by `CRON_SECRET` for calling via Vercel Cron, GitHub Actions, or any external cron manager.
- **💎 Premium Dark Theme UI**: A high-end developer dashboard with a starry background pattern, glow effects, project search, connection validation logs, and quick actions like manual pings.
- **🔐 Built-In Admin Auth**: Protected login using Supabase Authentication, matching your administrative user details.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org) (using React 19)
- **Database Connection**: [postgres.js](https://github.com/pgrdb/postgres)
- **Backend & Auth**: [Supabase](https://supabase.com) (Server & Admin APIs)
- **Styles & Components**: Tailwind CSS v4, [Radix UI / Base UI](https://base-ui.com/), Shadcn UI primitives, [Lucide Icons](https://lucide.dev)
- **Toast Notifications**: [Sonner](https://github.com/emilkowalski/sonner)

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory (based on your configuration) containing:

```env
# Host Supabase Project Configuration (Where app metadata & connections are stored)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password

# Admin Credentials (For logging into the dashboard)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password

# Optional: External Cron Security Secret
CRON_SECRET=your-custom-cron-secret-key
```

---

## 📦 Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

*Note: On startup, the dashboard will automatically check if the connections table exists in your host database and set up any necessary structures.*

---

## 🔄 Keep-Alive Database Schema

When pinging a project, **Supabase Forever** ensures a dedicated table is initialized in the target database:

```sql
CREATE TABLE IF NOT EXISTS keep_alive (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

It then upserts a single row:
```sql
INSERT INTO keep_alive (id, name, updated_at)
VALUES (1, 'Project Name', now())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, updated_at = now();
```
This minimal query keeps the project active without polluting your database or consuming unnecessary resources.

---

## ☁️ Production Deployment & External Cron Setup

For reliable 24/7 pings, deploy the app to [Vercel](https://vercel.com) and configure an external cron job.

### Triggering via Vercel Cron
Add a `vercel.json` file in the root of your project:
```json
{
  "crons": [
    {
      "path": "/api/cron?secret=YOUR_CRON_SECRET",
      "schedule": "0 0,12 * * *"
    }
  ]
}
```

### Triggering via GitHub Actions
Create a `.github/workflows/keep-alive.yml` workflow:
```yaml
name: Keep-Alive Heartbeat

on:
  schedule:
    - cron: '0 */12 * * *' # Every 12 hours

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Heartbeat
        run: |
          curl -X GET "https://your-app-domain.vercel.app/api/cron" \
          -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 🔒 Security Information

- **Credential Separation**: The application reads connection secrets only on the server. The client-side dashboard never receives passwords or service role keys from the API.
- **Row-Level Security (RLS)**: Row-Level Security is automatically enabled on the host database `connections` table, ensuring records are kept private.
