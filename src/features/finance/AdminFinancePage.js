import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
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
  Autorenew,
  Download,
  Email,
  Inventory,
  Paid,
  ReceiptLong,
  RequestQuote,
  Savings,
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import { useAuth } from '../../context/AuthContext';
import {
  fetchBillingEmailLog,
  fetchBillingInvoices,
  fetchBillingPayments,
  fetchMembers,
  fetchOperatingExpenses,
  generateDueMembershipInvoicesWithEmail,
  saveOperatingExpense,
  sendBillingInvoiceEmail,
} from '../../services/gymService';
import { formatCurrency } from '../billing/billingHelpers';
import {
  buildExpenseChartData,
  buildFinanceSummary,
  buildMonthlyTrendRows,
  buildPaymentMethodChartData,
  buildRevenueChartData,
  createExpenseForm,
  createExportSelection,
  downloadFinancePdf,
  downloadFinanceWorkbook,
  endOfToday,
  filterExpensesByDateRange,
  filterInvoicesByDateRange,
  filterMembersByExpiry,
  filterPaymentsByDateRange,
  FINANCE_EXPORT_SECTION_OPTIONS,
  formatShortDate,
  getExpenseCategoryLabel,
  OPERATING_EXPENSE_CATEGORY_OPTIONS,
  startOfCurrentMonth,
} from './financeHelpers';

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

const currentYear = new Date().getFullYear();

