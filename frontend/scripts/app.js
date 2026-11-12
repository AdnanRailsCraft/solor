// BEFIRST ENERGY SOLUTION - Main Application Script

// Global state
let currentPage = 'dashboard';
let products = [];
let quotations = [];
let invoices = [];
let orders = [];

// Current items for forms
let quotationItems = [];
let invoiceItems = [];
let orderItems = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Set current date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Setup navigation
    setupNavigation();

    // Setup modals
    setupModals();

    // Setup form handlers
    setupFormHandlers();

    // Load initial data
    await loadDashboardData();

    // Show dashboard
    showPage('dashboard');
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        });
    }
}

function showPage(page) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.classList.remove('hidden');
        pageElement.classList.add('active');
    }

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        inventory: 'Inventory',
        quotations: 'Quotations',
        invoices: 'Invoices',
        orders: 'Orders'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'inventory':
            loadInventoryData();
            break;
        case 'quotations':
            loadQuotationsData();
            break;
        case 'invoices':
            loadInvoicesData();
            break;
        case 'orders':
            loadOrdersData();
            break;
    }

    currentPage = page;

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

// Modals
function setupModals() {
    // Close buttons
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.dataset.modal;
            if (modalId) {
                closeModal(modalId);
            }
        });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Add Product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openProductModal();
    });

    // Add Quotation button
    document.getElementById('addQuotationBtn').addEventListener('click', () => {
        openQuotationModal();
    });

    // Add Invoice button
    document.getElementById('addInvoiceBtn').addEventListener('click', () => {
        openInvoiceModal();
    });

    // Add Order button
    document.getElementById('addOrderBtn').addEventListener('click', () => {
        openOrderModal();
    });

    // Product search
    document.getElementById('productSearch').addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Form Handlers
function setupFormHandlers() {
    // Product form
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });

    // Quotation form
    document.getElementById('quotationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveQuotation();
    });

    // Invoice form
    document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveInvoice();
    });

    // Order form
    document.getElementById('orderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveOrder();
    });

    // Quotation product add
    document.getElementById('addItemBtn').addEventListener('click', () => {
        addQuotationItem();
    });

    // Invoice product add
    document.getElementById('invoiceAddItemBtn').addEventListener('click', () => {
        addInvoiceItem();
    });

    // Order product add
    document.getElementById('orderAddItemBtn').addEventListener('click', () => {
        addOrderItem();
    });

    // Tax rate changes
    document.getElementById('quotationTaxRate').addEventListener('input', () => {
        updateQuotationTotals();
    });

    document.getElementById('invoiceTaxRate').addEventListener('input', () => {
        updateInvoiceTotals();
    });

    // Custom Product Field Logic
    setupMutualExclusion('productSelect', 'customProductName', 'customProductPrice');
    setupMutualExclusion('invoiceProductSelect', 'invoiceCustomProductName', 'invoiceCustomProductPrice');
    setupMutualExclusion('orderProductSelect', 'orderCustomProductName', 'orderCustomProductPrice');
}

function setupMutualExclusion(selectId, nameInputId, priceInputId) {
    const select = document.getElementById(selectId);
    const nameInput = document.getElementById(nameInputId);
    const priceInput = document.getElementById(priceInputId);

    if (!select || !nameInput || !priceInput) return;

    // When select changes
    select.addEventListener('change', () => {
        if (select.value !== '') {
            nameInput.disabled = true;
            priceInput.disabled = true;
            nameInput.value = '';
            priceInput.value = '';
        } else {
            nameInput.disabled = false;
            priceInput.disabled = false;
        }
    });

    // When custom name changes
    nameInput.addEventListener('input', () => {
        if (nameInput.value.trim() !== '') {
            select.disabled = true;
            select.value = '';
        } else {
            select.disabled = false;
        }
    });
}

