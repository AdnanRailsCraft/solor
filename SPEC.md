# BEFIRST ENERGY SOLUTION - Desktop Application Specification

## 1. Project Overview

**Project Name:** BEFIRST ENERGY SOLUTION
**Type:** Windows Desktop Application
**Tech Stack:** Electron.js, HTML, CSS, JavaScript, SQLite
**Architecture:** MVC Pattern

## 2. UI/UX Specification

### 2.1 Layout Structure
- **Window:** Single main window (1200x800 minimum)
- **Layout:** Sidebar (250px) + Main Content Area
- **Sidebar:** Fixed left navigation with menu items
- **Header:** Page title and action buttons
- **Content:** Dynamic content area based on selected menu

### 2.2 Visual Design

#### Color Palette
- **Primary:** #1a73e8 (Blue - professional business color)
- **Secondary:** #34a853 (Green - success/money)
- **Accent:** #fbbc04 (Yellow - attention/warning)
- **Background:** #f8f9fa (Light gray)
- **Surface:** #ffffff (White)
- **Text Primary:** #202124 (Dark gray)
- **Text Secondary:** #5f6368 (Medium gray)
- **Border:** #dadce0 (Light border)
- **Danger:** #ea4335 (Red - delete/error)
- **Sidebar Background:** #1a73e8 (Blue)
- **Sidebar Text:** #ffffff (White)

#### Typography
- **Font Family:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Heading 1:** 24px, bold
- **Heading 2:** 20px, semibold
- **Heading 3:** 16px, semibold
- **Body:** 14px, regular
- **Small:** 12px, regular

#### Spacing System
- **Base unit:** 8px
- **Padding small:** 8px
- **Padding medium:** 16px
- **Padding large:** 24px
- **Margin between sections:** 24px
- **Card padding:** 16px
- **Button padding:** 10px 20px

#### Visual Effects
- **Card shadow:** 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
- **Hover shadow:** 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)
- **Border radius:** 8px (cards), 4px (buttons/inputs)
- **Transitions:** 0.3s ease

### 2.3 Components

#### Sidebar Navigation
- Logo/App name at top
- Menu items with icons:
  - Dashboard (home icon)
  - Inventory (box icon)
  - Quotations (document icon)
  - Invoices (receipt icon)
  - Orders (shopping cart icon)
- Active state: lighter background
- Hover state: slight background change

