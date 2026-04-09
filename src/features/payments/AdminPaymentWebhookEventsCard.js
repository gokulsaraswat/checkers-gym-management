import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getRazorpayWebhookEndpoint, listPaymentWebhookEvents } from './paymentWebhookClient';

const statusSeverity = {
  processed: 'success',
  ignored: 'warning',
  rejected: 'error',
  failed: 'error',
  received: 'info',
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const AdminPaymentWebhookEventsCard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'info', message: '' });

  const webhookUrl = useMemo(() => getRazorpayWebhookEndpoint(), []);

  const loadRows = async () => {
    setLoading(true);
    try {
      const data = await listPaymentWebhookEvents({ limit: 25 });
      setRows(data);
      setFeedback({ type: 'success', message: 'Webhook delivery log loaded.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load webhook events.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6">Webhook reconciliation</Typography>
            <Typography variant="body2" color="text.secondary">
              Razorpay webhook deliveries are stored here so admins can confirm whether payment links were
              processed automatically.
            </Typography>
          </Box>

          {feedback.message ? <Alert severity={feedback.type}>{feedback.message}</Alert> : null}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Webhook endpoint
            </Typography>
            <Typography
              component="code"
              sx={{
                display: 'block',
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: 'grey.100',
                wordBreak: 'break-all',
              }}
            >
              {webhookUrl || 'Set REACT_APP_SUPABASE_URL to show the function endpoint.'}
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Button variant="outlined" onClick={loadRows} disabled={loading}>
              Refresh webhook log
            </Button>
            <Typography variant="body2" color="text.secondary">
              Showing the 25 most recent deliveries.
            </Typography>
          </Stack>

          <Divider />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>External payment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>{row.event_type}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.external_link_id || 'No payment link id'}
                        </Typography>
                        {row.processing_error ? (
                          <Typography variant="caption" color="error.main">
                            {row.processing_error}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusSeverity[row.processing_status] || 'default'}
                        label={row.processing_status}
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(row.received_at)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.notes?.invoice_number || row.invoice_id || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.notes?.invoice_status || 'No invoice status'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.external_payment_id || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(row.processed_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No webhook deliveries yet. After deploying the function and configuring Razorpay webhooks,
                      new events will show up here automatically.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AdminPaymentWebhookEventsCard;
