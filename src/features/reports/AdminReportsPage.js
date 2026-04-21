import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoGraph,
  Download,
  EventRepeat,
  Insights,
  MonetizationOn,
  PeopleAlt,
  Refresh,
} from '@mui/icons-material';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  deleteFinanceTarget,
  deleteReportPreset,
  fetchBillingInvoices,
  fetchBillingPayments,
  fetchClassBookingsBySessionIds,
  fetchClassSessions,
  fetchFinanceTargets,
  fetchMembers,
  fetchOperatingExpenses,
  fetchReportPresets,
  saveFinanceTarget,
  saveReportPreset,
} from '../../services/gymService';
import { formatCurrency } from '../billing/billingHelpers';
import ReportComparisonCard from './components/ReportComparisonCard';
import ReportInsightPanel from './components/ReportInsightPanel';
import {
  buildClassUtilizationChartData,
  buildDecoratedClassRows,
  buildMonthlyScorecardRows,
  buildPaymentMixChartData,
  buildPaymentMixRows,
  buildQuickRangeOptions,
  buildRangeComparison,
  buildReportInsights,
  buildReportSnapshotCsv,
} from './reportPolishHelpers';
import {
  applyPreset,
  buildClassPerformanceRows,
  buildExpiringRows,
  buildOutstandingRows,
  buildPlanMixChartData,
  buildReportsSummary,
  buildTargetProgress,
  buildTrendChartData,
  buildTrendRows,
  createPresetForm,
  createReportFilters,
  createTargetForm,
  currentMonthInput,
  formatPercent,
  formatShortDate,
  mapTargetToForm,
  monthInputToDate,
} from './reportHelpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const sectionCardSx = {
  p: { xs: 2.25, md: 3 },
  borderRadius: 4,
  background: '#fff',
  height: '100%',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
};

const TargetProgressRow = ({ label, actual, target, progress, isCurrency = false }) => {
  const actualDisplay = isCurrency ? formatCurrency(actual, 'INR') : actual;
  let targetDisplay = 'No target';

  if (target) {
    targetDisplay = isCurrency ? formatCurrency(target, 'INR') : target;
  }

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography fontWeight={700}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {actualDisplay}
          {' / '}
          {targetDisplay}
        </Typography>
      </Stack>
      <LinearProgress
        variant={target ? 'determinate' : 'indeterminate'}
        value={target ? Number(progress || 0) : 15}
        sx={{ height: 10, borderRadius: 999, backgroundColor: '#f3f4f6' }}
      />
    </Stack>
  );
};

const formatComparisonCardValue = (value, cardId) => {
  if (cardId === 'collections' || cardId === 'expenses') {
    return formatCurrency(value, 'INR');
  }

  if (cardId === 'fill_rate') {
    return formatPercent(value);
  }

  return value;
};

const formatComparisonDelta = (card) => {
  if (card.deltaPercent === null || card.deltaPercent === undefined) {
    return 'No baseline';
  }

  const prefix = card.deltaPercent > 0 ? '+' : '';

  if (card.id === 'fill_rate') {
    return `${prefix}${card.deltaPercent.toFixed(1)} pts`;
  }

  return `${prefix}${card.deltaPercent.toFixed(1)}%`;
};

const formatAttainment = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }

  return formatPercent(value);
};