#### Data Tables
- Striped rows (alternating #fff and #f8f9fa)
- Sortable columns
- Action buttons (edit, delete) per row
- Pagination controls

#### Forms
- Labeled inputs with proper spacing
- Validation states (error border red)
- Required field indicators (*)

#### Buttons
- Primary: Blue background, white text
- Secondary: White background, blue border
- Danger: Red background, white text
- Disabled: Gray background, reduced opacity

#### Cards
- White background
- Border radius 8px
- Shadow on hover
- Padding 16px

#### Modal Dialogs
- Centered overlay
- White background
- Close button top right
- Action buttons bottom right

## 3. Functionality Specification

### 3.1 Dashboard
- **Total Products:** Count of all products in inventory
- **Low Stock Alert:** Products with quantity < 5 (list with alert icon)
- **Total Sales:** Sum of all completed invoice totals
- **Recent Activity:** Last 5 transactions (invoices/orders)
- **Quick Stats Cards:** Visual cards with icons

### 3.2 Inventory Management

#### Product Fields
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `name` - TEXT NOT NULL
- `category` - TEXT (Inverter, Solar Panel, Battery, Accessory)
- `cost_price` - REAL (decimal)
- `selling_price` - REAL (decimal)
- `quantity` - INTEGER
- `created_at` - DATETIME
- `updated_at` - DATETIME

#### Operations
- **Add Product:** Form with all fields, validation
- **Edit Product:** Pre-filled form, update on save
- **Delete Product:** Confirmation dialog
- **Search:** Filter by name/category
- **List View:** Table with all products, sorting, pagination

### 3.3 Quotation System

#### Quotation Fields
- `id` - INTEGER PRIMARY KEY
- `customer_name` - TEXT NOT NULL
- `customer_phone` - TEXT
- `customer_email` - TEXT
- `items` - JSON (array of product items)
- `subtotal` - REAL
- `tax` - REAL (10%)
- `total` - REAL
- `status` - TEXT (Pending, Converted to Invoice)
- `created_at` - DATETIME

#### Quotation Item Fields
- `product_id` - INTEGER
- `product_name` - TEXT
- `quantity` - INTEGER
- `unit_price` - REAL
- `total` - REAL

#### Operations
- **Create Quotation:**
  - Select/add customer details
  - Add multiple products (searchable dropdown)
  - Adjust quantities
  - Auto-calculate subtotal, tax (10%), total
  - Save to database
- **View Quotation:** Display all quotations with status
- **Edit Quotation:** Modify pending quotations
- **Delete Quotation:** Remove quotations
- **Convert to Invoice:** Create invoice from quotation
- **Print to PDF:** Generate printable PDF document

### 3.4 Invoice/Receipt

#### Invoice Fields
- `id` - INTEGER PRIMARY KEY
- `quotation_id` - INTEGER (optional, if converted)
- `invoice_number` - TEXT (auto-generated INV-YYYYMMDD-XXX)
- `customer_name` - TEXT
- `customer_phone` - TEXT
- `customer_email` - TEXT
- `items` - JSON
- `subtotal` - REAL
- `tax` - REAL
- `total` - REAL
- `status` - TEXT (Pending, Paid)
- `created_at` - DATETIME

#### Operations
- **Create Invoice:** From quotation or fresh
- **View Invoice:** List all invoices
- **Mark as Paid:** Update status
- **Print to PDF:** Generate receipt

### 3.5 Order Management

#### Order Fields
- `id` - INTEGER PRIMARY KEY
- `order_number` - TEXT (auto-generated ORD-YYYYMMDD-XXX)
- `customer_name` - TEXT
- `items` - JSON
- `total` - REAL
- `status` - TEXT (Pending, Completed)
- `created_at` - DATETIME
- `completed_at` - DATETIME

#### Operations
- **Create Order:** Similar to quotation
- **Update Status:** Pending ↔ Completed
- **View Orders:** List with filters

### 3.6 Data Flow

```
User Input → Controller → Model → Database
                ↓
          View (HTML/CSS)
```

### 3.7 Edge Cases
- Empty inventory: Show "No products" message
- Low stock: Highlight row in yellow
- Delete product in use: Prevent deletion, show warning
- Invalid form data: Show validation errors
- PDF generation failure: Show error message

## 4. Technical Specification

### 4.1 Project Structure
```
befirst-energy/
├── package.json
├── main.js                 # Electron main process
├── preload.js              # Preload script
├── database/
│   └── db.js               # SQLite initialization
├── models/
│   ├── product.js          # Product model
│   ├── quotation.js        # Quotation model
│   ├── invoice.js          # Invoice model
│   └── order.js            # Order model
├── controllers/
│   ├── productController.js
│   ├── quotationController.js
│   ├── invoiceController.js
│   └── orderController.js
├── views/
│   ├── index.html          # Main window
│   ├── dashboard.html
│   ├── inventory.html
│   ├── quotations.html
│   ├── invoices.html
│   ├── orders.html
│   └── partials/
│       ├── sidebar.html
│       └── modals/
├── styles/
│   ├── main.css
│   ├── dashboard.css
│   ├── inventory.css
│   └── common.css
├── scripts/
│   ├── app.js              # Main app logic
│   ├── dashboard.js
│   ├── inventory.js
│   ├── quotations.js
│   ├── invoices.js
│   └── orders.js
└── assets/
    └── icon.ico
```

### 4.2 Database Schema

```sql
-- Products table
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    cost_price REAL NOT NULL,
    selling_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quotations table
CREATE TABLE quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id)
);

-- Orders table
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);
```

### 4.3 Sample Data
```sql
-- Products
INSERT INTO products (name, category, cost_price, selling_price, quantity) VALUES
('Solar Panel 300W', 'Solar Panel', 150, 200, 50),
('Solar Panel 500W', 'Solar Panel', 250, 350, 30),
('Inverter 1KW', 'Inverter', 300, 450, 20),
('Inverter 3KW', 'Inverter', 800, 1200, 15),
('Battery 12V 100Ah', 'Battery', 400, 600, 25),
('Battery 12V 200Ah', 'Battery', 700, 1000, 10),
('MC4 Connector', 'Accessory', 5, 10, 500),
('Solar Cable 4mm', 'Accessory', 2, 5, 1000);
```

## 5. Acceptance Criteria

### 5.1 Core Functionality
- [ ] Application launches without errors
- [ ] Sidebar navigation works for all sections
- [ ] Database initializes with sample data
- [ ] All CRUD operations work for products
- [ ] Quotation creation with product selection works
- [ ] Invoice generation from quotation works
- [ ] Order creation and status update works
- [ ] Dashboard displays correct statistics

### 5.2 UI/UX
- [ ] Clean, professional business appearance
- [ ] Responsive layout (minimum 1200x800)
- [ ] Consistent color scheme
- [ ] Proper spacing and alignment
- [ ] Loading states for async operations
- [ ] Error messages displayed clearly

### 5.3 Data Integrity
- [ ] Data persists between sessions
- [ ] Calculations are accurate
- [ ] Foreign key relationships maintained
- [ ] No data loss on application close

### 5.4 PDF Generation
- [ ] Quotation PDF generates correctly
- [ ] Invoice PDF generates correctly
- [ ] PDF contains all required information
- [ ] PDF is printable