(function () {
  if (window.electronAPI) return; // Electron preload already provided it
  if (!window.__TAURI__) return; // Not running under Tauri
  const invoke = window.__TAURI__.core.invoke;
  const win = window.__TAURI__.window.getCurrentWindow();
  window.electronAPI = {
    getProducts: () => invoke('get_products'),
    getProduct: (id) => invoke('get_product', { id }),
    addProduct: (product) => invoke('add_product', { product }),
    updateProduct: (id, product) => invoke('update_product', { id, product }),
    deleteProduct: (id) => invoke('delete_product', { id }),
    searchProducts: (term) => invoke('search_products', { term }),
    getQuotations: () => invoke('get_quotations'),
    getQuotation: (id) => invoke('get_quotation', { id }),
    addQuotation: (quotation) => invoke('add_quotation', { quotation }),
    updateQuotation: (id, quotation) => invoke('update_quotation', { id, quotation }),
    deleteQuotation: (id) => invoke('delete_quotation', { id }),
    getInvoices: () => invoke('get_invoices'),
    getInvoice: (id) => invoke('get_invoice', { id }),
    addInvoice: (invoice) => invoke('add_invoice', { invoice }),
    updateInvoice: (id, invoice) => invoke('update_invoice', { id, invoice }),
    convertToInvoice: (quotationId) => invoke('convert_to_invoice', { quotation_id: quotationId }),
    getOrders: () => invoke('get_orders'),
    getOrder: (id) => invoke('get_order', { id }),
    addOrder: (order) => invoke('add_order', { order }),
    updateOrder: (id, order) => invoke('update_order', { id, order }),
    updateOrderStatus: (id, status) => invoke('update_order_status', { id, status }),
    convertToInvoiceFromOrder: (orderId) => invoke('convert_order_to_invoice', { order_id: orderId }),
    getDashboardStats: () => invoke('get_dashboard_stats'),
    getLowStockProducts: () => invoke('get_low_stock_products'),
    getRecentTransactions: () => invoke('get_recent_transactions'),
    generatePDF: (type, data) => invoke('generate_pdf', { doc_type: type, data }),
    minimizeWindow: () => win.minimize(),
    maximizeWindow: () => win.toggleMaximize(),
    closeWindow: () => win.close(),
  };
})();
