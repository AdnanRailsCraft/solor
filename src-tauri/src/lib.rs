use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use printpdf::*;
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub category: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub quantity: i64,
}

#[derive(Debug, Deserialize)]
struct QuotationInput {
    customer_name: String,
    customer_phone: Option<String>,
    customer_email: Option<String>,
    items: JsonValue,
    subtotal: f64,
    tax: f64,
    total: f64,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct InvoiceInput {
    quotation_id: Option<i64>,
    customer_name: String,
    customer_phone: Option<String>,
    customer_email: Option<String>,
    items: JsonValue,
    subtotal: f64,
    tax: f64,
    total: f64,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OrderInput {
    customer_name: String,
    items: JsonValue,
    total: f64,
    status: Option<String>,
}

fn init_db(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            cost_price REAL NOT NULL,
            selling_price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
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
        );
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
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        );",
    )
    .expect("create tables");

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM products", [], |r| r.get(0))
        .unwrap_or(0);
    if count == 0 {
        let samples = [
            ("Solar Panel 300W", "Solar Panel", 150.0, 200.0, 50),
            ("Solar Panel 500W", "Solar Panel", 250.0, 350.0, 30),
            ("Inverter 1KW", "Inverter", 300.0, 450.0, 20),
            ("Inverter 3KW", "Inverter", 800.0, 1200.0, 15),
            ("Battery 12V 100Ah", "Battery", 400.0, 600.0, 25),
            ("Battery 12V 200Ah", "Battery", 700.0, 1000.0, 10),
            ("MC4 Connector Set", "Accessory", 5.0, 10.0, 500),
            ("Solar Cable 4mm (per meter)", "Accessory", 2.0, 5.0, 1000),
            ("Solar Mounting Kit", "Accessory", 50.0, 80.0, 40),
            ("Charge Controller 30A", "Accessory", 80.0, 120.0, 35),
        ];
        for s in samples {
            conn.execute(
                "INSERT INTO products (name, category, cost_price, selling_price, quantity) VALUES (?1,?2,?3,?4,?5)",
                params![s.0, s.1, s.2, s.3, s.4],
            )
            .ok();
        }
    }
}

