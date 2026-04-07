import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Group,
  LocalOffer,
  PersonAddAlt1,
  DeleteOutline,
  EditOutlined,
} from '@mui/icons-material';

import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  createOrUpdatePlan,
  deletePlan,
  fetchAvailablePlans,
  fetchMembers,
  invokeAdminMemberAction,
  updateMember,
} from '../../services/gymService';

const emptyMemberForm = {
  fullName: '',
  email: '',
  password: '',
  planId: '',
  role: 'member',
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

const currency = (value) => `$${Number(value || 0).toFixed(2)}`;

const AdminPage = () => {
  const { loading, profile } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [savingMember, setSavingMember] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const loadAdminData = async () => {
    try {
      setPageLoading(true);
      const [memberRows, planRows] = await Promise.all([
        fetchMembers(),
        fetchAvailablePlans(),
      ]);

      setMembers(memberRows);
      setPlans(planRows);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to load admin data.' });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const stats = useMemo(() => ({
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.is_active).length,
    adminUsers: members.filter((member) => member.role === 'admin').length,
    activePlans: plans.filter((plan) => plan.is_active).length,
  }), [members, plans]);

  const updateMemberFormField = (field) => (event) => {
    setMemberForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updatePlanFormField = (field) => (event) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;

    setPlanForm((current) => ({
      ...current,
      [field]: value,
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
        planId: memberForm.planId || null,
        role: memberForm.role,
      });

      setMemberForm(emptyMemberForm);
      await loadAdminData();
      setFeedback({ type: 'success', message: 'Member created successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `${error.message || 'Unable to create member.'} Make sure the admin-members Edge Function is deployed.`,
      });
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Remove this member account completely?')) {
      return;
    }

    try {
      await invokeAdminMemberAction('delete-user', { userId: memberId });
      setMembers((current) => current.filter((member) => member.id !== memberId));
      setFeedback({ type: 'success', message: 'Member removed successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `${error.message || 'Unable to remove member.'} Make sure the admin-members Edge Function is deployed.`,
      });
    }
  };

  const handleInlineMemberUpdate = async (memberId, changes) => {
    try {
      const updatedMember = await updateMember(memberId, changes);
      setMembers((current) => current.map((member) => (
        member.id === memberId ? updatedMember : member
      )));
      setFeedback({ type: 'success', message: 'Member updated.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update member.' });
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
          <Stack spacing={1.5} mb={4}>
            <Typography color="#ff2625" fontWeight={700}>
              Admin command center
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
              Manage plans, members, and gym access
            </Typography>
            <Typography color="text.secondary" maxWidth="920px">
              This page is designed for owners, managers, or coaches who need to manage member records without
              exposing admin credentials in the browser.
            </Typography>
          </Stack>

          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
            Creating and removing members requires the <strong>admin-members</strong> Supabase Edge Function included in this project.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <MetricCard title="Members" value={stats.totalMembers} caption="Total profiles" icon={Group} />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard title="Active members" value={stats.activeMembers} caption="Profiles marked active" icon={PersonAddAlt1} />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard title="Admins" value={stats.adminUsers} caption="Users with admin role" icon={AdminPanelSettings} />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard title="Active plans" value={stats.activePlans} caption="Membership plans live" icon={LocalOffer} />
            </Grid>

            <Grid item xs={12} lg={7}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Member roster
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Update roles, plans, and status
                  </Typography>
                </Stack>

                <TableContainer>
                  <Table sx={{ minWidth: 760 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Plan</strong></TableCell>
                        <TableCell><strong>Role</strong></TableCell>
                        <TableCell><strong>Active</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.full_name || 'Unnamed user'}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell sx={{ minWidth: 190 }}>
                            <TextField
                              select
                              size="small"
                              value={member.plan_id || ''}
                              onChange={(event) => handleInlineMemberUpdate(member.id, { plan_id: event.target.value || null })}
                              fullWidth
                            >
                              <MenuItem value="">No plan</MenuItem>
                              {plans.map((plan) => (
                                <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell sx={{ minWidth: 150 }}>
                            <TextField
                              select
                              size="small"
                              value={member.role}
                              onChange={(event) => handleInlineMemberUpdate(member.id, { role: event.target.value })}
                              fullWidth
                            >
                              <MenuItem value="member">Member</MenuItem>
                              <MenuItem value="admin">Admin</MenuItem>
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={member.is_active}
                              onChange={(event) => handleInlineMemberUpdate(member.id, { is_active: event.target.checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              color="error"
                              startIcon={<DeleteOutline />}
                              onClick={() => handleDeleteMember(member.id)}
                              disabled={member.id === profile.id}
                              sx={{ textTransform: 'none' }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Create member
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Add a new account
                  </Typography>
                  <Typography color="text.secondary">
                    This form creates a Supabase auth user and immediately prepares the member profile.
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleCreateMember}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Full name"
                      value={memberForm.fullName}
                      onChange={updateMemberFormField('fullName')}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={memberForm.email}
                      onChange={updateMemberFormField('email')}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Temporary password"
                      type="password"
                      value={memberForm.password}
                      onChange={updateMemberFormField('password')}
                      fullWidth
                      required
                    />
                    <TextField
                      select
                      label="Role"
                      value={memberForm.role}
                      onChange={updateMemberFormField('role')}
                      fullWidth
                    >
                      <MenuItem value="member">Member</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </TextField>
                    <TextField
                      select
                      label="Assign plan"
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

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={savingMember}
                      sx={{
                        bgcolor: '#ff2625',
                        textTransform: 'none',
                        borderRadius: 999,
                        py: 1.4,
                        '&:hover': { bgcolor: '#df1d1d' },
                      }}
                    >
                      {savingMember ? 'Creating...' : 'Create member'}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={1.5} mb={3}>
                  <Typography color="#ff2625" fontWeight={700}>
                    Plan editor
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {planForm.id ? 'Edit membership plan' : 'Create membership plan'}
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handlePlanSubmit}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Plan name"
                      value={planForm.name}
                      onChange={updatePlanFormField('name')}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Description"
                      value={planForm.description}
                      onChange={updatePlanFormField('description')}
                      fullWidth
                      multiline
                      minRows={3}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Price"
                        type="number"
                        value={planForm.price}
                        onChange={updatePlanFormField('price')}
                        fullWidth
                        required
                      />
                      <TextField
                        select
                        label="Billing cycle"
                        value={planForm.billing_cycle}
                        onChange={updatePlanFormField('billing_cycle')}
                        fullWidth
                      >
                        <MenuItem value="week">Week</MenuItem>
                        <MenuItem value="month">Month</MenuItem>
                        <MenuItem value="quarter">Quarter</MenuItem>
                        <MenuItem value="year">Year</MenuItem>
                      </TextField>
                    </Stack>
                    <TextField
                      label="Duration (weeks)"
                      type="number"
                      value={planForm.duration_weeks}
                      onChange={updatePlanFormField('duration_weeks')}
                      fullWidth
                      required
                    />

                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Switch
                        checked={planForm.is_active}
                        onChange={updatePlanFormField('is_active')}
                      />
                      <Typography>Plan is active</Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingPlan}
                        sx={{
                          bgcolor: '#ff2625',
                          textTransform: 'none',
                          borderRadius: 999,
                          py: 1.4,
                          flex: 1,
                          '&:hover': { bgcolor: '#df1d1d' },
                        }}
                      >
                        {savingPlan ? 'Saving...' : planForm.id ? 'Update plan' : 'Create plan'}
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setPlanForm(emptyPlanForm)}
                        sx={{ textTransform: 'none', borderRadius: 999, py: 1.4, flex: 1 }}
                      >
                        Reset
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Grid container spacing={2}>
                {plans.map((plan) => (
                  <Grid item xs={12} md={6} key={plan.id}>
                    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                      <Stack spacing={1.5} justifyContent="space-between" height="100%">
                        <Box>
                          <Typography variant="h6" fontWeight={800}>
                            {plan.name}
                          </Typography>
                          <Typography color="text.secondary" mb={1.5}>
                            {plan.description || 'No description yet.'}
                          </Typography>
                          <Typography fontWeight={700}>{currency(plan.price)} / {plan.billing_cycle}</Typography>
                          <Typography color="text.secondary">{plan.duration_weeks} week cycle</Typography>
                          <Typography color={plan.is_active ? 'success.main' : 'text.secondary'} mt={1}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1}>
                          <Button startIcon={<EditOutlined />} onClick={() => handleEditPlan(plan)} sx={{ textTransform: 'none' }}>
                            Edit
                          </Button>
                          <Button color="error" startIcon={<DeleteOutline />} onClick={() => handleDeletePlan(plan.id)} sx={{ textTransform: 'none' }}>
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AdminPage;
