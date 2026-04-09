import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
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
  AddShoppingCart,
  DeleteOutline,
  Edit,
  Inventory2,
  PointOfSale,
  Refresh,
  ReportProblem,
  StackedLineChart,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  createPosSale,
  fetchInventoryItems,
  fetchInventoryMovements,
  fetchMembers,
  fetchPosSales,
  recordInventoryAdjustment,
  saveInventoryItem,
} from '../../services/gymService';
import {
  buildPosSummary,
  buildSaleDraftTotals,
  createAdjustmentForm,
  createInventoryForm,
  createSaleForm,
  createSaleLine,
  formatCurrency,
  formatDateTime,
  getCategoryLabel,
  getDefaultCustomerEmail,
  getDefaultCustomerName,
  getInventoryStatusChipSx,
  getInventoryStatusLabel,
  getMovementLabel,
  getPaymentMethodLabel,
  isLowStock,
  POS_CATEGORY_OPTIONS,
  POS_PAYMENT_METHOD_OPTIONS,
  STOCK_MOVEMENT_OPTIONS,
  summariseSaleItems,
} from './posHelpers';

const cardSx = {
  p: { xs: 2.25, md: 3 },
  borderRadius: 4,
  background: '#fff',
  height: '100%',
};

const AdminPosPage = () => {
  const { loading, isConfigured, user } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [inventoryItems, setInventoryItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [movements, setMovements] = useState([]);
  const [members, setMembers] = useState([]);

  const [itemForm, setItemForm] = useState(createInventoryForm);
  const [adjustmentForm, setAdjustmentForm] = useState(createAdjustmentForm);
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

      const [inventoryRows, saleRows, movementRows, memberRows] = await Promise.all([
        fetchInventoryItems({ limit: 200, includeInactive: true }),
        fetchPosSales({ limit: 80 }),
        fetchInventoryMovements({ limit: 80 }),
        fetchMembers(),
      ]);

      setInventoryItems(inventoryRows);
      setSales(saleRows);
      setMovements(movementRows);
      setMembers(memberRows.filter((member) => member.role === 'member'));
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load POS data.' });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  const summary = useMemo(() => buildPosSummary({ inventoryItems, sales }), [inventoryItems, sales]);
  const activeInventoryItems = useMemo(() => inventoryItems.filter((item) => item.is_active), [inventoryItems]);
  const inventoryMap = useMemo(() => new Map(inventoryItems.map((item) => [item.id, item])), [inventoryItems]);
  const lowStockItems = useMemo(() => inventoryItems.filter(isLowStock), [inventoryItems]);
  const draftTotals = useMemo(
    () => buildSaleDraftTotals(saleForm.items, activeInventoryItems, saleForm.discountAmount, saleForm.taxAmount),
    [activeInventoryItems, saleForm.discountAmount, saleForm.items, saleForm.taxAmount],
  );

  const handleRefresh = async () => {
    await loadPage();
  };

  const updateItemFormField = (field) => (event) => {
    const value = field === 'is_stock_tracked' || field === 'is_active'
      ? event.target.checked
      : event.target.value;
    setItemForm((current) => ({ ...current, [field]: value }));
  };

  const updateAdjustmentField = (field) => (event) => {
    setAdjustmentForm((current) => ({ ...current, [field]: event.target.value }));
  };

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
      items: current.items.length > 1 ? current.items.filter((_, i) => i !== index) : current.items,
    }));
  };

  const handleEditItem = (item) => {
    setItemForm({
      id: item.id,
      sku: item.sku || '',
      name: item.name || '',
      category: item.category || 'supplement',
      description: item.description || '',
      unit_price: item.unit_price ?? '',
      cost_price: item.cost_price ?? '',
      reorder_level: item.reorder_level ?? '',
      opening_stock: '',
      is_stock_tracked: item.is_stock_tracked ?? true,
      is_active: item.is_active ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetItemForm = () => setItemForm(createInventoryForm());

  const handleItemSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      setSavingItem(true);
      await saveInventoryItem(itemForm, user?.id || null);
      resetItemForm();
      await loadPage();
      setFeedback({ type: 'success', message: itemForm.id ? 'Inventory item updated.' : 'Inventory item created.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the inventory item.' });
    } finally {
      setSavingItem(false);
    }
  };

  const handleAdjustmentSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      setSavingAdjustment(true);
      await recordInventoryAdjustment(adjustmentForm.inventoryItemId, {
        quantityDelta: Number(adjustmentForm.quantityDelta || 0),
        movementType: adjustmentForm.movementType,
        referenceNote: adjustmentForm.referenceNote,
      });
      setAdjustmentForm(createAdjustmentForm());
      await loadPage();
      setFeedback({ type: 'success', message: 'Inventory stock updated.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to record the stock adjustment.' });
    } finally {
      setSavingAdjustment(false);
    }
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
      setFeedback({ type: 'success', message: `Sale ${savedSale.sale_number || ''} recorded successfully.`.trim() });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to complete the sale.' });
    } finally {
      setSavingSale(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading POS and inventory..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="POS and inventory tools need Supabase setup" />

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>{feedback.message}</Alert>
      ) : null}

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>Admin retail and counter operations</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '30px', md: '44px' } }}>
          POS, stock control, and quick checkout
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          Add supplements, merchandise, and service items, monitor low stock, restock inventory,
          and complete counter sales without leaving the admin workspace.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component={RouterLink} to={PATHS.adminFinance} variant="contained" sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' }, alignSelf: 'flex-start' }}>
            Finance and exports
          </Button>
          <Button component={RouterLink} to={PATHS.adminReports} variant="outlined" sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}>
            Reports and analytics
          </Button>
          <Button startIcon={<Refresh />} variant="outlined" onClick={handleRefresh} disabled={refreshing} sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Active SKUs" value={summary.activeItemCount} caption="Products and services" icon={Inventory2} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Low stock" value={summary.lowStockCount} caption="Need restock attention" icon={ReportProblem} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="Stock value" value={formatCurrency(summary.stockValue)} caption="Cost basis on hand" icon={StackedLineChart} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard title="POS sales" value={formatCurrency(summary.totalSales)} caption={`${summary.totalItemsSold} unit(s) sold`} icon={PointOfSale} /></Grid>
      </Grid>

      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} lg={6}>
          <Paper sx={cardSx} component="form" onSubmit={handleItemSubmit}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={800}>Inventory catalog</Typography>
                {itemForm.id ? <Button size="small" onClick={resetItemForm} sx={{ textTransform: 'none' }}>Clear edit</Button> : null}
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Item name" value={itemForm.name} onChange={updateItemFormField('name')} required /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="SKU" value={itemForm.sku} onChange={updateItemFormField('sku')} /></Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="Category" value={itemForm.category} onChange={updateItemFormField('category')}>
                    {POS_CATEGORY_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Reorder level" type="number" value={itemForm.reorder_level} onChange={updateItemFormField('reorder_level')} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Selling price" type="number" inputProps={{ step: '0.01', min: '0' }} value={itemForm.unit_price} onChange={updateItemFormField('unit_price')} required /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Cost price" type="number" inputProps={{ step: '0.01', min: '0' }} value={itemForm.cost_price} onChange={updateItemFormField('cost_price')} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label={itemForm.id ? 'Opening stock (new items only)' : 'Opening stock'} type="number" value={itemForm.opening_stock} onChange={updateItemFormField('opening_stock')} disabled={Boolean(itemForm.id)} /></Grid>
                <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Description" value={itemForm.description} onChange={updateItemFormField('description')} /></Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControlLabel control={<Switch checked={Boolean(itemForm.is_stock_tracked)} onChange={updateItemFormField('is_stock_tracked')} />} label="Track stock" />
                <FormControlLabel control={<Switch checked={Boolean(itemForm.is_active)} onChange={updateItemFormField('is_active')} />} label="Item active" />
              </Stack>
              <Button type="submit" variant="contained" disabled={savingItem} sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                {savingItem ? 'Saving…' : itemForm.id ? 'Update item' : 'Create item'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={cardSx} component="form" onSubmit={handleAdjustmentSubmit}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Stock adjustments</Typography>
              <Typography color="text.secondary">Restock items, log damage, or correct counts with a movement history.</Typography>
              <TextField select fullWidth label="Inventory item" value={adjustmentForm.inventoryItemId} onChange={updateAdjustmentField('inventoryItemId')} required>
                {inventoryItems.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} {item.is_stock_tracked ? `(stock ${item.current_stock || 0})` : '(service)'}</MenuItem>)}
              </TextField>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="Movement type" value={adjustmentForm.movementType} onChange={updateAdjustmentField('movementType')}>
                    {STOCK_MOVEMENT_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Quantity delta" type="number" value={adjustmentForm.quantityDelta} onChange={updateAdjustmentField('quantityDelta')} required helperText="Positive adds stock, negative reduces stock." /></Grid>
              </Grid>
              <TextField fullWidth multiline minRows={3} label="Reference note" value={adjustmentForm.referenceNote} onChange={updateAdjustmentField('referenceNote')} />
              <Button type="submit" variant="contained" disabled={savingAdjustment} sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}>
                {savingAdjustment ? 'Saving…' : 'Record adjustment'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={cardSx} component="form" onSubmit={handleCreateSale}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="h5" fontWeight={800}>Counter checkout</Typography>
                  <Typography color="text.secondary">Build a quick cart for supplements, merchandise, or one-off service sales.</Typography>
                </Stack>
                <Chip label={`${saleForm.items.length} line item(s)`} sx={{ alignSelf: 'flex-start', bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 }} />
              </Stack>

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
                            {activeInventoryItems.map((item) => (
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

        <Grid item xs={12} xl={7}>
          <Paper sx={cardSx}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Inventory overview</Typography>
              {inventoryItems.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Stock</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventoryItems.slice(0, 16).map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography fontWeight={700}>{item.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{item.sku || 'No SKU'}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{getCategoryLabel(item.category)}</TableCell>
                          <TableCell>{item.is_stock_tracked ? Number(item.current_stock || 0) : '—'}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell><Chip label={getInventoryStatusLabel(item)} size="small" sx={getInventoryStatusChipSx(item)} /></TableCell>
                          <TableCell align="right"><IconButton onClick={() => handleEditItem(item)}><Edit fontSize="small" /></IconButton></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <EmptyStateCard title="No inventory items yet" description="Create your first supplement, merchandise, or service item to start counter operations." />}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={5}>
          <Paper sx={cardSx}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Low-stock watchlist</Typography>
              {lowStockItems.length ? (
                <Stack spacing={1.5}>
                  {lowStockItems.slice(0, 8).map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                        <Stack>
                          <Typography fontWeight={700}>{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{item.current_stock || 0} left · reorder at {item.reorder_level || 0}</Typography>
                        </Stack>
                        <Chip label="Low stock" sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 }} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : <EmptyStateCard title="No low-stock warnings" description="Once tracked products drop to or below their reorder level, they will appear here." />}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper sx={cardSx}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Recent sales</Typography>
              {sales.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sale</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell>Payment</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Sold at</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sales.slice(0, 12).map((sale) => (
                        <TableRow key={sale.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography fontWeight={700}>{sale.sale_number}</Typography>
                              <Typography variant="body2" color="text.secondary">{sale.sale_status}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{sale.customer_name || sale.customer?.full_name || sale.customer_email || 'Walk-in'}</TableCell>
                          <TableCell>{summariseSaleItems(sale.items)}</TableCell>
                          <TableCell>{getPaymentMethodLabel(sale.payment_method)}</TableCell>
                          <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell>{formatDateTime(sale.sold_at || sale.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <EmptyStateCard title="No POS sales yet" description="Complete a checkout above to start building a sales trail for the counter." />}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={cardSx}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Recent stock movements</Typography>
              {movements.length ? (
                <Stack spacing={1.5}>
                  {movements.slice(0, 10).map((movement) => (
                    <Paper key={movement.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={700}>{movement.inventory_item?.name || 'Inventory item'}</Typography>
                        <Typography variant="body2" color="text.secondary">{getMovementLabel(movement.movement_type)} · Δ {movement.quantity_delta}</Typography>
                        <Typography variant="body2" color="text.secondary">{movement.previous_stock} → {movement.next_stock}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDateTime(movement.created_at)}</Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : <EmptyStateCard title="No stock history yet" description="Stock movements will appear here after you restock or sell tracked items." />}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminPosPage;
