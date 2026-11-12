const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');
const initSqlJs = require('sql.js');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

// Global exception handler
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
    app.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow;
let db;
let dbPath;

// Initialize database
async function initDatabase() {
    dbPath = path.join(app.getPath('userData'), 'befirst_energy.db');
    log.info('Database path:', dbPath);
    
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    let data = null;
    if (fs.existsSync(dbPath)) {
        data = fs.readFileSync(dbPath);
    }
    
    db = new SQL.Database(data);
    
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            cost_price REAL NOT NULL,
            selling_price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS quotations (
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
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
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
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        )
    `);
    
    // Insert sample data if empty
    const result = db.exec('SELECT COUNT(*) as count FROM products');
    const productCount = result.length > 0 ? result[0].values[0][0] : 0;
    
    if (productCount === 0) {
        log.info('Inserting sample data...');
        const sampleProducts = [
            ['Solar Panel 300W', 'Solar Panel', 150, 200, 50],
            ['Solar Panel 500W', 'Solar Panel', 250, 350, 30],
            ['Inverter 1KW', 'Inverter', 300, 450, 20],
            ['Inverter 3KW', 'Inverter', 800, 1200, 15],
            ['Battery 12V 100Ah', 'Battery', 400, 600, 25],
            ['Battery 12V 200Ah', 'Battery', 700, 1000, 10],
            ['MC4 Connector Set', 'Accessory', 5, 10, 500],
            ['Solar Cable 4mm (per meter)', 'Accessory', 2, 5, 1000],
            ['Solar Mounting Kit', 'Accessory', 50, 80, 40],
            ['Charge Controller 30A', 'Accessory', 80, 120, 35]
        ];
        
        sampleProducts.forEach(p => {
            db.run('INSERT INTO products (name, category, cost_price, selling_price, quantity) VALUES (?, ?, ?, ?, ?)', p);
        });
        saveDatabase();
    }
    
    log.info('Database initialized successfully');
}

function saveDatabase() {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

function runQuery(query, params = []) {
    try {
        db.run(query, params);
        saveDatabase();
        return { changes: db.getRowsModified() };
    } catch (error) {
        log.error('DB Run Error:', error);
        throw error;
    }
}

function getAll(query, params = []) {
    try {
        const stmt = db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(row);
        }
        stmt.free();
        return results;
    } catch (error) {
        log.error('DB All Error:', error);
        throw error;
    }
}

function getOne(query, params = []) {
    try {
        const stmt = db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        return result;
    } catch (error) {
        log.error('DB Get Error:', error);
        throw error;
    }
}

// IPC Handlers - Products
ipcMain.handle('product:getAll', () => {
    return getAll('SELECT * FROM products ORDER BY id DESC');
});

ipcMain.handle('product:get', (event, id) => {
    return getOne('SELECT * FROM products WHERE id = ?', [id]);
});

ipcMain.handle('product:add', (event, product) => {
    runQuery('INSERT INTO products (name, category, cost_price, selling_price, quantity) VALUES (?, ?, ?, ?, ?)', 
        [product.name, product.category, product.cost_price, product.selling_price, product.quantity]);
    const result = getOne('SELECT last_insert_rowid() as id');
    return { id: result['last_insert_rowid()'], ...product };
});

ipcMain.handle('product:update', (event, id, product) => {
    runQuery(`UPDATE products SET name = ?, category = ?, cost_price = ?, selling_price = ?, quantity = ?, updated_at = datetime('now') WHERE id = ?`,
        [product.name, product.category, product.cost_price, product.selling_price, product.quantity, id]);
    return { id, ...product };
});

ipcMain.handle('product:delete', (event, id) => {
    runQuery('DELETE FROM products WHERE id = ?', [id]);
    return { success: true };
});

ipcMain.handle('product:search', (event, term) => {
    return getAll('SELECT * FROM products WHERE name LIKE ? OR category LIKE ?', [`%${term}%`, `%${term}%`]);
});

// IPC Handlers - Quotations
ipcMain.handle('quotation:getAll', () => {
    return getAll('SELECT * FROM quotations ORDER BY id DESC');
});

ipcMain.handle('quotation:get', (event, id) => {
    return getOne('SELECT * FROM quotations WHERE id = ?', [id]);
});

ipcMain.handle('quotation:add', (event, quotation) => {
    runQuery(`INSERT INTO quotations (customer_name, customer_phone, customer_email, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotation.customer_name, quotation.customer_phone || '', quotation.customer_email || '', JSON.stringify(quotation.items), quotation.subtotal, quotation.tax, quotation.total, quotation.status || 'Pending']);
    const result = getOne('SELECT last_insert_rowid() as id');
    return { id: result['last_insert_rowid()'], ...quotation };
});

