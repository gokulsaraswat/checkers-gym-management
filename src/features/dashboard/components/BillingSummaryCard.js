import React from 'react';
import { Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { ReceiptLong, Repeat, Wallet } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../../app/paths';
import {
  formatBillingDate,
  formatCurrency,
  getInvoiceStatusChipSx,
  getInvoiceStatusMeta,
} from '../../billing/billingHelpers';

const BillingSummaryCard = ({ summary }) => {
  const recentInvoice = summary?.recentInvoice || null;

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography color="#ff2625" fontWeight={700}>
            Billing & renewals
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {formatCurrency(summary?.outstandingBalance || 0, summary?.currencyCode)}
          </Typography>
          <Typography color="text.secondary">
            {summary?.dueInvoiceCount
              ? `${summary.dueInvoiceCount} open invoice(s) still need action.`
              : 'No open invoices right now. Your payment history will stay here.'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={summary?.preferredPaymentMethodLabel || 'Not set'} icon={<Wallet />} />
          <Chip
            label={summary?.autopayEnabled ? 'Auto-renew enabled' : 'Manual renewals'}
            icon={<Repeat />}
            sx={summary?.autopayEnabled ? { bgcolor: '#ecfdf3', color: '#047857', fontWeight: 700 } : undefined}
          />
          {recentInvoice ? (
            <Chip
              label={getInvoiceStatusMeta(recentInvoice.status).label}
              sx={getInvoiceStatusChipSx(recentInvoice.status)}
            />
          ) : null}
        </Stack>

        <Divider />

        <Stack spacing={1.2}>
          <Typography variant="body1">
            <strong>Next billing date:</strong> {formatBillingDate(summary?.nextBillingDate)}
          </Typography>
          <Typography variant="body1">
            <strong>Paid so far:</strong> {formatCurrency(summary?.completedPaymentsTotal || 0, summary?.currencyCode)}
          </Typography>
          <Typography variant="body1">
            <strong>Active plan:</strong> {summary?.activePlanName || 'No plan assigned yet'}
          </Typography>
          {recentInvoice ? (
            <Typography variant="body1">
              <strong>Latest invoice:</strong> {recentInvoice.invoice_number || 'Draft invoice'} · {formatCurrency(recentInvoice.total_amount, recentInvoice.currency_code)}
            </Typography>
          ) : null}
        </Stack>

        <Button
          component={RouterLink}
          to={PATHS.billing}
          variant="contained"
          startIcon={<ReceiptLong />}
          sx={{
            bgcolor: '#ff2625',
            textTransform: 'none',
            borderRadius: 999,
            alignSelf: 'flex-start',
            '&:hover': { bgcolor: '#df1d1d' },
          }}
        >
          Open billing
        </Button>
      </Stack>
    </Paper>
  );
};

export default BillingSummaryCard;
