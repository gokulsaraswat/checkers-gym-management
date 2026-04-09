import React, { useEffect, useMemo, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import {
  getPaymentAutomationSnapshot,
  listRenewalQueue,
  listRetryQueue,
  listRefundRequests,
  resolveRefundRequest,
} from './paymentAutomationClient';

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

export default function AdminPaymentAutomationPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [renewals, setRenewals] = useState([]);
  const [retries, setRetries] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [noteById, setNoteById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [snapshotData, renewalData, retryData, refundData] = await Promise.all([
        getPaymentAutomationSnapshot(),
        listRenewalQueue(),
        listRetryQueue(),
        listRefundRequests(),
      ]);
      setSnapshot(snapshotData || null);
      setRenewals(renewalData || []);
      setRetries(retryData || []);
      setRefunds(refundData || []);
    } catch (err) {
      setError(err?.message || 'Failed to load payment automation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openRefunds = useMemo(
    () => refunds.filter((row) => row.request_status === 'requested' || row.request_status === 'under_review'),
    [refunds]
  );

  const handleResolve = async (id, action) => {
    try {
      await resolveRefundRequest(id, action, noteById[id] || null);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to update refund request.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Payment Automation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor renewals, failed collections, dunning, and refund workflows.
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? <Alert severity="info">Loading automation dashboard...</Alert> : null}

        <Grid container spacing={2}>
          {[
            ['Renewals due', snapshot?.renewals_due_count, 'warning'],
            ['Retry jobs open', snapshot?.retry_jobs_open_count, 'info'],
            ['Refunds pending', snapshot?.refunds_pending_count, 'secondary'],
            ['Projected revenue', money(snapshot?.projected_revenue_due || 0), 'success'],
          ].map(([label, value, color]) => (
            <Grid item xs={12} sm={6} lg={3} key={label}>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                    <Chip color={color} label={value ?? 0} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Renewal queue
                </Typography>
                <Stack spacing={1.5}>
                  {renewals.length ? (
                    renewals.slice(0, 8).map((row) => (
                      <Box key={row.membership_id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                          <Box>
                            <Typography fontWeight={600}>{row.member_name || row.member_email}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {row.plan_name} • expires {row.current_period_end?.slice(0, 10)}
                            </Typography>
                          </Box>
                          <Chip label={money(row.renewal_amount || 0)} size="small" />
                        </Stack>
                        <Divider sx={{ mt: 1.5 }} />
                      </Box>
                    ))
                  ) : (
                    <Typography color="text.secondary">No renewals currently due.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment retry queue
                </Typography>
                <Stack spacing={1.5}>
                  {retries.length ? (
                    retries.slice(0, 8).map((row) => (
                      <Box key={row.id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                          <Box>
                            <Typography fontWeight={600}>{row.member_name || row.member_email}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Attempt {row.attempt_number} • next retry {row.next_retry_at?.slice(0, 16).replace('T', ' ')}
                            </Typography>
                          </Box>
                          <Chip label={row.retry_status} size="small" />
                        </Stack>
                        <Divider sx={{ mt: 1.5 }} />
                      </Box>
                    ))
                  ) : (
                    <Typography color="text.secondary">No retry jobs are open.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Refund requests
            </Typography>
            <Stack spacing={2}>
              {openRefunds.length ? (
                openRefunds.map((row) => (
                  <Box key={row.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                        <Box>
                          <Typography fontWeight={600}>{row.member_name || row.member_email}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Invoice #{row.invoice_number || row.invoice_id}
                          </Typography>
                        </Box>
                        <Chip label={row.request_status} size="small" />
                      </Stack>
                      <Typography variant="body2">{row.request_reason || 'No reason provided.'}</Typography>
                      <TextField
                        label="Admin note"
                        size="small"
                        value={noteById[row.id] || ''}
                        onChange={(event) =>
                          setNoteById((current) => ({ ...current, [row.id]: event.target.value }))
                        }
                      />
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={() => handleResolve(row.id, 'approve')}>
                          Approve
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => handleResolve(row.id, 'reject')}>
                          Reject
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">No open refund requests.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
