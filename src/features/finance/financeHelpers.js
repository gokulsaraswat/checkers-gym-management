import { formatCurrency } from '../billing/billingHelpers';

export const OPERATING_EXPENSE_CATEGORY_OPTIONS = [
  { value: 'staff_salary', label: 'Staff salary' },
  { value: 'staff_commission', label: 'Staff commission' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'software', label: 'Software & tools' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'misc', label: 'Miscellaneous' },
];

export const FINANCE_EXPORT_SECTION_OPTIONS = [
  { key: 'overview', label: 'Overview KPI sheet' },
  { key: 'members', label: 'Members sheet' },
  { key: 'expiring', label: 'Expiring members sheet' },
  { key: 'revenue', label: 'Revenue sheet' },
  { key: 'expenses', label: 'Expenses sheet' },
  { key: 'staffCosts', label: 'Staff cost sheet' },
  { key: 'maintenance', label: 'Maintenance sheet' },
  { key: 'trends', label: 'Yearly trends sheet' },
  { key: 'outstanding', label: 'Outstanding dues sheet' },
];

export const createExpenseForm = () => ({
  id: '',
  expense_date: new Date().toISOString().slice(0, 10),
  expense_category: 'maintenance',
  description: '',
  vendor_name: '',
  amount: '',
  payment_method: 'upi',
  branch_name: '',
  notes: '',
});

export const createExportSelection = () => FINANCE_EXPORT_SECTION_OPTIONS.reduce((accumulator, section) => ({
  ...accumulator,
  [section.key]: true,
}), {});

export const startOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

export const endOfToday = () => new Date().toISOString().slice(0, 10);

export const getExpenseCategoryLabel = (value) => (
  OPERATING_EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value || 'Other'
);

