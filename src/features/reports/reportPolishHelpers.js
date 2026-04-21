import {
  buildReportsSummary,
  formatPercent,
  formatShortDate,
} from './reportHelpers';

const MS_PER_DAY = 86400000;

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeRows = (rows) => (Array.isArray(rows) ? rows : []);

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

const paymentMethodLabel = (payment) => (
  payment?.payment_method
  || payment?.method
  || payment?.payment_provider
  || payment?.gateway
  || payment?.source
  || 'Unspecified'
);

const signedPaymentAmount = (payment) => {
  if (payment?.payment_status === 'completed') {
    return toNumber(payment?.amount);
  }

  if (payment?.payment_status === 'refunded') {
    return toNumber(payment?.amount) * -1;
  }

  return 0;
};

const safePercentChange = (currentValue, previousValue) => {
  const currentNumber = toNumber(currentValue);
  const previousNumber = toNumber(previousValue);

  if (!previousNumber) {
    if (!currentNumber) {
      return 0;
    }

    return null;
  }

  return ((currentNumber - previousNumber) / previousNumber) * 100;
};

const buildPreviousRange = (startDate, endDate) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (!start || !end) {
    return {
      startDate: startDate || '',
      endDate: endDate || '',
    };
  }

  const daySpan = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, (daySpan - 1) * -1);

  return {
    startDate: toIsoDate(previousStart),
    endDate: toIsoDate(previousEnd),
  };
};

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (!text.includes(',') && !text.includes('"') && !text.includes('\n')) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

export const buildQuickRangeOptions = (referenceDate = new Date()) => {
  const today = toDateOnly(referenceDate) || new Date(referenceDate);
  const currentMonth = new Date().toISOString().slice(0, 7);

  return [
    {
      id: 'last30',
      label: 'Last 30 days',
      startDate: toIsoDate(addDays(today, -29)),
      endDate: toIsoDate(today),
      reportYear: today.getUTCFullYear(),
    },
    {
      id: 'last90',
      label: 'Last 90 days',
      startDate: toIsoDate(addDays(today, -89)),
      endDate: toIsoDate(today),
      reportYear: today.getUTCFullYear(),
    },
    {
      id: 'ytd',
      label: 'Year to date',
      startDate: `${today.getUTCFullYear()}-01-01`,
      endDate: toIsoDate(today),
      reportYear: today.getUTCFullYear(),
    },
    {
      id: 'month',
      label: 'This month',
      startDate: `${currentMonth}-01`,
      endDate: toIsoDate(today),
      reportYear: today.getUTCFullYear(),
    },
  ];
};

export const buildDecoratedClassRows = (classRows = []) => safeRows(classRows).map((row) => ({
  ...row,
  noShowRate: row.bookedCount > 0 ? row.missedCount / row.bookedCount : 0,
}));

export const buildRangeComparison = ({
  members = [],
  invoices = [],
  payments = [],
  expenses = [],
  sessions = [],
  bookings = [],
  startDate,
  endDate,
}) => {
  const previousRange = buildPreviousRange(startDate, endDate);
  const currentSummary = buildReportsSummary({
    members,
    invoices,
    payments,
    expenses,
    sessions,
    bookings,
    startDate,
    endDate,
  });
  const previousSummary = buildReportsSummary({
    members,
    invoices,
    payments,
    expenses,
    sessions,
    bookings,
    startDate: previousRange.startDate,
    endDate: previousRange.endDate,
  });

  return {
    currentSummary,
    previousSummary,
    previousRangeLabel: `${formatShortDate(previousRange.startDate)} – ${formatShortDate(previousRange.endDate)}`,
    cards: [
      {
        id: 'collections',
        label: 'Collections',
        goal: 'up',
        currentValue: currentSummary.collectedRevenue,
        previousValue: previousSummary.collectedRevenue,
        deltaValue: currentSummary.collectedRevenue - previousSummary.collectedRevenue,
        deltaPercent: safePercentChange(currentSummary.collectedRevenue, previousSummary.collectedRevenue),
        helperText: 'Completed payments net of refunds',
      },
      {
        id: 'expenses',
        label: 'Expenses',
        goal: 'down',
        currentValue: currentSummary.expenseTotal,
        previousValue: previousSummary.expenseTotal,
        deltaValue: currentSummary.expenseTotal - previousSummary.expenseTotal,
        deltaPercent: safePercentChange(currentSummary.expenseTotal, previousSummary.expenseTotal),
        helperText: 'Operating expenses booked in range',
      },
      {
        id: 'renewals',
        label: 'Renewals due',
        goal: 'down',
        currentValue: currentSummary.renewalsDue,
        previousValue: previousSummary.renewalsDue,
        deltaValue: currentSummary.renewalsDue - previousSummary.renewalsDue,
        deltaPercent: safePercentChange(currentSummary.renewalsDue, previousSummary.renewalsDue),
        helperText: 'Members needing renewal follow-up',
      },
      {
        id: 'fill_rate',
        label: 'Fill rate',
        goal: 'up',
        currentValue: currentSummary.fillRate,
        previousValue: previousSummary.fillRate,
        deltaValue: currentSummary.fillRate - previousSummary.fillRate,
        deltaPercent: (toNumber(currentSummary.fillRate) - toNumber(previousSummary.fillRate)) * 100,
        helperText: 'Booked seats divided by capacity',
      },
    ],
  };
};