fn reduce_inventory(conn: &Connection, items: &JsonValue) -> Result<(), String> {
    let arr = items.as_array().ok_or("items must be array")?;
    // check stock
    for item in arr {
        if let Some(pid) = item.get("product_id").and_then(|v| v.as_i64()) {
            let qty = item.get("quantity").and_then(|v| v.as_i64()).unwrap_or(0);
            let (name, available): (String, i64) = conn
                .query_row("SELECT name, quantity FROM products WHERE id = ?1", params![pid], |r| Ok((r.get(0)?, r.get(1)?)))
                .map_err(|e| e.to_string())?;
            if available < qty {
                return Err(format!("{} (Available: {}, Required: {})", name, available, qty));
            }
        }
    }
    for item in arr {
        if let Some(pid) = item.get("product_id").and_then(|v| v.as_i64()) {
            let qty = item.get("quantity").and_then(|v| v.as_i64()).unwrap_or(0);
            conn.execute("UPDATE products SET quantity = quantity - ?1 WHERE id = ?2", params![qty, pid])
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// ---------- Products ----------
#[tauri::command]
fn get_products(state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, category, cost_price, selling_price, quantity FROM products ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                cost_price: row.get(3)?,
                selling_price: row.get(4)?,
                quantity: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
fn get_product(state: State<'_, DbState>, id: i64) -> Result<Option<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, category, cost_price, selling_price, quantity FROM products WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let obj = serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "name": row.get::<_,String>(1).unwrap_or_default(),
            "category": row.get::<_,String>(2).unwrap_or_default(),
            "cost_price": row.get::<_,f64>(3).unwrap_or(0.0),
            "selling_price": row.get::<_,f64>(4).unwrap_or(0.0),
            "quantity": row.get::<_,i64>(5).unwrap_or(0),
        });
        Ok(Some(obj))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn add_product(state: State<'_, DbState>, product: Product) -> Result<Product, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO products (name, category, cost_price, selling_price, quantity) VALUES (?1,?2,?3,?4,?5)",
        params![product.name, product.category, product.cost_price, product.selling_price, product.quantity],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(Product { id, ..product })
}

#[tauri::command]
fn update_product(state: State<'_, DbState>, id: i64, product: Product) -> Result<Product, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE products SET name = ?1, category = ?2, cost_price = ?3, selling_price = ?4, quantity = ?5, updated_at = datetime('now') WHERE id = ?6",
        params![product.name, product.category, product.cost_price, product.selling_price, product.quantity, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(Product { id, ..product })
}

#[tauri::command]
fn delete_product(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM products WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn search_products(state: State<'_, DbState>, term: String) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let like = format!("%{}%", term);
    let mut stmt = conn
        .prepare("SELECT id, name, category, cost_price, selling_price, quantity FROM products WHERE name LIKE ?1 OR category LIKE ?1 ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![like], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                cost_price: row.get(3)?,
                selling_price: row.get(4)?,
                quantity: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

// ---------- Quotations ----------
#[tauri::command]
fn get_quotations(state: State<'_, DbState>) -> Result<Vec<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status, created_at FROM quotations ORDER BY id DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0)?,
            "customer_name": row.get::<_,String>(1)?,
            "customer_phone": row.get::<_,Option<String>>(2)?,
            "customer_email": row.get::<_,Option<String>>(3)?,
            "items": row.get::<_,String>(4)?,
            "subtotal": row.get::<_,f64>(5)?,
            "tax": row.get::<_,f64>(6)?,
            "total": row.get::<_,f64>(7)?,
            "status": row.get::<_,String>(8)?,
            "created_at": row.get::<_,String>(9)?,
        }))
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn get_quotation(state: State<'_, DbState>, id: i64) -> Result<Option<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status, created_at FROM quotations WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "customer_name": row.get::<_,String>(1).unwrap_or_default(),
            "customer_phone": row.get::<_,Option<String>>(2).unwrap_or(None),
            "customer_email": row.get::<_,Option<String>>(3).unwrap_or(None),
            "items": row.get::<_,String>(4).unwrap_or_default(),
            "subtotal": row.get::<_,f64>(5).unwrap_or(0.0),
            "tax": row.get::<_,f64>(6).unwrap_or(0.0),
            "total": row.get::<_,f64>(7).unwrap_or(0.0),
            "status": row.get::<_,String>(8).unwrap_or_default(),
            "created_at": row.get::<_,String>(9).unwrap_or_default(),
        })))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn add_quotation(state: State<'_, DbState>, quotation: QuotationInput) -> Result<JsonValue, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let items_str = quotation.items.to_string();
    let status = quotation.status.unwrap_or_else(|| "Pending".to_string());
    conn.execute(
        "INSERT INTO quotations (customer_name, customer_phone, customer_email, items, subtotal, tax, total, status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![quotation.customer_name, quotation.customer_phone.unwrap_or_default(), quotation.customer_email.unwrap_or_default(), items_str, quotation.subtotal, quotation.tax, quotation.total, status],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
fn update_quotation(state: State<'_, DbState>, id: i64, quotation: QuotationInput) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let items_str = quotation.items.to_string();
    let status = quotation.status.unwrap_or_else(|| "Pending".to_string());
    conn.execute(
        "UPDATE quotations SET customer_name = ?1, customer_phone = ?2, customer_email = ?3, items = ?4, subtotal = ?5, tax = ?6, total = ?7, status = ?8 WHERE id = ?9",
        params![quotation.customer_name, quotation.customer_phone.unwrap_or_default(), quotation.customer_email.unwrap_or_default(), items_str, quotation.subtotal, quotation.tax, quotation.total, status, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_quotation(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM quotations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Invoices ----------
#[tauri::command]
fn get_invoices(state: State<'_, DbState>) -> Result<Vec<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, quotation_id, invoice_number, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status, created_at FROM invoices ORDER BY id DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0)?,
            "quotation_id": row.get::<_,Option<i64>>(1)?,
            "invoice_number": row.get::<_,String>(2)?,
            "customer_name": row.get::<_,String>(3)?,
            "customer_phone": row.get::<_,Option<String>>(4)?,
            "customer_email": row.get::<_,Option<String>>(5)?,
            "items": row.get::<_,String>(6)?,
            "subtotal": row.get::<_,f64>(7)?,
            "tax": row.get::<_,f64>(8)?,
            "total": row.get::<_,f64>(9)?,
            "status": row.get::<_,String>(10)?,
            "created_at": row.get::<_,String>(11)?,
            "number": row.get::<_,String>(2)?,
        }))
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn get_invoice(state: State<'_, DbState>, id: i64) -> Result<Option<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, quotation_id, invoice_number, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status, created_at FROM invoices WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "quotation_id": row.get::<_,Option<i64>>(1).unwrap_or(None),
            "invoice_number": row.get::<_,String>(2).unwrap_or_default(),
            "customer_name": row.get::<_,String>(3).unwrap_or_default(),
            "customer_phone": row.get::<_,Option<String>>(4).unwrap_or(None),
            "customer_email": row.get::<_,Option<String>>(5).unwrap_or(None),
            "items": row.get::<_,String>(6).unwrap_or_default(),
            "subtotal": row.get::<_,f64>(7).unwrap_or(0.0),
            "tax": row.get::<_,f64>(8).unwrap_or(0.0),
            "total": row.get::<_,f64>(9).unwrap_or(0.0),
            "status": row.get::<_,String>(10).unwrap_or_default(),
            "created_at": row.get::<_,String>(11).unwrap_or_default(),
            "number": row.get::<_,String>(2).unwrap_or_default(),
        })))
    } else {
        Ok(None)
    }
}

fn new_invoice_number(conn: &Connection) -> String {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM invoices", [], |r| r.get(0)).unwrap_or(0);
    let date = chrono::Utc::now().format("%Y%m%d").to_string();
    format!("INV-{}-{:03}", date, count + 1)
}

#[tauri::command]
fn add_invoice(state: State<'_, DbState>, invoice: InvoiceInput) -> Result<JsonValue, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let items_str = invoice.items.to_string();
    let inv_number = new_invoice_number(&conn);
    let status = invoice.status.unwrap_or_else(|| "Pending".to_string());
    conn.execute(
        "INSERT INTO invoices (quotation_id, invoice_number, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![invoice.quotation_id, inv_number, invoice.customer_name, invoice.customer_phone.unwrap_or_default(), invoice.customer_email.unwrap_or_default(), items_str, invoice.subtotal, invoice.tax, invoice.total, status],
    )
    .map_err(|e| e.to_string())?;
    reduce_inventory(&conn, &invoice.items)?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id, "invoice_number": inv_number, "number": inv_number }))
}

