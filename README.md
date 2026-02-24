# Expense Tracking Web Application

A modern, responsive, production-ready Expense Tracking Web Application built with the MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Features

- **🔐 Authentication Module**: Secure login/signup with role-based access control (Admin, Employee, Individual).
- **🏠 Dashboard**: Visual summary of income, expenses, and balance with recent transaction history.
- **💸 Expense & Income Management**: Full CRUD operations for transactions with payment mode tracking.
- **📊 Reports & Analytics**: Detailed category-wise breakdown and monthly trends using interactive charts.
- **👥 Business Features**: Admin-controlled employee onboarding and expense approval/rejection system.
- **⚙️ Settings**: Profile overview, currency selection, and theme management.

## 📂 Project Structure

```text
/client       - Frontend (React + Tailwind CSS)
/server       - Backend (Node.js + Express)
  /config     - Database connection (Mongoose)
  /models     - Mongoose Schemas (User, Company, Expense, Income, etc.)
  /middleware - Auth, Role, AuditLogger
  /controllers - Business logic for separate collections
  /routes     - API endpoint definitions
```

## 🏗️ Database Architecture (Refactored)

The database has been designed for scalability and auditability:

- **Users**: Centralized user management with roles (Admin, Employee, Individual).
- **Companies**: Multi-tenant support for businesses and organizations.
- **Expenses**: Tracking expenditures with category, mode, and automated status (pending for employees).
- **Income**: Dedicated tracking for revenue sources.
- **Audit Logs**: Forensic logging for all state-changing actions (Create/Update/Delete).
- **Indexing**: Optimized for temporal queries (date-based sorting) and multi-tenant filters.

## 🛠️ Setup Instructions
... (keep existing)

### 1. Prerequisites
- Node.js (v16+)
- MongoDB (Running locally on `mongodb://localhost:27017/expense-tracker`)

### 2. Backend Setup
```bash
cd server
npm install
npm run seed  # Optional: Seed database with dummy data
npm start
```
Note: Ensure `.env` is configured with `JWT_SECRET` and `MONGO_URI`.

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 4. Admin Setup
To create an admin:
- Register on the `/register` page and select "Business/Organization Admin".
- This will create a new Organization and set you as the Admin.
- You can then onboard employees from the **Admin** tab.

## 📊 Sample Data
To seed the database with dummy transactions, use the provided `seed.js` script (if available) or simply add transactions through the UI.

## 🧑‍💻 Technical Stack
- **Frontend**: React, Tailwind CSS, Lucide-React, Recharts, Framer Motion.
- **Backend**: Node.js, Express, Mongoose, JWT, BcryptJS.
- **Database**: MongoDB.
"# sampleproject" 
