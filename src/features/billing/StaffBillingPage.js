import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
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
  Add,
  DeleteOutline,
  Paid,
  ReceiptLong,
  Refresh,
  Autorenew,
} from '@mui/icons-material';

import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchBillingInvoices,
  fetchBillingPayments,
  fetchMembers,
  generateDueMembershipInvoices,
  recordBillingPayment,
  saveBillingInvoice,
} from '../../services/gymService';
import {
  BILLING_PROFILE_METHOD_OPTIONS,
  buildStaffBillingStats,
  calculateInvoiceDraftTotals,
  createEmptyInvoiceForm,
  createEmptyInvoiceLineItem,
  createEmptyPaymentForm,
  formatBillingDate,
  formatCurrency,
  getInvoiceStatusChipSx,
  getInvoiceStatusMeta,
  getInvoiceTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusChipSx,
  getPaymentStatusMeta,
  INVOICE_STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  normaliseInvoiceForForm,
  normalisePaymentForForm,
  PAYMENT_STATUS_OPTIONS,
  sortBillingInvoices,
  sortBillingPayments,
} from './billingHelpers';

const createFilters = () => ({
  memberId: 'all',
  status: 'all',
  invoiceType: 'all',
});

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const StaffBillingPage = () => {
  const { user, loading, profile, isConfigured } = useAuth();

  const [filters, setFilters] = useState(createFilters);
  const [members, setMembers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  const [invoiceForm, setInvoiceForm] = useState(createEmptyInvoiceForm());
  const [paymentForm, setPaymentForm] = useState(createEmptyPaymentForm());

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [generatingRenewals, setGeneratingRenewals] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const selectedMember = useMemo(
    () => members.find((member) => member.id === invoiceForm.member_id) || null,
    [invoiceForm.member_id, members],
  );

  const selectedPaymentInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === paymentForm.invoice_id) || null,
    [invoices, paymentForm.invoice_id],
  );

  const stats = useMemo(() => buildStaffBillingStats(invoices, payments), [invoices, payments]);
  const invoiceTotals = useMemo(() => calculateInvoiceDraftTotals(invoiceForm), [invoiceForm]);

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

      const memberFilter = filters.memberId !== 'all' ? filters.memberId : null;

      const [memberRows, invoiceRows, paymentRows] = await Promise.all([
        fetchMembers(),
        fetchBillingInvoices({
          memberId: memberFilter,
          status: filters.status,
          invoiceType: filters.invoiceType,
          limit: 80,
        }),
        fetchBillingPayments({
          memberId: memberFilter,
          limit: 80,
        }),
      ]);

      setMembers(memberRows);
      setInvoices(sortBillingInvoices(invoiceRows));
      setPayments(sortBillingPayments(paymentRows));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the billing workspace.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [filters.invoiceType, filters.memberId, filters.status, isConfigured]);

  useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    if (!invoiceForm.member_id && members.length) {
      const firstMember = members[0];
      setInvoiceForm((current) => ({
        ...createEmptyInvoiceForm(firstMember),
        items: current.items?.length ? current.items : createEmptyInvoiceForm(firstMember).items,
      }));
    }
  }, [invoiceForm.member_id, members]);

  const handleFilterChange = (field) => (event) => {
    const { value } = event.target;
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleRefresh = async () => {
    await loadPage();
  };

  const handleInvoiceFieldChange = (field) => (event) => {
    const { value } = event.target;

    setInvoiceForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
      };

      if (field === 'member_id') {
        const nextMember = members.find((member) => member.id === value) || null;

        return {
          ...nextForm,
          plan_id: nextMember?.plan_id || '',
          billing_period_start: current.billing_period_start || nextMember?.next_billing_date || todayIsoDate(),
          billing_period_end: current.billing_period_end || nextMember?.membership_end_date || '',
          items: current.items?.length
            ? current.items.map((item, index) => (
              index === 0
                ? {
                  ...item,
                  description: item.description || nextMember?.plan?.name || 'Membership renewal',
                  linked_plan_name: item.linked_plan_name || nextMember?.plan?.name || '',
                  unit_price: item.unit_price !== '' ? item.unit_price : (nextMember?.plan?.price ?? ''),
                }
                : item
            ))
            : createEmptyInvoiceForm(nextMember).items,
        };
      }

      return nextForm;
    });
  };

  const handleInvoiceItemChange = (index, field) => (event) => {
    const { value } = event.target;

    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const handleAddItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      items: [...(current.items || []), createEmptyInvoiceLineItem()],
    }));
  };

  const handleRemoveItem = (index) => () => {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.length > 1
        ? current.items.filter((_item, itemIndex) => itemIndex !== index)
        : current.items,
    }));
  };

  const handleResetInvoiceForm = () => {
    setInvoiceForm(createEmptyInvoiceForm(selectedMember || members[0] || null));
  };

  const handleEditInvoice = (invoice) => {
    const member = members.find((row) => row.id === invoice.member_id) || null;
    setInvoiceForm(normaliseInvoiceForForm(invoice, member));
    setPaymentForm((current) => ({
      ...current,
      invoice_id: invoice.id,
      member_id: invoice.member_id,
      amount: invoice.balance_due ?? '',
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreparePayment = (invoice) => {
    setPaymentForm(normalisePaymentForForm({}, invoice));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveInvoice = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingInvoice(true);
      await saveBillingInvoice(invoiceForm, user?.id || profile?.id || null);
      await loadPage();
      setFeedback({
        type: 'success',
        message: invoiceForm.id ? 'Invoice updated.' : 'Invoice created.',
      });
      handleResetInvoiceForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save the invoice.',
      });
    } finally {
      setSavingInvoice(false);
    }
  };

  const handlePaymentFieldChange = (field) => (event) => {
    const { value } = event.target;

    setPaymentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingPayment(true);
      await recordBillingPayment(paymentForm.invoice_id, paymentForm);
      await loadPage();
      setFeedback({
        type: 'success',
        message: 'Payment recorded.',
      });
      setPaymentForm(createEmptyPaymentForm());
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to record the payment.',
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleGenerateRenewals = async () => {
    try {
      setGeneratingRenewals(true);
      const results = await generateDueMembershipInvoices({
        dueDate: todayIsoDate(),
        memberId: filters.memberId !== 'all' ? filters.memberId : null,
      });
      await loadPage();
      setFeedback({
        type: 'success',
        message: results.length
          ? `Generated ${results.length} renewal invoice(s).`
          : 'No renewal invoices were due today.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to generate renewal invoices.',
      });
    } finally {
      setGeneratingRenewals(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading the billing workspace..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Billing tools need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff billing workspace
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Run renewals, invoices, and payment collection
        </Typography>
        <Typography color="text.secondary" maxWidth="980px">
          Create invoices, auto-generate due renewals, record manual payments, and keep a shared ledger for the front desk and admins.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Outstanding balance"
            value={formatCurrency(stats.outstandingBalance)}
            caption={`${stats.openInvoiceCount} open invoice(s)`}
            icon={ReceiptLong}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Collected"
            value={formatCurrency(stats.collectedTotal)}
            caption={`${stats.paidInvoiceCount} paid invoice(s)`}
            icon={Paid}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Overdue"
            value={stats.overdueCount}
            caption="Need follow-up"
            icon={ReceiptLong}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Invoices"
            value={stats.invoiceCount}
            caption={refreshing ? 'Refreshing…' : 'Visible in current filter'}
            icon={ReceiptLong}
          />
        </Grid>
      </Grid>

      <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography color="#ff2625" fontWeight={700}>
                Filters
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                Narrow the ledger
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                onClick={handleGenerateRenewals}
                variant="contained"
                startIcon={<Autorenew />}
                disabled={generatingRenewals}
                sx={{
                  bgcolor: '#ff2625',
                  textTransform: 'none',
                  borderRadius: 999,
                  '&:hover': { bgcolor: '#df1d1d' },
                }}
              >
                {generatingRenewals ? 'Generating…' : 'Generate due renewals'}
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outlined"
                startIcon={<Refresh />}
                sx={{ textTransform: 'none', borderRadius: 999 }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Member"
                value={filters.memberId}
                onChange={handleFilterChange('memberId')}
                fullWidth
              >
                <MenuItem value="all">All members</MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Invoice status"
                value={filters.status}
                onChange={handleFilterChange('status')}
                fullWidth
              >
                <MenuItem value="all">All statuses</MenuItem>
                {INVOICE_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Invoice type"
                value={filters.invoiceType}
                onChange={handleFilterChange('invoiceType')}
                fullWidth
              >
                <MenuItem value="all">All types</MenuItem>
                {INVOICE_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={6}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5} component="form" onSubmit={handleSaveInvoice}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography color="#ff2625" fontWeight={700}>
                    Invoice editor
                  </Typography>
                  <Typography variant="h5" fontWeight={800} mt={0.5}>
                    {invoiceForm.id ? 'Edit invoice' : 'Create invoice'}
                  </Typography>
                </Box>

                <Button
                  onClick={handleResetInvoiceForm}
                  variant="outlined"
                  sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
                >
                  Reset form
                </Button>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Member"
                    value={invoiceForm.member_id}
                    onChange={handleInvoiceFieldChange('member_id')}
                    fullWidth
                    required
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Invoice type"
                    value={invoiceForm.invoice_type}
                    onChange={handleInvoiceFieldChange('invoice_type')}
                    fullWidth
                  >
                    {INVOICE_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Issue date"
                    type="date"
                    value={invoiceForm.issue_date}
                    onChange={handleInvoiceFieldChange('issue_date')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Due date"
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={handleInvoiceFieldChange('due_date')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Status"
                    value={invoiceForm.status}
                    onChange={handleInvoiceFieldChange('status')}
                    fullWidth
                  >
                    {INVOICE_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Billing period start"
                    type="date"
                    value={invoiceForm.billing_period_start}
                    onChange={handleInvoiceFieldChange('billing_period_start')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Billing period end"
                    type="date"
                    value={invoiceForm.billing_period_end}
                    onChange={handleInvoiceFieldChange('billing_period_end')}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Tax amount"
                    value={invoiceForm.tax_amount}
                    onChange={handleInvoiceFieldChange('tax_amount')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Discount amount"
                    value={invoiceForm.discount_amount}
                    onChange={handleInvoiceFieldChange('discount_amount')}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Divider />

              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Typography variant="h6" fontWeight={800}>
                    Line items
                  </Typography>
                  <Button
                    onClick={handleAddItem}
                    startIcon={<Add />}
                    variant="outlined"
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    Add item
                  </Button>
                </Stack>

                {(invoiceForm.items || []).map((item, index) => (
                  <Paper key={item.client_id || item.id || `${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <TextField
                          label={`Item ${index + 1} description`}
                          value={item.description}
                          onChange={handleInvoiceItemChange(index, 'description')}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Qty"
                          value={item.quantity}
                          onChange={handleInvoiceItemChange(index, 'quantity')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          label="Unit price"
                          value={item.unit_price}
                          onChange={handleInvoiceItemChange(index, 'unit_price')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCurrency((Number(item.quantity || 0) || 0) * (Number(item.unit_price || 0) || 0))}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          onClick={handleRemoveItem(index)}
                          disabled={(invoiceForm.items || []).length === 1}
                          color="error"
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>

              <TextField
                label="Notes"
                value={invoiceForm.notes}
                onChange={handleInvoiceFieldChange('notes')}
                multiline
                minRows={3}
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                <Chip label={`Subtotal: ${formatCurrency(invoiceTotals.subtotal)}`} />
                <Chip label={`Tax: ${formatCurrency(invoiceTotals.taxAmount)}`} />
                <Chip label={`Discount: ${formatCurrency(invoiceTotals.discountAmount)}`} />
                <Chip label={`Balance due: ${formatCurrency(invoiceTotals.balanceDue)}`} />
              </Stack>

              <Button
                type="submit"
                variant="contained"
                disabled={savingInvoice}
                sx={{
                  bgcolor: '#ff2625',
                  textTransform: 'none',
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  '&:hover': { bgcolor: '#df1d1d' },
                }}
              >
                {(() => {
                  if (savingInvoice) return 'Saving…';
                  if (invoiceForm.id) return 'Save invoice changes';
                  return 'Create invoice';
                })()}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={6}>
          <Stack spacing={3}>
            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5} component="form" onSubmit={handleRecordPayment}>
                <Box>
                  <Typography color="#ff2625" fontWeight={700}>
                    Payment recorder
                  </Typography>
                  <Typography variant="h5" fontWeight={800} mt={0.5}>
                    Collect or backfill a payment
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      select
                      label="Invoice"
                      value={paymentForm.invoice_id}
                      onChange={handlePaymentFieldChange('invoice_id')}
                      fullWidth
                      required
                    >
                      {invoices.map((invoice) => (
                        <MenuItem key={invoice.id} value={invoice.id}>
                          {(invoice.invoice_number || 'Draft invoice')} — {invoice.member?.full_name || invoice.member?.email}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Payment date"
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={handlePaymentFieldChange('payment_date')}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Method"
                      value={paymentForm.payment_method}
                      onChange={handlePaymentFieldChange('payment_method')}
                      fullWidth
                    >
                      {BILLING_PROFILE_METHOD_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Payment status"
                      value={paymentForm.payment_status}
                      onChange={handlePaymentFieldChange('payment_status')}
                      fullWidth
                    >
                      {PAYMENT_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Amount"
                      value={paymentForm.amount}
                      onChange={handlePaymentFieldChange('amount')}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Reference"
                      value={paymentForm.reference_code}
                      onChange={handlePaymentFieldChange('reference_code')}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Processor / channel"
                  value={paymentForm.processor_name}
                  onChange={handlePaymentFieldChange('processor_name')}
                  fullWidth
                  placeholder="Example: Front desk cash, PhonePe, Stripe, Razorpay"
                />

                <TextField
                  label="Notes"
                  value={paymentForm.notes}
                  onChange={handlePaymentFieldChange('notes')}
                  multiline
                  minRows={3}
                  fullWidth
                />

                {selectedPaymentInvoice ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Chip label={`Member: ${selectedPaymentInvoice.member?.full_name || selectedPaymentInvoice.member?.email || 'Member'}`} />
                    <Chip label={`Balance: ${formatCurrency(selectedPaymentInvoice.balance_due, selectedPaymentInvoice.currency_code)}`} />
                    <Chip label={`Due: ${formatBillingDate(selectedPaymentInvoice.due_date)}`} />
                  </Stack>
                ) : null}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={savingPayment}
                  sx={{
                    bgcolor: '#ff2625',
                    textTransform: 'none',
                    borderRadius: 999,
                    alignSelf: 'flex-start',
                    '&:hover': { bgcolor: '#df1d1d' },
                  }}
                >
                  {savingPayment ? 'Recording…' : 'Record payment'}
                </Button>
              </Stack>
            </Paper>

            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography color="#ff2625" fontWeight={700}>
                    Invoice ledger
                  </Typography>
                  <Typography variant="h5" fontWeight={800} mt={0.5}>
                    Current invoices
                  </Typography>
                </Box>

                {!invoices.length ? (
                  <EmptyStateCard
                    title="No invoices found"
                    description="Try a broader filter or generate due renewals to seed the billing ledger."
                  />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Invoice</TableCell>
                          <TableCell>Member</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Balance</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id} hover>
                            <TableCell>
                              <Stack spacing={0.35}>
                                <Typography fontWeight={700}>
                                  {invoice.invoice_number || 'Draft invoice'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {getInvoiceTypeLabel(invoice.invoice_type)} · Due {formatBillingDate(invoice.due_date)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{invoice.member?.full_name || invoice.member?.email || 'Member'}</TableCell>
                            <TableCell>
                              <Chip
                                label={getInvoiceStatusMeta(invoice.status).label}
                                sx={getInvoiceStatusChipSx(invoice.status)}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(invoice.balance_due, invoice.currency_code)}
                            </TableCell>
                            <TableCell>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleEditInvoice(invoice)}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handlePreparePayment(invoice)}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Collect
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Paper>

            <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography color="#ff2625" fontWeight={700}>
                    Payment ledger
                  </Typography>
                  <Typography variant="h5" fontWeight={800} mt={0.5}>
                    Recent payments
                  </Typography>
                </Box>

                {!payments.length ? (
                  <EmptyStateCard
                    title="No payments yet"
                    description="Payments recorded here will update invoice balances and help you track collections."
                  />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Member</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Reference</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>{formatBillingDate(payment.payment_date)}</TableCell>
                            <TableCell>{payment.member?.full_name || payment.member?.email || 'Member'}</TableCell>
                            <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                            <TableCell>
                              <Chip
                                label={getPaymentStatusMeta(payment.payment_status).label}
                                sx={getPaymentStatusChipSx(payment.payment_status)}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(payment.amount, payment.invoice?.currency_code || 'INR')}
                            </TableCell>
                            <TableCell>{payment.reference_code || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffBillingPage;
