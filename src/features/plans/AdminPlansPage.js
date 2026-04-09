import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
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
  LocalOffer,
  Payments,
  PersonAddAlt1,
  ReceiptLong,
  Sell,
  SportsMma,
} from '@mui/icons-material';

import MetricCard from '../../components/common/MetricCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMembers,
  fetchMembershipAddOns,
  fetchMembershipPlanCatalog,
  fetchMemberAddOnSubscriptions,
  issueMembershipBundleInvoice,
  saveMembershipAddOn,
  saveMembershipPlanCatalog,
} from '../../services/gymService';
import { formatCurrency } from '../billing/billingHelpers';
import {
  ADD_ON_BILLING_FREQUENCY_OPTIONS,
  ADD_ON_CATEGORY_OPTIONS,
  buildBundlePreviewTotal,
  buildPlanSummaryLabel,
  createEmptyAddOnForm,
  createEmptyPlanCatalogForm,
  createEmptySubscriptionBundleForm,
  DEFAULT_PRICING_PREVIEW,
  describeDuration,
  getAddOnBillingFrequencyLabel,
  getAddOnCategoryLabel,
  normaliseAddOnForm,
  normalisePlanForm,
  PLAN_DURATION_OPTIONS,
} from './planCatalogHelpers';

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const sectionCardSx = {
  p: { xs: 2.25, md: 3 },
  borderRadius: 4,
  background: '#fff',
  height: '100%',
};

