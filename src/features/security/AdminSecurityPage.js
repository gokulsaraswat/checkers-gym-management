import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import { useAuth } from '../../context/AuthContext';
import AuditEventTable from './AuditEventTable';
import SecuritySummaryCards from './SecuritySummaryCards';
import {
  deletePermissionOverride,
  fetchAuditLogEvents,
  fetchPermissionOverrides,
  fetchSecurityBranches,
  fetchSecurityIncidents,
  fetchSecuritySummary,
  fetchSecurityUsers,
  fetchUserSecurityFlags,
  savePermissionOverride,
  saveSecurityIncident,
  saveUserSecurityFlag,
} from './securityClient';

const emptyOverrideForm = {
  roleName: 'staff',
  permissionKey: '',
  accessMode: 'allow',
  notes: '',
};

const emptyIncidentForm = {
  id: '',
  incident_status: 'open',
  severity: 'medium',
  title: '',
  description: '',
  branch_id: '',
  owner_user_id: '',
  related_user_id: '',
  related_entity_type: '',
  related_entity_id: '',
  resolution_notes: '',
};

const emptyFlagForm = {
  user_id: '',
  require_password_reset: false,
  member_portal_access: true,
  staff_portal_access: true,
  admin_portal_access: true,
  notes: '',
};

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
    timeStyle: 'short',
  }).format(date);
};

const statusChipSx = (value) => ({
  fontWeight: 700,
  backgroundColor: value === 'resolved' || value === 'allow' ? '#edf7ed' : value === 'deny' ? '#ffebee' : '#fff4e5',
  color: value === 'resolved' || value === 'allow' ? '#2e7d32' : value === 'deny' ? '#c62828' : '#ed6c02',
});