const AdminFinancePage = () => {
  const { loading, isConfigured, profile, user } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState('');
  const [generatingRenewals, setGeneratingRenewals] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [members, setMembers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  const [dateRange, setDateRange] = useState({
    startDate: startOfCurrentMonth(),
    endDate: endOfToday(),
  });
  const [reportYear, setReportYear] = useState(currentYear);
  const [expenseForm, setExpenseForm] = useState(createExpenseForm);
  const [exportSelection, setExportSelection] = useState(createExportSelection);
  const [autoEmailRenewals, setAutoEmailRenewals] = useState(true);

  const loadPage = useCallback(async (showPageLoader = false) => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      if (showPageLoader) {
        setPageLoading(true);
      } else {
        setRefreshing(true);
      }

      const [memberRows, invoiceRows, paymentRows, expenseRows, emailRows] = await Promise.all([
        fetchMembers(),
        fetchBillingInvoices({ limit: 400 }),
        fetchBillingPayments({ limit: 400 }),
        fetchOperatingExpenses({ limit: 300 }),
        fetchBillingEmailLog({ limit: 120 }),
      ]);

      setMembers(memberRows);
      setInvoices(invoiceRows);
      setPayments(paymentRows);
      setExpenses(expenseRows);
      setEmailLogs(emailRows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the finance control center.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  const filteredMembers = useMemo(
    () => members.filter((member) => member.role === 'member'),
    [members],
  );

  const filteredInvoices = useMemo(
    () => filterInvoicesByDateRange(invoices, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, invoices],
  );

  const filteredPayments = useMemo(
    () => filterPaymentsByDateRange(payments, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, payments],
  );

  const filteredExpenses = useMemo(
    () => filterExpensesByDateRange(expenses, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, expenses],
  );

  const expiringMembers = useMemo(
    () => filterMembersByExpiry(filteredMembers, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, filteredMembers],
  );

  const summary = useMemo(() => buildFinanceSummary({
    members: filteredMembers,
    invoices,
    payments,
    expenses,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [dateRange.endDate, dateRange.startDate, expenses, filteredMembers, invoices, payments]);

  const trendRows = useMemo(() => buildMonthlyTrendRows({
    year: reportYear,
    invoices,
    payments,
    expenses,
  }), [expenses, invoices, payments, reportYear]);

  const latestEmailByInvoice = useMemo(() => emailLogs.reduce((accumulator, log) => {
    if (!log?.invoice_id) {
      return accumulator;
    }

    const existing = accumulator[log.invoice_id];
    if (!existing || String(log.created_at || '').localeCompare(String(existing.created_at || '')) > 0) {
      return {
        ...accumulator,
        [log.invoice_id]: log,
      };
    }

    return accumulator;
  }, {}), [emailLogs]);

  const revenueChartData = useMemo(() => buildRevenueChartData(trendRows), [trendRows]);
  const expenseChartData = useMemo(
    () => buildExpenseChartData(expenses, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, expenses],
  );
  const paymentMethodChartData = useMemo(
    () => buildPaymentMethodChartData(payments, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, payments],
  );

  const recentRenewalInvoices = useMemo(
    () => filteredInvoices
      .filter((invoice) => invoice.invoice_type === 'membership_renewal')
      .slice(0, 12),
    [filteredInvoices],
  );

  const handleDateRangeChange = (field) => (event) => {
    setDateRange((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleExpenseFieldChange = (field) => (event) => {
    setExpenseForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleExportSelectionChange = (field) => (event) => {
    setExportSelection((current) => ({
      ...current,
      [field]: event.target.checked,
    }));
  };

  const handleSaveExpense = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingExpense(true);
      await saveOperatingExpense(expenseForm, user?.id || profile?.id || null);
      setExpenseForm(createExpenseForm());
      await loadPage();
      setFeedback({ type: 'success', message: 'Expense entry saved.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save expense.' });
    } finally {
      setSavingExpense(false);
    }
  };

  const handleRenewalRun = async () => {
    setFeedback({ type: '', message: '' });

    try {
      setGeneratingRenewals(true);
      const createdInvoices = await generateDueMembershipInvoicesWithEmail({
        dueDate: dateRange.endDate,
        sendEmails: autoEmailRenewals,
        triggerSource: 'renewal',
      });
      await loadPage();
      setFeedback({
        type: 'success',
        message: `${createdInvoices.length} renewal invoice(s) generated${autoEmailRenewals ? ' and email delivery was attempted.' : '.'}`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to generate renewals.',
      });
    } finally {
      setGeneratingRenewals(false);
    }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      setSendingInvoiceId(invoice.id);
      setFeedback({ type: '', message: '' });
      await sendBillingInvoiceEmail(invoice.id, {
        triggerSource: latestEmailByInvoice[invoice.id] ? 'resend' : 'manual',
      });
      await loadPage();
      setFeedback({
        type: 'success',
        message: `Invoice ${invoice.invoice_number || ''} email send was attempted.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to send invoice email.',
      });
    } finally {
      setSendingInvoiceId('');
    }
  };

  const handleExcelExport = async () => {
    try {
      await downloadFinanceWorkbook({
        selection: exportSelection,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        summary,
        members: filteredMembers,
        expiringMembers,
        invoices: filteredInvoices,
        payments: filteredPayments,
        expenses: filteredExpenses,
        trendRows,
      });
      setFeedback({ type: 'success', message: 'Excel export downloaded.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to export the Excel workbook.' });
    }
  };

  const handlePdfExport = async () => {
    try {
      await downloadFinancePdf({
        selection: exportSelection,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        summary,
        expiringMembers,
        invoices: filteredInvoices,
        expenses: filteredExpenses,
        trendRows,
      });
      setFeedback({ type: 'success', message: 'PDF export downloaded.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to export the PDF summary.' });
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading finance control center..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Exports, finance analytics, and billing emails need Supabase setup" />

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Finance control center and exports
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Watch renewals, expenses, cash flow, and downloadable reports
        </Typography>
        <Typography color="text.secondary" maxWidth="980px">
          This patch gives admin a structured finance cockpit: issue renewal runs, email bills,
          track money in and money out, monitor expiring memberships, and export clean Excel or PDF reports.
        </Typography>
      </Stack>

      <Paper sx={{ ...sectionCardSx, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField label="Start date" type="date" value={dateRange.startDate} onChange={handleDateRangeChange('startDate')} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="End date" type="date" value={dateRange.endDate} onChange={handleDateRangeChange('endDate')} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Trend year" value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))} fullWidth>
              {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => void loadPage()}
                disabled={refreshing}
                sx={{ borderRadius: 999, textTransform: 'none' }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh data'}
              </Button>
              <Button
                variant="contained"
                onClick={handleRenewalRun}
                disabled={generatingRenewals}
                startIcon={<Autorenew />}
                sx={{ borderRadius: 999, textTransform: 'none', bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
              >
                {generatingRenewals ? 'Running renewals...' : 'Generate due renewals'}
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={autoEmailRenewals} onChange={(event) => setAutoEmailRenewals(event.target.checked)} color="error" />}
              label="Attempt invoice email delivery after renewal generation"
            />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard title="Collected" value={formatCurrency(summary.collectedRevenue, 'INR')} caption="Payments completed in range" icon={Paid} />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard title="Outstanding" value={formatCurrency(summary.outstandingBalance, 'INR')} caption="Open, partial, or overdue balance" icon={RequestQuote} />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard title="Expenses" value={formatCurrency(summary.expenseTotal, 'INR')} caption="Staff, maintenance, tools, and more" icon={Savings} />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard title="Expiring soon" value={summary.expiringCount} caption="Members ending in the selected window" icon={Inventory} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={8}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Revenue vs expenses trend</Typography>
                <Typography color="text.secondary">A year-at-a-glance trend for collected revenue and expenses.</Typography>
              </Box>
              <Box sx={{ minHeight: 320 }}>
                <Line
                  data={revenueChartData}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                  height={320}
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} xl={4}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Payment mix</Typography>
                <Typography color="text.secondary">How members paid during the selected range.</Typography>
              </Box>
              <Box sx={{ minHeight: 320 }}>
                <Doughnut
                  data={paymentMethodChartData}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                  height={320}
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7} xl={7}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Expense categories</Typography>
                <Typography color="text.secondary">This helps owners see where cash is going each month.</Typography>
              </Box>
              <Box sx={{ minHeight: 320 }}>
                <Bar
                  data={expenseChartData}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { display: false } },
                  }}
                  height={320}
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5} xl={5}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Quick finance pulse</Typography>
              <Typography color="text.secondary">A simple manager-friendly snapshot of what matters today.</Typography>
              <Divider />
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Issued revenue</Typography>
                  <Typography fontWeight={700}>{formatCurrency(summary.issuedRevenue, 'INR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Collected revenue</Typography>
                  <Typography fontWeight={700}>{formatCurrency(summary.collectedRevenue, 'INR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Net cash flow</Typography>
                  <Typography fontWeight={700}>{formatCurrency(summary.netCashFlow, 'INR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Staff cost</Typography>
                  <Typography fontWeight={700}>{formatCurrency(summary.staffCost, 'INR')}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Active members</Typography>
                  <Typography fontWeight={700}>{summary.activeMembers}</Typography>
                </Stack>
              </Stack>
              <Divider />
              {expiringMembers.length ? (
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight={800}>Expiring members in range</Typography>
                  {expiringMembers.slice(0, 5).map((member) => (
                    <Stack key={member.id} direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography fontWeight={700}>{member.full_name || member.email}</Typography>
                        <Typography variant="body2" color="text.secondary">{member.plan?.name || 'No plan selected'}</Typography>
                      </Box>
                      <Chip label={formatShortDate(member.membership_end_date)} size="small" sx={{ bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }} />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <EmptyStateCard title="No expiries in the selected range" description="Try widening the export window to see upcoming renewals." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={5}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Export center</Typography>
                <Typography color="text.secondary">Choose what you want in the workbook or PDF before downloading.</Typography>
              </Box>

              <FormGroup>
                <Grid container spacing={1}>
                  {FINANCE_EXPORT_SECTION_OPTIONS.map((section) => (
                    <Grid item xs={12} sm={6} key={section.key}>
                      <FormControlLabel
                        control={<Switch checked={exportSelection[section.key]} onChange={handleExportSelectionChange(section.key)} color="error" />}
                        label={section.label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" startIcon={<Download />} onClick={handleExcelExport} sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                  Download Excel
                </Button>
                <Button variant="outlined" startIcon={<ReceiptLong />} onClick={handlePdfExport} sx={{ textTransform: 'none', borderRadius: 999 }}>
                  Download PDF
                </Button>
              </Stack>

              <Typography color="text.secondary">
                The Excel export is organized into multiple sheets such as members, expiring memberships, revenue,
                expenses, yearly trends, staff cost, maintenance, and outstanding dues.
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={7}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Record operating expenses</Typography>
                <Typography color="text.secondary">Track staff pay, maintenance, rent, utilities, and anything else leaving the business.</Typography>
              </Box>
              <Box component="form" onSubmit={handleSaveExpense}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField label="Expense date" type="date" value={expenseForm.expense_date} onChange={handleExpenseFieldChange('expense_date')} fullWidth InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField select label="Category" value={expenseForm.expense_category} onChange={handleExpenseFieldChange('expense_category')} fullWidth>
                      {OPERATING_EXPENSE_CATEGORY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Amount" type="number" value={expenseForm.amount} onChange={handleExpenseFieldChange('amount')} fullWidth required />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Payment method" value={expenseForm.payment_method} onChange={handleExpenseFieldChange('payment_method')} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Description" value={expenseForm.description} onChange={handleExpenseFieldChange('description')} fullWidth required />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Vendor / payee" value={expenseForm.vendor_name} onChange={handleExpenseFieldChange('vendor_name')} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Branch" value={expenseForm.branch_name} onChange={handleExpenseFieldChange('branch_name')} fullWidth />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Notes" value={expenseForm.notes} onChange={handleExpenseFieldChange('notes')} fullWidth multiline minRows={2} />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Typography color="text.secondary">Common buckets are staff salary, commissions, rent, utilities, software, marketing, equipment, and maintenance.</Typography>
                      <Button type="submit" variant="contained" disabled={savingExpense} sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                        {savingExpense ? 'Saving expense...' : 'Save expense'}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Recent renewal invoices and email delivery</Typography>
                <Typography color="text.secondary">Admins can resend bills on demand and monitor the most recent delivery attempt.</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Member</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell>Email status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentRenewalInvoices.map((invoice) => {
                      const emailLog = latestEmailByInvoice[invoice.id];
                      const emailStatus = emailLog?.delivery_status || 'not_sent';

                      return (
                        <TableRow key={invoice.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography fontWeight={700}>{invoice.invoice_number || 'Pending number'}</Typography>
                              <Typography variant="body2" color="text.secondary">{invoice.status}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{invoice.member?.full_name || invoice.member?.email || '—'}</TableCell>
                          <TableCell>{formatCurrency(invoice.total_amount, invoice.currency_code || 'INR')}</TableCell>
                          <TableCell>{formatShortDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={emailStatus.replace('_', ' ')}
                              sx={{
                                bgcolor: emailStatus === 'sent' ? '#ecfdf3' : emailStatus === 'failed' ? '#fef2f2' : '#f8fafc',
                                color: emailStatus === 'sent' ? '#047857' : emailStatus === 'failed' ? '#b91c1c' : '#475569',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<Email />}
                              onClick={() => handleSendInvoice(invoice)}
                              disabled={sendingInvoiceId === invoice.id}
                              sx={{ textTransform: 'none' }}
                            >
                              {sendingInvoiceId === invoice.id ? 'Sending...' : 'Send email'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Recent operating expenses</Typography>
                <Typography color="text.secondary">A clean list of costs recorded in the selected range.</Typography>
              </Box>
              {filteredExpenses.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredExpenses.slice(0, 20).map((expense) => (
                        <TableRow key={expense.id} hover>
                          <TableCell>{formatShortDate(expense.expense_date)}</TableCell>
                          <TableCell>{getExpenseCategoryLabel(expense.expense_category)}</TableCell>
                          <TableCell>{expense.description || '—'}</TableCell>
                          <TableCell>{expense.vendor_name || '—'}</TableCell>
                          <TableCell>{formatCurrency(expense.amount, 'INR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <EmptyStateCard title="No expenses recorded yet" description="As soon as you log rent, maintenance, staff payouts, or utilities, they will appear here and feed the export center." />
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminFinancePage;
