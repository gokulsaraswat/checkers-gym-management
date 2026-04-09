export const POS_CATEGORY_OPTIONS = [
  { value: 'supplement', label: 'Supplement' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'service', label: 'Service' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'other', label: 'Other' },
];

export const POS_PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

export const STOCK_MOVEMENT_OPTIONS = [
  { value: 'purchase', label: 'Purchase / restock' },
  { value: 'adjustment', label: 'Manual adjustment' },
  { value: 'damage', label: 'Damage / shrinkage' },
  { value: 'return', label: 'Customer return' },
  { value: 'correction', label: 'Correction' },
];

export const createInventoryForm = () => ({
  id: '',
  sku: '',
  name: '',
  category: 'supplement',
  description: '',
  unit_price: '',
  cost_price: '',
  reorder_level: '',
  opening_stock: '',
  is_stock_tracked: true,
  is_active: true,
});

export const createAdjustmentForm = () => ({
  inventoryItemId: '',
  quantityDelta: '',
  movementType: 'purchase',
  referenceNote: '',
});

export const createSaleLine = (inventoryItemId = '') => ({
  inventory_item_id: inventoryItemId,
  quantity: 1,
});

export const createSaleForm = () => ({
  customerId: '',
  customerName: '',
  customerEmail: '',
  paymentMethod: 'cash',
  discountAmount: '',
  taxAmount: '',
  notes: '',
  items: [createSaleLine()],
});

export const getCategoryLabel = (value) => (
  POS_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || 'Other'
);

export const getPaymentMethodLabel = (value) => (
  POS_PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label || 'Other'
);

export const getMovementLabel = (value) => (
  STOCK_MOVEMENT_OPTIONS.find((option) => option.value === value)?.label || 'Manual'
);

export const formatCurrency = (value, currency = 'INR') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const isLowStock = (item) => (
  Boolean(item?.is_stock_tracked)
  && Number(item?.reorder_level || 0) > 0
  && Number(item?.current_stock || 0) <= Number(item?.reorder_level || 0)
);

export const getInventoryStatusChipSx = (item) => {
  if (!item?.is_active) return { bgcolor: '#f3f4f6', color: '#4b5563', fontWeight: 700 };
  if (!item?.is_stock_tracked) return { bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 };
  if (isLowStock(item)) return { bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 };
  return { bgcolor: '#ecfdf3', color: '#166534', fontWeight: 700 };
};

export const getInventoryStatusLabel = (item) => {
  if (!item?.is_active) return 'Inactive';
  if (!item?.is_stock_tracked) return 'Service';
  if (isLowStock(item)) return 'Low stock';
  return 'In stock';
};

export const summariseSaleItems = (items = [], limit = 3) => {
  const list = (items || []).filter(Boolean).map((item) => `${item.item_name} × ${item.quantity}`);
  if (!list.length) return '—';
  if (list.length <= limit) return list.join(', ');
  return `${list.slice(0, limit).join(', ')} +${list.length - limit} more`;
};

export const buildSaleDraftTotals = (draftItems = [], inventoryItems = [], discountAmount = 0, taxAmount = 0) => {
  const inventoryMap = new Map((inventoryItems || []).map((item) => [item.id, item]));
  const subtotal = draftItems.reduce((sum, line) => {
    const inventoryItem = inventoryMap.get(line.inventory_item_id);
    const quantity = Math.max(1, Number(line.quantity || 1));
    return sum + (quantity * Number(inventoryItem?.unit_price || 0));
  }, 0);
  const discount = Math.max(0, Number(discountAmount || 0));
  const tax = Math.max(0, Number(taxAmount || 0));
  return { subtotal, discount, tax, total: Math.max(0, subtotal + tax - discount) };
};

export const buildPosSummary = ({ inventoryItems = [], sales = [] } = {}) => {
  const activeItems = (inventoryItems || []).filter((item) => item.is_active);
  const stockTrackedItems = activeItems.filter((item) => item.is_stock_tracked);
  const lowStockItems = stockTrackedItems.filter(isLowStock);
  const stockValue = stockTrackedItems.reduce((sum, item) => sum + (Number(item.current_stock || 0) * Number(item.cost_price || 0)), 0);
  const totalSales = (sales || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const totalItemsSold = (sales || []).reduce(
    (sum, sale) => sum + (sale.items || []).reduce((itemSum, line) => itemSum + Number(line.quantity || 0), 0),
    0,
  );
  return {
    activeItemCount: activeItems.length,
    stockTrackedCount: stockTrackedItems.length,
    lowStockCount: lowStockItems.length,
    stockValue,
    totalSales,
    totalItemsSold,
  };
};

export const getDefaultCustomerName = (member) => member?.full_name || member?.email || '';
export const getDefaultCustomerEmail = (member) => member?.email || '';