const AdminSecurityPage = () => {
  const { isConfigured, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [feedback, setFeedback] = useState({ severity: 'success', message: '' });
  const [summary, setSummary] = useState(null);
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [userFlags, setUserFlags] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [overrideForm, setOverrideForm] = useState(emptyOverrideForm);
  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm);
  const [flagForm, setFlagForm] = useState(emptyFlagForm);
  const [incidentFilter, setIncidentFilter] = useState({ status: '', severity: '' });
  const [flagSearch, setFlagSearch] = useState('');

  const userOptions = useMemo(
    () => users.map((user) => ({
      ...user,
      label: `${user.full_name || 'Unnamed'} (${user.role || 'user'})`,
    })),
    [users],
  );

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSummary, nextOverrides, nextIncidents, nextFlags, nextAudit, nextUsers, nextBranches] = await Promise.all([
        fetchSecuritySummary(),
        fetchPermissionOverrides(),
        fetchSecurityIncidents({
          status: incidentFilter.status || null,
          severity: incidentFilter.severity || null,
          limit: 40,
        }),
        fetchUserSecurityFlags({ search: flagSearch, limit: 80 }),
        fetchAuditLogEvents({ limit: 80 }),
        fetchSecurityUsers({ limit: 150 }),
        fetchSecurityBranches(),
      ]);

      setSummary(nextSummary);
      setPermissionOverrides(nextOverrides);
      setIncidents(nextIncidents);
      setUserFlags(nextFlags);
      setAuditEvents(nextAudit);
      setUsers(nextUsers);
      setBranches(nextBranches);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load the security center.' });
    } finally {
      setLoading(false);
    }
  }, [flagSearch, incidentFilter.severity, incidentFilter.status]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    loadPage();
  }, [isConfigured, loadPage]);

  const handleRefresh = async () => {
    try {
      setBusyAction('refresh');
      await loadPage();
      setFeedback({ severity: 'success', message: 'Security center refreshed.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to refresh the security center.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleOverrideChange = (field) => (event) => {
    setOverrideForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleIncidentChange = (field) => (event) => {
    setIncidentForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleFlagSwitchChange = (field) => (event) => {
    setFlagForm((current) => ({
      ...current,
      [field]: event.target.checked,
    }));
  };

  const handleFlagFieldChange = (field) => (event) => {
    setFlagForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSaveOverride = async () => {
    try {
      setBusyAction('save-override');
      await savePermissionOverride(overrideForm);
      setOverrideForm(emptyOverrideForm);
      await loadPage();
      setFeedback({ severity: 'success', message: 'Permission override saved.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save the permission override.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteOverride = async (overrideId) => {
    try {
      setBusyAction(`delete-${overrideId}`);
      await deletePermissionOverride(overrideId);
      await loadPage();
      setFeedback({ severity: 'success', message: 'Permission override removed.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to remove the permission override.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleLoadOverride = (override) => {
    setOverrideForm({
      roleName: override.role_name,
      permissionKey: override.permission_key,
      accessMode: override.access_mode,
      notes: override.notes || '',
    });
  };

  const handleSaveIncident = async () => {
    try {
      setBusyAction('save-incident');
      await saveSecurityIncident(incidentForm);
      setIncidentForm(emptyIncidentForm);
      await loadPage();
      setFeedback({ severity: 'success', message: incidentForm.id ? 'Security incident updated.' : 'Security incident created.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save the security incident.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleEditIncident = (incident) => {
    setIncidentForm({
      id: incident.id,
      incident_status: incident.incident_status || 'open',
      severity: incident.severity || 'medium',
      title: incident.title || '',
      description: incident.description || '',
      branch_id: incident.branch_id || '',
      owner_user_id: incident.owner_user_id || '',
      related_user_id: incident.related_user_id || '',
      related_entity_type: incident.related_entity_type || '',
      related_entity_id: incident.related_entity_id || '',
      resolution_notes: incident.resolution_notes || '',
    });
  };

  const handleSaveFlag = async () => {
    try {
      setBusyAction('save-flag');
      await saveUserSecurityFlag(flagForm);
      setFlagForm(emptyFlagForm);
      await loadPage();
      setFeedback({ severity: 'success', message: 'User security controls saved.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save the user security controls.' });
    } finally {
      setBusyAction('');
    }
  };

  const handleEditFlag = (flag) => {
    setFlagForm({
      user_id: flag.user_id,
      require_password_reset: Boolean(flag.require_password_reset),
      member_portal_access: Boolean(flag.member_portal_access),
      staff_portal_access: Boolean(flag.staff_portal_access),
      admin_portal_access: Boolean(flag.admin_portal_access),
      notes: flag.notes || '',
    });
  };

  if (!isConfigured) {
    return (
      <SetupNotice
        title="Supabase is required for the security center"
        description="Add your Supabase project URL and publishable/anon key to .env, then reload the app to use security controls and audit logs."
      />
    );
  }

  if (loading) {
    return <LoadingScreen message="Loading security center" />;
  }

  if (profile?.role !== 'admin') {
    return <Alert severity="warning">Admin access is required to view the security center.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Box>
          <Typography variant="h4" fontWeight={900}>
            Security and audit center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage role overrides, investigate incidents, review access flags, and keep a clean audit trail.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={handleRefresh}
          disabled={busyAction === 'refresh'}
        >
          Refresh workspace
        </Button>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.severity} onClose={() => setFeedback({ severity: 'success', message: '' })}>
          {feedback.message}
        </Alert>
      ) : null}

      <SecuritySummaryCards summary={summary} />

      <Grid container spacing={2.5}>
        <Grid xs={12} xl={4}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography variant="h6" fontWeight={800}>
                  Permission override rules
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use targeted allow or deny rules when a role needs temporary exceptions.
                </Typography>
              </Stack>

              <TextField
                select
                label="Role"
                value={overrideForm.roleName}
                onChange={handleOverrideChange('roleName')}
                fullWidth
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
              <TextField
                label="Permission key"
                value={overrideForm.permissionKey}
                onChange={handleOverrideChange('permissionKey')}
                placeholder="billing.refund.issue or reports.export.finance"
                fullWidth
              />
              <TextField
                select
                label="Access mode"
                value={overrideForm.accessMode}
                onChange={handleOverrideChange('accessMode')}
                fullWidth
              >
                <MenuItem value="allow">Allow</MenuItem>
                <MenuItem value="deny">Deny</MenuItem>
              </TextField>
              <TextField
                label="Notes"
                value={overrideForm.notes}
                onChange={handleOverrideChange('notes')}
                multiline
                minRows={3}
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<SaveRoundedIcon />}
                onClick={handleSaveOverride}
                disabled={busyAction === 'save-override'}
              >
                Save override
              </Button>

              <Divider />

              {permissionOverrides.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell>Permission</TableCell>
                      <TableCell>Access</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissionOverrides.map((override) => (
                      <TableRow key={override.id} hover>
                        <TableCell>{override.role_name}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>{override.permission_key}</TableCell>
                        <TableCell>
                          <Chip size="small" label={override.access_mode} sx={statusChipSx(override.access_mode)} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => handleLoadOverride(override)}>
                              Load
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineRoundedIcon />}
                              onClick={() => handleDeleteOverride(override.id)}
                              disabled={busyAction === `delete-${override.id}`}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyStateCard
                  title="No overrides yet"
                  description="Create your first targeted role override to document an exception without changing the whole role model."
                />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid xs={12} xl={8}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Security incidents
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track suspicious access, billing mismatches, waiver issues, or branch-level compliance problems.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    size="small"
                    label="Status"
                    value={incidentFilter.status}
                    onChange={(event) => setIncidentFilter((current) => ({ ...current, status: event.target.value }))}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="monitoring">Monitoring</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Severity"
                    value={incidentFilter.severity}
                    onChange={(event) => setIncidentFilter((current) => ({ ...current, severity: event.target.value }))}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </TextField>
                </Stack>
              </Stack>

              <Grid container spacing={2}>
                <Grid xs={12} md={4}>
                  <TextField
                    select
                    label="Status"
                    value={incidentForm.incident_status}
                    onChange={handleIncidentChange('incident_status')}
                    fullWidth
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="monitoring">Monitoring</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </TextField>
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    select
                    label="Severity"
                    value={incidentForm.severity}
                    onChange={handleIncidentChange('severity')}
                    fullWidth
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </TextField>
                </Grid>
                <Grid xs={12} md={4}>
                  <TextField
                    select
                    label="Branch"
                    value={incidentForm.branch_id}
                    onChange={handleIncidentChange('branch_id')}
                    fullWidth
                  >
                    <MenuItem value="">Global</MenuItem>
                    {branches.map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid xs={12}>
                  <TextField
                    label="Incident title"
                    value={incidentForm.title}
                    onChange={handleIncidentChange('title')}
                    fullWidth
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    label="Owner"
                    value={incidentForm.owner_user_id}
                    onChange={handleIncidentChange('owner_user_id')}
                    fullWidth
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {userOptions.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    label="Related user"
                    value={incidentForm.related_user_id}
                    onChange={handleIncidentChange('related_user_id')}
                    fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
                    {userOptions.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Related entity type"
                    value={incidentForm.related_entity_type}
                    onChange={handleIncidentChange('related_entity_type')}
                    placeholder="invoice, booking, access_event"
                    fullWidth
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Related entity id"
                    value={incidentForm.related_entity_id}
                    onChange={handleIncidentChange('related_entity_id')}
                    fullWidth
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Description"
                    value={incidentForm.description}
                    onChange={handleIncidentChange('description')}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Resolution notes"
                    value={incidentForm.resolution_notes}
                    onChange={handleIncidentChange('resolution_notes')}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSaveIncident}
                  disabled={busyAction === 'save-incident'}
                >
                  {incidentForm.id ? 'Update incident' : 'Create incident'}
                </Button>
                <Button variant="text" onClick={() => setIncidentForm(emptyIncidentForm)}>
                  Reset form
                </Button>
              </Stack>

              <Divider />

              {incidents.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {incidents.map((incident) => (
                      <TableRow key={incident.id} hover>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography fontWeight={700}>{incident.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {incident.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={incident.incident_status} sx={statusChipSx(incident.incident_status)} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={incident.severity} sx={statusChipSx(incident.severity)} />
                        </TableCell>
                        <TableCell>{incident.owner_name || 'Unassigned'}</TableCell>
                        <TableCell>{incident.branch_name || 'Global'}</TableCell>
                        <TableCell>{formatDate(incident.updated_at)}</TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => handleEditIncident(incident)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyStateCard
                  title="No incidents yet"
                  description="Create incidents for suspicious activity, process failures, or compliance follow-ups so they do not disappear into chat or spreadsheets."
                />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid xs={12}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    User access flags
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Flag accounts for password reset or temporarily block member, staff, or admin portal access without deleting the profile.
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label="Find user"
                  value={flagSearch}
                  onChange={(event) => setFlagSearch(event.target.value)}
                  sx={{ minWidth: 240 }}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    label="User"
                    value={flagForm.user_id}
                    onChange={handleFlagFieldChange('user_id')}
                    fullWidth
                  >
                    <MenuItem value="">Select user</MenuItem>
                    {userOptions.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Notes"
                    value={flagForm.notes}
                    onChange={handleFlagFieldChange('notes')}
                    fullWidth
                  />
                </Grid>
                <Grid xs={12} md={3}>
                  <FormControlLabel
                    control={<Switch checked={flagForm.require_password_reset} onChange={handleFlagSwitchChange('require_password_reset')} />}
                    label="Require password reset"
                  />
                </Grid>
                <Grid xs={12} md={3}>
                  <FormControlLabel
                    control={<Switch checked={flagForm.member_portal_access} onChange={handleFlagSwitchChange('member_portal_access')} />}
                    label="Member portal"
                  />
                </Grid>
                <Grid xs={12} md={3}>
                  <FormControlLabel
                    control={<Switch checked={flagForm.staff_portal_access} onChange={handleFlagSwitchChange('staff_portal_access')} />}
                    label="Staff portal"
                  />
                </Grid>
                <Grid xs={12} md={3}>
                  <FormControlLabel
                    control={<Switch checked={flagForm.admin_portal_access} onChange={handleFlagSwitchChange('admin_portal_access')} />}
                    label="Admin portal"
                  />
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSaveFlag}
                  disabled={busyAction === 'save-flag'}
                >
                  Save user controls
                </Button>
                <Button variant="text" onClick={() => setFlagForm(emptyFlagForm)}>
                  Reset form
                </Button>
              </Stack>

              <Divider />

              {userFlags.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Password reset</TableCell>
                      <TableCell>Portal access</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userFlags.map((flag) => (
                      <TableRow key={flag.user_id} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{flag.full_name || 'Unnamed user'}</Typography>
                          <Typography variant="caption" color="text.secondary">{flag.email || 'No email'}</Typography>
                        </TableCell>
                        <TableCell>{flag.role || 'user'}</TableCell>
                        <TableCell>
                          {flag.require_password_reset ? (
                            <Chip size="small" label="Required" sx={{ fontWeight: 700, backgroundColor: '#ffebee', color: '#c62828' }} />
                          ) : (
                            <Chip size="small" label="Normal" sx={{ fontWeight: 700, backgroundColor: '#edf7ed', color: '#2e7d32' }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip size="small" label={`Member ${flag.member_portal_access ? 'on' : 'off'}`} sx={statusChipSx(flag.member_portal_access ? 'allow' : 'deny')} />
                            <Chip size="small" label={`Staff ${flag.staff_portal_access ? 'on' : 'off'}`} sx={statusChipSx(flag.staff_portal_access ? 'allow' : 'deny')} />
                            <Chip size="small" label={`Admin ${flag.admin_portal_access ? 'on' : 'off'}`} sx={statusChipSx(flag.admin_portal_access ? 'allow' : 'deny')} />
                          </Stack>
                        </TableCell>
                        <TableCell>{formatDate(flag.updated_at)}</TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => handleEditFlag(flag)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyStateCard
                  title="No flagged users yet"
                  description="Use flags to require a password reset or temporarily lock a portal while you investigate a billing, waiver, or access-control issue."
                />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid xs={12}>
          <AuditEventTable events={auditEvents} />
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AdminSecurityPage;