#[tauri::command]
fn update_invoice(state: State<'_, DbState>, id: i64, invoice: InvoiceInput) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let items_str = invoice.items.to_string();
    let status = invoice.status.unwrap_or_else(|| "Pending".to_string());
    conn.execute(
        "UPDATE invoices SET customer_name = ?1, customer_phone = ?2, customer_email = ?3, items = ?4, subtotal = ?5, tax = ?6, total = ?7, status = ?8 WHERE id = ?9",
        params![invoice.customer_name, invoice.customer_phone.unwrap_or_default(), invoice.customer_email.unwrap_or_default(), items_str, invoice.subtotal, invoice.tax, invoice.total, status, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn convert_to_invoice(state: State<'_, DbState>, quotation_id: i64) -> Result<JsonValue, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let q: (String, Option<String>, Option<String>, String, f64, f64, f64) = conn
        .query_row(
            "SELECT customer_name, customer_phone, customer_email, items, subtotal, tax, total FROM quotations WHERE id = ?1",
            params![quotation_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?)),
        )
        .map_err(|_| "Quotation not found".to_string())?;
    let items: JsonValue = serde_json::from_str(&q.3).unwrap_or(JsonValue::Array(vec![]));
    let inv_number = new_invoice_number(&conn);
    conn.execute(
        "INSERT INTO invoices (quotation_id, invoice_number, customer_name, customer_phone, customer_email, items, subtotal, tax, total, status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![quotation_id, inv_number, q.0, q.1.unwrap_or_default(), q.2.unwrap_or_default(), q.3, q.4, q.5, q.6, "Pending"],
    )
    .map_err(|e| e.to_string())?;
    reduce_inventory(&conn, &items)?;
    let id = conn.last_insert_rowid();
    conn.execute("UPDATE quotations SET status = 'Converted to Invoice' WHERE id = ?1", params![quotation_id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": id, "invoice_number": inv_number, "number": inv_number }))
}

// ---------- Orders ----------
#[tauri::command]
fn get_orders(state: State<'_, DbState>) -> Result<Vec<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, order_number, customer_name, items, total, status, created_at, completed_at FROM orders ORDER BY id DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0)?,
            "order_number": row.get::<_,String>(1)?,
            "customer_name": row.get::<_,String>(2)?,
            "items": row.get::<_,String>(3)?,
            "total": row.get::<_,f64>(4)?,
            "status": row.get::<_,String>(5)?,
            "created_at": row.get::<_,String>(6)?,
            "completed_at": row.get::<_,Option<String>>(7)?,
            "number": row.get::<_,String>(1)?,
        }))
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn get_order(state: State<'_, DbState>, id: i64) -> Result<Option<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, order_number, customer_name, items, total, status, created_at, completed_at FROM orders WHERE id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "order_number": row.get::<_,String>(1).unwrap_or_default(),
            "customer_name": row.get::<_,String>(2).unwrap_or_default(),
            "items": row.get::<_,String>(3).unwrap_or_default(),
            "total": row.get::<_,f64>(4).unwrap_or(0.0),
            "status": row.get::<_,String>(5).unwrap_or_default(),
            "created_at": row.get::<_,String>(6).unwrap_or_default(),
            "completed_at": row.get::<_,Option<String>>(7).unwrap_or(None),
            "number": row.get::<_,String>(1).unwrap_or_default(),
        })))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn add_order(state: State<'_, DbState>, order: OrderInput) -> Result<JsonValue, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let items_str = order.items.to_string();
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM orders", [], |r| r.get(0)).unwrap_or(0);
    let date = chrono::Utc::now().format("%Y%m%d").to_string();
    let order_number = format!("ORD-{}-{:03}", date, count + 1);
    let status = order.status.unwrap_or_else(|| "Pending".to_string());
    conn.execute(
        "INSERT INTO orders (order_number, customer_name, items, total, status) VALUES (?1,?2,?3,?4,?5)",
        params![order_number, order.customer_name, items_str, order.total, status],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id, "order_number": order_number, "number": order_number }))
}

