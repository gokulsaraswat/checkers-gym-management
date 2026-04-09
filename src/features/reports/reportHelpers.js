const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const isoDate = String(value).slice(0, 10);
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (value) => {
  const parsed = toDateOnly(value);
  return parsed ? parsed.toISOString().slice(0, 10) : '';
};

const addDays = (value, days) => {
  const parsed = toDateOnly(value) || new Date(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  const next = new Date(parsed);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
};

const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const endOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const currentMonthInput = () => new Date().toISOString().slice(0, 7);
export const monthInputToDate = (value) => `${String(value || currentMonthInput()).slice(0, 7)}-01`;

export const createReportFilters = () => ({
  startDate: toIsoDate(addDays(new Date(), -89)),
  endDate: toIsoDate(new Date()),
  reportYear: new Date().getUTCFullYear(),
});

export const createTargetForm = (month = currentMonthInput()) => ({
  id: '',
  month,
  collectionsTarget: '',
  expenseCap: '',
  activeMembersTarget: '',
  renewalsTarget: '',
  notes: '',
});

export const createPresetForm = () => ({
  id: '',
  name: '',
});

export const mapTargetToForm = (target = null) => ({
  id: target?.id || '',
  month: String(target?.target_month || monthInputToDate(currentMonthInput())).slice(0, 7),
  collectionsTarget: String(target?.collections_target ?? ''),
  expenseCap: String(target?.expense_cap ?? ''),
  activeMembersTarget: String(target?.active_members_target ?? ''),
  renewalsTarget: String(target?.renewals_target ?? ''),
  notes: target?.notes || '',
});

export const formatShortDate = (value) => {
  const parsed = toDateOnly(value) || new Date(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

export const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const isWithinDateRange = (value, startDate, endDate) => {
  const target = toDateOnly(value);
  if (!target) {
    return false;
  }

  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (start && target < start) {
    return false;
  }

  if (end && target > end) {
    return false;
  }

  return true;
};

const memberRows = (members = []) => members.filter((member) => member?.role === 'member');

export const buildReportsSummary = ({ members = [], invoices = [], payments = [], expenses = [], sessions = [], bookings = [], startDate, endDate }) => {
  const activeMembers = memberRows(members).filter((member) => member?.is_active);
  const expiringMembers = activeMembers.filter((member) => isWithinDateRange(member?.membership_end_date, startDate, endDate));
  const dueRenewals = activeMembers.filter((member) => isWithinDateRange(member?.next_billing_date || member?.membership_end_date, startDate, endDate));

  const filteredInvoices = (invoices || []).filter((invoice) => isWithinDateRange(invoice?.issue_date || invoice?.due_date, startDate, endDate));
  const filteredPayments = (payments || []).filter((payment) => isWithinDateRange(payment?.payment_date, startDate, endDate));
  const filteredExpenses = (expenses || []).filter((expense) => isWithinDateRange(expense?.expense_date, startDate, endDate));
  const filteredSessions = (sessions || []).filter((session) => isWithinDateRange(session?.starts_at, startDate, endDate));
  const sessionIdSet = new Set(filteredSessions.map((session) => session.id));
  const filteredBookings = (bookings || []).filter((booking) => sessionIdSet.has(booking?.class_session_id));

  const issuedRevenue = filteredInvoices.reduce((sum, invoice) => sum + toNumber(invoice?.total_amount), 0);
  const collectedRevenue = filteredPayments.reduce((sum, payment) => (
    sum + (
      payment?.payment_status === 'completed'
        ? toNumber(payment?.amount)
        : payment?.payment_status === 'refunded'
          ? toNumber(payment?.amount) * -1
          : 0
    )
  ), 0);
  const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + toNumber(expense?.amount), 0);
  const outstandingBalance = (invoices || [])
    .filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice?.status))
    .reduce((sum, invoice) => sum + toNumber(invoice?.balance_due), 0);
  const bookedCount = filteredBookings.filter((booking) => ['booked', 'attended', 'missed'].includes(booking?.booking_status)).length;
  const attendedCount = filteredBookings.filter((booking) => booking?.booking_status === 'attended').length;
  const missedCount = filteredBookings.filter((booking) => booking?.booking_status === 'missed').length;
  const totalCapacity = filteredSessions.reduce((sum, session) => sum + toNumber(session?.capacity), 0);

  return {
    activeMembers: activeMembers.length,
    expiringCount: expiringMembers.length,
    renewalsDue: dueRenewals.length,
    issuedRevenue,
    collectedRevenue,
    expenseTotal,
    outstandingBalance,
    netCashFlow: collectedRevenue - expenseTotal,
    collectionRate: issuedRevenue > 0 ? collectedRevenue / issuedRevenue : 0,
    fillRate: totalCapacity > 0 ? bookedCount / totalCapacity : 0,
    noShowRate: attendedCount + missedCount > 0 ? missedCount / (attendedCount + missedCount) : 0,
  };
};

