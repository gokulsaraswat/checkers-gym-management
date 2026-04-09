import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
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
  AdminPanelSettings,
  AssignmentTurnedIn,
  DeleteOutline,
  Group,
  PersonAddAlt1,
  WarningAmber,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { getAdminMemberDetailPath, PATHS } from '../../app/paths';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  createOrUpdatePlan,
  deletePlan,
  fetchAdminActivity,
  fetchAvailablePlans,
  fetchMembers,
  invokeAdminMemberAction,
  updateMember,
} from '../../services/gymService';
import {
  CURRENT_LIABILITY_WAIVER_VERSION,
  formatDateValue,
  getMembershipStatusChipSx,
  getMembershipStatusLabel,
  getWaiverChipSx,
  MEMBERSHIP_STATUS_OPTIONS,
  todayIsoDate,
} from '../members/memberLifecycle';
import {
  ACCESS_FILTER_OPTIONS,
  APP_ROLE_OPTIONS,
  buildAdminStats,
  describeAccessState,
  filterMembers,
  getRoleChipSx,
  getRoleLabel,
  MEMBER_SORT_OPTIONS,
} from './adminHelpers';
import AdminRecentActivityCard from './components/AdminRecentActivityCard';
import StaffRosterCard from './components/StaffRosterCard';

const emptyMemberForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  planId: '',
  role: 'member',
  membershipStatus: 'active',
  membershipStartDate: todayIsoDate(),
  membershipEndDate: '',
  nextBillingDate: '',
  isActive: true,
};

const emptyPlanForm = {
  id: '',
  name: '',
  description: '',
  price: '',
  billing_cycle: 'month',
  duration_weeks: 4,
  is_active: true,
};

const emptyFilters = {
  query: '',
  role: 'all',
  status: 'all',
  planId: 'all',
  access: 'all',
  sort: 'recent',
};

const currency = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `INR ${amount.toFixed(2)}`;
  }
};