#[tauri::command]
fn update_order(state: State<'_, DbState>, id: i64, order: OrderInput) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let items_str = order.items.to_string();
    let status = order.status.unwrap_or_else(|| "Pending".to_string());
    conn.execute(
        "UPDATE orders SET customer_name = ?1, items = ?2, total = ?3, status = ?4 WHERE id = ?5",
        params![order.customer_name, items_str, order.total, status, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_order_status(state: State<'_, DbState>, id: i64, status: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    if status == "Completed" {
        conn.execute("UPDATE orders SET status = ?1, completed_at = datetime('now') WHERE id = ?2", params![status, id])
            .map_err(|e| e.to_string())?;
    } else {
        conn.execute("UPDATE orders SET status = ?1, completed_at = NULL WHERE id = ?2", params![status, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn convert_order_to_invoice(state: State<'_, DbState>, order_id: i64) -> Result<JsonValue, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (customer_name, items_str, total): (String, String, f64) = conn
        .query_row("SELECT customer_name, items, total FROM orders WHERE id = ?1", params![order_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|_| "Order not found".to_string())?;
    let items: JsonValue = serde_json::from_str(&items_str).unwrap_or(JsonValue::Array(vec![]));
    let inv_number = new_invoice_number(&conn);
    let subtotal = total;
    let tax = 0.0;
    conn.execute(
        "INSERT INTO invoices (invoice_number, customer_name, items, subtotal, tax, total, status) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![inv_number, customer_name, items_str, subtotal, tax, total, "Pending"],
    )
    .map_err(|e| e.to_string())?;
    reduce_inventory(&conn, &items)?;
    let id = conn.last_insert_rowid();
    conn.execute("UPDATE orders SET status = 'Completed', completed_at = datetime('now') WHERE id = ?1", params![order_id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": id, "invoice_number": inv_number, "number": inv_number }))
}

// ---------- Dashboard ----------
#[tauri::command]
fn get_dashboard_stats(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let total_products: i64 = conn.query_row("SELECT COUNT(*) FROM products", [], |r| r.get(0)).unwrap_or(0);
    let low_stock_count: i64 = conn.query_row("SELECT COUNT(*) FROM products WHERE quantity < 5", [], |r| r.get(0)).unwrap_or(0);
    let total_sales: f64 = conn.query_row("SELECT COALESCE(SUM(total),0) FROM invoices WHERE status = 'Paid'", [], |r| r.get(0)).unwrap_or(0.0);
    let pending_orders: i64 = conn.query_row("SELECT COUNT(*) FROM orders WHERE status = 'Pending'", [], |r| r.get(0)).unwrap_or(0);
    Ok(serde_json::json!({
        "totalProducts": total_products,
        "lowStockCount": low_stock_count,
        "totalSales": total_sales,
        "pendingOrders": pending_orders,
    }))
}

#[tauri::command]
fn get_low_stock_products(state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, category, cost_price, selling_price, quantity FROM products WHERE quantity < 5 ORDER BY quantity ASC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Product {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            cost_price: row.get(3)?,
            selling_price: row.get(4)?,
            quantity: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn get_recent_transactions(state: State<'_, DbState>) -> Result<Vec<JsonValue>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    let mut stmt = conn.prepare("SELECT id, invoice_number, customer_name, total, created_at FROM invoices ORDER BY created_at DESC LIMIT 5").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0)?,
            "number": row.get::<_,String>(1)?,
            "customer_name": row.get::<_,String>(2)?,
            "total": row.get::<_,f64>(3)?,
            "created_at": row.get::<_,String>(4)?,
            "type": "Invoice",
        }))
    }).map_err(|e| e.to_string())?;
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    let mut stmt2 = conn.prepare("SELECT id, order_number, customer_name, total, created_at FROM orders ORDER BY created_at DESC LIMIT 5").map_err(|e| e.to_string())?;
    let rows2 = stmt2.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0)?,
            "number": row.get::<_,String>(1)?,
            "customer_name": row.get::<_,String>(2)?,
            "total": row.get::<_,f64>(3)?,
            "created_at": row.get::<_,String>(4)?,
            "type": "Order",
        }))
    }).map_err(|e| e.to_string())?;
    for r in rows2 { out.push(r.map_err(|e| e.to_string())?); }
    out.sort_by(|a, b| {
        let da = a.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
        let db = b.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
        db.cmp(da)
    });
    out.truncate(5);
    Ok(out)
}