export const buildTrendRows = ({ year, members = [], invoices = [], payments = [], expenses = [], targets = [] }) => {
  const reportYear = Number(year || new Date().getUTCFullYear());
  const targetByMonth = (targets || []).reduce((accumulator, target) => ({
    ...accumulator,
    [String(target?.target_month || '').slice(0, 10)]: target,
  }), {});

  return Array.from({ length: 12 }, (_value, index) => {
    const monthStart = new Date(Date.UTC(reportYear, index, 1));
    const monthEnd = endOfMonth(monthStart);
    const startDate = toIsoDate(monthStart);
    const endDate = toIsoDate(monthEnd);

    const collectedRevenue = (payments || []).filter((payment) => isWithinDateRange(payment?.payment_date, startDate, endDate))
      .reduce((sum, payment) => (
        sum + (
          payment?.payment_status === 'completed'
            ? toNumber(payment?.amount)
            : payment?.payment_status === 'refunded'
              ? toNumber(payment?.amount) * -1
              : 0
        )
      ), 0);
    const expenseTotal = (expenses || []).filter((expense) => isWithinDateRange(expense?.expense_date, startDate, endDate))
      .reduce((sum, expense) => sum + toNumber(expense?.amount), 0);
    const activeMembers = memberRows(members).filter((member) => {
      const memberSince = toDateOnly(member?.member_since || member?.membership_start_date);
      const membershipEnd = toDateOnly(member?.membership_end_date);
      if (!member?.is_active) {
        return false;
      }
      if (memberSince && memberSince > monthEnd) {
        return false;
      }
      if (membershipEnd && membershipEnd < monthStart) {
        return false;
      }
      return true;
    }).length;
    const renewals = memberRows(members).filter((member) => isWithinDateRange(member?.next_billing_date || member?.membership_end_date, startDate, endDate)).length;
    const target = targetByMonth[startDate] || null;

    return {
      month: startDate,
      monthLabel: monthStart.toLocaleString(undefined, { month: 'short' }),
      collectedRevenue,
      expenseTotal,
      activeMembers,
      renewals,
      collectionsTarget: toNumber(target?.collections_target),
      expenseCap: toNumber(target?.expense_cap),
      activeMembersTarget: toNumber(target?.active_members_target),
      renewalsTarget: toNumber(target?.renewals_target),
    };
  });
};

export const buildTrendChartData = (trendRows = []) => ({
  labels: trendRows.map((row) => row.monthLabel),
  datasets: [
    {
      type: 'line',
      label: 'Collections',
      data: trendRows.map((row) => row.collectedRevenue),
      borderColor: '#ff2625',
      backgroundColor: 'rgba(255,38,37,0.12)',
      borderWidth: 3,
      tension: 0.35,
      yAxisID: 'y',
    },
    {
      type: 'bar',
      label: 'Expenses',
      data: trendRows.map((row) => row.expenseTotal),
      backgroundColor: 'rgba(31,41,55,0.18)',
      borderColor: '#1f2937',
      yAxisID: 'y',
    },
    {
      type: 'line',
      label: 'Collection target',
      data: trendRows.map((row) => row.collectionsTarget),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.1)',
      borderDash: [6, 6],
      tension: 0.25,
      yAxisID: 'y',
    },
  ],
});