const AdminPlansPage = () => {
  const { loading, isConfigured, user, profile } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingAddOn, setSavingAddOn] = useState(false);
  const [issuingBundle, setIssuingBundle] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [selectedMemberAddOns, setSelectedMemberAddOns] = useState([]);

  const [planForm, setPlanForm] = useState(createEmptyPlanCatalogForm);
  const [addOnForm, setAddOnForm] = useState(createEmptyAddOnForm);
  const [bundleForm, setBundleForm] = useState(createEmptySubscriptionBundleForm);

  const loadPage = useCallback(async () => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [memberRows, planRows, addOnRows] = await Promise.all([
        fetchMembers(),
        fetchMembershipPlanCatalog(),
        fetchMembershipAddOns(),
      ]);

      setMembers(memberRows);
      setPlans(planRows);
      setAddOns(addOnRows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load plans and pricing tools.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!bundleForm.memberId || !isConfigured) {
      setSelectedMemberAddOns([]);
      return;
    }

    let active = true;

    const syncMemberBundle = async () => {
      try {
        const activeSubscriptions = await fetchMemberAddOnSubscriptions(bundleForm.memberId);

        if (!active) {
          return;
        }

        setSelectedMemberAddOns(activeSubscriptions);
        setBundleForm((current) => ({
          ...current,
          addOnIds: activeSubscriptions
            .filter((subscription) => subscription.status === 'active')
            .map((subscription) => subscription.add_on_id),
        }));
      } catch (error) {
        if (active) {
          setSelectedMemberAddOns([]);
        }
      }
    };

    void syncMemberBundle();

    return () => {
      active = false;
    };
  }, [bundleForm.memberId, isConfigured]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === bundleForm.memberId) || null,
    [bundleForm.memberId, members],
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === bundleForm.planId) || null,
    [bundleForm.planId, plans],
  );

  const selectedAddOnRows = useMemo(
    () => addOns.filter((addOn) => bundleForm.addOnIds.includes(addOn.id)),
    [addOns, bundleForm.addOnIds],
  );

  const previewTotal = useMemo(() => buildBundlePreviewTotal({
    selectedPlan,
    selectedAddOns: selectedAddOnRows,
    discountAmount: bundleForm.discountAmount,
  }), [bundleForm.discountAmount, selectedAddOnRows, selectedPlan]);

  const pricingSnapshot = useMemo(() => ({
    liveBasePlans: plans.filter((plan) => plan.is_active).length,
    liveAddOns: addOns.filter((addOn) => addOn.is_active).length,
    monthlyPlan: plans.find((plan) => Number(plan.duration_months) === 1)?.price || 2000,
    annualPlan: plans.find((plan) => Number(plan.duration_months) === 12)?.price || 15000,
  }), [addOns, plans]);

  const handlePlanFieldChange = (field) => (event) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;
    setPlanForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddOnFieldChange = (field) => (event) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;
    setAddOnForm((current) => ({ ...current, [field]: value }));
  };

  const handleBundleFieldChange = (field) => (event) => {
    const value = field === 'sendEmail' ? event.target.checked : event.target.value;

    setBundleForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
      };

      if (field === 'memberId') {
        const nextMember = members.find((member) => member.id === value) || null;
        return {
          ...nextForm,
          planId: nextMember?.plan_id || current.planId,
          startDate: nextMember?.next_billing_date || current.startDate || todayIsoDate(),
        };
      }

      return nextForm;
    });
  };

  const handleEditPlan = (plan) => {
    setPlanForm(normalisePlanForm(plan));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditAddOn = (addOn) => {
    setAddOnForm(normaliseAddOnForm(addOn));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePlan = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingPlan(true);
      const savedPlan = await saveMembershipPlanCatalog(planForm);
      setPlans((current) => {
        const exists = current.some((plan) => plan.id === savedPlan.id);
        if (exists) {
          return current.map((plan) => (plan.id === savedPlan.id ? savedPlan : plan));
        }
        return [...current, savedPlan].sort((left, right) => Number(left.display_order || 0) - Number(right.display_order || 0));
      });
      setPlanForm(createEmptyPlanCatalogForm());
      setFeedback({ type: 'success', message: planForm.id ? 'Membership plan updated.' : 'Membership plan created.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the membership plan.' });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSaveAddOn = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingAddOn(true);
      const savedAddOn = await saveMembershipAddOn(addOnForm);
      setAddOns((current) => {
        const exists = current.some((row) => row.id === savedAddOn.id);
        if (exists) {
          return current.map((row) => (row.id === savedAddOn.id ? savedAddOn : row));
        }
        return [...current, savedAddOn].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
      });
      setAddOnForm(createEmptyAddOnForm());
      setFeedback({ type: 'success', message: addOnForm.id ? 'Add-on updated.' : 'Add-on created.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the add-on.' });
    } finally {
      setSavingAddOn(false);
    }
  };

  const handleIssueBundle = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setIssuingBundle(true);
      const invoice = await issueMembershipBundleInvoice({
        memberId: bundleForm.memberId,
        planId: bundleForm.planId,
        addOnIds: bundleForm.addOnIds,
        startDate: bundleForm.startDate,
        dueDate: bundleForm.dueDate,
        discountAmount: bundleForm.discountAmount,
        notes: bundleForm.notes,
        sendEmail: bundleForm.sendEmail,
        actorId: user?.id || profile?.id || null,
      });

      setBundleForm(createEmptySubscriptionBundleForm());
      setSelectedMemberAddOns([]);
      await loadPage();
      setFeedback({
        type: invoice?.email_delivery_error ? 'warning' : 'success',
        message: invoice?.email_delivery_error
          ? `Subscription bundle issued and invoice ${invoice?.invoice_number || 'created'} was created, but the email could not be sent: ${invoice.email_delivery_error}`
          : `Subscription bundle issued. Invoice ${invoice?.invoice_number || 'created'} is ready${bundleForm.sendEmail ? ' and the email dispatch was attempted.' : '.'}`,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to issue the membership bundle.' });
    } finally {
      setIssuingBundle(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading plans, pricing, and renewal tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <SetupNotice title="Plans and billing automations need Supabase setup" />

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Pricing catalog and smart renewals
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Build membership bundles, add-ons, and invoice-ready renewals
        </Typography>
        <Typography color="text.secondary" maxWidth="980px">
          This patch turns your pricing into editable products. Admin can maintain monthly, quarterly,
          half-yearly, and annual plans, add personal training or specialty add-ons, then issue the full bundle
          as an invoice and optionally email it to the member immediately.
        </Typography>
      </Stack>

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            title="Live plans"
            value={pricingSnapshot.liveBasePlans}
            caption="Editable base memberships"
            icon={Sell}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            title="Add-ons"
            value={pricingSnapshot.liveAddOns}
            caption="Upsells and specialty programs"
            icon={LocalOffer}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            title="Starter price"
            value={formatCurrency(pricingSnapshot.monthlyPlan, 'INR')}
            caption="1 month default seed"
            icon={Payments}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            title="Annual plan"
            value={formatCurrency(pricingSnapshot.annualPlan, 'INR')}
            caption="1 year default seed"
            icon={ReceiptLong}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        {DEFAULT_PRICING_PREVIEW.map((item) => (
          <Grid item xs={12} sm={6} lg={3} key={item.code}>
            <Paper sx={sectionCardSx}>
              <Stack spacing={1}>
                <Chip
                  label={item.type === 'membership' ? 'Base plan' : 'Add-on'}
                  sx={{ alignSelf: 'flex-start', bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }}
                />
                <Typography variant="h6" fontWeight={800}>{item.name}</Typography>
                <Typography color="text.secondary">
                  {item.durationMonths ? describeDuration(item.durationMonths) : 'Editable specialty pricing'}
                </Typography>
                <Typography variant="h5" fontWeight={800}>{formatCurrency(item.price, 'INR')}</Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={6}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: '#fff0f0',
                    color: '#ff2625',
                  }}
                >
                  <Sell />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Membership plan catalog
                  </Typography>
                  <Typography color="text.secondary">
                    Edit your main plans and keep the prices fully configurable for later.
                  </Typography>
                </Box>
              </Stack>

              <Box component="form" onSubmit={handleSavePlan}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Plan name" value={planForm.name} onChange={handlePlanFieldChange('name')} fullWidth required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Plan code" value={planForm.plan_code} onChange={handlePlanFieldChange('plan_code')} fullWidth placeholder="membership_3m" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Duration"
                      value={planForm.duration_months}
                      onChange={handlePlanFieldChange('duration_months')}
                      fullWidth
                    >
                      {PLAN_DURATION_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Price (INR)" type="number" value={planForm.price} onChange={handlePlanFieldChange('price')} fullWidth required />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Display order" type="number" value={planForm.display_order} onChange={handlePlanFieldChange('display_order')} fullWidth />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Description" value={planForm.description} onChange={handlePlanFieldChange('description')} fullWidth multiline minRows={2} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Switch checked={planForm.is_active} onChange={handlePlanFieldChange('is_active')} color="error" />}
                      label="Plan is available for sale"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Typography color="text.secondary">
                        Suggested defaults: 1 month ₹2,000 • 3 months ₹6,000 • 6 months ₹10,000 • 1 year ₹15,000
                      </Typography>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingPlan}
                        sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        {savingPlan ? 'Saving plan...' : planForm.id ? 'Update plan' : 'Save plan'}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Plan</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={700}>{plan.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{plan.plan_code || '—'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{describeDuration(plan.duration_months || 1)}</TableCell>
                        <TableCell>{formatCurrency(plan.price, plan.currency_code || 'INR')}</TableCell>
                        <TableCell>
                          <Chip
                            label={plan.is_active ? 'Active' : 'Archived'}
                            size="small"
                            sx={{ bgcolor: plan.is_active ? '#ecfdf3' : '#f8fafc', color: plan.is_active ? '#047857' : '#475569', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => handleEditPlan(plan)} sx={{ textTransform: 'none' }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={6}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: '#fff0f0',
                    color: '#ff2625',
                  }}
                >
                  <SportsMma />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Add-on pricing catalog
                  </Typography>
                  <Typography color="text.secondary">
                    Personal training, MMA, boxing, yoga, and future upsells stay editable.
                  </Typography>
                </Box>
              </Stack>

              <Box component="form" onSubmit={handleSaveAddOn}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Add-on name" value={addOnForm.name} onChange={handleAddOnFieldChange('name')} fullWidth required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Add-on code" value={addOnForm.add_on_code} onChange={handleAddOnFieldChange('add_on_code')} fullWidth placeholder="personal_training" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField select label="Category" value={addOnForm.category} onChange={handleAddOnFieldChange('category')} fullWidth>
                      {ADD_ON_CATEGORY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField select label="Frequency" value={addOnForm.billing_frequency} onChange={handleAddOnFieldChange('billing_frequency')} fullWidth>
                      {ADD_ON_BILLING_FREQUENCY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Price (INR)" type="number" value={addOnForm.price} onChange={handleAddOnFieldChange('price')} fullWidth required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Description" value={addOnForm.description} onChange={handleAddOnFieldChange('description')} fullWidth multiline minRows={2} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Switch checked={addOnForm.is_active} onChange={handleAddOnFieldChange('is_active')} color="error" />}
                      label="Add-on is available"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Typography color="text.secondary">
                        Suggested defaults: Personal training ₹10,000 • MMA ₹8,000 • Boxing ₹8,000 • Yoga ₹6,000
                      </Typography>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingAddOn}
                        sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        {savingAddOn ? 'Saving add-on...' : addOnForm.id ? 'Update add-on' : 'Save add-on'}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Add-on</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {addOns.map((addOn) => (
                      <TableRow key={addOn.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={700}>{addOn.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{addOn.add_on_code || '—'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{getAddOnCategoryLabel(addOn.category)}</TableCell>
                        <TableCell>{getAddOnBillingFrequencyLabel(addOn.billing_frequency)}</TableCell>
                        <TableCell>{formatCurrency(addOn.price, addOn.currency_code || 'INR')}</TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => handleEditAddOn(addOn)} sx={{ textTransform: 'none' }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={sectionCardSx}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: '#fff0f0',
                    color: '#ff2625',
                  }}
                >
                  <PersonAddAlt1 />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Issue a membership bundle and invoice
                  </Typography>
                  <Typography color="text.secondary">
                    Choose a member, attach the base plan and add-ons, then issue the invoice. Email delivery is attempted automatically when enabled.
                  </Typography>
                </Box>
              </Stack>

              <Box component="form" onSubmit={handleIssueBundle}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={4}>
                    <TextField select label="Member" value={bundleForm.memberId} onChange={handleBundleFieldChange('memberId')} fullWidth required>
                      <MenuItem value="">Select member</MenuItem>
                      {members.filter((member) => member.role === 'member').map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField select label="Base plan" value={bundleForm.planId} onChange={handleBundleFieldChange('planId')} fullWidth required>
                      <MenuItem value="">Select base plan</MenuItem>
                      {plans.filter((plan) => plan.is_active).map((plan) => (
                        <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="membership-add-ons-label">Add-ons</InputLabel>
                      <Select
                        labelId="membership-add-ons-label"
                        multiple
                        value={bundleForm.addOnIds}
                        label="Add-ons"
                        onChange={handleBundleFieldChange('addOnIds')}
                        renderValue={(selected) => addOns
                          .filter((addOn) => selected.includes(addOn.id))
                          .map((addOn) => addOn.name)
                          .join(', ')}
                      >
                        {addOns.filter((addOn) => addOn.is_active).map((addOn) => (
                          <MenuItem key={addOn.id} value={addOn.id}>
                            <Checkbox checked={bundleForm.addOnIds.includes(addOn.id)} />
                            <ListItemText primary={addOn.name} secondary={formatCurrency(addOn.price, addOn.currency_code || 'INR')} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Start date" type="date" value={bundleForm.startDate} onChange={handleBundleFieldChange('startDate')} fullWidth InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Invoice due date" type="date" value={bundleForm.dueDate} onChange={handleBundleFieldChange('dueDate')} fullWidth InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Discount amount" type="number" value={bundleForm.discountAmount} onChange={handleBundleFieldChange('discountAmount')} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControlLabel
                      control={<Switch checked={bundleForm.sendEmail} onChange={handleBundleFieldChange('sendEmail')} color="error" />}
                      label="Email bill on issue"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Notes" value={bundleForm.notes} onChange={handleBundleFieldChange('notes')} fullWidth multiline minRows={2} placeholder="Example: Renewal for annual membership + yoga access" />
                  </Grid>
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={5}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle1" fontWeight={800}>Bundle preview</Typography>
                            <Typography color="text.secondary">Member: {selectedMember?.full_name || selectedMember?.email || '—'}</Typography>
                            <Typography color="text.secondary">Plan: {selectedPlan ? buildPlanSummaryLabel(selectedPlan) : 'Select a plan'}</Typography>
                            <Typography color="text.secondary">Add-ons: {selectedAddOnRows.length ? selectedAddOnRows.map((addOn) => addOn.name).join(', ') : 'None selected'}</Typography>
                            <Typography color="text.secondary">Active add-ons right now: {selectedMemberAddOns.length ? selectedMemberAddOns.map((row) => row.add_on?.name || row.add_on_name || row.add_on_id).join(', ') : 'None'}</Typography>
                            <Typography variant="h5" fontWeight={800}>{formatCurrency(previewTotal, 'INR')}</Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={7}>
                        {selectedPlan ? (
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                            <Stack spacing={1}>
                              <Typography variant="subtitle1" fontWeight={800}>What happens when you issue</Typography>
                              <Typography color="text.secondary">• The profile is updated with the selected plan and active dates.</Typography>
                              <Typography color="text.secondary">• Active add-on subscriptions are aligned with the new bundle.</Typography>
                              <Typography color="text.secondary">• An invoice is created with plan + add-on line items.</Typography>
                              <Typography color="text.secondary">• When enabled, the app tries to email the invoice summary to the member.</Typography>
                            </Stack>
                          </Paper>
                        ) : (
                          <EmptyStateCard
                            title="Select a member and base plan"
                            description="Once both are chosen, you can preview the invoice-ready bundle before issuing it."
                          />
                        )}
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Typography color="text.secondary">
                        The seed pricing in this patch is fully editable later. Boxing is seeded at the same ₹8,000 price as MMA by default.
                      </Typography>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={issuingBundle}
                        sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        {issuingBundle ? 'Issuing bundle...' : 'Issue bundle invoice'}
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
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>Seed price reference</Typography>
              <Typography color="text.secondary">
                These are the defaults patched into the database so your AI agent or team can adjust them later without code changes.
              </Typography>
              <Grid container spacing={2}>
                {DEFAULT_PRICING_PREVIEW.map((item) => (
                  <Grid item xs={12} sm={6} md={3} key={`seed-${item.code}`}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                      <Stack spacing={1}>
                        <Typography fontWeight={800}>{item.name}</Typography>
                        <Typography color="text.secondary">{item.type === 'membership' ? (item.durationMonths ? describeDuration(item.durationMonths) : 'Membership') : 'Add-on'}</Typography>
                        <Typography variant="h6" fontWeight={800}>{formatCurrency(item.price, 'INR')}</Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminPlansPage;