#[tauri::command]
fn generate_pdf(app: tauri::AppHandle, doc_type: String, data: JsonValue) -> Result<String, String> {
    use std::fs::File;
    use std::io::BufWriter;
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    let safe_name = data.get("customer_name").and_then(|v| v.as_str()).unwrap_or("customer")
        .chars().filter(|c| c.is_alphanumeric()).collect::<String>().to_lowercase();
    let doc_number = data.get("number").and_then(|v| v.as_str()).unwrap_or("");
    let safe_number = doc_number.chars().filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-').collect::<String>();
    let file_name = if safe_number.is_empty() {
        format!("{}_{}.pdf", doc_type, safe_name)
    } else {
        format!("{}_{}_{}.pdf", doc_type, safe_name, safe_number)
    };
    let file_path = docs.join(file_name);

    let (doc, page1, layer1) = PdfDocument::new(&format!("{}", doc_type), Mm(210.0), Mm(297.0), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;
    let bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|e| e.to_string())?;
    let layer = doc.get_page(page1).get_layer(layer1);

    let mut y = 280.0;
    layer.use_text("BEFIRST ENERGY SOLUTION", 20.0, Mm(10.0), Mm(y), &bold);
    y -= 8.0;
    layer.use_text("Solar Equipment & Solutions", 10.0, Mm(10.0), Mm(y), &font);
    y -= 12.0;
    let title = if doc_type == "quotation" { "QUOTATION" } else { "INVOICE" };
    layer.use_text(title, 16.0, Mm(10.0), Mm(y), &bold);
    y -= 8.0;
    if !doc_number.is_empty() {
        layer.use_text(&format!("Number: {}", doc_number), 10.0, Mm(10.0), Mm(y), &font);
        y -= 6.0;
    }
    layer.use_text(&format!("Date: {}", chrono::Utc::now().format("%Y-%m-%d")), 10.0, Mm(10.0), Mm(y), &font);
    y -= 10.0;

    layer.use_text("Customer Details:", 12.0, Mm(10.0), Mm(y), &bold);
    y -= 6.0;
    if let Some(name) = data.get("customer_name").and_then(|v| v.as_str()) {
        layer.use_text(&format!("Name: {}", name), 10.0, Mm(10.0), Mm(y), &font);
        y -= 5.0;
    }
    if let Some(phone) = data.get("customer_phone").and_then(|v| v.as_str()) {
        layer.use_text(&format!("Phone: {}", phone), 10.0, Mm(10.0), Mm(y), &font);
        y -= 5.0;
    }
    if let Some(email) = data.get("customer_email").and_then(|v| v.as_str()) {
        layer.use_text(&format!("Email: {}", email), 10.0, Mm(10.0), Mm(y), &font);
        y -= 8.0;
    }

    // header row
    layer.use_text("No.", 10.0, Mm(10.0), Mm(y), &bold);
    layer.use_text("Item", 10.0, Mm(25.0), Mm(y), &bold);
    layer.use_text("Qty", 10.0, Mm(90.0), Mm(y), &bold);
    layer.use_text("Unit Price", 10.0, Mm(110.0), Mm(y), &bold);
    layer.use_text("Total", 10.0, Mm(150.0), Mm(y), &bold);
    y -= 6.0;

    if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
        for (i, item) in items.iter().enumerate() {
            let name = item.get("product_name").or_else(|| item.get("name")).and_then(|v| v.as_str()).unwrap_or("");
            let qty = item.get("quantity").and_then(|v| v.as_i64()).unwrap_or(0);
            let unit = item.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let total = item.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
            layer.use_text(&format!("{}", i + 1), 10.0, Mm(10.0), Mm(y), &font);
            layer.use_text(name, 10.0, Mm(25.0), Mm(y), &font);
            layer.use_text(&format!("{}", qty), 10.0, Mm(90.0), Mm(y), &font);
            layer.use_text(&format!("{:.2}", unit), 10.0, Mm(110.0), Mm(y), &font);
            layer.use_text(&format!("{:.2}", total), 10.0, Mm(150.0), Mm(y), &font);
            y -= 5.0;
        }
    }

    y -= 4.0;
    let subtotal = data.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let tax = data.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let total = data.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    layer.use_text(&format!("Subtotal: {:.2}", subtotal), 10.0, Mm(110.0), Mm(y), &font);
    y -= 5.0;
    layer.use_text(&format!("Tax: {:.2}", tax), 10.0, Mm(110.0), Mm(y), &font);
    y -= 5.0;
    layer.use_text(&format!("Total: {:.2}", total), 12.0, Mm(110.0), Mm(y), &bold);
    y -= 10.0;
    layer.use_text("Thank you for your business!", 10.0, Mm(10.0), Mm(y), &font);

    let file = File::create(&file_path).map_err(|e| e.to_string())?;
    doc.save(&mut BufWriter::new(file)).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("befirst_energy.db");
            let conn = Connection::open(&db_path).expect("open db");
            init_db(&conn);
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_products, get_product, add_product, update_product, delete_product, search_products,
            get_quotations, get_quotation, add_quotation, update_quotation, delete_quotation,
            get_invoices, get_invoice, add_invoice, update_invoice, convert_to_invoice,
            get_orders, get_order, add_order, update_order, update_order_status, convert_order_to_invoice,
            get_dashboard_stats, get_low_stock_products, get_recent_transactions,
            generate_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
