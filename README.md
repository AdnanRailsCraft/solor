# BEFIRST ENERGY SOLUTION

A complete Windows desktop application for solar equipment business management.

## Features

- **Inventory Management** - Add, edit, delete products with categories (Solar Panel, Inverter, Battery, Accessory)
- **Quotation System** - Create quotations with multiple products, auto-calculate totals with tax
- **Invoice/Receipt** - Convert quotations to invoices, generate printable PDF
- **Order Management** - Create orders with status tracking (Pending/Completed)
- **Dashboard** - View total products, low stock alerts, total sales, pending orders

## Tech Stack

- Electron.js (Desktop framework)
- HTML, CSS, JavaScript
- SQLite database (better-sqlite3)
- PDFKit (PDF generation)

## Project Structure

```
befirst-energy/
├── main.js              # Electron main process with database & IPC
├── preload.js           # Context bridge for renderer
├── package.json         # Dependencies and scripts
├── views/
│   └── index.html       # Main UI with all pages
├── styles/
│   ├── main.css         # Core styles
│   ├── dashboard.css   # Dashboard specific
│   ├── inventory.css   # Inventory specific
│   └── common.css      # Utility classes
├── scripts/
│   └── app.js          # Frontend application logic
└── SPEC.md             # Detailed specification
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Navigate to the project folder:
```bash
cd befirst-energy
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

### Building the .exe

To create a Windows executable:

```bash
npm run build
```

The executable will be in the `dist` folder.

## Usage

### Dashboard
- View total products count
- See low stock alerts (items with quantity < 5)
- View total sales amount
- See pending orders count
- View recent transactions

### Inventory
- Click "Add Product" to add new products
- Fill in: Name, Category, Cost Price, Selling Price, Quantity
- Use search to filter products
- Edit or delete existing products

### Quotations
- Click "New Quotation" to create
- Add customer details (name, phone, email)
- Select products from dropdown and add quantities
- Auto-calculates subtotal, tax (10%), and total
- Click "Invoice" to convert to invoice

### Invoices
- View all invoices
- Click "Print" to generate PDF
- Click "Paid" to mark invoice as paid

### Orders
- Create new orders
- Toggle status between Pending and Completed

## Database

The SQLite database is stored in:
- Windows: `%APPDATA%/befirst_energy.db`

## Sample Data

The app includes 10 sample solar products:
- Solar Panel 300W, 500W
- Inverter 1KW, 3KW
- Battery 12V 100Ah, 200Ah
- MC4 Connector Set
- Solar Cable 4mm
- Solar Mounting Kit
- Charge Controller 30A

## License

MIT