// Dashboard
async function loadDashboardData() {
    try {
        const stats = await window.electronAPI.getDashboardStats();
        
        document.getElementById('totalProducts').textContent = stats.totalProducts;
        document.getElementById('lowStockCount').textContent = stats.lowStockCount;
        document.getElementById('totalSales').textContent = '$' + stats.totalSales.toFixed(2);
        document.getElementById('pendingOrders').textContent = stats.pendingOrders;

        // Load low stock items
        const lowStock = await window.electronAPI.getLowStockProducts();
        renderLowStockTable(lowStock);

        // Load recent transactions
        const recent = await window.electronAPI.getRecentTransactions();
        renderRecentTransactions(recent);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function renderLowStockTable(items) {
    const tbody = document.getElementById('lowStockTable');
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No low stock items</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr class="low-stock">
            <td><i class="ph ph-package"></i> ${item.name}</td>
            <td><span class="badge badge-secondary">${item.category}</span></td>
            <td><span class="badge badge-warning">${item.quantity}</span></td>
        </tr>
    `).join('');
}

function renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recentTransactions');
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No recent transactions</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const typeIcon = t.type === 'Invoice' ? 'ph-receipt' : 'ph-shopping-cart';
        const typeBadge = t.type === 'Invoice' ? 'badge-primary' : 'badge-accent';
        return `
            <tr>
                <td><span class="badge ${typeBadge}"><i class="ph ${typeIcon}"></i> ${t.type}</span></td>
                <td>${t.number}</td>
                <td>${t.customer_name}</td>
                <td>$${t.total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

// Inventory
async function loadInventoryData() {
    try {
        products = await window.electronAPI.getProducts();
        renderProductTable(products);
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Error loading inventory', 'error');
    }
}

function renderProductTable(items) {
    const tbody = document.getElementById('productTable');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(product => {
        const quantityClass = product.quantity < 5 ? 'low-stock' : '';
        return `
            <tr class="${quantityClass}">
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>$${product.cost_price.toFixed(2)}</td>
                <td>$${product.selling_price.toFixed(2)}</td>
                <td>${product.quantity < 5 ? '<span class="badge badge-warning">' + product.quantity + '</span>' : product.quantity}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editProduct(${product.id})">
                            <i class="ph ph-pencil-simple"></i> Edit
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct(${product.id})">
                            <i class="ph ph-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function searchProducts(term) {
    if (!term) {
        renderProductTable(products);
        return;
    }
    
    try {
        const results = await window.electronAPI.searchProducts(term);
        renderProductTable(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

function openProductModal(product = null) {
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('costPrice').value = product.cost_price;
        document.getElementById('sellingPrice').value = product.selling_price;
        document.getElementById('productQuantity').value = product.quantity;
    } else {
        title.textContent = 'Add Product';
        form.reset();
        document.getElementById('productId').value = '';
    }
    
    openModal('productModal');
}

async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const product = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        cost_price: parseFloat(document.getElementById('costPrice').value),
        selling_price: parseFloat(document.getElementById('sellingPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value)
    };

    try {
        if (productId) {
            await window.electronAPI.updateProduct(parseInt(productId), product);
            showToast('Product updated successfully', 'success');
        } else {
            await window.electronAPI.addProduct(product);
            showToast('Product added successfully', 'success');
        }
        
        closeModal('productModal');
        loadInventoryData();
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error saving product', 'error');
    }
}

async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await window.electronAPI.deleteProduct(id);
            showToast('Product deleted successfully', 'success');
            loadInventoryData();
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Error deleting product', 'error');
        }
    }
}

// Quotations
async function loadQuotationsData() {
    try {
        quotations = await window.electronAPI.getQuotations();
        renderQuotationTable(quotations);
    } catch (error) {
        console.error('Error loading quotations:', error);
        showToast('Error loading quotations', 'error');
    }
}

function renderQuotationTable(items) {
    const tbody = document.getElementById('quotationTable');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No quotations found</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(q => `
        <tr>
            <td>${q.id}</td>
            <td>${q.customer_name}</td>
            <td>${new Date(q.created_at).toLocaleDateString()}</td>
            <td>$${q.total.toFixed(2)}</td>
            <td><span class="status-badge ${q.status.toLowerCase().replace(' ', '-')}">${q.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewQuotation(${q.id})">
                        <i class="ph ph-eye"></i> View
                    </button>
                    <button class="action-btn convert" onclick="convertQuotation(${q.id})" ${q.status === 'Converted to Invoice' ? 'disabled' : ''}>
                        <i class="ph ph-receipt"></i> Invoice
                    </button>
                    <button class="action-btn delete" onclick="deleteQuotation(${q.id})">
                        <i class="ph ph-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openQuotationModal(quotation = null) {
    const title = document.getElementById('quotationModalTitle');
    const form = document.getElementById('quotationForm');
    
    // Reset form
    form.reset();
    document.getElementById('quotationId').value = '';
    quotationItems = [];
    renderQuotationItems();
    
    // Load products for selector
    loadProductSelectors('productSelect');
    
    if (quotation) {
        title.textContent = 'Edit Quotation';
        document.getElementById('quotationId').value = quotation.id;
        document.getElementById('customerName').value = quotation.customer_name;
        document.getElementById('customerPhone').value = quotation.customer_phone || '';
        document.getElementById('customerEmail').value = quotation.customer_email || '';
        document.getElementById('quotationTaxRate').value = ((quotation.tax / quotation.subtotal) * 100).toFixed(1);
        
        const items = JSON.parse(quotation.items);
        quotationItems = items.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            total: item.total
        }));
        renderQuotationItems();
    } else {
        title.textContent = 'New Quotation';
    }
    
    openModal('quotationModal');
}

function loadProductSelectors(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select a product</option>' +
        products.map(p => `<option value="${p.id}" data-name="${p.name}" data-price="${p.selling_price}">${p.name} - $${p.selling_price.toFixed(2)}</option>`).join('');
}

function addQuotationItem() {
    const select = document.getElementById('productSelect');
    const customNameInput = document.getElementById('customProductName');
    const customPriceInput = document.getElementById('customProductPrice');
    const quantityInput = document.getElementById('itemQuantity');
    const quantity = parseInt(quantityInput.value);
    
    let item;
    
    // Check if custom product is entered
    if (customNameInput.value.trim() !== '') {
        const customName = customNameInput.value.trim();
        const customPrice = parseFloat(customPriceInput.value) || 0;
        
        item = {
            product_id: null, // No ID for custom product
            name: customName,
            unit_price: customPrice,
            quantity: quantity,
            total: customPrice * quantity
        };
    } else {
        const option = select.options[select.selectedIndex];
        if (!option.value) {
            showToast('Please select a product or enter a custom one', 'warning');
            return;
        }
        
        const product = products.find(p => p.id === parseInt(option.value));
        if (!product) return;
        
        item = {
            product_id: product.id,
            name: product.name,
            unit_price: product.selling_price,
            quantity: quantity,
            total: product.selling_price * quantity
        };
    }
    
    quotationItems.push(item);
    renderQuotationItems();
    
    // Reset inputs
    select.value = '';
    customNameInput.value = '';
    customPriceInput.value = '';
    quantityInput.value = 1;
    
    // Re-enable inputs
    select.disabled = false;
    customNameInput.disabled = false;
    customPriceInput.disabled = false;
}

function renderQuotationItems() {
    const tbody = document.getElementById('quotationItems');
    
    if (quotationItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No items added</td></tr>';
        updateQuotationTotals();
        return;
    }
    
    tbody.innerHTML = quotationItems.map((item, index) => `
        <tr>
            <td>${item.name}</td>
            <td>$${item.unit_price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${item.total.toFixed(2)}</td>
            <td><button class="action-btn delete" onclick="removeQuotationItem(${index})"><i class="ph ph-trash"></i> Remove</button></td>
        </tr>
    `).join('');
    
    updateQuotationTotals();
}

function removeQuotationItem(index) {
    quotationItems.splice(index, 1);
    renderQuotationItems();
}

function updateQuotationTotals() {
    const subtotal = quotationItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('quotationTaxRate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    document.getElementById('quotationSubtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('quotationTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('quotationTotal').textContent = '$' + total.toFixed(2);
}

async function saveQuotation() {
    if (quotationItems.length === 0) {
        showToast('Please add at least one product', 'warning');
        return;
    }
    
    const subtotal = quotationItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('quotationTaxRate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    const quotation = {
        customer_name: document.getElementById('customerName').value,
        customer_phone: document.getElementById('customerPhone').value,
        customer_email: document.getElementById('customerEmail').value,
        items: quotationItems.map(item => ({
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        status: 'Pending'
    };

    try {
        const quotationId = document.getElementById('quotationId').value;
        if (quotationId) {
            await window.electronAPI.updateQuotation(parseInt(quotationId), quotation);
            showToast('Quotation updated successfully', 'success');
        } else {
            await window.electronAPI.addQuotation(quotation);
            showToast('Quotation created successfully', 'success');
        }
        
        closeModal('quotationModal');
        loadQuotationsData();
    } catch (error) {
        console.error('Error saving quotation:', error);
        // Extract message from error if it's an Error object (from IPC)
        const errorMsg = error.message ? error.message.replace('Error invoking remote method \'quotation:add\': ', '').replace('Error invoking remote method \'quotation:update\': ', '') : 'Error saving quotation';
        showToast(errorMsg, 'error');
    }
}

async function viewQuotation(id) {
    const quotation = quotations.find(q => q.id === id);
    if (quotation) {
        openQuotationModal(quotation);
    }
}

async function convertQuotation(id) {
    try {
        const result = await window.electronAPI.convertToInvoice(id);
        showToast('Converted to Invoice: ' + result.invoice_number, 'success');
        loadQuotationsData();
        loadInvoicesData();
    } catch (error) {
        console.error('Error converting quotation:', error);
        const errorMsg = error.message ? error.message.replace('Error invoking remote method \'invoice:convert\': ', '') : 'Error converting quotation';
        showToast(errorMsg, 'error');
    }
}

async function deleteQuotation(id) {
    if (confirm('Are you sure you want to delete this quotation?')) {
        try {
            await window.electronAPI.deleteQuotation(id);
            showToast('Quotation deleted successfully', 'success');
            loadQuotationsData();
        } catch (error) {
            console.error('Error deleting quotation:', error);
            showToast('Error deleting quotation', 'error');
        }
    }
}

// Invoices
async function loadInvoicesData() {
    try {
        invoices = await window.electronAPI.getInvoices();
        renderInvoiceTable(invoices);
    } catch (error) {
        console.error('Error loading invoices:', error);
        showToast('Error loading invoices', 'error');
    }
}

function renderInvoiceTable(items) {
    const tbody = document.getElementById('invoiceTable');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No invoices found</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(inv => `
        <tr>
            <td>${inv.invoice_number}</td>
            <td>${inv.customer_name}</td>
            <td>${new Date(inv.created_at).toLocaleDateString()}</td>
            <td>$${inv.total.toFixed(2)}</td>
            <td><span class="status-badge ${inv.status.toLowerCase()}">${inv.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="printInvoice(${inv.id})">
                        <i class="ph ph-printer"></i> Print
                    </button>
                    <button class="action-btn edit" onclick="markInvoicePaid(${inv.id})" ${inv.status === 'Paid' ? 'disabled' : ''}>
                        <i class="ph ph-check-circle"></i> Paid
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openInvoiceModal(invoice = null) {
    const title = document.getElementById('invoiceModalTitle');
    const form = document.getElementById('invoiceForm');
    
    form.reset();
    document.getElementById('invoiceId').value = '';
    invoiceItems = [];
    renderInvoiceItems();
    
    loadProductSelectors('invoiceProductSelect');
    
    if (invoice) {
        title.textContent = 'Edit Invoice';
        document.getElementById('invoiceId').value = invoice.id;
        document.getElementById('invoiceCustomerName').value = invoice.customer_name;
        document.getElementById('invoiceCustomerPhone').value = invoice.customer_phone || '';
        document.getElementById('invoiceCustomerEmail').value = invoice.customer_email || '';
        document.getElementById('invoiceTaxRate').value = ((invoice.tax / invoice.subtotal) * 100).toFixed(1);
        
        const items = JSON.parse(invoice.items);
        invoiceItems = items.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            total: item.total
        }));
        renderInvoiceItems();
    } else {
        title.textContent = 'New Invoice';
    }
    
    openModal('invoiceModal');
}

function addInvoiceItem() {
    const select = document.getElementById('invoiceProductSelect');
    const customNameInput = document.getElementById('invoiceCustomProductName');
    const customPriceInput = document.getElementById('invoiceCustomProductPrice');
    const quantityInput = document.getElementById('invoiceItemQuantity');
    const quantity = parseInt(quantityInput.value);
    
    let item;
    
    // Check if custom product is entered
    if (customNameInput.value.trim() !== '') {
        const customName = customNameInput.value.trim();
        const customPrice = parseFloat(customPriceInput.value) || 0;
        
        item = {
            product_id: null,
            name: customName,
            unit_price: customPrice,
            quantity: quantity,
            total: customPrice * quantity
        };
    } else {
        const option = select.options[select.selectedIndex];
        if (!option.value) {
            showToast('Please select a product or enter a custom one', 'warning');
            return;
        }
        
        const product = products.find(p => p.id === parseInt(option.value));
        if (!product) return;
        
        item = {
            product_id: product.id,
            name: product.name,
            unit_price: product.selling_price,
            quantity: quantity,
            total: product.selling_price * quantity
        };
    }
    
    invoiceItems.push(item);
    renderInvoiceItems();
    
    // Reset inputs
    select.value = '';
    customNameInput.value = '';
    customPriceInput.value = '';
    quantityInput.value = 1;

    // Re-enable inputs
    select.disabled = false;
    customNameInput.disabled = false;
    customPriceInput.disabled = false;
}

function renderInvoiceItems() {
    const tbody = document.getElementById('invoiceItems');
    
    if (invoiceItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No items added</td></tr>';
        updateInvoiceTotals();
        return;
    }
    
    tbody.innerHTML = invoiceItems.map((item, index) => `
        <tr>
            <td>${item.name}</td>
            <td>$${item.unit_price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${item.total.toFixed(2)}</td>
            <td><button class="action-btn delete" onclick="removeInvoiceItem(${index})"><i class="ph ph-trash"></i> Remove</button></td>
        </tr>
    `).join('');
    
    updateInvoiceTotals();
}

function removeInvoiceItem(index) {
    invoiceItems.splice(index, 1);
    renderInvoiceItems();
}

function updateInvoiceTotals() {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('invoiceTaxRate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    document.getElementById('invoiceSubtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('invoiceTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('invoiceTotal').textContent = '$' + total.toFixed(2);
}

async function saveInvoice() {
    if (invoiceItems.length === 0) {
        showToast('Please add at least one product', 'warning');
        return;
    }
    
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('invoiceTaxRate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    const invoice = {
        customer_name: document.getElementById('invoiceCustomerName').value,
        customer_phone: document.getElementById('invoiceCustomerPhone').value,
        customer_email: document.getElementById('invoiceCustomerEmail').value,
        items: invoiceItems.map(item => ({
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        status: 'Pending'
    };

    try {
        const invoiceId = document.getElementById('invoiceId').value;
        if (invoiceId) {
            await window.electronAPI.updateInvoice(parseInt(invoiceId), invoice);
            showToast('Invoice updated successfully', 'success');
        } else {
            await window.electronAPI.addInvoice(invoice);
            showToast('Invoice created successfully', 'success');
        }
        
        closeModal('invoiceModal');
        loadInvoicesData();
    } catch (error) {
        console.error('Error saving invoice:', error);
        const errorMsg = error.message ? error.message.replace('Error invoking remote method \'invoice:add\': ', '').replace('Error invoking remote method \'invoice:update\': ', '') : 'Error saving invoice';
        showToast(errorMsg, 'error');
    }
}

async function printInvoice(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    
    try {
        const data = {
            number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            items: JSON.parse(invoice.items),
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total
        };
        
        const filePath = await window.electronAPI.generatePDF('invoice', data);
        showToast('PDF generated: ' + filePath, 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error generating PDF', 'error');
    }
}

async function markInvoicePaid(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    
    try {
        await window.electronAPI.updateInvoice(id, { ...invoice, status: 'Paid' });
        showToast('Invoice marked as Paid', 'success');
        loadInvoicesData();
    } catch (error) {
        console.error('Error updating invoice:', error);
        showToast('Error updating invoice', 'error');
    }
}

// Orders
async function loadOrdersData() {
    try {
        orders = await window.electronAPI.getOrders();
        renderOrderTable(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error loading orders', 'error');
    }
}

function renderOrderTable(items) {
    const tbody = document.getElementById('orderTable');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.customer_name}</td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>$${order.total.toFixed(2)}</td>
            <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="toggleOrderStatus(${order.id}, '${order.status}')" title="${order.status === 'Pending' ? 'Mark as Completed' : 'Mark as Pending'}">
                        <i class="ph ${order.status === 'Pending' ? 'ph-check-circle' : 'ph-clock'}"></i> ${order.status === 'Pending' ? 'Complete' : 'Pending'}
                    </button>
                    <button class="action-btn convert" onclick="convertToInvoiceFromOrder(${order.id})" ${order.status === 'Completed' ? 'disabled' : ''} title="Generate Invoice">
                        <i class="ph ph-receipt"></i> Generate Invoice
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openOrderModal(order = null) {
    const title = document.getElementById('orderModalTitle');
    const form = document.getElementById('orderForm');
    
    form.reset();
    document.getElementById('orderId').value = '';
    orderItems = [];
    renderOrderItems();
    
    loadProductSelectors('orderProductSelect');
    
    if (order) {
        title.textContent = 'Edit Order';
        document.getElementById('orderId').value = order.id;
        document.getElementById('orderCustomerName').value = order.customer_name;
        
        const items = JSON.parse(order.items);
        orderItems = items.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            total: item.total
        }));
        renderOrderItems();
    } else {
        title.textContent = 'New Order';
    }
    
    openModal('orderModal');
}

function addOrderItem() {
    const select = document.getElementById('orderProductSelect');
    const customNameInput = document.getElementById('orderCustomProductName');
    const customPriceInput = document.getElementById('orderCustomProductPrice');
    const quantityInput = document.getElementById('orderItemQuantity');
    const quantity = parseInt(quantityInput.value);
    
    let item;
    
    // Check if custom product is entered
    if (customNameInput.value.trim() !== '') {
        const customName = customNameInput.value.trim();
        const customPrice = parseFloat(customPriceInput.value) || 0;
        
        item = {
            product_id: null,
            name: customName,
            unit_price: customPrice,
            quantity: quantity,
            total: customPrice * quantity
        };
    } else {
        const option = select.options[select.selectedIndex];
        if (!option.value) {
            showToast('Please select a product or enter a custom one', 'warning');
            return;
        }
        
        const product = products.find(p => p.id === parseInt(option.value));
        if (!product) return;
        
        item = {
            product_id: product.id,
            name: product.name,
            unit_price: product.selling_price,
            quantity: quantity,
            total: product.selling_price * quantity
        };
    }
    
    orderItems.push(item);
    renderOrderItems();
    
    // Reset inputs
    select.value = '';
    customNameInput.value = '';
    customPriceInput.value = '';
    quantityInput.value = 1;

    // Re-enable inputs
    select.disabled = false;
    customNameInput.disabled = false;
    customPriceInput.disabled = false;
}

function renderOrderItems() {
    const tbody = document.getElementById('orderItems');
    
    if (orderItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No items added</td></tr>';
        updateOrderTotals();
        return;
    }
    
    tbody.innerHTML = orderItems.map((item, index) => `
        <tr>
            <td>${item.name}</td>
            <td>$${item.unit_price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${item.total.toFixed(2)}</td>
            <td><button class="action-btn delete" onclick="removeOrderItem(${index})"><i class="ph ph-trash"></i> Remove</button></td>
        </tr>
    `).join('');
    
    updateOrderTotals();
}

function removeOrderItem(index) {
    orderItems.splice(index, 1);
    renderOrderItems();
}

function updateOrderTotals() {
    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('orderTotal').textContent = '$' + total.toFixed(2);
}

async function saveOrder() {
    if (orderItems.length === 0) {
        showToast('Please add at least one product', 'warning');
        return;
    }
    
    const order = {
        customer_name: document.getElementById('orderCustomerName').value,
        items: orderItems.map(item => ({
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
        })),
        total: orderItems.reduce((sum, item) => sum + item.total, 0),
        status: 'Pending'
    };

    try {
        const orderId = document.getElementById('orderId').value;
        if (orderId) {
            await window.electronAPI.updateOrder(parseInt(orderId), order);
            showToast('Order updated successfully', 'success');
        } else {
            await window.electronAPI.addOrder(order);
            showToast('Order created successfully', 'success');
        }
        
        closeModal('orderModal');
        loadOrdersData();
    } catch (error) {
        console.error('Error saving order:', error);
        showToast('Error saving order', 'error');
    }
}

async function toggleOrderStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    
    try {
        await window.electronAPI.updateOrderStatus(id, newStatus);
        showToast('Order status updated', 'success');
        loadOrdersData();
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Error updating order', 'error');
    }
}

async function convertToInvoiceFromOrder(id) {
    try {
        const result = await window.electronAPI.convertToInvoiceFromOrder(id);
        showToast('Converted to Invoice: ' + result.invoice_number, 'success');
        loadOrdersData();
        loadInvoicesData();
    } catch (error) {
        console.error('Error converting order:', error);
        const errorMsg = error.message ? error.message.replace('Error invoking remote method \'order:convertToInvoice\': ', '') : 'Error converting order';
        showToast(errorMsg, 'error');
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make functions globally available
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.viewQuotation = viewQuotation;
window.convertQuotation = convertQuotation;
window.deleteQuotation = deleteQuotation;
window.printInvoice = printInvoice;
window.markInvoicePaid = markInvoicePaid;
window.toggleOrderStatus = toggleOrderStatus;
window.convertToInvoiceFromOrder = convertToInvoiceFromOrder;
window.removeQuotationItem = removeQuotationItem;
window.removeInvoiceItem = removeInvoiceItem;
window.removeOrderItem = removeOrderItem;