const AdminReportsPage = () => {
  const { loading, isConfigured, user } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [filters, setFilters] = useState(createReportFilters);
  const [targetForm, setTargetForm] = useState(createTargetForm);
  const [presetForm, setPresetForm] = useState(createPresetForm);

  const [members, setMembers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [financeTargets, setFinanceTargets] = useState([]);
  const [reportPresets, setReportPresets] = useState([]);

  const quickRangeOptions = useMemo(() => buildQuickRangeOptions(new Date()), []);

  const syncTargetForm = useCallback((monthValue, targetRows = financeTargets) => {
    const targetMonth = monthInputToDate(monthValue || currentMonthInput());
    const matched = (targetRows || []).find((target) => String(target?.target_month || '').slice(0, 10) === targetMonth);

    if (matched) {
      setTargetForm(mapTargetToForm(matched));
      return;
    }

    setTargetForm(createTargetForm(monthValue || currentMonthInput()));
  }, [financeTargets]);

  const loadPage = useCallback(async (showLoader = false) => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      if (showLoader) {
        setPageLoading(true);
      } else {
        setRefreshing(true);
      }

      const sessionRows = await fetchClassSessions({
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: 'all',
        visibility: 'all',
        includeInactive: true,
        limit: 300,
      });

      const bookingRows = await fetchClassBookingsBySessionIds(sessionRows.map((session) => session.id), 5000);

      const [memberRows, invoiceRows, paymentRows, expenseRows, targetRows, presetRows] = await Promise.all([
        fetchMembers(),
        fetchBillingInvoices({ limit: 600 }),
        fetchBillingPayments({ limit: 800 }),
        fetchOperatingExpenses({ startDate: `${filters.reportYear}-01-01`, endDate: `${filters.reportYear}-12-31`, limit: 800 }),
        fetchFinanceTargets({ year: filters.reportYear, limit: 24 }),
        fetchReportPresets({ scope: 'admin_reports', limit: 30 }),
      ]);

      setMembers(memberRows);
      setInvoices(invoiceRows);
      setPayments(paymentRows);
      setExpenses(expenseRows);
      setSessions(sessionRows);
      setBookings(bookingRows);
      setFinanceTargets(targetRows);
      setReportPresets(presetRows);
      setTargetForm((current) => {
        const nextMonth = current?.month || currentMonthInput();
        const matched = (targetRows || []).find((target) => String(target?.target_month || '').slice(0, 10) === monthInputToDate(nextMonth));
        return matched ? mapTargetToForm(matched) : createTargetForm(nextMonth);
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load admin reports.' });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [filters.endDate, filters.reportYear, filters.startDate, isConfigured]);

  useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  const summary = useMemo(() => buildReportsSummary({
    members,
    invoices,
    payments,
    expenses,
    sessions,
    bookings,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [bookings, expenses, filters.endDate, filters.startDate, invoices, members, payments, sessions]);

  const trendRows = useMemo(() => buildTrendRows({
    year: filters.reportYear,
    members,
    invoices,
    payments,
    expenses,
    targets: financeTargets,
  }), [expenses, filters.reportYear, financeTargets, invoices, members, payments]);

  const trendChartData = useMemo(() => buildTrendChartData(trendRows), [trendRows]);
  const planMixChartData = useMemo(() => buildPlanMixChartData(members), [members]);
  const outstandingRows = useMemo(() => buildOutstandingRows(invoices, filters.endDate), [filters.endDate, invoices]);
  const expiringRows = useMemo(() => buildExpiringRows(members, filters.startDate, filters.endDate), [filters.endDate, filters.startDate, members]);
  const classRows = useMemo(() => buildClassPerformanceRows(sessions, bookings), [bookings, sessions]);
  const targetProgress = useMemo(() => buildTargetProgress(trendRows, targetForm.month), [targetForm.month, trendRows]);
  const decoratedClassRows = useMemo(() => buildDecoratedClassRows(classRows), [classRows]);
  const paymentMixRows = useMemo(() => buildPaymentMixRows(payments, filters.startDate, filters.endDate), [filters.endDate, filters.startDate, payments]);
  const paymentMixChartData = useMemo(() => buildPaymentMixChartData(paymentMixRows), [paymentMixRows]);
  const classUtilizationChartData = useMemo(() => buildClassUtilizationChartData(decoratedClassRows), [decoratedClassRows]);
  const comparison = useMemo(() => buildRangeComparison({
    members,
    invoices,
    payments,
    expenses,
    sessions,
    bookings,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [bookings, expenses, filters.endDate, filters.startDate, invoices, members, payments, sessions]);
  const scorecardRows = useMemo(() => buildMonthlyScorecardRows(trendRows), [trendRows]);
  const insights = useMemo(() => buildReportInsights({
    summary,
    comparison,
    outstandingRows,
    expiringRows,
    classRows: decoratedClassRows,
    trendRows,
  }), [comparison, decoratedClassRows, expiringRows, outstandingRows, summary, trendRows]);

  const handleFilterChange = (field) => (event) => {
    const { value } = event.target;
    const nextValue = field === 'reportYear' ? Number(value) : value;

    setFilters((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleQuickRangeApply = (option) => {
    setFilters((current) => ({
      ...current,
      startDate: option.startDate,
      endDate: option.endDate,
      reportYear: option.reportYear,
    }));
  };

  const handleTargetFieldChange = (field) => (event) => {
    const { value } = event.target;

    if (field === 'month') {
      syncTargetForm(value);
      return;
    }

    setTargetForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePresetFieldChange = (event) => {
    const { value } = event.target;

    setPresetForm((current) => ({
      ...current,
      name: value,
    }));
  };

  const handleSaveTarget = async () => {
    try {
      setSavingTarget(true);
      const savedTarget = await saveFinanceTarget({
        id: targetForm.id,
        target_month: monthInputToDate(targetForm.month),
        collections_target: targetForm.collectionsTarget,
        expense_cap: targetForm.expenseCap,
        active_members_target: targetForm.activeMembersTarget,
        renewals_target: targetForm.renewalsTarget,
        notes: targetForm.notes,
      }, user?.id || null);

      const nextTargets = [savedTarget, ...financeTargets.filter((target) => target.id !== savedTarget.id)];
      setFinanceTargets(nextTargets);
      syncTargetForm(targetForm.month, nextTargets);
      setFeedback({ type: 'success', message: 'Monthly target saved.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the target.' });
    } finally {
      setSavingTarget(false);
    }
  };

  const handleDeleteTarget = async () => {
    if (!targetForm.id) {
      setTargetForm(createTargetForm(targetForm.month));
      return;
    }

    if (!window.confirm('Delete this target?')) {
      return;
    }

    try {
      await deleteFinanceTarget(targetForm.id);
      const nextTargets = financeTargets.filter((target) => target.id !== targetForm.id);
      setFinanceTargets(nextTargets);
      syncTargetForm(targetForm.month, nextTargets);
      setFeedback({ type: 'success', message: 'Target deleted.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to delete the target.' });
    }
  };

  const handleSavePreset = async () => {
    try {
      setSavingPreset(true);
      const savedPreset = await saveReportPreset({
        id: presetForm.id,
        name: presetForm.name,
        scope: 'admin_reports',
        filters,
        export_sections: [],
      }, user?.id || null);

      setReportPresets((current) => [savedPreset, ...current.filter((preset) => preset.id !== savedPreset.id)]);
      setPresetForm(createPresetForm());
      setFeedback({ type: 'success', message: 'Preset saved.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the preset.' });
    } finally {
      setSavingPreset(false);
    }
  };

  const handleLoadPreset = (preset) => {
    setFilters((current) => applyPreset(preset, current));
    setPresetForm({ id: preset?.id || '', name: preset?.name || '' });
    setFeedback({ type: 'success', message: `Loaded preset “${preset?.name || 'preset'}”.` });
  };

  const handleDeletePreset = async (preset) => {
    if (!window.confirm(`Delete preset “${preset?.name || 'preset'}”?`)) {
      return;
    }

    try {
      await deleteReportPreset(preset.id);
      setReportPresets((current) => current.filter((item) => item.id !== preset.id));
      setFeedback({ type: 'success', message: 'Preset removed.' });
      setPresetForm(createPresetForm());
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to delete the preset.' });
    }
  };

  const handleRefresh = async () => {
    await loadPage();
  };

  const handleDownloadSnapshot = useCallback(() => {
    const csvContent = buildReportSnapshotCsv({
      filters,
      summary,
      scorecardRows,
      insights,
      outstandingRows,
      expiringRows,
      classRows: decoratedClassRows,
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = `reports-snapshot-${filters.startDate}-to-${filters.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    setFeedback({ type: 'success', message: 'CSV snapshot downloaded.' });
  }, [decoratedClassRows, expiringRows, filters, insights, outstandingRows, scorecardRows, summary]);

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading admin reports..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Reports, targets, and saved presets need Supabase setup" />

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>Reporting and analytics polish</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          See performance, period-over-period shifts, and action items in one reporting view
        </Typography>
        <Typography color="text.secondary" maxWidth="980px">
          Patch 35 refines the reporting workspace with period comparison cards, quick range presets, CSV snapshot export,
          payment-mix visibility, utilization summaries, and an action-oriented insight panel.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to={PATHS.adminFinance}
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Open finance export center
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownloadSnapshot}
            sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
          >
            Download CSV snapshot
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh reports'}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ ...sectionCardSx, mb: 3 }}>
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField label="Start date" type="date" value={filters.startDate} onChange={handleFilterChange('startDate')} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="End date" type="date" value={filters.endDate} onChange={handleFilterChange('endDate')} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Trend year" value={filters.reportYear} onChange={handleFilterChange('reportYear')} fullWidth>
                {[filters.reportYear - 1, filters.reportYear, filters.reportYear + 1].map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap>
            {quickRangeOptions.map((option) => (
              <Button
                key={option.id}
                variant="outlined"
                size="small"
                onClick={() => { handleQuickRangeApply(option); }}
                sx={{ textTransform: 'none', borderRadius: 999 }}
              >
                {option.label}
              </Button>
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Active range: {formatShortDate(filters.startDate)} – {formatShortDate(filters.endDate)}
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Active members" value={summary.activeMembers} caption={`${summary.expiringCount} expiring soon`} icon={PeopleAlt} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Renewals due" value={summary.renewalsDue} caption={formatCurrency(summary.outstandingBalance, 'INR')} icon={EventRepeat} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Collection rate" value={formatPercent(summary.collectionRate)} caption={formatCurrency(summary.collectedRevenue, 'INR')} icon={MonetizationOn} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Net cash flow" value={formatCurrency(summary.netCashFlow, 'INR')} caption={`No-shows ${formatPercent(summary.noShowRate)}`} icon={AutoGraph} />
        </Grid>
      </Grid>

      <Paper sx={{ ...sectionCardSx, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Period comparison</Typography>
            <Typography color="text.secondary">
              Compare the selected date range against the immediately previous period ({comparison.previousRangeLabel}).
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {comparison.cards.map((card) => (
              <Grid key={card.id} item xs={12} md={6} lg={3}>
                <ReportComparisonCard
                  title={card.label}
                  value={formatComparisonCardValue(card.currentValue, card.id)}
                  comparisonText={`Previous range: ${formatComparisonCardValue(card.previousValue, card.id)}`}
                  deltaText={formatComparisonDelta(card)}
                  deltaValue={card.deltaValue}
                  goal={card.goal}
                  helperText={card.helperText}
                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={8}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Monthly collections vs expenses</Typography>
                <Typography color="text.secondary">Track actual performance against collection targets for {filters.reportYear}.</Typography>
              </Box>
              <Box sx={{ height: 360 }}>
                <Bar data={trendChartData} options={chartOptions} />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} xl={4}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Plan mix</Typography>
                <Typography color="text.secondary">See how the active member base is distributed across plans.</Typography>
              </Box>
              {planMixChartData.labels.length ? (
                <Box sx={{ height: 320 }}>
                  <Doughnut data={planMixChartData} options={doughnutOptions} />
                </Box>
              ) : (
                <EmptyStateCard title="No plan assignments" description="Assign plans to members to unlock this chart." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Payment mix</Typography>
                <Typography color="text.secondary">Understand which payment methods are driving collections in the selected range.</Typography>
              </Box>
              {paymentMixRows.length ? (
                <Box sx={{ height: 320 }}>
                  <Doughnut data={paymentMixChartData} options={doughnutOptions} />
                </Box>
              ) : (
                <EmptyStateCard title="No payment data" description="Completed or refunded payments will appear here when available." />
              )}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Class utilisation buckets</Typography>
                <Typography color="text.secondary">Quickly see how many sessions are under-filled, healthy, or near-full.</Typography>
              </Box>
              {decoratedClassRows.length ? (
                <Box sx={{ height: 320 }}>
                  <Bar data={classUtilizationChartData} options={chartOptions} />
                </Box>
              ) : (
                <EmptyStateCard title="No class data" description="Create sessions and bookings to unlock utilisation reporting." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Monthly target planner</Typography>
                <Typography color="text.secondary">Set collections, expense, member, and renewal goals for the current month.</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Target month" type="month" value={targetForm.month} onChange={handleTargetFieldChange('month')} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Collections target" value={targetForm.collectionsTarget} onChange={handleTargetFieldChange('collectionsTarget')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Expense cap" value={targetForm.expenseCap} onChange={handleTargetFieldChange('expenseCap')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Active members target" value={targetForm.activeMembersTarget} onChange={handleTargetFieldChange('activeMembersTarget')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Renewals target" value={targetForm.renewalsTarget} onChange={handleTargetFieldChange('renewalsTarget')} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Notes" value={targetForm.notes} onChange={handleTargetFieldChange('notes')} multiline minRows={3} fullWidth />
                </Grid>
              </Grid>

              <Divider />

              {targetProgress ? (
                <Stack spacing={1.75}>
                  <TargetProgressRow label="Collections" actual={targetProgress.collections.actual} target={targetProgress.collections.target} progress={targetProgress.collections.progress} isCurrency />
                  <TargetProgressRow label="Expenses" actual={targetProgress.expenses.actual} target={targetProgress.expenses.target} progress={targetProgress.expenses.progress} isCurrency />
                  <TargetProgressRow label="Active members" actual={targetProgress.members.actual} target={targetProgress.members.target} progress={targetProgress.members.progress} />
                  <TargetProgressRow label="Renewals" actual={targetProgress.renewals.actual} target={targetProgress.renewals.target} progress={targetProgress.renewals.progress} />
                </Stack>
              ) : (
                <Typography color="text.secondary">Save a target first to compare actuals against your monthly goals.</Typography>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={handleSaveTarget} disabled={savingTarget} sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                  {savingTarget ? 'Saving target...' : 'Save target'}
                </Button>
                <Button variant="outlined" onClick={handleDeleteTarget} sx={{ textTransform: 'none', borderRadius: 999 }}>
                  {targetForm.id ? 'Delete target' : 'Clear target form'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Saved report presets</Typography>
                <Typography color="text.secondary">Store commonly used date ranges so you can reopen them in one click.</Typography>
              </Box>
              <TextField label="Preset name" value={presetForm.name} onChange={handlePresetFieldChange} fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={handleSavePreset} disabled={savingPreset} sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                  {savingPreset ? 'Saving preset...' : 'Save preset'}
                </Button>
                <Button component={RouterLink} to={PATHS.adminFinance} variant="outlined" sx={{ textTransform: 'none', borderRadius: 999 }}>
                  Go to Excel/PDF exports
                </Button>
              </Stack>

              {reportPresets.length ? (
                <Stack spacing={1.25}>
                  {reportPresets.map((preset) => (
                    <Paper key={preset.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Box>
                          <Typography fontWeight={800}>{preset.name}</Typography>
                          <Typography variant="body2" color="text.secondary">Created {formatShortDate(preset.created_at)}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1.25}>
                          <Button size="small" variant="outlined" onClick={() => handleLoadPreset(preset)} sx={{ textTransform: 'none', borderRadius: 999 }}>
                            Load
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => { handleDeletePreset(preset); }} sx={{ textTransform: 'none', borderRadius: 999 }}>
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <EmptyStateCard title="No presets yet" description="Save a preset after setting your preferred report dates." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Insights color="error" />
                <Box>
                  <Typography variant="h6" fontWeight={800}>Action centre</Typography>
                  <Typography color="text.secondary">The main issues or wins surfaced by the selected range.</Typography>
                </Box>
              </Stack>
              <ReportInsightPanel insights={insights} />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Monthly scorecard</Typography>
                <Typography color="text.secondary">Review monthly collections, target attainment, and cash flow trends at a glance.</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Collections</TableCell>
                      <TableCell align="right">Target</TableCell>
                      <TableCell align="right">Attainment</TableCell>
                      <TableCell align="right">Expenses</TableCell>
                      <TableCell align="right">Net cash</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...scorecardRows].reverse().map((row) => (
                      <TableRow key={row.month} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{formatShortDate(row.month)}</Typography>
                          <Typography variant="body2" color="text.secondary">Gap {row.collectionGap === null ? '—' : formatCurrency(row.collectionGap, 'INR')}</Typography>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(row.collectedRevenue, 'INR')}</TableCell>
                        <TableCell align="right">{row.collectionsTarget ? formatCurrency(row.collectionsTarget, 'INR') : '—'}</TableCell>
                        <TableCell align="right">{formatAttainment(row.collectionAttainment)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.expenseTotal, 'INR')}</TableCell>
                        <TableCell align="right">{formatCurrency(row.netCashFlow, 'INR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Outstanding dues</Typography>
                <Typography color="text.secondary">The invoices that need follow-up first.</Typography>
              </Box>
              {outstandingRows.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Member</TableCell>
                        <TableCell>Due</TableCell>
                        <TableCell>Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {outstandingRows.slice(0, 10).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography fontWeight={700}>{row.invoiceNumber}</Typography>
                            <Typography variant="body2" color="text.secondary">{row.status} • {row.daysOverdue} days</Typography>
                          </TableCell>
                          <TableCell>{row.memberName}</TableCell>
                          <TableCell>{formatShortDate(row.dueDate)}</TableCell>
                          <TableCell>{formatCurrency(row.balanceDue, 'INR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <EmptyStateCard title="No dues pending" description="Open, partial, and overdue invoices will appear here." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Expiring members</Typography>
                <Typography color="text.secondary">Use this list for renewal reminders and front-desk follow-ups.</Typography>
              </Box>
              {expiringRows.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Member</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell>Ends</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expiringRows.slice(0, 10).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography fontWeight={700}>{row.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{row.email}</Typography>
                          </TableCell>
                          <TableCell>{row.planName}</TableCell>
                          <TableCell>{formatShortDate(row.membershipEndDate)}</TableCell>
                          <TableCell>{row.membershipStatus}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <EmptyStateCard title="No expiries in range" description="Expand the report dates to review more upcoming renewals." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Class performance</Typography>
                <Typography color="text.secondary">Track class demand, missed sessions, and trainer-level hotspots before you adjust the timetable.</Typography>
              </Box>
              {decoratedClassRows.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Class</TableCell>
                        <TableCell>Trainer</TableCell>
                        <TableCell>Booked</TableCell>
                        <TableCell>Attended</TableCell>
                        <TableCell>Missed</TableCell>
                        <TableCell>Fill</TableCell>
                        <TableCell>No-show</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {decoratedClassRows.slice(0, 12).map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography fontWeight={700}>{row.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{formatShortDate(row.startsAt)}</Typography>
                          </TableCell>
                          <TableCell>{row.trainerName}</TableCell>
                          <TableCell>{row.bookedCount}/{row.capacity}</TableCell>
                          <TableCell>{row.attendedCount}</TableCell>
                          <TableCell>{row.missedCount}</TableCell>
                          <TableCell>{formatPercent(row.fillRate)}</TableCell>
                          <TableCell>{formatPercent(row.noShowRate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <EmptyStateCard title="No class performance data" description="Create sessions and bookings to unlock class analytics." />
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminReportsPage;
