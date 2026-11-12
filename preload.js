const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Database operations
    runQuery: (query, params) => ipcRenderer.invoke('db:run', query, params),
    getAll: (query, params) => ipcRenderer.invoke('db:all', query, params),
    getOne: (query, params) => ipcRenderer.invoke('db:get', query, params),
    
    // Product operations
    getProducts: () => ipcRenderer.invoke('product:getAll'),
    getProduct: (id) => ipcRenderer.invoke('product:get', id),
    addProduct: (product) => ipcRenderer.invoke('product:add', product),
    updateProduct: (id, product) => ipcRenderer.invoke('product:update', id, product),
    deleteProduct: (id) => ipcRenderer.invoke('product:delete', id),
    searchProducts: (term) => ipcRenderer.invoke('product:search', term),
    
    // Quotation operations
    getQuotations: () => ipcRenderer.invoke('quotation:getAll'),
    getQuotation: (id) => ipcRenderer.invoke('quotation:get', id),
    addQuotation: (quotation) => ipcRenderer.invoke('quotation:add', quotation),
    updateQuotation: (id, quotation) => ipcRenderer.invoke('quotation:update', id, quotation),
    deleteQuotation: (id) => ipcRenderer.invoke('quotation:delete', id),
    
    // Invoice operations
    getInvoices: () => ipcRenderer.invoke('invoice:getAll'),
    getInvoice: (id) => ipcRenderer.invoke('invoice:get', id),
    addInvoice: (invoice) => ipcRenderer.invoke('invoice:add', invoice),
    updateInvoice: (id, invoice) => ipcRenderer.invoke('invoice:update', id, invoice),
    convertToInvoice: (quotationId) => ipcRenderer.invoke('invoice:convert', quotationId),
    
    // Order operations
    getOrders: () => ipcRenderer.invoke('order:getAll'),
    getOrder: (id) => ipcRenderer.invoke('order:get', id),
    addOrder: (order) => ipcRenderer.invoke('order:add', order),
    updateOrder: (id, order) => ipcRenderer.invoke('order:update', id, order),
    updateOrderStatus: (id, status) => ipcRenderer.invoke('order:updateStatus', id, status),
    convertToInvoiceFromOrder: (orderId) => ipcRenderer.invoke('order:convertToInvoice', orderId),
    
    // Dashboard operations
    getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getLowStockProducts: () => ipcRenderer.invoke('dashboard:getLowStock'),
    getRecentTransactions: () => ipcRenderer.invoke('dashboard:getRecent'),
    
    // PDF operations
    generatePDF: (type, data) => ipcRenderer.invoke('pdf:generate', type, data),
    
    // Window operations
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close')
});