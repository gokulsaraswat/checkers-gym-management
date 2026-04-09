import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { submitRefundRequest, updateAutoRenewPreference } from './paymentAutomationClient';

export default function MemberPaymentSettingsPage() {
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const saveAutoRenew = async (enabled) => {
    setError('');
    setMessage('');
    try {
      await updateAutoRenewPreference(enabled);
      setAutoRenewEnabled(enabled);
      setMessage('Billing preference updated.');
    } catch (err) {
      setError(err?.message || 'Failed to update billing preference.');
    }
  };

  const requestRefund = async () => {
    setError('');
    setMessage('');
    try {
      await submitRefundRequest(invoiceId, refundReason);
      setInvoiceId('');
      setRefundReason('');
      setMessage('Refund request submitted for review.');
    } catch (err) {
      setError(err?.message || 'Failed to submit refund request.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 820 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Billing Settings
          </Typography>
          <Typography color="text.secondary">
            Manage auto-renew preference and submit invoice refund requests.
          </Typography>
        </Box>

        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Auto-renew preference</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRenewEnabled}
                    onChange={(event) => saveAutoRenew(event.target.checked)}
                  />
                }
                label={autoRenewEnabled ? 'Auto-renew enabled' : 'Auto-renew disabled'}
              />
              <Typography variant="body2" color="text.secondary">
                This stores your preference for renewal automation. Actual saved payment mandates can be connected later.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Request a refund review</Typography>
              <TextField
                label="Invoice ID"
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                placeholder="Paste the invoice UUID"
                fullWidth
              />
              <TextField
                label="Reason"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                fullWidth
                multiline
                minRows={3}
              />
              <Button variant="contained" onClick={requestRefund} disabled={!invoiceId.trim()}>
                Submit refund request
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