export const buildPaymentMixRows = (payments = [], startDate, endDate) => {
  const totals = {};

  safeRows(payments)
    .filter((payment) => isWithinDateRange(payment?.payment_date, startDate, endDate))
    .forEach((payment) => {
      const label = paymentMethodLabel(payment);
      const current = totals[label] || { label, amount: 0, count: 0 };

      totals[label] = {
        ...current,
        amount: current.amount + signedPaymentAmount(payment),
        count: current.count + 1,
      };
    });

  return Object.values(totals)
    .filter((row) => row.amount !== 0)
    .sort((left, right) => right.amount - left.amount || right.count - left.count);
};

export const buildPaymentMixChartData = (paymentRows = []) => {
  const labels = safeRows(paymentRows).map((row) => row.label);
  const colors = ['#ff2625', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#64748b'];

  return {
    labels,
    datasets: [
      {
        label: 'Collections by payment method',
        data: safeRows(paymentRows).map((row) => row.amount),
        backgroundColor: labels.map((_label, index) => colors[index % colors.length]),
      },
    ],
  };
};

export const buildClassUtilizationChartData = (classRows = []) => {
  const buckets = [
    { label: '0–39%', min: 0, max: 0.4, count: 0 },
    { label: '40–79%', min: 0.4, max: 0.8, count: 0 },
    { label: '80%+', min: 0.8, max: 2, count: 0 },
  ];

  safeRows(classRows).forEach((row) => {
    const match = buckets.find((bucket) => row.fillRate >= bucket.min && row.fillRate < bucket.max);
    if (match) {
      match.count += 1;
    }
  });

  return {
    labels: buckets.map((bucket) => bucket.label),
    datasets: [
      {
        label: 'Sessions',
        data: buckets.map((bucket) => bucket.count),
        backgroundColor: ['rgba(239,68,68,0.72)', 'rgba(245,158,11,0.72)', 'rgba(16,185,129,0.72)'],
        borderColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 1,
      },
    ],
  };
};

export const buildMonthlyScorecardRows = (trendRows = []) => safeRows(trendRows).map((row) => ({
  ...row,
  netCashFlow: row.collectedRevenue - row.expenseTotal,
  collectionAttainment: row.collectionsTarget > 0 ? row.collectedRevenue / row.collectionsTarget : null,
  collectionGap: row.collectionsTarget > 0 ? row.collectedRevenue - row.collectionsTarget : null,
}));

export const buildReportInsights = ({
  summary,
  comparison,
  outstandingRows = [],
  expiringRows = [],
  classRows = [],
  trendRows = [],
}) => {
  const insights = [];
  const collectionGap = toNumber(summary?.issuedRevenue) - toNumber(summary?.collectedRevenue);
  const overdueFollowUps = safeRows(outstandingRows).filter((row) => row.daysOverdue >= 7);
  const underfilledClasses = safeRows(classRows).filter((row) => row.capacity > 0 && row.fillRate < 0.4);
  const noShowClasses = safeRows(classRows).filter((row) => row.bookedCount >= 5 && row.noShowRate >= 0.2);
  const offTargetMonths = safeRows(trendRows).filter((row) => row.collectionsTarget > 0 && row.collectedRevenue < row.collectionsTarget);
  const previousCollections = comparison?.previousSummary?.collectedRevenue || 0;
  const currentCollections = comparison?.currentSummary?.collectedRevenue || 0;

  if (collectionGap > 0) {
    insights.push({
      id: 'collections_gap',
      severity: 'warning',
      title: 'Collections are trailing issued revenue',
      description: `Net collections trail billed revenue by ₹${collectionGap.toFixed(2)} in the selected range.`,
      badge: 'Collections',
    });
  }

  if (overdueFollowUps.length > 0) {
    insights.push({
      id: 'overdue_dues',
      severity: 'error',
      title: 'Overdue dues need follow-up',
      description: `${overdueFollowUps.length} invoices are overdue by at least 7 days.`,
      badge: 'Dues',
    });
  }

  if (safeRows(expiringRows).length > 0) {
    insights.push({
      id: 'expiring_memberships',
      severity: 'info',
      title: 'Renewal outreach is due',
      description: `${safeRows(expiringRows).length} memberships expire inside the selected report window.`,
      badge: 'Renewals',
    });
  }

  if (summary?.noShowRate >= 0.15) {
    insights.push({
      id: 'no_show_rate',
      severity: 'warning',
      title: 'No-show rate is elevated',
      description: `No-shows are running at ${formatPercent(summary.noShowRate)} for the current date range.`,
      badge: 'Attendance',
    });
  }

  if (underfilledClasses.length > 0) {
    insights.push({
      id: 'underfilled_classes',
      severity: 'info',
      title: 'Some sessions are under-filled',
      description: `${underfilledClasses.length} classes are below 40% fill and may need schedule or demand adjustments.`,
      badge: 'Capacity',
    });
  }

  if (noShowClasses.length > 0) {
    insights.push({
      id: 'no_show_classes',
      severity: 'warning',
      title: 'A few classes have high no-show risk',
      description: `${noShowClasses.length} classes have 20%+ no-shows with at least 5 bookings.`,
      badge: 'Hotspots',
    });
  }

  if (offTargetMonths.length > 0) {
    const monthLabels = offTargetMonths.slice(0, 3).map((row) => formatShortDate(row.month)).join(', ');

    insights.push({
      id: 'targets',
      severity: 'warning',
      title: 'Collection targets are missed in some months',
      description: `Below-target months include ${monthLabels}.`,
      badge: 'Targets',
    });
  }

  if (!insights.length) {
    if (currentCollections >= previousCollections) {
      insights.push({
        id: 'healthy',
        severity: 'success',
        title: 'The reporting signals look healthy',
        description: 'Collections are stable or improving and no major operational risks stand out in the selected range.',
        badge: 'Healthy',
      });
    } else {
      insights.push({
        id: 'monitor',
        severity: 'info',
        title: 'The reports are stable but worth watching',
        description: 'Collections are slightly softer than the previous period, even though no urgent operational blockers surfaced.',
        badge: 'Monitor',
      });
    }
  }

  return insights.slice(0, 6);
};

export const buildReportSnapshotCsv = ({
  filters,
  summary,
  scorecardRows = [],
  insights = [],
  outstandingRows = [],
  expiringRows = [],
  classRows = [],
}) => {
  const lines = [];

  lines.push('Checkers Gym Reporting Snapshot');
  lines.push(`Range,${csvEscape(`${formatShortDate(filters?.startDate)} – ${formatShortDate(filters?.endDate)}`)}`);
  lines.push('');
  lines.push('Summary');
  lines.push('Metric,Value');
  lines.push(`Active members,${csvEscape(summary?.activeMembers ?? 0)}`);
  lines.push(`Renewals due,${csvEscape(summary?.renewalsDue ?? 0)}`);
  lines.push(`Issued revenue,${csvEscape(toNumber(summary?.issuedRevenue).toFixed(2))}`);
  lines.push(`Collected revenue,${csvEscape(toNumber(summary?.collectedRevenue).toFixed(2))}`);
  lines.push(`Expense total,${csvEscape(toNumber(summary?.expenseTotal).toFixed(2))}`);
  lines.push(`Outstanding balance,${csvEscape(toNumber(summary?.outstandingBalance).toFixed(2))}`);
  lines.push(`Net cash flow,${csvEscape(toNumber(summary?.netCashFlow).toFixed(2))}`);
  lines.push(`Collection rate,${csvEscape(formatPercent(summary?.collectionRate || 0))}`);
  lines.push(`Fill rate,${csvEscape(formatPercent(summary?.fillRate || 0))}`);
  lines.push('');
  lines.push('Insights');
  lines.push('Severity,Title,Description');
  safeRows(insights).forEach((row) => {
    lines.push([row.severity, row.title, row.description].map(csvEscape).join(','));
  });
  lines.push('');
  lines.push('Monthly scorecard');
  lines.push('Month,Collections,Target,Attainment,Expenses,Net cash flow');
  safeRows(scorecardRows).forEach((row) => {
    lines.push([
      formatShortDate(row.month),
      toNumber(row.collectedRevenue).toFixed(2),
      toNumber(row.collectionsTarget).toFixed(2),
      row.collectionAttainment === null ? '' : formatPercent(row.collectionAttainment),
      toNumber(row.expenseTotal).toFixed(2),
      toNumber(row.netCashFlow).toFixed(2),
    ].map(csvEscape).join(','));
  });
  lines.push('');
  lines.push('Outstanding dues');
  lines.push('Invoice,Member,Due date,Balance due,Status,Days overdue');
  safeRows(outstandingRows).slice(0, 20).forEach((row) => {
    lines.push([
      row.invoiceNumber,
      row.memberName,
      row.dueDate,
      toNumber(row.balanceDue).toFixed(2),
      row.status,
      row.daysOverdue,
    ].map(csvEscape).join(','));
  });
  lines.push('');
  lines.push('Expiring members');
  lines.push('Member,Email,Plan,Membership end,Status');
  safeRows(expiringRows).slice(0, 20).forEach((row) => {
    lines.push([
      row.name,
      row.email,
      row.planName,
      row.membershipEndDate,
      row.membershipStatus,
    ].map(csvEscape).join(','));
  });
  lines.push('');
  lines.push('Class performance');
  lines.push('Class,Trainer,Booked,Attended,Missed,Fill rate,No-show rate');
  safeRows(classRows).slice(0, 20).forEach((row) => {
    lines.push([
      row.title,
      row.trainerName,
      row.bookedCount,
      row.attendedCount,
      row.missedCount,
      formatPercent(row.fillRate),
      formatPercent(row.noShowRate),
    ].map(csvEscape).join(','));
  });

  return lines.join('\n');
};