export const formatShortDate = (value) => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const toDateOnlyValue = (value) => {
  if (!value) {
    return null;
  }

  const isoValue = String(value).slice(0, 10);
  const parsed = new Date(`${isoValue}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinRange = (value, startDate, endDate) => {
  const target = toDateOnlyValue(value);
  if (!target) {
    return false;
  }

  const start = toDateOnlyValue(startDate);
  const end = toDateOnlyValue(endDate);

  if (start && target < start) {
    return false;
  }

  if (end && target > end) {
    return false;
  }

  return true;
};

export const filterMembersByExpiry = (members = [], startDate, endDate) => members.filter((member) => (
  member?.membership_end_date && isWithinRange(member.membership_end_date, startDate, endDate)
));

export const filterInvoicesByDateRange = (invoices = [], startDate, endDate) => invoices.filter((invoice) => (
  isWithinRange(invoice?.issue_date || invoice?.due_date, startDate, endDate)
));

export const filterPaymentsByDateRange = (payments = [], startDate, endDate) => payments.filter((payment) => (
  isWithinRange(payment?.payment_date, startDate, endDate)
));

export const filterExpensesByDateRange = (expenses = [], startDate, endDate) => expenses.filter((expense) => (
  isWithinRange(expense?.expense_date, startDate, endDate)
));

export const buildFinanceSummary = ({
  members = [],
  invoices = [],
  payments = [],
  expenses = [],
  startDate,
  endDate,
}) => {
  const filteredInvoices = filterInvoicesByDateRange(invoices, startDate, endDate);
  const filteredPayments = filterPaymentsByDateRange(payments, startDate, endDate);
  const filteredExpenses = filterExpensesByDateRange(expenses, startDate, endDate);
  const expiringMembers = filterMembersByExpiry(members, startDate, endDate);
  const activeMembers = members.filter((member) => member?.role === 'member' && member?.is_active).length;
  const issuedRevenue = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice?.total_amount || 0), 0);
  const collectedRevenue = filteredPayments.reduce((sum, payment) => (
    sum + (
      payment?.payment_status === 'completed'
        ? Number(payment?.amount || 0)
        : payment?.payment_status === 'refunded'
          ? Number(payment?.amount || 0) * -1
          : 0
    )
  ), 0);
  const outstandingBalance = filteredInvoices
    .filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice?.status))
    .reduce((sum, invoice) => sum + Number(invoice?.balance_due || 0), 0);
  const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0);
  const netCashFlow = collectedRevenue - expenseTotal;
  const staffCost = filteredExpenses
    .filter((expense) => ['staff_salary', 'staff_commission'].includes(expense?.expense_category))
    .reduce((sum, expense) => sum + Number(expense?.amount || 0), 0);

  return {
    activeMembers,
    expiringCount: expiringMembers.length,
    issuedRevenue,
    collectedRevenue,
    outstandingBalance,
    expenseTotal,
    netCashFlow,
    staffCost,
  };
};

export const buildMonthlyTrendRows = ({
  year,
  invoices = [],
  payments = [],
  expenses = [],
}) => {
  const nextYear = Number(year) || new Date().getFullYear();

  return Array.from({ length: 12 }, (_value, index) => {
    const monthNumber = index + 1;
    const monthStart = new Date(Date.UTC(nextYear, index, 1));
    const monthEnd = new Date(Date.UTC(nextYear, index + 1, 0));
    const startDate = monthStart.toISOString().slice(0, 10);
    const endDate = monthEnd.toISOString().slice(0, 10);

    const monthlyInvoices = filterInvoicesByDateRange(invoices, startDate, endDate);
    const monthlyPayments = filterPaymentsByDateRange(payments, startDate, endDate);
    const monthlyExpenses = filterExpensesByDateRange(expenses, startDate, endDate);

    const issuedRevenue = monthlyInvoices.reduce((sum, invoice) => sum + Number(invoice?.total_amount || 0), 0);
    const collectedRevenue = monthlyPayments.reduce((sum, payment) => (
      sum + (
        payment?.payment_status === 'completed'
          ? Number(payment?.amount || 0)
          : payment?.payment_status === 'refunded'
            ? Number(payment?.amount || 0) * -1
            : 0
      )
    ), 0);
    const expenseTotal = monthlyExpenses.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0);

    return {
      monthNumber,
      monthLabel: monthStart.toLocaleString(undefined, { month: 'short' }),
      issuedRevenue,
      collectedRevenue,
      expenseTotal,
      netCashFlow: collectedRevenue - expenseTotal,
    };
  });
};

export const buildRevenueChartData = (trendRows = []) => ({
  labels: trendRows.map((row) => row.monthLabel),
  datasets: [
    {
      label: 'Collected revenue',
      data: trendRows.map((row) => Number(row.collectedRevenue || 0)),
      borderWidth: 3,
      fill: false,
      tension: 0.35,
    },
    {
      label: 'Expenses',
      data: trendRows.map((row) => Number(row.expenseTotal || 0)),
      borderWidth: 3,
      fill: false,
      tension: 0.35,
    },
  ],
});

export const buildExpenseChartData = (expenses = [], startDate, endDate) => {
  const filteredExpenses = filterExpensesByDateRange(expenses, startDate, endDate);
  const totalsByCategory = OPERATING_EXPENSE_CATEGORY_OPTIONS.reduce((accumulator, option) => ({
    ...accumulator,
    [option.value]: 0,
  }), {});

  filteredExpenses.forEach((expense) => {
    const category = expense?.expense_category || 'misc';
    totalsByCategory[category] = Number(totalsByCategory[category] || 0) + Number(expense?.amount || 0);
  });

  return {
    labels: OPERATING_EXPENSE_CATEGORY_OPTIONS.map((option) => option.label),
    datasets: [
      {
        label: 'Expenses',
        data: OPERATING_EXPENSE_CATEGORY_OPTIONS.map((option) => totalsByCategory[option.value] || 0),
        borderWidth: 1,
      },
    ],
  };
};

export const buildPaymentMethodChartData = (payments = [], startDate, endDate) => {
  const filteredPayments = filterPaymentsByDateRange(payments, startDate, endDate);
  const totalsByMethod = filteredPayments.reduce((accumulator, payment) => {
    const key = payment?.payment_method || 'other';
    return {
      ...accumulator,
      [key]: Number(accumulator[key] || 0) + Number(payment?.amount || 0),
    };
  }, {});

  const labels = Object.keys(totalsByMethod);
  return {
    labels,
    datasets: [
      {
        label: 'Collection mix',
        data: labels.map((label) => totalsByMethod[label]),
        borderWidth: 1,
      },
    ],
  };
};

const buildOverviewRows = (summary = {}, startDate, endDate) => ([
  { metric: 'Date range start', value: startDate || '—' },
  { metric: 'Date range end', value: endDate || '—' },
  { metric: 'Active members', value: summary.activeMembers || 0 },
  { metric: 'Expiring members', value: summary.expiringCount || 0 },
  { metric: 'Issued revenue', value: formatCurrency(summary.issuedRevenue, 'INR') },
  { metric: 'Collected revenue', value: formatCurrency(summary.collectedRevenue, 'INR') },
  { metric: 'Outstanding balance', value: formatCurrency(summary.outstandingBalance, 'INR') },
  { metric: 'Expenses', value: formatCurrency(summary.expenseTotal, 'INR') },
  { metric: 'Net cash flow', value: formatCurrency(summary.netCashFlow, 'INR') },
  { metric: 'Staff cost', value: formatCurrency(summary.staffCost, 'INR') },
]);

export const downloadFinanceWorkbook = async ({
  selection,
  startDate,
  endDate,
  summary,
  members,
  expiringMembers,
  invoices,
  payments,
  expenses,
  trendRows,
}) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  if (selection.overview) {
    const sheet = XLSX.utils.json_to_sheet(buildOverviewRows(summary, startDate, endDate));
    XLSX.utils.book_append_sheet(workbook, sheet, 'Overview');
  }

  if (selection.members) {
    const rows = (members || []).map((member) => ({
      name: member?.full_name || '',
      email: member?.email || '',
      phone: member?.phone || '',
      role: member?.role || '',
      plan: member?.plan?.name || '',
      membership_status: member?.membership_status || '',
      membership_start_date: member?.membership_start_date || '',
      membership_end_date: member?.membership_end_date || '',
      next_billing_date: member?.next_billing_date || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Members');
  }

  if (selection.expiring) {
    const rows = (expiringMembers || []).map((member) => ({
      name: member?.full_name || '',
      email: member?.email || '',
      phone: member?.phone || '',
      plan: member?.plan?.name || '',
      membership_end_date: member?.membership_end_date || '',
      next_billing_date: member?.next_billing_date || '',
      membership_status: member?.membership_status || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Expiring Members');
  }

  if (selection.revenue) {
    const invoiceRows = (invoices || []).map((invoice) => ({
      invoice_number: invoice?.invoice_number || '',
      member: invoice?.member?.full_name || invoice?.member?.email || '',
      issue_date: invoice?.issue_date || '',
      due_date: invoice?.due_date || '',
      type: invoice?.invoice_type || '',
      status: invoice?.status || '',
      total_amount: Number(invoice?.total_amount || 0),
      amount_paid: Number(invoice?.amount_paid || 0),
      balance_due: Number(invoice?.balance_due || 0),
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invoiceRows), 'Revenue');
  }

  if (selection.expenses) {
    const expenseRows = (expenses || []).map((expense) => ({
      expense_date: expense?.expense_date || '',
      category: getExpenseCategoryLabel(expense?.expense_category),
      description: expense?.description || '',
      vendor_name: expense?.vendor_name || '',
      amount: Number(expense?.amount || 0),
      payment_method: expense?.payment_method || '',
      branch_name: expense?.branch_name || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), 'Expenses');
  }

  if (selection.staffCosts) {
    const staffRows = (expenses || [])
      .filter((expense) => ['staff_salary', 'staff_commission'].includes(expense?.expense_category))
      .map((expense) => ({
        expense_date: expense?.expense_date || '',
        category: getExpenseCategoryLabel(expense?.expense_category),
        description: expense?.description || '',
        vendor_name: expense?.vendor_name || '',
        amount: Number(expense?.amount || 0),
      }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows), 'Staff Cost');
  }

  if (selection.maintenance) {
    const maintenanceRows = (expenses || [])
      .filter((expense) => expense?.expense_category === 'maintenance')
      .map((expense) => ({
        expense_date: expense?.expense_date || '',
        description: expense?.description || '',
        vendor_name: expense?.vendor_name || '',
        amount: Number(expense?.amount || 0),
        notes: expense?.notes || '',
      }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(maintenanceRows), 'Maintenance');
  }

  if (selection.trends) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trendRows || []), 'Yearly Trends');
  }

  if (selection.outstanding) {
    const outstandingRows = (invoices || [])
      .filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice?.status))
      .map((invoice) => ({
        invoice_number: invoice?.invoice_number || '',
        member: invoice?.member?.full_name || invoice?.member?.email || '',
        due_date: invoice?.due_date || '',
        status: invoice?.status || '',
        balance_due: Number(invoice?.balance_due || 0),
      }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(outstandingRows), 'Outstanding Dues');
  }

  const fileName = `gym-finance-export-${startDate || 'start'}-${endDate || 'end'}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const downloadFinancePdf = async ({
  selection,
  startDate,
  endDate,
  summary,
  expiringMembers,
  invoices,
  expenses,
  trendRows,
}) => {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  doc.setFontSize(18);
  doc.text('Gym Finance Summary', 40, 48);
  doc.setFontSize(10);
  doc.text(`Range: ${startDate || '—'} to ${endDate || '—'}`, 40, 66);

  let currentY = 86;

  if (selection.overview) {
    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Value']],
      body: buildOverviewRows(summary, startDate, endDate).map((row) => [row.metric, row.value]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 38, 37] },
    });
    currentY = doc.lastAutoTable.finalY + 18;
  }

  if (selection.expiring && expiringMembers?.length) {
    autoTable(doc, {
      startY: currentY,
      head: [['Expiring member', 'Plan', 'Expiry date', 'Status']],
      body: expiringMembers.slice(0, 18).map((member) => [
        member?.full_name || member?.email || '',
        member?.plan?.name || '',
        member?.membership_end_date || '',
        member?.membership_status || '',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 38, 37] },
    });
    currentY = doc.lastAutoTable.finalY + 18;
  }

  if (selection.outstanding) {
    const outstandingRows = (invoices || [])
      .filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice?.status))
      .slice(0, 18);

    if (outstandingRows.length) {
      autoTable(doc, {
        startY: currentY,
        head: [['Invoice', 'Member', 'Due date', 'Balance']],
        body: outstandingRows.map((invoice) => [
          invoice?.invoice_number || '',
          invoice?.member?.full_name || invoice?.member?.email || '',
          invoice?.due_date || '',
          formatCurrency(invoice?.balance_due, invoice?.currency_code || 'INR'),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 38, 37] },
      });
      currentY = doc.lastAutoTable.finalY + 18;
    }
  }

  if (selection.expenses && expenses?.length) {
    autoTable(doc, {
      startY: currentY,
      head: [['Expense date', 'Category', 'Description', 'Amount']],
      body: expenses.slice(0, 18).map((expense) => [
        expense?.expense_date || '',
        getExpenseCategoryLabel(expense?.expense_category),
        expense?.description || '',
        formatCurrency(expense?.amount, 'INR'),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 38, 37] },
    });
    currentY = doc.lastAutoTable.finalY + 18;
  }

  if (selection.trends && trendRows?.length) {
    if (currentY > 650) {
      doc.addPage();
      currentY = 40;
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Month', 'Collected', 'Expenses', 'Net cash flow']],
      body: trendRows.map((row) => [
        row.monthLabel,
        formatCurrency(row.collectedRevenue, 'INR'),
        formatCurrency(row.expenseTotal, 'INR'),
        formatCurrency(row.netCashFlow, 'INR'),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 38, 37] },
    });
  }

  doc.save(`gym-finance-summary-${startDate || 'start'}-${endDate || 'end'}.pdf`);
};
