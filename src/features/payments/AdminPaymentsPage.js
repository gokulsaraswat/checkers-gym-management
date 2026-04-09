import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  cancelInvoicePaymentLink,
  createInvoicePaymentLink,
  listInvoicePaymentLinks,
  listPaymentGatewayConfigs,
  savePaymentGatewayConfig,
  syncInvoicePaymentLink,
} from './paymentGatewayClient';

const defaultForm = {
  invoiceId: '',
  amount: '',
  description: '',
  customerName: '',
  customerEmail: '',
  customerContact: '',
  expireBy: '',
};

const AdminPaymentsPage = () => {
  const [configs, setConfigs] = useState([]);
  const [links, setLinks] = useState([]);
  const [feedback, setFeedback] = useState({ type: 'info', message: '' });
  const [loading, setLoading] = useState(false);
  const [configForm, setConfigForm] = useState({
    provider: 'razorpay',
    config_name: 'Primary Razorpay',
    is_active: true,
    public_metadata: { notes: 'Configured via Patch 17 replacement bundle' },
  });
  const [form, setForm] = useState(defaultForm);

  const refresh = async () => {
    setLoading(true);
    try {
      const [configRows, linkRows] = await Promise.all([
        listPaymentGatewayConfigs(),
        listInvoicePaymentLinks(),
      ]);
      setConfigs(configRows);
      setLinks(linkRows);
      setFeedback({ type: 'success', message: 'Payment gateway data loaded.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load payment data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeGateway = useMemo(
    () => configs.find((entry) => entry.is_active) ?? null,
    [configs],
  );

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await savePaymentGatewayConfig(configForm);
      await refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save config.' });
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      await createInvoicePaymentLink({
        invoiceId: form.invoiceId,
        amount: Number(form.amount),
        description: form.description,
        customer: {
          name: form.customerName,
          email: form.customerEmail,
          contact: form.customerContact,
        },
        expireBy: form.expireBy || null,
      });
      setForm(defaultForm);
      await refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to create payment link.' });
      setLoading(false);
    }
  };

  const handleSync = async (paymentLinkId) => {
    setLoading(true);
    try {
      await syncInvoicePaymentLink({ paymentLinkId });
      await refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to sync payment link.' });
      setLoading(false);
    }
  };

  const handleCancel = async (paymentLinkId) => {
    setLoading(true);
    try {
      await cancelInvoicePaymentLink({ paymentLinkId });
      await refresh();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to cancel payment link.' });
      setLoading(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Online Payments
          </Typography>
          <Typography color="text.secondary">
            Create Razorpay payment links for invoices, sync status, and cancel links when needed.
          </Typography>
        </Box>

        {feedback.message ? <Alert severity={feedback.type}>{feedback.message}</Alert> : null}

        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Gateway settings</Typography>
                  <TextField
                    label="Provider"
                    value={configForm.provider}
                    onChange={(event) =>
                      setConfigForm((current) => ({ ...current, provider: event.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Config name"
                    value={configForm.config_name}
                    onChange={(event) =>
                      setConfigForm((current) => ({ ...current, config_name: event.target.value }))
                    }
                    fullWidth
                  />
                  <Button variant="contained" onClick={handleSaveConfig} disabled={loading}>
                    Save config
                  </Button>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    Active gateway:{' '}
                    <strong>{activeGateway ? activeGateway.config_name : 'None configured yet'}</strong>
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Create payment link</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Invoice ID"
                        value={form.invoiceId}
                        onChange={(event) => setForm((current) => ({ ...current, invoiceId: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Amount (INR)"
                        type="number"
                        value={form.amount}
                        onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Description"
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Customer name"
                        value={form.customerName}
                        onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Customer email"
                        value={form.customerEmail}
                        onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Customer phone"
                        value={form.customerContact}
                        onChange={(event) => setForm((current) => ({ ...current, customerContact: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Expiry (unix timestamp, optional)"
                        value={form.expireBy}
                        onChange={(event) => setForm((current) => ({ ...current, expireBy: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                  <Button variant="contained" onClick={handleCreateLink} disabled={loading}>
                    Create payment link
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Recent payment links</Typography>
              <Button variant="outlined" onClick={refresh} disabled={loading}>
                Refresh
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Short URL</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{link.invoice_id}</TableCell>
                    <TableCell>{link.gateway_provider}</TableCell>
                    <TableCell>
                      <Chip label={link.link_status || 'created'} size="small" />
                    </TableCell>
                    <TableCell>{link.amount}</TableCell>
                    <TableCell>
                      {link.short_url ? (
                        <a href={link.short_url} target="_blank" rel="noreferrer">
                          Open link
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => handleSync(link.id)} disabled={loading}>
                          Sync
                        </Button>
                        <Button size="small" color="error" onClick={() => handleCancel(link.id)} disabled={loading}>
                          Cancel
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!links.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary">No payment links yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default AdminPaymentsPage;