const AdminPage = () => {
  const { loading, profile } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [savingMember, setSavingMember] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const loadAdminData = async () => {
    try {
      setPageLoading(true);
      const [memberRows, planRows, activityRows] = await Promise.all([
        fetchMembers(),
        fetchAvailablePlans(),
        fetchAdminActivity({ limit: 10 }),
      ]);

      setMembers(memberRows);
      setPlans(planRows);
      setRecentActivity(activityRows);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load admin data.' });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const stats = useMemo(
    () => buildAdminStats(members, plans, recentActivity),
    [members, plans, recentActivity],
  );

  const filteredMembers = useMemo(
    () => filterMembers(members, filters),
    [members, filters],
  );

  const staffRoster = useMemo(
    () => members.filter((member) => ['staff', 'admin'].includes(member.role)),
    [members],
  );

  const updateMemberFormField = (field) => (event) => {
    const value = field === 'isActive' ? event.target.checked : event.target.value;

    setMemberForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePlanFormField = (field) => (event) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;

    setPlanForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateFilterField = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingMember(true);

      await invokeAdminMemberAction('create-user', {
        email: memberForm.email,
        password: memberForm.password,
        fullName: memberForm.fullName,
        phone: memberForm.phone,
        planId: memberForm.planId || null,
        role: memberForm.role,
        membershipStatus: memberForm.membershipStatus,
        membershipStartDate: memberForm.membershipStartDate || null,
        membershipEndDate: memberForm.membershipEndDate || null,
        nextBillingDate: memberForm.nextBillingDate || null,
        isActive: memberForm.isActive,
      });

      setMemberForm({
        ...emptyMemberForm,
        membershipStartDate: todayIsoDate(),
      });
      await loadAdminData();
      setFeedback({ type: 'success', message: 'Member created successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `${error.message || 'Unable to create member.'} Make sure the admin-members Edge Function and Phase 4 SQL migration are deployed.`,
      });
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Remove ${member.full_name || member.email} completely? This deletes login access too.`)) {
      return;
    }

    try {
      await invokeAdminMemberAction('delete-user', { userId: member.id });
      await loadAdminData();
      setFeedback({ type: 'success', message: 'Member removed successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `${error.message || 'Unable to remove member.'} Make sure the admin-members Edge Function is deployed.`,
      });
    }
  };

  const handleMemberUpdate = async (memberId, changes, changeReason) => {
    try {
      await updateMember(memberId, changes, { changeReason });
      await loadAdminData();
      setFeedback({ type: 'success', message: 'Member updated.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update member.' });
    }
  };

  const handleQuickAction = async (member, action) => {
    if (action === 'suspend') {
      await handleMemberUpdate(
        member.id,
        { membershipStatus: 'suspended', isActive: false },
        `Suspended access for ${member.full_name || member.email}.`,
      );
      return;
    }

    if (action === 'reactivate') {
      await handleMemberUpdate(
        member.id,
        {
          membershipStatus: member.plan_id ? 'active' : 'trial',
          isActive: true,
        },
        `Reactivated ${member.full_name || member.email}.`,
      );
      return;
    }

    if (action === 'expire') {
      await handleMemberUpdate(
        member.id,
        {
          membershipStatus: 'expired',
          isActive: false,
          membershipEndDate: todayIsoDate(),
        },
        `Marked ${member.full_name || member.email} as expired.`,
      );
    }
  };

  const handlePlanSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingPlan(true);
      const savedPlan = await createOrUpdatePlan(planForm);

      setPlans((current) => {
        const exists = current.some((plan) => plan.id === savedPlan.id);

        if (exists) {
          return current.map((plan) => (plan.id === savedPlan.id ? savedPlan : plan));
        }

        return [...current, savedPlan];
      });

      setPlanForm(emptyPlanForm);
      setFeedback({ type: 'success', message: planForm.id ? 'Plan updated.' : 'Plan created.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save plan.' });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleEditPlan = (plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      duration_weeks: plan.duration_weeks,
      is_active: plan.is_active,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete this membership plan?')) {
      return;
    }

    try {
      await deletePlan(planId);
      setPlans((current) => current.filter((plan) => plan.id !== planId));
      setFeedback({ type: 'success', message: 'Plan deleted.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to delete plan.' });
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading admin tools..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="Admin features need Supabase setup" />

      {!profile ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          No profile record is available yet. Run <code>supabase/schema.sql</code> and refresh the app.
        </Alert>
      ) : (
        <>
          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          {!profile.is_active ? (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
              Your own admin account is inactive. Another admin must reactivate it before all management actions will work.
            </Alert>
          ) : null}

          <Stack spacing={1.5} mb={4}>
            <Typography color="#ff2625" fontWeight={700}>
              Admin command center
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
              Fully manage members, plans, access, and finance
            </Typography>
            <Typography color="text.secondary" maxWidth="920px">
              This phase turns the admin area into a real operations workspace: create members, filter the roster,
              suspend or reactivate accounts, maintain staff roles, launch the pricing catalog, and open the finance export center.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={RouterLink}
                to={PATHS.adminPlans}
                variant="contained"
                sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' }, alignSelf: 'flex-start' }}
              >
                Pricing catalog and renewals
              </Button>
              <Button
                component={RouterLink}
                to={PATHS.adminFinance}
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
              >
                Finance and exports
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={3} mb={1}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Members"
                value={stats.totalMembers}
                caption="All profile records"
                icon={Group}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Live"
                value={stats.liveMembers}
                caption="Active or trial with access"
                icon={AssignmentTurnedIn}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Staff/Admin"
                value={stats.staffCount}
                caption="Operational accounts"
                icon={AdminPanelSettings}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Needs attention"
                value={stats.attentionRequired}
                caption={`Pending waivers: ${stats.pendingWaivers} • Active plans: ${stats.activePlans}`}
                icon={WarningAmber}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Box
                      sx={{
                        width: 58,
                        height: 58,
                        borderRadius: '20px',
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
                        Create member or staff account
                      </Typography>
                      <Typography color="text.secondary">
                        Every new account can start with role, plan, lifecycle dates, and access state already set.
                      </Typography>
                    </Box>
                  </Stack>

                  <Box component="form" onSubmit={handleCreateMember}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Full name"
                          value={memberForm.fullName}
                          onChange={updateMemberFormField('fullName')}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Email"
                          type="email"
                          value={memberForm.email}
                          onChange={updateMemberFormField('email')}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Temporary password"
                          type="password"
                          value={memberForm.password}
                          onChange={updateMemberFormField('password')}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Phone"
                          value={memberForm.phone}
                          onChange={updateMemberFormField('phone')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Role"
                          value={memberForm.role}
                          onChange={updateMemberFormField('role')}
                          fullWidth
                        >
                          {APP_ROLE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Membership status"
                          value={memberForm.membershipStatus}
                          onChange={updateMemberFormField('membershipStatus')}
                          fullWidth
                        >
                          {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Plan"
                          value={memberForm.planId}
                          onChange={updateMemberFormField('planId')}
                          fullWidth
                        >
                          <MenuItem value="">No plan yet</MenuItem>
                          {plans.map((plan) => (
                            <MenuItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Membership start"
                          type="date"
                          value={memberForm.membershipStartDate}
                          onChange={updateMemberFormField('membershipStartDate')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Membership end"
                          type="date"
                          value={memberForm.membershipEndDate}
                          onChange={updateMemberFormField('membershipEndDate')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Next billing date"
                          type="date"
                          value={memberForm.nextBillingDate}
                          onChange={updateMemberFormField('nextBillingDate')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControlLabel
                          control={(
                            <Switch
                              checked={memberForm.isActive}
                              onChange={updateMemberFormField('isActive')}
                              color="error"
                            />
                          )}
                          label="Enable app access immediately"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            New waivers start as pending. Current version: <strong>{CURRENT_LIABILITY_WAIVER_VERSION}</strong>
                          </Typography>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={savingMember}
                            sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                          >
                            {savingMember ? 'Creating account...' : 'Create account'}
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <AdminRecentActivityCard activities={recentActivity} />
            </Grid>

            <Grid item xs={12}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Box>
                      <Typography variant="h5" fontWeight={800}>
                        Member roster
                      </Typography>
                      <Typography color="text.secondary">
                        Filter by lifecycle, access, or plan, then make quick updates inline.
                      </Typography>
                    </Box>

                    <Chip
                      label={`${filteredMembers.length} shown`}
                      sx={{ bgcolor: '#fff0f0', color: '#ff2625', fontWeight: 700 }}
                    />
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Search"
                        value={filters.query}
                        onChange={updateFilterField('query')}
                        fullWidth
                        placeholder="Name, email, phone, goal..."
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        select
                        label="Role"
                        value={filters.role}
                        onChange={updateFilterField('role')}
                        fullWidth
                      >
                        <MenuItem value="all">All roles</MenuItem>
                        {APP_ROLE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        select
                        label="Status"
                        value={filters.status}
                        onChange={updateFilterField('status')}
                        fullWidth
                      >
                        <MenuItem value="all">All statuses</MenuItem>
                        {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        select
                        label="Plan"
                        value={filters.planId}
                        onChange={updateFilterField('planId')}
                        fullWidth
                      >
                        <MenuItem value="all">All plans</MenuItem>
                        <MenuItem value="">No plan</MenuItem>
                        {plans.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={1}>
                      <TextField
                        select
                        label="Access"
                        value={filters.access}
                        onChange={updateFilterField('access')}
                        fullWidth
                      >
                        {ACCESS_FILTER_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <TextField
                        select
                        label="Sort"
                        value={filters.sort}
                        onChange={updateFilterField('sort')}
                        fullWidth
                      >
                        {MEMBER_SORT_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>

                  <TableContainer>
                    <Table sx={{ minWidth: 1100 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Plan</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Access</TableCell>
                          <TableCell>Dates</TableCell>
                          <TableCell>Waiver</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredMembers.map((member) => (
                          <TableRow key={member.id} hover>
                            <TableCell sx={{ minWidth: 240 }}>
                              <Stack spacing={1}>
                                <Box>
                                  <Typography fontWeight={700}>
                                    {member.full_name || member.email}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {member.email}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  <Chip
                                    label={getRoleLabel(member.role)}
                                    size="small"
                                    sx={getRoleChipSx(member.role)}
                                  />
                                  <Chip
                                    label={describeAccessState(member)}
                                    size="small"
                                    sx={{
                                      bgcolor: member.is_active ? '#ecfdf3' : '#fef2f2',
                                      color: member.is_active ? '#047857' : '#b91c1c',
                                      fontWeight: 700,
                                    }}
                                  />
                                </Stack>
                              </Stack>
                            </TableCell>

                            <TableCell sx={{ minWidth: 150 }}>
                              <TextField
                                select
                                size="small"
                                value={member.role}
                                onChange={(event) => {
                                  void handleMemberUpdate(
                                    member.id,
                                    { role: event.target.value },
                                    `Changed role for ${member.full_name || member.email}.`,
                                  );
                                }}
                                fullWidth
                              >
                                {APP_ROLE_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </TableCell>

                            <TableCell sx={{ minWidth: 180 }}>
                              <TextField
                                select
                                size="small"
                                value={member.plan_id || ''}
                                onChange={(event) => {
                                  void handleMemberUpdate(
                                    member.id,
                                    { planId: event.target.value || null },
                                    `Updated plan assignment for ${member.full_name || member.email}.`,
                                  );
                                }}
                                fullWidth
                              >
                                <MenuItem value="">No plan</MenuItem>
                                {plans.map((plan) => (
                                  <MenuItem key={plan.id} value={plan.id}>
                                    {plan.name}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </TableCell>

                            <TableCell sx={{ minWidth: 180 }}>
                              <Stack spacing={1}>
                                <TextField
                                  select
                                  size="small"
                                  value={member.membership_status}
                                  onChange={(event) => {
                                    void handleMemberUpdate(
                                      member.id,
                                      { membershipStatus: event.target.value },
                                      `Updated membership status for ${member.full_name || member.email}.`,
                                    );
                                  }}
                                  fullWidth
                                >
                                  {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </TextField>
                                <Chip
                                  label={getMembershipStatusLabel(member.membership_status)}
                                  size="small"
                                  sx={getMembershipStatusChipSx(member.membership_status)}
                                />
                              </Stack>
                            </TableCell>

                            <TableCell sx={{ minWidth: 150 }}>
                              <FormControlLabel
                                control={(
                                  <Switch
                                    checked={Boolean(member.is_active)}
                                    onChange={(event) => {
                                      void handleMemberUpdate(
                                        member.id,
                                        { isActive: event.target.checked },
                                        event.target.checked
                                          ? `Enabled app access for ${member.full_name || member.email}.`
                                          : `Paused app access for ${member.full_name || member.email}.`,
                                      );
                                    }}
                                    color="error"
                                  />
                                )}
                                label={member.is_active ? 'Enabled' : 'Paused'}
                              />
                            </TableCell>

                            <TableCell sx={{ minWidth: 180 }}>
                              <Typography variant="body2" fontWeight={600}>
                                Ends: {formatDateValue(member.membership_end_date, 'Not set')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Bills: {formatDateValue(member.next_billing_date, 'Not set')}
                              </Typography>
                            </TableCell>

                            <TableCell sx={{ minWidth: 120 }}>
                              <Chip
                                label={member.waiver_signed_at ? 'Signed' : 'Pending'}
                                size="small"
                                sx={getWaiverChipSx(Boolean(member.waiver_signed_at))}
                              />
                            </TableCell>

                            <TableCell align="right" sx={{ minWidth: 260 }}>
                              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                                <Button
                                  component={RouterLink}
                                  to={getAdminMemberDetailPath(member.id)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Details
                                </Button>

                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    void handleQuickAction(
                                      member,
                                      member.is_active && member.membership_status !== 'suspended' ? 'suspend' : 'reactivate',
                                    );
                                  }}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  {member.is_active && member.membership_status !== 'suspended' ? 'Suspend' : 'Reactivate'}
                                </Button>

                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    void handleQuickAction(member, 'expire');
                                  }}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Expire
                                </Button>

                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteOutline />}
                                  onClick={() => {
                                    void handleDeleteMember(member);
                                  }}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Delete
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!filteredMembers.length ? (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <Typography color="text.secondary" py={2}>
                                No members match the current filters.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <StaffRosterCard members={staffRoster} />
            </Grid>

            <Grid item xs={12} lg={8}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Membership plan manager
                    </Typography>
                    <Typography color="text.secondary">
                      Keep offerings current, then assign them directly from the roster or member detail page.
                    </Typography>
                  </Box>

                  <Box component="form" onSubmit={handlePlanSubmit}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Plan name"
                          value={planForm.name}
                          onChange={updatePlanFormField('name')}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Description"
                          value={planForm.description}
                          onChange={updatePlanFormField('description')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Price"
                          type="number"
                          value={planForm.price}
                          onChange={updatePlanFormField('price')}
                          fullWidth
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          select
                          label="Billing"
                          value={planForm.billing_cycle}
                          onChange={updatePlanFormField('billing_cycle')}
                          fullWidth
                        >
                          <MenuItem value="month">Monthly</MenuItem>
                          <MenuItem value="quarter">Quarterly</MenuItem>
                          <MenuItem value="year">Yearly</MenuItem>
                          <MenuItem value="one_time">One-time</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          label="Duration (weeks)"
                          type="number"
                          value={planForm.duration_weeks}
                          onChange={updatePlanFormField('duration_weeks')}
                          fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <FormControlLabel
                          control={(
                            <Switch
                              checked={Boolean(planForm.is_active)}
                              onChange={updatePlanFormField('is_active')}
                              color="error"
                            />
                          )}
                          label="Plan available for new sales"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Stack direction="row" spacing={1.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                          {planForm.id ? (
                            <Button
                              type="button"
                              onClick={() => setPlanForm(emptyPlanForm)}
                              sx={{ textTransform: 'none', borderRadius: 999 }}
                            >
                              Cancel edit
                            </Button>
                          ) : null}
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={savingPlan}
                            sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                          >
                            {savingPlan ? 'Saving...' : (planForm.id ? 'Update plan' : 'Create plan')}
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Billing</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {plans.map((plan) => (
                          <TableRow key={plan.id} hover>
                            <TableCell>
                              <Typography fontWeight={700}>{plan.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {plan.description || 'No description'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ textTransform: 'capitalize' }}>{plan.billing_cycle.replace('_', ' ')}</TableCell>
                            <TableCell>{currency(plan.price)}</TableCell>
                            <TableCell>{plan.duration_weeks} weeks</TableCell>
                            <TableCell>
                              <Chip
                                label={plan.is_active ? 'Active' : 'Archived'}
                                size="small"
                                sx={{
                                  bgcolor: plan.is_active ? '#ecfdf3' : '#f8fafc',
                                  color: plan.is_active ? '#047857' : '#475569',
                                  fontWeight: 700,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleEditPlan(plan)}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    void handleDeletePlan(plan.id);
                                  }}
                                  sx={{ textTransform: 'none', borderRadius: 999 }}
                                >
                                  Delete
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!plans.length ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Typography color="text.secondary" py={2}>
                                No membership plans created yet.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AdminPage;
