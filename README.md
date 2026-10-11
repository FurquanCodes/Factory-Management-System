# 🏭 Factory Management System & Khata Ledger

A modern, high-performance **Factory Management & Customer Khata (Ledger) System** built specifically for manufacturing, wholesale, and sanitary ware businesses. Designed to replace paper registers with accurate real-time accounting, invoicing, and balance tracking.

---

## ✨ Key Features

### 📒 1. Comprehensive Customer Ledger (Khata)
- **Brought Forward (BF / سابقہ بقایا)**: Seamlessly onboard customers from physical notebooks or Excel sheets. Add and edit BF amounts with custom date and time support.
- **Running Balance Calculations**: Automatically computes running due balances for every invoice and payment via PostgreSQL window functions.
- **Accurate Accounting Math**: Real-time balance updates across both receivables and advances.

### 🧾 2. Professional Invoice Management
- **Fast Billing**: Quick invoice creation with auto-calculated rates, units, and item totals.
- **Draft & Final States**: Draft invoices can be saved and edited before finalization.
- **Print-Ready Layouts**: Exact A4 standard printable invoice vouchers with clean typography, borders, and margins.

### 💰 3. Payments & Outstanding Tracking
- **Payment Collection**: Record payments (Cash, Bank, Cheque) linked to specific customers or invoices.
- **Master Outstanding Screen**: Instantly view all customers who owe balances, sorted by due amounts.
- **Payment History**: Detailed audit trail of past payments with receipt printing capabilities.

### 📦 4. Products & Catalog
- **Multi-size Pricing**: Dynamic rates based on product dimensions and unit conversions.
- **Recycle Bin**: Soft-delete protection ensures no accidental deletion of customer or invoice records.

### 🖨️ 5. Dedicated A4 Print Engine
- High-fidelity PDF/printer-friendly stylesheets (`print.css`).
- Automatically formats headers, company branding, tables, and balances without UI clutter.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & SQL Views)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Forms & Validation**: React Hook Form & Zod

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/FurquanCodes/Factory-Management-System.git
cd Factory-Management-System
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Run database migrations
Apply SQL migrations located in `supabase/migrations/` to your Supabase project.

### 5. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📁 Project Structure

```text
├── docs/                   # Specifications and requirements
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── customers/  # Customer Directory, Ledgers, BF & Details
│   │   │   ├── dashboard/  # Sales analytics & revenue overview
│   │   │   ├── invoices/   # Invoice creation, listing & editing
│   │   │   ├── outstanding/# Outstanding debts master list
│   │   │   ├── payments/   # Payment receipts & recording
│   │   │   ├── products/   # Product catalog & pricing
│   │   │   └── recycle-bin/# Soft-deleted recovery bin
│   │   ├── components/     # Reusable UI components & modals
│   │   └── globals.css     # Global styles & A4 print CSS
├── supabase/
│   └── migrations/         # PostgreSQL schema, views & triggers
└── package.json
```

---

## 📄 License
Private client software. All rights reserved.