ipcMain.handle('quotation:update', (event, id, quotation) => {
    runQuery(`UPDATE quotations SET customer_name = ?, customer_phone = ?, customer_email = ?, items = ?, subtotal = ?, tax = ?, total = ?, status = ? WHERE id = ?`,
        [quotation.customer_name, quotation.customer_phone || '', quotation.customer_email || '', JSON.stringify(quotation.items), quotation.subtotal, quotation.tax, quotation.total, quotation.status || 'Pending', id]);
    return { id, ...quotation };
});

ipcMain.handle('quotation:delete', (event, id) => {
    runQuery('DELETE FROM quotations WHERE id = ?', [id]);
    return { success: true };
});

// Helper to check and reduce inventory
function reduceInventory(items) {
    try {
        const productItems = typeof items === 'string' ? JSON.parse(items) : items;
        
        // First check if all items have enough stock
        const insufficientStock = [];
        for (const item of productItems) {
            if (item.product_id) {
                const product = getOne('SELECT name, quantity FROM products WHERE id = ?', [item.product_id]);
                if (!product || product.quantity < item.quantity) {
                    insufficientStock.push(`${product ? product.name : 'Unknown Product'} (Available: ${product ? product.quantity : 0}, Required: ${item.quantity})`);
                }
            }
        }

        if (insufficientStock.length > 0) {
            throw new Error('Insufficient stock for: ' + insufficientStock.join(', '));
        }

        // If all items have enough stock, proceed with reduction
        productItems.forEach(item => {
            if (item.product_id) {
                runQuery('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
            }
        });
        log.info('Inventory reduced for items:', productItems.length);
        return { success: true };
    } catch (error) {
        log.error('Error reducing inventory:', error);
        throw error; // Re-throw to be caught by IPC handlers
    }
}

// IPC Handlers - Invoices
ipcMain.handle('invoice:getAll', () => {
    return getAll('SELECT * FROM invoices ORDER BY id DESC');
});

ipcMain.handle('invoice:get', (event, id) => {
    return getOne('SELECT * FROM invoices WHERE id = ?', [id]);
});

ipcMain.handle('invoice:add', (event, invoice) => {
    const countResult = getOne('SELECT COUNT(*) as count FROM invoices');
    const count = countResult ? countResult.count : 0;
    const invoiceNumber = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(count + 1).padStart(3, '0');
    
    runQuery(`INSERT INTO invoices (quotation_id, invoice_number, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoice.quotation_id || null, invoiceNumber, invoice.customer_name, invoice.customer_phone || '', invoice.customer_email || '', JSON.stringify(invoice.items), invoice.subtotal, invoice.tax, invoice.total, invoice.status || 'Pending']);
    
    // Reduce inventory
    reduceInventory(invoice.items);
    
    const result = getOne('SELECT last_insert_rowid() as id');
    return { id: result['last_insert_rowid()'], invoice_number: invoiceNumber, ...invoice };
});

ipcMain.handle('invoice:update', (event, id, invoice) => {
    runQuery(`UPDATE invoices SET customer_name = ?, customer_phone = ?, customer_email = ?, items = ?, subtotal = ?, tax = ?, total = ?, status = ? WHERE id = ?`,
        [invoice.customer_name, invoice.customer_phone || '', invoice.customer_email || '', JSON.stringify(invoice.items), invoice.subtotal, invoice.tax, invoice.total, invoice.status || 'Pending', id]);
    return { id, ...invoice };
});

ipcMain.handle('invoice:convert', (event, quotationId) => {
    const quotation = getOne('SELECT * FROM quotations WHERE id = ?', [quotationId]);
    if (!quotation) throw new Error('Quotation not found');
    
    const countResult = getOne('SELECT COUNT(*) as count FROM invoices');
    const count = countResult ? countResult.count : 0;
    const invoiceNumber = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(count + 1).padStart(3, '0');
    
    runQuery(`INSERT INTO invoices (quotation_id, invoice_number, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotationId, invoiceNumber, quotation.customer_name, quotation.customer_phone, quotation.customer_email, quotation.items, quotation.subtotal, quotation.tax, quotation.total, 'Pending']);
    
    // Reduce inventory
    reduceInventory(quotation.items);
    
    const result = getOne('SELECT last_insert_rowid() as id');
    
    // Update quotation status
    runQuery("UPDATE quotations SET status = 'Converted to Invoice' WHERE id = ?", [quotationId]);
    
    return { id: result['last_insert_rowid()'], invoice_number: invoiceNumber };
});

// IPC Handlers - Orders
ipcMain.handle('order:getAll', () => {
    return getAll('SELECT * FROM orders ORDER BY id DESC');
});

ipcMain.handle('order:get', (event, id) => {
    return getOne('SELECT * FROM orders WHERE id = ?', [id]);
});

ipcMain.handle('order:add', (event, order) => {
    const countResult = getOne('SELECT COUNT(*) as count FROM orders');
    const count = countResult ? countResult.count : 0;
    const orderNumber = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(count + 1).padStart(3, '0');
    
    runQuery(`INSERT INTO orders (order_number, customer_name, items, total, status) VALUES (?, ?, ?, ?, ?)`,
        [orderNumber, order.customer_name, JSON.stringify(order.items), order.total, order.status || 'Pending']);
    const result = getOne('SELECT last_insert_rowid() as id');
    return { id: result['last_insert_rowid()'], order_number: orderNumber, ...order };
});

ipcMain.handle('order:update', (event, id, order) => {
    runQuery(`UPDATE orders SET customer_name = ?, items = ?, total = ?, status = ? WHERE id = ?`,
        [order.customer_name, JSON.stringify(order.items), order.total, order.status || 'Pending', id]);
    return { id, ...order };
});

ipcMain.handle('order:updateStatus', (event, id, status) => {
    if (status === 'Completed') {
        runQuery("UPDATE orders SET status = ?, completed_at = datetime('now') WHERE id = ?", [status, id]);
    } else {
        runQuery("UPDATE orders SET status = ?, completed_at = NULL WHERE id = ?", [status, id]);
    }
    return { success: true };
});

ipcMain.handle('order:convertToInvoice', (event, orderId) => {
    const order = getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');
    
    const countResult = getOne('SELECT COUNT(*) as count FROM invoices');
    const count = countResult ? countResult.count : 0;
    const invoiceNumber = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(count + 1).padStart(3, '0');
    
    // Calculate subtotal and tax if not present in order (order only has total)
    // Default to 0% tax since orders don't store tax rate
    const total = order.total;
    const subtotal = total;
    const tax = 0;

    runQuery(`INSERT INTO invoices (invoice_number, customer_name, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invoiceNumber, order.customer_name, order.items, subtotal, tax, total, 'Pending']);
    
    // Reduce inventory
    reduceInventory(order.items);
    
    const result = getOne('SELECT last_insert_rowid() as id');
    
    // Update order status
    runQuery("UPDATE orders SET status = 'Completed', completed_at = datetime('now') WHERE id = ?", [orderId]);
    
    return { id: result['last_insert_rowid()'], invoice_number: invoiceNumber };
});

// IPC Handlers - Dashboard
ipcMain.handle('dashboard:getStats', () => {
    const productCount = getOne('SELECT COUNT(*) as count FROM products');
    const lowStockCount = getOne('SELECT COUNT(*) as count FROM products WHERE quantity < 5');
    const totalSalesResult = getOne("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'Paid'");
    const pendingOrders = getOne("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
    
    return {
        totalProducts: productCount ? productCount.count : 0,
        lowStockCount: lowStockCount ? lowStockCount.count : 0,
        totalSales: totalSalesResult ? totalSalesResult.total : 0,
        pendingOrders: pendingOrders ? pendingOrders.count : 0
    };
});

ipcMain.handle('dashboard:getLowStock', () => {
    return getAll('SELECT * FROM products WHERE quantity < 5 ORDER BY quantity ASC');
});

ipcMain.handle('dashboard:getRecent', () => {
    const recentInvoices = getAll('SELECT id, invoice_number as number, customer_name, total, created_at, "Invoice" as type FROM invoices ORDER BY created_at DESC LIMIT 5');
    const recentOrders = getAll('SELECT id, order_number as number, customer_name, total, created_at, "Order" as type FROM orders ORDER BY created_at DESC LIMIT 5');
    
    // Combine and sort by date
    const combined = [...recentInvoices, ...recentOrders].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    ).slice(0, 5);
    
    return combined;
});

// IPC Handlers - PDF Generation
ipcMain.handle('pdf:generate', async (event, type, data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const safeName = data.customer_name ? data.customer_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'customer';
        const docNumber = data.number ? `_${data.number.replace(/[^a-z0-9]/gi, '_')}` : '';
        const fileName = `${type}_${safeName}${docNumber}.pdf`;
        const filePath = path.join(app.getPath('documents'), fileName);
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Header
        doc.fontSize(24).fillColor('#1a73e8').text('BEFIRST ENERGY SOLUTION', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#5f6368').text('Solar Equipment & Solutions', { align: 'center' });
        doc.moveDown(2);
        
        // Document type
        doc.fontSize(18).fillColor('#202124').text(type === 'quotation' ? 'QUOTATION' : 'INVOICE', { align: 'center' });
        doc.moveDown(0.5);
        
        if (data.number) {
            doc.fontSize(12).fillColor('#5f6368').text(`Number: ${data.number}`, { align: 'center' });
        }
        doc.moveDown();
        
        // Date
        doc.fontSize(10).fillColor('#5f6368').text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown(2);
        
        // Customer info
        doc.fontSize(12).fillColor('#202124').text('Customer Details:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#5f6368');
        doc.text(`Name: ${data.customer_name}`);
        if (data.customer_phone) doc.text(`Phone: ${data.customer_phone}`);
        if (data.customer_email) doc.text(`Email: ${data.customer_email}`);
        doc.moveDown(2);
        
        // Items table header
        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#202124');
        doc.text('No.', 50, tableTop);
        doc.text('Item', 100, tableTop);
        doc.text('Qty', 300, tableTop);
        doc.text('Unit Price', 350, tableTop);
        doc.text('Total', 450, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#dadce0');
        doc.moveDown();
        
        // Items
        let y = tableTop + 25;
        data.items.forEach((item, index) => {
            doc.text(String(index + 1), 50, y);
            doc.text(item.product_name || item.name, 100, y);
            doc.text(String(item.quantity), 300, y);
            doc.text('$' + item.unit_price.toFixed(2), 350, y);
            doc.text('$' + item.total.toFixed(2), 450, y);
            y += 20;
        });
        
        doc.moveDown(2);
        
        // Totals
        const totalsY = doc.y;
        doc.text('Subtotal:', 350, totalsY);
        doc.text('$' + data.subtotal.toFixed(2), 450, totalsY);
        doc.moveDown();
        doc.text('Tax:', 350, doc.y);
        doc.text('$' + data.tax.toFixed(2), 450, doc.y);
        doc.moveDown();
        doc.fontSize(12).fillColor('#202124').text('Total:', 350, doc.y);
        doc.text('$' + data.total.toFixed(2), 450, doc.y);
        
        doc.moveDown(3);
        
        // Footer
        doc.fontSize(10).fillColor('#5f6368').text('Thank you for your business!', { align: 'center' });
        doc.text('BEFIRST ENERGY SOLUTION', { align: 'center' });
        
        doc.end();
        
        stream.on('finish', () => {
            resolve(filePath);
        });
        
        stream.on('error', (error) => {
            reject(error);
        });
    });
});

// Window controls
ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
});

function createWindow() {
    log.info('Creating main window...');
    
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false
    });

    mainWindow.loadFile('frontend/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        log.info('Main window displayed');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    log.info('App is ready');
    await initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    log.info('All windows closed');
    if (db) {
        db.close();
        log.info('Database closed');
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    log.info('Application quitting...');
});
