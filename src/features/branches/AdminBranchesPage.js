import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import SaveIcon from '@mui/icons-material/Save';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import { useAuth } from '../../context/AuthContext';
import BranchSummaryCards from './BranchSummaryCards';
import {
  assignMemberHomeBranch,
  assignStaffToBranch,
  fetchBranchMembers,
  fetchBranches,
  fetchBranchStaffAssignments,
  fetchBranchSummary,
  fetchMemberCandidates,
  fetchStaffCandidates,
  saveBranch,
} from './branchClient';

const emptyBranchForm = {
  id: '',
  branch_code: '',
  name: '',
  timezone: 'Asia/Kolkata',
  phone: '',
  email: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  capacity_limit: '',
  opened_on: '',
  notes: '',
  is_active: true,
};

const emptyStaffAssignment = {
  staffId: '',
  assignmentRole: 'branch_manager',
  isPrimary: true,
};

const emptyMemberAssignment = {
  memberId: '',
  affiliationType: 'home_branch',
  isPrimary: true,
};

const statusChipSx = (isActive) => ({
  fontWeight: 700,
  backgroundColor: isActive ? '#edf7ed' : '#fff4e5',
  color: isActive ? '#2e7d32' : '#ed6c02',
});

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(date);
};

const AdminBranchesPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [staffCandidates, setStaffCandidates] = useState([]);
  const [memberCandidates, setMemberCandidates] = useState([]);
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [staffAssignment, setStaffAssignment] = useState(emptyStaffAssignment);
  const [memberAssignment, setMemberAssignment] = useState(emptyMemberAssignment);
  const [memberSearch, setMemberSearch] = useState('');
  const [feedback, setFeedback] = useState({ severity: 'success', message: '' });
  const [busyAction, setBusyAction] = useState('');

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || null,
    [branches, selectedBranchId],
  );

  const loadBranchDetail = useCallback(async (branchId, search = '') => {
    if (!branchId) {
      setSummary(null);
      setAssignments([]);
      setMembers([]);
      return;
    }

    const [nextSummary, nextAssignments, nextMembers] = await Promise.all([
      fetchBranchSummary(branchId),
      fetchBranchStaffAssignments(branchId),
      fetchBranchMembers(branchId, search),
    ]);

    setSummary(nextSummary);
    setAssignments(nextAssignments);
    setMembers(nextMembers);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [nextBranches, nextStaffCandidates, nextMemberCandidates] = await Promise.all([
        fetchBranches(),
        fetchStaffCandidates(),
        fetchMemberCandidates(),
      ]);

      setBranches(nextBranches);
      setStaffCandidates(nextStaffCandidates);
      setMemberCandidates(nextMemberCandidates);

      const fallbackBranchId = nextBranches[0]?.id || '';
      setSelectedBranchId((current) => current || fallbackBranchId);

      if (fallbackBranchId) {
        const activeBranch = nextBranches.find((branch) => branch.id === (selectedBranchId || fallbackBranchId)) || nextBranches[0];
        setBranchForm({
          ...emptyBranchForm,
          ...activeBranch,
          capacity_limit: activeBranch?.capacity_limit ?? '',
          opened_on: activeBranch?.opened_on || '',
        });
        await loadBranchDetail(activeBranch.id, memberSearch);
      }
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load branch operations.' });
    } finally {
      setLoading(false);
    }
  }, [loadBranchDetail, memberSearch, selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedBranch) {
      return;
    }

    setBranchForm({
      ...emptyBranchForm,
      ...selectedBranch,
      capacity_limit: selectedBranch.capacity_limit ?? '',
      opened_on: selectedBranch.opened_on || '',
    });
  }, [selectedBranch]);

  const handleRefreshCurrentBranch = useCallback(async () => {
    try {
      setBusyAction('refresh');
      await loadBranchDetail(selectedBranchId, memberSearch);
      setFeedback({ severity: 'success', message: 'Branch workspace refreshed.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to refresh branch workspace.' });
    } finally {
      setBusyAction('');
    }
  }, [loadBranchDetail, memberSearch, selectedBranchId]);

  const handleBranchFieldChange = (field) => (event) => {
    const value = field === 'is_active' ? event.target.value === 'true' : event.target.value;
    setBranchForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveBranch = async () => {
    try {
      setBusyAction('save-branch');
      const savedBranch = await saveBranch(branchForm);
      setFeedback({ severity: 'success', message: branchForm.id ? 'Branch updated successfully.' : 'Branch created successfully.' });
      await loadData();
      setSelectedBranchId(savedBranch.id);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save branch.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedBranchId) {
      setFeedback({ severity: 'warning', message: 'Select a branch first.' });
      return;
    }

    try {
      setBusyAction('assign-staff');
      await assignStaffToBranch({
        branchId: selectedBranchId,
        staffId: staffAssignment.staffId,
        assignmentRole: staffAssignment.assignmentRole,
        isPrimary: staffAssignment.isPrimary,
      });
      setStaffAssignment(emptyStaffAssignment);
      await loadBranchDetail(selectedBranchId, memberSearch);
      setFeedback({ severity: 'success', message: 'Staff member assigned to the branch.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to assign staff.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleAssignMember = async () => {
    if (!selectedBranchId) {
      setFeedback({ severity: 'warning', message: 'Select a branch first.' });
      return;
    }

    try {
      setBusyAction('assign-member');
      await assignMemberHomeBranch({
        branchId: selectedBranchId,
        memberId: memberAssignment.memberId,
        affiliationType: memberAssignment.affiliationType,
        isPrimary: memberAssignment.isPrimary,
      });
      setMemberAssignment(emptyMemberAssignment);
      await loadBranchDetail(selectedBranchId, memberSearch);
      setFeedback({ severity: 'success', message: 'Member affiliation saved.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to assign member to branch.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleNewBranch = () => {
    setBranchForm(emptyBranchForm);
    setSelectedBranchId('');
    setSummary(null);
    setAssignments([]);
    setMembers([]);
    setFeedback({ severity: 'info', message: 'Creating a new branch. Fill the branch profile and click save.' });
  };

  const filteredMemberCandidates = useMemo(() => memberCandidates.filter((candidate) => {
    if (!memberSearch.trim()) {
      return true;
    }

    const searchText = memberSearch.trim().toLowerCase();
    return [candidate.full_name, candidate.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchText));
  }), [memberCandidates, memberSearch]);

  if (loading) {
    return <LoadingScreen message="Loading branch operations..." />;
  }

  if (profile?.role !== 'admin') {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>Only admins can manage branches.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <SetupNotice title="Branch operations need Supabase setup" />

      <Stack spacing={1} mb={3}>
        <Typography variant="h4" fontWeight={800}>Multi-branch operations</Typography>
        <Typography color="text.secondary" maxWidth="900px">
          Add new locations, assign staff, set member home branches, and review branch-by-branch operational performance.
          This patch lays the branch-aware foundation for reports, payments, staffing, and future franchise growth.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.severity} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <BranchSummaryCards summary={summary} />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid xs={12} lg={4}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
              <Typography variant="h6" fontWeight={800}>Branch directory</Typography>
              <Button startIcon={<AddBusinessIcon />} variant="outlined" onClick={handleNewBranch}>
                New branch
              </Button>
            </Stack>
            {!branches.length ? (
              <EmptyStateCard
                title="No branches yet"
                description="Create your first branch to start assigning staff, members, classes, payments, and access points by location."
              />
            ) : (
              <Stack spacing={1.25}>
                {branches.map((branch) => (
                  <Paper
                    key={branch.id}
                    variant={selectedBranchId === branch.id ? 'outlined' : 'elevation'}
                    onClick={() => setSelectedBranchId(branch.id)}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      borderColor: selectedBranchId === branch.id ? '#ff2625' : 'divider',
                      cursor: 'pointer',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box>
                        <Typography fontWeight={800}>{branch.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {branch.city || 'City not set'}{branch.state ? `, ${branch.state}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Code: {branch.branch_code}
                        </Typography>
                      </Box>
                      <Chip label={branch.is_active ? 'Active' : 'Inactive'} sx={statusChipSx(branch.is_active)} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid xs={12} lg={8}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} mb={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Branch profile and assignments</Typography>
                <Typography variant="body2" color="text.secondary">
                  Save branch details here first, then assign staff and members to the location.
                </Typography>
              </Box>
              <Button variant="text" onClick={handleRefreshCurrentBranch} disabled={busyAction === 'refresh'}>
                Refresh data
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid xs={12} md={6}>
                <TextField label="Branch code" value={branchForm.branch_code} onChange={handleBranchFieldChange('branch_code')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Branch name" value={branchForm.name} onChange={handleBranchFieldChange('name')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Timezone" value={branchForm.timezone} onChange={handleBranchFieldChange('timezone')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Capacity limit" type="number" value={branchForm.capacity_limit} onChange={handleBranchFieldChange('capacity_limit')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Phone" value={branchForm.phone} onChange={handleBranchFieldChange('phone')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Email" value={branchForm.email} onChange={handleBranchFieldChange('email')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="City" value={branchForm.city} onChange={handleBranchFieldChange('city')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="State" value={branchForm.state} onChange={handleBranchFieldChange('state')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Country" value={branchForm.country} onChange={handleBranchFieldChange('country')} fullWidth />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField label="Opened on" type="date" value={branchForm.opened_on} onChange={handleBranchFieldChange('opened_on')} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid xs={12}>
                <TextField label="Address line 1" value={branchForm.address_line_1} onChange={handleBranchFieldChange('address_line_1')} fullWidth />
              </Grid>
              <Grid xs={12}>
                <TextField label="Address line 2" value={branchForm.address_line_2} onChange={handleBranchFieldChange('address_line_2')} fullWidth />
              </Grid>
              <Grid xs={12}>
                <TextField label="Notes" value={branchForm.notes} onChange={handleBranchFieldChange('notes')} multiline minRows={3} fullWidth />
              </Grid>
              <Grid xs={12} md={4}>
                <TextField
                  select
                  label="Status"
                  value={String(branchForm.is_active)}
                  onChange={handleBranchFieldChange('is_active')}
                  fullWidth
                >
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </TextField>
              </Grid>
              <Grid xs={12} md={8}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end" sx={{ height: '100%' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveBranch}
                    disabled={busyAction === 'save-branch'}
                    sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                  >
                    {branchForm.id ? 'Save branch changes' : 'Create branch'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={800} mb={1.5}>Assign staff to this branch</Typography>
                <Stack spacing={1.5}>
                  <TextField
                    select
                    label="Staff member"
                    value={staffAssignment.staffId}
                    onChange={(event) => setStaffAssignment((current) => ({ ...current, staffId: event.target.value }))}
                    fullWidth
                  >
                    {staffCandidates.map((candidate) => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.full_name || candidate.email} — {candidate.role}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Assignment role"
                    value={staffAssignment.assignmentRole}
                    onChange={(event) => setStaffAssignment((current) => ({ ...current, assignmentRole: event.target.value }))}
                    fullWidth
                  >
                    <MenuItem value="branch_manager">Branch manager</MenuItem>
                    <MenuItem value="trainer">Trainer</MenuItem>
                    <MenuItem value="front_desk">Front desk</MenuItem>
                    <MenuItem value="coach">Coach</MenuItem>
                    <MenuItem value="support">Support</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Primary assignment"
                    value={String(staffAssignment.isPrimary)}
                    onChange={(event) => setStaffAssignment((current) => ({ ...current, isPrimary: event.target.value === 'true' }))}
                    fullWidth
                  >
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </TextField>
                  <Button variant="outlined" onClick={handleAssignStaff} disabled={busyAction === 'assign-staff'}>
                    Save staff assignment
                  </Button>
                </Stack>
              </Grid>

              <Grid xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={800} mb={1.5}>Assign member to this branch</Typography>
                <Stack spacing={1.5}>
                  <TextField
                    label="Filter members"
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search by name or email"
                    fullWidth
                  />
                  <TextField
                    select
                    label="Member"
                    value={memberAssignment.memberId}
                    onChange={(event) => setMemberAssignment((current) => ({ ...current, memberId: event.target.value }))}
                    fullWidth
                  >
                    {filteredMemberCandidates.map((candidate) => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.full_name || candidate.email} — {candidate.membership_status || 'trial'}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Affiliation type"
                    value={memberAssignment.affiliationType}
                    onChange={(event) => setMemberAssignment((current) => ({ ...current, affiliationType: event.target.value }))}
                    fullWidth
                  >
                    <MenuItem value="home_branch">Home branch</MenuItem>
                    <MenuItem value="training_branch">Training branch</MenuItem>
                    <MenuItem value="visiting_branch">Visiting branch</MenuItem>
                  </TextField>
                  <Button
                    variant="outlined"
                    startIcon={<SwapHorizIcon />}
                    onClick={handleAssignMember}
                    disabled={busyAction === 'assign-member'}
                  >
                    Save member branch
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid xs={12} lg={5}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} mb={2}>Current staff roster</Typography>
            {!assignments.length ? (
              <EmptyStateCard
                title="No staff assignments yet"
                description="Assign branch managers, trainers, and front-desk staff so reports, classes, and compliance can be filtered by location."
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Primary</TableCell>
                    <TableCell>Dates</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.assignment_id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{assignment.full_name || assignment.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{assignment.email}</Typography>
                      </TableCell>
                      <TableCell>{assignment.assignment_role}</TableCell>
                      <TableCell>{assignment.is_primary ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        {formatDate(assignment.starts_on)}
                        {assignment.ends_on ? ` → ${formatDate(assignment.ends_on)}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        <Grid xs={12} lg={7}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} mb={2}>Member snapshot for selected branch</Typography>
            {!members.length ? (
              <EmptyStateCard
                title="No branch members loaded"
                description="Once members are assigned a home branch, this table will show their current plan, lifecycle status, and renewal horizon."
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Renews / ends</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{member.full_name || member.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{member.email || 'No email'}</Typography>
                      </TableCell>
                      <TableCell>{member.plan?.name || 'No plan assigned'}</TableCell>
                      <TableCell>
                        <Chip label={member.membership_status || 'trial'} size="small" sx={statusChipSx(member.is_active)} />
                      </TableCell>
                      <TableCell>{formatDate(member.membership_end_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminBranchesPage;
