<div align="center">

# 💸 SpendWise

**A full-stack personal finance tracker with budgets, savings goals, recurring bills and smart insights.**

React 18 · Vite · Tailwind CSS · Recharts · Node.js · Express · MySQL · JWT

</div>

SpendWise helps you see where your money goes. Record income and expenses, set monthly budgets that warn you before you overspend, save towards goals, and let recurring bills add themselves.

## Features

**Core**
- Dashboard with total balance, income, expenses, monthly savings, savings rate and month-over-month change
- Add, edit and delete transactions (income and expense, payment method, notes)
- Category-wise donut chart, income vs expense bars, daily spending area chart
- Monthly budgets per category with progress bars and alerts at a threshold you choose
- Search, filter (type, category, payment method, date range, amount range), sort, paginate
- CSV export that respects your active filters
- JWT authentication with bcrypt password hashing

**Going further**
- **Savings goals**: deposit history, completion state, "save X per month" calculation from the deadline
- **Recurring transactions**: rent, salary and subscriptions are created automatically by a daily cron job, and missed runs are caught up
- **Smart insights**: biggest category, spending trend vs last month, savings-rate feedback, month-end spending forecast
- **Reports**: presets and custom ranges, category tables, top expenses, summary CSV, print to PDF
- **Custom categories** with emoji icon and colour
- **Copy last month's budgets** in one click
- Dark mode, keyboard shortcut (`N` to add a transaction), responsive layout, accessible dialogs and focus states
- Security: Helmet, CORS allow-list, auth rate limiting, Zod validation on every write, per-user data isolation, CSV formula-injection protection

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS (no inline styles), Recharts, Lucide icons |
| Backend | Node.js, Express, Zod, node-cron |
| Database | MySQL 8 (`mysql2` with a connection pool) |
| Auth | JWT + bcrypt |
| Reports | CSV export, print stylesheet |

## Project structure

```
spendwise/
├── database/
│   └── schema.sql              # Tables, indexes, constraints
├── docs/
│   └── DATABASE.md             # ER diagram and design notes
├── server/
│   └── src/
│       ├── config/db.js        # MySQL pool
│       ├── middleware/         # auth (JWT), error handling
│       ├── routes/             # auth, categories, transactions, budgets,
│       │                       # goals, recurring, analytics
│       ├── services/           # budget status, recurring job
│       ├── scripts/            # migrate.js, seed.js
│       ├── utils/              # helpers, default categories
│       └── index.js            # App entry
└── client/
    └── src/
        ├── components/         # Layout, TransactionModal, shared UI
        ├── context/            # Auth, Theme, Data (categories + refresh)
        ├── lib/                # api client, formatters, theme palette
        ├── pages/              # Dashboard, Transactions, Budgets, Goals,
        │                       # Recurring, Reports, Settings, Auth
        ├── App.jsx
        └── main.jsx
```

## Getting started

**Prerequisites:** Node.js 18+ and MySQL 8+.

```bash
# 1. Install everything
npm run install:all

# 2. Configure the API
cp server/.env server/.env
# open server/.env and set DB_PASSWORD and JWT_SECRET

# 3. Create the database and (optionally) load demo data
npm run db:migrate
npm run db:seed          # demo@spendwise.app / Demo@1234

# 4. Run API (http://localhost:5000) and web app (http://localhost:5173)
npm run dev
```

Generate a strong secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## API overview

All routes except `/api/auth/register` and `/api/auth/login` need `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` | Create account, log in |
| GET / PUT | `/api/auth/me` · `/profile` · `/password` | Profile and password |
| GET POST PUT DELETE | `/api/categories` | Manage categories |
| GET | `/api/transactions` | List with filters, sort, pagination and totals |
| GET | `/api/transactions/export` | CSV download (same filters) |
| POST PUT DELETE | `/api/transactions[/:id]` | Create, update, delete |
| GET PUT DELETE | `/api/budgets` | Budgets with live spend and status, `POST /copy` to copy a month |
| GET POST PUT DELETE | `/api/goals` | Goals, `POST /:id/contribute` to deposit |
| GET POST DELETE | `/api/recurring` | Rules, `PATCH /:id/toggle`, `POST /run` |
| GET | `/api/analytics/dashboard?month=YYYY-MM` | Everything the dashboard needs in one call |
| GET | `/api/analytics/report?from=&to=` | Report data for a date range |

## Deployment notes

- Build the client with `npm run build` and serve `client/dist` from any static host (set `VITE_API_URL` to your API URL before building).
- Run the API with `npm start --prefix server`, set `CLIENT_URL` to your frontend origin, and use a long random `JWT_SECRET`.
- Put the API behind HTTPS in production.

## Ideas for next steps

Multi-account wallets, receipt uploads, CSV import, email budget alerts, shared household budgets.

## License

MIT
