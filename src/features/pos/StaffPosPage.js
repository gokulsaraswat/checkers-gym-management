import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  AddShoppingCart,
  DeleteOutline,
  PointOfSale,
  ReceiptLong,
  Refresh,
  Sell,
  Storefront,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import { createPosSale, fetchInventoryItems, fetchMembers, fetchPosSales } from '../../services/gymService';
import {
  buildPosSummary,
  buildSaleDraftTotals,
  createSaleForm,
  createSaleLine,
  formatCurrency,
  formatDateTime,
  getDefaultCustomerEmail,
  getDefaultCustomerName,
  getPaymentMethodLabel,
  POS_PAYMENT_METHOD_OPTIONS,
  summariseSaleItems,
} from './posHelpers';

const cardSx = {
  p: { xs: 2.25, md: 3 },
  borderRadius: 4,
  background: '#fff',
  height: '100%',
};

const StaffPosPage = () => {
  const { loading, isConfigured } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [inventoryItems, setInventoryItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [members, setMembers] = useState([]);
  const [saleForm, setSaleForm] = useState(createSaleForm);

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

      const [inventoryRows, saleRows, memberRows] = await Promise.all([
        fetchInventoryItems({ limit: 200, includeInactive: false }),
        fetchPosSales({ limit: 40 }),
        fetchMembers(),
      ]);

      setInventoryItems(inventoryRows.filter((item) => item.is_active));
      setSales(saleRows);
      setMembers(memberRows.filter((member) => member.role === 'member'));
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load staff POS tools.' });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  const summary = useMemo(() => buildPosSummary({ inventoryItems, sales }), [inventoryItems, sales]);
  const inventoryMap = useMemo(() => new Map(inventoryItems.map((item) => [item.id, item])), [inventoryItems]);
  const draftTotals = useMemo(
    () => buildSaleDraftTotals(saleForm.items, inventoryItems, saleForm.discountAmount, saleForm.taxAmount),
    [inventoryItems, saleForm.discountAmount, saleForm.items, saleForm.taxAmount],
  );

  const updateSaleField = (field) => (event) => {
    const value = event.target.value;
    setSaleForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'customerId') {
        const selectedMember = members.find((member) => member.id === value);
        if (selectedMember) {
          next.customerName = getDefaultCustomerName(selectedMember);
          next.customerEmail = getDefaultCustomerEmail(selectedMember);
        }
      }
      return next;
    });
  };

  const updateSaleLine = (index, field, value) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) => (lineIndex === index
        ? { ...line, [field]: field === 'quantity' ? Math.max(1, Number(value || 1)) : value }
        : line)),
    }));
  };

  const addSaleLine = () => {
    setSaleForm((current) => ({ ...current, items: [...current.items, createSaleLine()] }));
  };

  const removeSaleLine = (index) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, lineIndex) => lineIndex !== index) : current.items,
    }));
  };

  const handleRefresh = async () => {
    await loadPage();
  };

  const handleCreateSale = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingSale(true);
      const savedSale = await createPosSale({
        customerId: saleForm.customerId || null,
        customerName: saleForm.customerName,
        customerEmail: saleForm.customerEmail,
        paymentMethod: saleForm.paymentMethod,
        discountAmount: saleForm.discountAmount,
        taxAmount: saleForm.taxAmount,
        notes: saleForm.notes,
        items: saleForm.items,
      });
      setSaleForm(createSaleForm());
      await loadPage();
      setFeedback({ type: 'success', message: `Sale ${savedSale.sale_number || ''} recorded.`.trim() });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to record the sale.' });
    } finally {
      setSavingSale(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading staff POS..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="Staff POS needs Supabase setup" />

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>{feedback.message}</Alert>
      ) : null}

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>Staff point of sale</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '30px', md: '42px' } }}>
          Quick counter checkout for the front desk
        </Typography>
        <Typography color="text.secondary" maxWidth="860px">
          Front-desk staff can sell supplements, merchandise, and service items while keeping a clean receipt trail.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component={RouterLink} to={PATHS.staffBilling} variant="contained" sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' }, alignSelf: 'flex-start' }}>
            Open billing desk
          </Button>
          <Button component={RouterLink} to={PATHS.staff} variant="outlined" sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}>
            Back to staff hub
          </Button>
          <Button startIcon={<Refresh />} variant="outlined" onClick={handleRefresh} disabled={refreshing} sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Active items" value={summary.activeItemCount} caption="Ready to sell" icon={Storefront} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Counter sales" value={formatCurrency(summary.totalSales)} caption="Recent recorded sales" icon={PointOfSale} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Units sold" value={summary.totalItemsSold} caption="Across recent receipts" icon={Sell} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Receipts" value={sales.length} caption="Visible in the terminal" icon={ReceiptLong} /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper sx={cardSx} component="form" onSubmit={handleCreateSale}>
            <Stack spacing={2.5}>
              <Typography variant="h5" fontWeight={800}>New sale</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField select fullWidth label="Member (optional)" value={saleForm.customerId} onChange={updateSaleField('customerId')}>
                    <MenuItem value="">Walk-in / guest</MenuItem>
                    {members.map((member) => <MenuItem key={member.id} value={member.id}>{member.full_name || member.email}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Customer name" value={saleForm.customerName} onChange={updateSaleField('customerName')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Customer email" value={saleForm.customerEmail} onChange={updateSaleField('customerEmail')} /></Grid>
                <Grid item xs={12} md={4}>
                  <TextField select fullWidth label="Payment method" value={saleForm.paymentMethod} onChange={updateSaleField('paymentMethod')}>
                    {POS_PAYMENT_METHOD_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Discount" type="number" inputProps={{ step: '0.01', min: '0' }} value={saleForm.discountAmount} onChange={updateSaleField('discountAmount')} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth label="Tax" type="number" inputProps={{ step: '0.01', min: '0' }} value={saleForm.taxAmount} onChange={updateSaleField('taxAmount')} /></Grid>
                <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Notes" value={saleForm.notes} onChange={updateSaleField('notes')} /></Grid>
              </Grid>

              <Stack spacing={1.5}>
                {saleForm.items.map((line, index) => {
                  const selectedItem = inventoryMap.get(line.inventory_item_id);
                  const quantity = Math.max(1, Number(line.quantity || 1));
                  const lineTotal = Number(selectedItem?.unit_price || 0) * quantity;

                  return (
                    <Paper key={`${line.inventory_item_id || 'line'}-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                          <TextField select fullWidth label={`Item ${index + 1}`} value={line.inventory_item_id} onChange={(event) => updateSaleLine(index, 'inventory_item_id', event.target.value)} required>
                            {inventoryItems.map((item) => (
                              <MenuItem key={item.id} value={item.id} disabled={item.is_stock_tracked && Number(item.current_stock || 0) <= 0}>
                                {item.name} — {formatCurrency(item.unit_price)} {item.is_stock_tracked ? `(stock ${item.current_stock || 0})` : '(service)'}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}><TextField fullWidth label="Qty" type="number" inputProps={{ min: '1', step: '1' }} value={quantity} onChange={(event) => updateSaleLine(index, 'quantity', event.target.value)} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><TextField fullWidth label="Line total" value={formatCurrency(lineTotal)} InputProps={{ readOnly: true }} /></Grid>
                        <Grid item xs={12} md={1}><IconButton color="error" disabled={saleForm.items.length === 1} onClick={() => removeSaleLine(index)}><DeleteOutline /></IconButton></Grid>
                      </Grid>
                    </Paper>
                  );
                })}
                <Button startIcon={<AddShoppingCart />} onClick={addSaleLine} variant="outlined" sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 999 }}>Add line item</Button>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                <Stack spacing={0.5}>
                  <Typography color="text.secondary">Subtotal: {formatCurrency(draftTotals.subtotal)}</Typography>
                  <Typography color="text.secondary">Discount: {formatCurrency(draftTotals.discount)}</Typography>
                  <Typography color="text.secondary">Tax: {formatCurrency(draftTotals.tax)}</Typography>
                  <Typography variant="h5" fontWeight={800}>Grand total: {formatCurrency(draftTotals.total)}</Typography>
                </Stack>
                <Button type="submit" disabled={savingSale} variant="contained" sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                  {savingSale ? 'Completing sale…' : 'Complete sale'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={cardSx}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Recent receipts</Typography>
              {sales.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Receipt</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sales.slice(0, 10).map((sale) => (
                        <TableRow key={sale.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography fontWeight={700}>{sale.sale_number}</Typography>
                              <Typography variant="caption" color="text.secondary">{formatDateTime(sale.sold_at || sale.created_at)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant="body2">{sale.customer_name || sale.customer?.full_name || 'Walk-in'}</Typography>
                              <Typography variant="caption" color="text.secondary">{getPaymentMethodLabel(sale.payment_method)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{summariseSaleItems(sale.items, 2)}</TableCell>
                          <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <EmptyStateCard title="No recent receipts" description="Complete your first counter checkout to start the receipt trail." />}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffPosPage;
