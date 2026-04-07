import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
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
  ReceiptLong,
  Repeat,
  Wallet,
} from '@mui/icons-material';

import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchBillingInvoices,
  fetchBillingPayments,
  fetchBillingProfile,
  saveBillingProfile,
} from '../../services/gymService';
import {
  BILLING_PROFILE_METHOD_OPTIONS,
  buildBillingSummary,
  createEmptyBillingProfile,
  formatBillingDate,
  formatCurrency,
  getInvoiceStatusChipSx,
  getInvoiceStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusChipSx,
  getPaymentStatusMeta,
  normaliseBillingProfileForForm,
  sortBillingInvoices,
  sortBillingPayments,
} from './billingHelpers';

const BillingPage = () => {
  const {
    user,
    profile,
    loading,
    isConfigured,
  } = useAuth();

  const [billingProfile, setBillingProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(createEmptyBillingProfile());
  const [pageLoading, setPageLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadPage = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [profileRow, invoiceRows, paymentRows] = await Promise.all([
        fetchBillingProfile(user.id),
        fetchBillingInvoices({ memberId: user.id, limit: 20 }),
        fetchBillingPayments({ memberId: user.id, limit: 20 }),
      ]);

      setBillingProfile(profileRow);
      setInvoices(sortBillingInvoices(invoiceRows));
      setPayments(sortBillingPayments(paymentRows));
      setForm(normaliseBillingProfileForForm(profileRow || {}, profile || {}));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load your billing tools.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, profile, user]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!billingProfile && profile) {
      setForm(normaliseBillingProfileForForm({}, profile));
    }
  }, [billingProfile, profile]);

  const summary = useMemo(
    () => buildBillingSummary(profile || {}, billingProfile, invoices, payments),
    [billingProfile, invoices, payments, profile],
  );

  const handleFieldChange = (field) => (event) => {
    const value = field === 'autopay_enabled' ? event.target.checked : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingProfile(true);
      const savedProfile = await saveBillingProfile(user.id, form);
      setBillingProfile(savedProfile);
      setForm(normaliseBillingProfileForForm(savedProfile || {}, profile || {}));
      setFeedback({
        type: 'success',
        message: 'Billing preferences updated.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update billing preferences.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading your billing tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Billing tools need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Billing & renewals
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Stay on top of your membership payments
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          See your renewal dates, invoice history, payment records, and preferred payment settings from one place.
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
            value={formatCurrency(summary.outstandingBalance, summary.currencyCode)}
            caption={summary.dueInvoiceCount ? `${summary.dueInvoiceCount} open invoice(s)` : 'No unpaid invoices'}
            icon={ReceiptLong}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Paid so far"
            value={formatCurrency(summary.completedPaymentsTotal, summary.currencyCode)}
            caption={payments.length ? `${payments.length} payment records` : 'No payment records yet'}
            icon={Wallet}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Next renewal"
            value={formatBillingDate(summary.nextBillingDate)}
            caption={profile?.plan?.name || 'No plan assigned'}
            icon={Repeat}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Auto-renew"
            value={summary.autopayEnabled ? 'Enabled' : 'Manual'}
            caption={summary.preferredPaymentMethodLabel || 'No payment preference yet'}
            icon={Repeat}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5} component="form" onSubmit={handleSaveProfile}>
              <Box>
                <Typography color="#ff2625" fontWeight={700}>
                  Payment preferences
                </Typography>
                <Typography variant="h5" fontWeight={800} mt={0.5}>
                  {profile?.plan?.name || 'No plan assigned yet'}
                </Typography>
                <Typography color="text.secondary" mt={0.75}>
                  Update your preferred payment method, wallet details, and billing contact info.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={profile?.membership_status || 'membership'} />
                <Chip label={summary.preferredPaymentMethodLabel || 'No payment method'} />
                <Chip label={summary.autopayEnabled ? 'Auto-renew enabled' : 'Manual renewals'} />
              </Stack>

              <TextField
                select
                label="Preferred payment method"
                value={form.preferred_payment_method}
                onChange={handleFieldChange('preferred_payment_method')}
                fullWidth
              >
                {BILLING_PROFILE_METHOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Wallet / processor name"
                value={form.wallet_provider}
                onChange={handleFieldChange('wallet_provider')}
                placeholder="Example: Google Pay, PhonePe, Razorpay"
                fullWidth
              />

              <TextField
                label="Billing email"
                value={form.billing_email}
                onChange={handleFieldChange('billing_email')}
                fullWidth
              />

              <TextField
                label="Billing phone"
                value={form.billing_phone}
                onChange={handleFieldChange('billing_phone')}
                fullWidth
              />

              <TextField
                label="Tax ID / GSTIN"
                value={form.tax_id}
                onChange={handleFieldChange('tax_id')}
                fullWidth
              />

              <TextField
                label="Billing notes"
                value={form.billing_notes}
                onChange={handleFieldChange('billing_notes')}
                multiline
                minRows={3}
                fullWidth
              />

              <FormControlLabel
                control={(
                  <Switch
                    checked={Boolean(form.autopay_enabled)}
                    onChange={handleFieldChange('autopay_enabled')}
                    color="error"
                  />
                )}
                label="I want auto-renewal / auto-debit reminders enabled"
              />

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Next billing date: {formatBillingDate(summary.nextBillingDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Preferred method: {getPaymentMethodLabel(form.preferred_payment_method)}
                </Typography>
              </Stack>

              <Button
                type="submit"
                variant="contained"
                disabled={savingProfile}
                sx={{
                  bgcolor: '#ff2625',
                  textTransform: 'none',
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  '&:hover': { bgcolor: '#df1d1d' },
                }}
              >
                {savingProfile ? 'Saving…' : 'Save billing preferences'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography color="#ff2625" fontWeight={700}>
                  Invoices
                </Typography>
                <Typography variant="h5" fontWeight={800} mt={0.5}>
                  Your invoice history
                </Typography>
                <Typography color="text.secondary" mt={0.75}>
                  Open invoices, paid renewals, and any manual billing adjustments will show here.
                </Typography>
              </Box>

              {!invoices.length ? (
                <EmptyStateCard
                  title="No invoices yet"
                  description="Once your gym starts issuing renewal invoices or package invoices, they will appear here automatically."
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Due date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Balance</TableCell>
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
                                {invoice.notes || invoice.items?.[0]?.description || 'Membership invoice'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{formatBillingDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Chip
                              label={getInvoiceStatusMeta(invoice.status).label}
                              sx={getInvoiceStatusChipSx(invoice.status)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(invoice.total_amount, invoice.currency_code)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(invoice.balance_due, invoice.currency_code)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography color="#ff2625" fontWeight={700}>
                  Payment history
                </Typography>
                <Typography variant="h5" fontWeight={800} mt={0.5}>
                  Recent transactions
                </Typography>
                <Typography color="text.secondary" mt={0.75}>
                  Completed, pending, and refunded payment records are visible here for quick support checks.
                </Typography>
              </Box>

              {!payments.length ? (
                <EmptyStateCard
                  title="No payments recorded yet"
                  description="Payment entries will appear once staff record an invoice payment or a renewal transaction."
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Invoice</TableCell>
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
                          <TableCell>{payment.invoice?.invoice_number || 'Manual entry'}</TableCell>
                          <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                          <TableCell>
                            <Chip
                              label={getPaymentStatusMeta(payment.payment_status).label}
                              sx={getPaymentStatusChipSx(payment.payment_status)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(payment.amount, payment.invoice?.currency_code || summary.currencyCode)}
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default BillingPage;
