# NovaBank — Banking Management System (MongoDB + Node/Express + HTML/JS)

A full-stack banking management system:

- **Database:** MongoDB (via Mongoose)
- **Backend:** Node.js + Express REST API, JWT authentication, bcrypt password hashing
- **Frontend:** Plain HTML/CSS/JavaScript (no build step) — customer dashboard + admin dashboard

## Features

- Customer registration & login (JWT-based sessions)
- Auto-opens a bank account (12-digit account number) on signup; customers can open more
- Deposit, withdraw, and transfer money between accounts (by account number)
- Full transaction history per account, with running balance
- Admin login (bootstrapped automatically on first run) to:
  - View all users, freeze/unfreeze accounts
  - View all bank accounts, change their status (active / frozen / closed)
  - View all transactions system-wide
- Input validation, balance checks, rate limiting on auth routes, and status checks
  (frozen/closed accounts can't transact)

## 1. Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- A MongoDB instance — either:
  - Local MongoDB (`mongod` running on `localhost:27017`), or
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (get a connection string)

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/banking_management_system
JWT_SECRET=some_long_random_string
PORT=5000
CLIENT_ORIGIN=http://127.0.0.1:5500
ADMIN_EMAIL=admin@bank.local
ADMIN_PASSWORD=Admin@12345
```

- If you're using MongoDB Atlas, replace `MONGO_URI` with the connection string
  Atlas gives you (`mongodb+srv://...`).
- `CLIENT_ORIGIN` should match the URL your frontend is served from (see below).
- The `ADMIN_EMAIL`/`ADMIN_PASSWORD` account is created automatically the first
  time the server starts, if it doesn't already exist. **Change the password**
  before using this anywhere but your own machine.

Start the API server:

```bash
npm start
```

You should see:
```
Connected to MongoDB
Bootstrap admin account created: admin@bank.local
API server running on http://localhost:5000
```

## 3. Frontend setup

The frontend is static HTML/CSS/JS — no build tools needed. You just need to
serve it over HTTP (opening the file directly with `file://` will break API
calls in some browsers), for example with the built-in Python server:

```bash
cd frontend
python3 -m http.server 5500
```

Then open **http://127.0.0.1:5500** in your browser.

If your API isn't at `http://localhost:5000`, edit `API_BASE` at the top of
`frontend/js/api.js`.

## 4. Using the app

- **As a customer:** Open `index.html` → "Open a bank account" → register.
  You'll land on the dashboard with your first account already created.
  Click an account card to select it, then use the Deposit / Withdraw /
  Transfer / History tabs.
- **As the admin:** Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from
  your `.env` file. You'll be redirected to `admin.html` to manage users,
  accounts, and view all transactions.

## 5. API reference (summary)

| Method | Endpoint                              | Auth   | Description                         |
|--------|----------------------------------------|--------|--------------------------------------|
| POST   | /api/auth/register                    | —      | Register + auto-create first account |
| POST   | /api/auth/login                       | —      | Login, returns JWT                   |
| GET    | /api/accounts/me                      | user   | List my accounts                     |
| POST   | /api/accounts                         | user   | Open a new account                   |
| GET    | /api/accounts/:id                     | user   | Get one account                      |
| POST   | /api/transactions/deposit             | user   | Deposit into an account              |
| POST   | /api/transactions/withdraw            | user   | Withdraw from an account              |
| POST   | /api/transactions/transfer            | user   | Transfer to another account number    |
| GET    | /api/transactions/account/:accountId  | user   | Transaction history                  |
| GET    | /api/admin/users                      | admin  | List all users                       |
| GET    | /api/admin/accounts                   | admin  | List all accounts                    |
| GET    | /api/admin/transactions               | admin  | List all transactions                |
| PATCH  | /api/admin/users/:id/status           | admin  | Freeze/unfreeze a user               |
| PATCH  | /api/admin/accounts/:id/status        | admin  | Change account status                |

All authenticated requests need `Authorization: Bearer <token>`.

## 6. Data model (MongoDB collections)

- **users** — fullName, email, phone, passwordHash, role (customer/admin), status
- **accounts** — accountNumber, owner (ref User), accountType, balance, currency, status
- **transactions** — type (deposit/withdrawal/transfer_out/transfer_in), account,
  counterpartyAccount, amount, balanceAfter, note, reference

## 7. Notes on production hardening

This is a learning/demo-grade implementation. Before using it for anything
real, you'd want to add: HTTPS, refresh tokens / shorter JWT expiry, MongoDB
replica-set transactions for transfers (currently sequential balance updates,
noted in `routes/transactions.js`), audit logging, 2FA, stricter input
validation/schema checks, and a proper secrets manager for `.env` values.