export const buildPlanMixChartData = (members = []) => {
  const totals = memberRows(members).filter((member) => member?.is_active).reduce((accumulator, member) => {
    const label = member?.plan?.name || 'Unassigned';
    return {
      ...accumulator,
      [label]: Number(accumulator[label] || 0) + 1,
    };
  }, {});

  const labels = Object.keys(totals);

  return {
    labels,
    datasets: [
      {
        label: 'Plan mix',
        data: labels.map((label) => totals[label]),
        backgroundColor: ['#ff2625', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'],
      },
    ],
  };
};

export const buildOutstandingRows = (invoices = [], referenceDate = new Date()) => (invoices || [])
  .filter((invoice) => ['open', 'partial', 'overdue'].includes(invoice?.status))
  .map((invoice) => {
    const dueDate = toDateOnly(invoice?.due_date);
    const now = toDateOnly(referenceDate) || new Date(referenceDate);
    const daysOverdue = dueDate && now ? Math.max(0, Math.round((now.getTime() - dueDate.getTime()) / 86400000)) : 0;

    return {
      id: invoice.id,
      invoiceNumber: invoice?.invoice_number || '',
      memberName: invoice?.member?.full_name || invoice?.member?.email || 'Member',
      dueDate: invoice?.due_date || '',
      balanceDue: toNumber(invoice?.balance_due),
      status: invoice?.status || 'open',
      daysOverdue,
    };
  })
  .sort((left, right) => right.balanceDue - left.balanceDue || right.daysOverdue - left.daysOverdue);

export const buildExpiringRows = (members = [], startDate, endDate) => memberRows(members)
  .filter((member) => member?.is_active && isWithinDateRange(member?.membership_end_date, startDate, endDate))
  .map((member) => ({
    id: member.id,
    name: member?.full_name || member?.email || 'Member',
    email: member?.email || '',
    planName: member?.plan?.name || 'Unassigned',
    membershipEndDate: member?.membership_end_date || '',
    membershipStatus: member?.membership_status || '',
  }))
  .sort((left, right) => String(left.membershipEndDate).localeCompare(String(right.membershipEndDate)));

export const buildClassPerformanceRows = (sessions = [], bookings = []) => {
  const bookingMap = (bookings || []).reduce((accumulator, booking) => ({
    ...accumulator,
    [booking?.class_session_id]: [...(accumulator[booking?.class_session_id] || []), booking],
  }), {});

  return (sessions || []).map((session) => {
    const rows = bookingMap[session.id] || [];
    const bookedCount = rows.filter((booking) => ['booked', 'attended', 'missed'].includes(booking?.booking_status)).length;
    const attendedCount = rows.filter((booking) => booking?.booking_status === 'attended').length;
    const missedCount = rows.filter((booking) => booking?.booking_status === 'missed').length;
    const capacity = toNumber(session?.capacity);

    return {
      id: session.id,
      title: session?.title || 'Class',
      trainerName: session?.trainer_name || session?.coach_name || 'Unassigned',
      startsAt: session?.starts_at || '',
      bookedCount,
      attendedCount,
      missedCount,
      capacity,
      fillRate: capacity > 0 ? bookedCount / capacity : 0,
    };
  }).sort((left, right) => right.bookedCount - left.bookedCount || right.fillRate - left.fillRate);
};

export const buildTargetProgress = (trendRows = [], month = currentMonthInput()) => {
  const targetRow = (trendRows || []).find((row) => row.month === monthInputToDate(month));
  if (!targetRow) {
    return null;
  }

  const progress = (actual, target) => (target > 0 ? Math.min((actual / target) * 100, 100) : null);

  return {
    collections: {
      actual: targetRow.collectedRevenue,
      target: targetRow.collectionsTarget,
      progress: progress(targetRow.collectedRevenue, targetRow.collectionsTarget),
    },
    expenses: {
      actual: targetRow.expenseTotal,
      target: targetRow.expenseCap,
      progress: progress(targetRow.expenseTotal, targetRow.expenseCap),
    },
    members: {
      actual: targetRow.activeMembers,
      target: targetRow.activeMembersTarget,
      progress: progress(targetRow.activeMembers, targetRow.activeMembersTarget),
    },
    renewals: {
      actual: targetRow.renewals,
      target: targetRow.renewalsTarget,
      progress: progress(targetRow.renewals, targetRow.renewalsTarget),
    },
  };
};

export const applyPreset = (preset, currentFilters) => ({
  ...currentFilters,
  ...(preset?.filters || {}),
});
