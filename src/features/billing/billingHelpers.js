const createClientKey = (prefix = 'billing') => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

export const BILLING_PROFILE_METHOD_OPTIONS = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'wallet', label: 'Digital wallet' },
  { value: 'other', label: 'Other' },
];

export const INVOICE_TYPE_OPTIONS = [
  { value: 'membership_renewal', label: 'Membership renewal' },
  { value: 'drop_in', label: 'Drop-in visit' },
  { value: 'class_pack', label: 'Class pack' },
  { value: 'pt_package', label: 'Personal training' },
  { value: 'retail', label: 'Retail / POS' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'manual', label: 'Manual invoice' },
];

export const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
  { value: 'refunded', label: 'Refunded' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'wallet', label: 'Digital wallet' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

const INVOICE_STATUS_META = {
  draft: { label: 'Draft', background: '#eff6ff', color: '#1d4ed8' },
  open: { label: 'Open', background: '#fff7ed', color: '#c2410c' },
  partial: { label: 'Partial', background: '#fef3c7', color: '#92400e' },
  paid: { label: 'Paid', background: '#ecfdf3', color: '#047857' },
  overdue: { label: 'Overdue', background: '#fef2f2', color: '#b91c1c' },
  void: { label: 'Void', background: '#f8fafc', color: '#475569' },
  refunded: { label: 'Refunded', background: '#eef2ff', color: '#4338ca' },
};

const PAYMENT_STATUS_META = {
  pending: { label: 'Pending', background: '#eff6ff', color: '#1d4ed8' },
  completed: { label: 'Completed', background: '#ecfdf3', color: '#047857' },
  failed: { label: 'Failed', background: '#fef2f2', color: '#b91c1c' },
  refunded: { label: 'Refunded', background: '#eef2ff', color: '#4338ca' },
  cancelled: { label: 'Cancelled', background: '#f8fafc', color: '#475569' },
};

const getMetaSx = (meta) => ({
  bgcolor: meta.background,
  color: meta.color,
  fontWeight: 700,
});

export const getInvoiceStatusMeta = (status) => (
  INVOICE_STATUS_META[status] || INVOICE_STATUS_META.open
);
export const getInvoiceStatusChipSx = (status) => getMetaSx(getInvoiceStatusMeta(status));

export const getPaymentStatusMeta = (status) => (
  PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.pending
);
export const getPaymentStatusChipSx = (status) => getMetaSx(getPaymentStatusMeta(status));

export const getPaymentMethodLabel = (method) => (
  PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label
  || BILLING_PROFILE_METHOD_OPTIONS.find((option) => option.value === method)?.label
  || 'Not set'
);

export const getInvoiceTypeLabel = (invoiceType) => (
  INVOICE_TYPE_OPTIONS.find((option) => option.value === invoiceType)?.label || 'Invoice'
);

const normaliseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const nextValue = value.includes?.('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(nextValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatBillingDate = (value, fallback = 'Not set') => {
  const parsed = normaliseDateValue(value);

  if (!parsed) {
    return fallback;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatCurrency = (value, currencyCode = 'INR') => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${currencyCode || 'INR'} ${amount.toFixed(2)}`;
  }
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildSortKey = (primaryValue, secondaryValue = '') => `${primaryValue || ''}${secondaryValue || ''}`;

export const sortBillingPayments = (rows = []) => [...rows].sort((left, right) => (
  buildSortKey(right?.payment_date, right?.created_at).localeCompare(
    buildSortKey(left?.payment_date, left?.created_at),
  )
));

export const sortBillingInvoices = (rows = []) => [...rows]
  .map((row) => ({
    ...row,
    items: [...(row.items || [])].sort(
      (left, right) => Number(left?.line_index || 0) - Number(right?.line_index || 0),
    ),
    payments: sortBillingPayments(row.payments || []),
  }))
  .sort((left, right) => (
    buildSortKey(right?.due_date, right?.created_at).localeCompare(
      buildSortKey(left?.due_date, left?.created_at),
    )
  ));

export const createEmptyBillingProfile = (profile = {}) => ({
  user_id: profile.id || '',
  preferred_payment_method: 'upi',
  autopay_enabled: false,
  wallet_provider: '',
  billing_email: profile.email || '',
  billing_phone: profile.phone || '',
  tax_id: '',
  billing_notes: '',
  currency_code: 'INR',
});

export const createEmptyInvoiceLineItem = () => ({
  client_id: createClientKey('invoice-item'),
  id: '',
  item_type: 'membership',
  description: '',
  quantity: 1,
  unit_price: '',
  line_total: '',
  linked_plan_name: '',
});

export const createEmptyInvoiceForm = (member = null) => ({
  id: '',
  member_id: member?.id || '',
  plan_id: member?.plan_id || '',
  invoice_type: 'membership_renewal',
  status: 'open',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: new Date().toISOString().slice(0, 10),
  billing_period_start: member?.next_billing_date || new Date().toISOString().slice(0, 10),
  billing_period_end: member?.membership_end_date || '',
  currency_code: 'INR',
  tax_amount: '',
  discount_amount: '',
  notes: '',
  items: [
    {
      ...createEmptyInvoiceLineItem(),
      description: member?.plan?.name || 'Membership renewal',
      linked_plan_name: member?.plan?.name || '',
      unit_price: member?.plan?.price ?? '',
    },
  ],
});

export const createEmptyPaymentForm = () => ({
  invoice_id: '',
  member_id: '',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: 'upi',
  payment_status: 'completed',
  amount: '',
  reference_code: '',
  processor_name: '',
  notes: '',
});

export const normaliseBillingProfileForForm = (profile = {}, memberProfile = {}) => ({
  user_id: profile.user_id || memberProfile.id || '',
  preferred_payment_method: profile.preferred_payment_method || 'upi',
  autopay_enabled: Boolean(profile.autopay_enabled),
  wallet_provider: profile.wallet_provider || '',
  billing_email: profile.billing_email || memberProfile.email || '',
  billing_phone: profile.billing_phone || memberProfile.phone || '',
  tax_id: profile.tax_id || '',
  billing_notes: profile.billing_notes || '',
  currency_code: profile.currency_code || 'INR',
});

export const normaliseInvoiceForForm = (invoice = {}, member = null) => ({
  id: invoice.id || '',
  member_id: invoice.member_id || member?.id || '',
  plan_id: invoice.plan_id || member?.plan_id || '',
  invoice_type: invoice.invoice_type || 'membership_renewal',
  status: invoice.status || 'open',
  issue_date: invoice.issue_date || new Date().toISOString().slice(0, 10),
  due_date: invoice.due_date || new Date().toISOString().slice(0, 10),
  billing_period_start: invoice.billing_period_start || member?.next_billing_date || '',
  billing_period_end: invoice.billing_period_end || member?.membership_end_date || '',
  currency_code: invoice.currency_code || 'INR',
  tax_amount: invoice.tax_amount ?? '',
  discount_amount: invoice.discount_amount ?? '',
  notes: invoice.notes || '',
  amount_paid: invoice.amount_paid ?? '',
  items: (invoice.items || []).length
    ? invoice.items.map((item) => ({
      client_id: item.client_id || item.id || createClientKey('invoice-item'),
      id: item.id || '',
      item_type: item.item_type || 'membership',
      description: item.description || '',
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? '',
      line_total: item.line_total ?? '',
      linked_plan_name: item.linked_plan_name || '',
    }))
    : createEmptyInvoiceForm(member).items,
});

export const normalisePaymentForForm = (payment = {}, invoice = null) => ({
  invoice_id: payment.invoice_id || invoice?.id || '',
  member_id: payment.member_id || invoice?.member_id || '',
  payment_date: payment.payment_date || new Date().toISOString().slice(0, 10),
  payment_method: payment.payment_method || 'upi',
  payment_status: payment.payment_status || 'completed',
  amount: payment.amount ?? invoice?.balance_due ?? '',
  reference_code: payment.reference_code || '',
  processor_name: payment.processor_name || '',
  notes: payment.notes || '',
});

export const calculateInvoiceDraftTotals = (invoice = {}) => {
  const subtotal = (invoice.items || []).reduce((sum, item) => (
    sum + (toNumber(item.quantity) * toNumber(item.unit_price))
  ), 0);

  const taxAmount = toNumber(invoice.tax_amount);
  const discountAmount = toNumber(invoice.discount_amount);
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
  const amountPaid = Math.max(0, toNumber(invoice.amount_paid));
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    amountPaid,
    balanceDue,
  };
};

export const buildBillingSummary = (profile = {}, billingProfile = null, invoices = [], payments = []) => {
  const sortedInvoices = sortBillingInvoices(invoices);
  const sortedPayments = sortBillingPayments(payments);

  const openInvoices = sortedInvoices.filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice.status));
  const overdueInvoices = sortedInvoices.filter((invoice) => invoice.status === 'overdue');
  const dueInvoices = sortedInvoices.filter((invoice) => (
    ['open', 'partial', 'overdue'].includes(invoice.status)
    && (invoice.balance_due || 0) > 0
  ));

  const outstandingBalance = dueInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
  const completedPaymentsTotal = sortedPayments.reduce((sum, payment) => (
    payment.payment_status === 'completed' ? sum + Number(payment.amount || 0) : sum
  ), 0);

  return {
    currencyCode: billingProfile?.currency_code || 'INR',
    preferredPaymentMethod: billingProfile?.preferred_payment_method || 'upi',
    preferredPaymentMethodLabel: getPaymentMethodLabel(billingProfile?.preferred_payment_method),
    autopayEnabled: Boolean(billingProfile?.autopay_enabled),
    billingEmail: billingProfile?.billing_email || profile?.email || '',
    billingPhone: billingProfile?.billing_phone || profile?.phone || '',
    dueInvoices,
    openInvoices,
    overdueInvoices,
    recentInvoice: sortedInvoices[0] || null,
    recentPayment: sortedPayments[0] || null,
    outstandingBalance,
    dueInvoiceCount: dueInvoices.length,
    overdueCount: overdueInvoices.length,
    completedPaymentsTotal,
    nextBillingDate: profile?.next_billing_date || dueInvoices[0]?.due_date || null,
    activePlanName: profile?.plan?.name || null,
  };
};

export const buildStaffBillingStats = (invoices = [], payments = []) => {
  const sortedInvoices = sortBillingInvoices(invoices);
  const sortedPayments = sortBillingPayments(payments);

  const openInvoices = sortedInvoices.filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice.status));
  const overdueInvoices = sortedInvoices.filter((invoice) => invoice.status === 'overdue');
  const paidInvoices = sortedInvoices.filter((invoice) => invoice.status === 'paid');

  const outstandingBalance = openInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
  const collectedTotal = sortedPayments.reduce((sum, payment) => (
    payment.payment_status === 'completed' ? sum + Number(payment.amount || 0) : sum
  ), 0);

  return {
    invoiceCount: sortedInvoices.length,
    openInvoiceCount: openInvoices.length,
    overdueCount: overdueInvoices.length,
    paidInvoiceCount: paidInvoices.length,
    outstandingBalance,
    collectedTotal,
  };
};
