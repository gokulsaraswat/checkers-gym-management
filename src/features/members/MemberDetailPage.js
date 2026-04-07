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
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  ArrowBack,
  AssignmentTurnedIn,
  DeleteOutline,
  HistoryEdu,
  Login,
  StickyNote2,
  WarningAmber,
} from '@mui/icons-material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  createMemberNote,
  deleteMemberNote,
  fetchAdminActivity,
  fetchAvailablePlans,
  fetchMemberAttendanceVisits,
  fetchMemberById,
  fetchMemberNotes,
  fetchMemberWaivers,
  fetchMembershipStatusHistory,
  recordMemberWaiver,
  updateMember,
} from '../../services/gymService';
import {
  APP_ROLE_OPTIONS,
  formatAdminActivityTimestamp,
  getRoleChipSx,
  getRoleLabel,
} from '../admin/adminHelpers';
import {
  buildMemberFormValues,
  CURRENT_LIABILITY_WAIVER_VERSION,
  formatDateTimeValue,
  formatDateValue,
  getMembershipStatusChipSx,
  getMembershipStatusLabel,
  getWaiverChipSx,
  getWaiverStatusLabel,
  MEMBERSHIP_STATUS_OPTIONS,
  todayIsoDate,
} from './memberLifecycle';
import {
  formatAttendanceDateTime,
  formatVisitDuration,
  getAttendanceSourceLabel,
  getAttendanceStatusChipSx,
  getAttendanceStatusLabel,
} from '../attendance/attendanceHelpers';

const MemberDetailPage = () => {
  const { memberId } = useParams();
  const { loading, profile } = useAuth();

  const [member, setMember] = useState(null);
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [attendanceVisits, setAttendanceVisits] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState({
    ...buildMemberFormValues(),
    changeReason: '',
  });
  const [waiverForm, setWaiverForm] = useState({
    version: CURRENT_LIABILITY_WAIVER_VERSION,
    notes: '',
  });
  const [noteForm, setNoteForm] = useState({
    note: '',
    isPinned: false,
    visibility: 'staff',
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordingWaiver, setRecordingWaiver] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [waiverFeedback, setWaiverFeedback] = useState({ type: '', message: '' });
  const [noteFeedback, setNoteFeedback] = useState({ type: '', message: '' });

  const loadPage = async () => {
    if (!memberId) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const [
        memberRow,
        planRows,
        historyRows,
        waiverRows,
        attendanceRows,
        noteRows,
        activityRows,
      ] = await Promise.all([
        fetchMemberById(memberId),
        fetchAvailablePlans(),
        fetchMembershipStatusHistory(memberId),
        fetchMemberWaivers(memberId),
        fetchMemberAttendanceVisits(memberId, 12),
        fetchMemberNotes(memberId),
        fetchAdminActivity({ memberId, limit: 12 }),
      ]);

      setMember(memberRow);
      setPlans(planRows);
      setHistory(historyRows);
      setWaivers(waiverRows);
      setAttendanceVisits(attendanceRows);
      setNotes(noteRows);
      setActivity(activityRows);
      setForm({
        ...buildMemberFormValues(memberRow),
        changeReason: '',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load member details.',
      });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [memberId]);

  const lifecycleSummary = useMemo(() => ({
    membershipLabel: getMembershipStatusLabel(member?.membership_status),
    waiverLabel: getWaiverStatusLabel(member),
  }), [member]);

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading member details..." />;
  }

  const handleFieldChange = (field) => (event) => {
    const nextValue = field === 'isActive' ? event.target.checked : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleWaiverFieldChange = (field) => (event) => {
    setWaiverForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleNoteFieldChange = (field) => (event) => {
    const nextValue = field === 'isPinned' ? event.target.checked : event.target.value;

    setNoteForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!form.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required.' });
      return;
    }

    try {
      setSaving(true);
      await updateMember(memberId, {
        fullName: form.fullName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        address: form.address,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        fitnessGoal: form.fitnessGoal,
        role: form.role,
        planId: form.planId || null,
        isActive: form.isActive,
        membershipStatus: form.membershipStatus,
        membershipStartDate: form.membershipStartDate,
        membershipEndDate: form.membershipEndDate,
        nextBillingDate: form.nextBillingDate,
      }, {
        changeReason: form.changeReason || 'Updated member record from detail page.',
      });
      await loadPage();
      setFeedback({ type: 'success', message: 'Member profile saved successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to save member details.',
      });
    } finally {
      setSaving(false);
    }
  };

  const runQuickAction = async (action) => {
    try {
      setFeedback({ type: '', message: '' });

      if (action === 'suspend') {
        await updateMember(memberId, {
          membershipStatus: 'suspended',
          isActive: false,
        }, {
          changeReason: `Suspended access for ${member?.full_name || member?.email}.`,
        });
      }

      if (action === 'reactivate') {
        await updateMember(memberId, {
          membershipStatus: member?.plan_id ? 'active' : 'trial',
          isActive: true,
        }, {
          changeReason: `Reactivated ${member?.full_name || member?.email}.`,
        });
      }

      if (action === 'expire') {
        await updateMember(memberId, {
          membershipStatus: 'expired',
          isActive: false,
          membershipEndDate: todayIsoDate(),
        }, {
          changeReason: `Marked ${member?.full_name || member?.email} as expired.`,
        });
      }

      await loadPage();
      setFeedback({ type: 'success', message: 'Quick action applied.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to apply quick action.' });
    }
  };

  const handleRecordWaiver = async (event) => {
    event.preventDefault();
    setWaiverFeedback({ type: '', message: '' });

    if (!waiverForm.version.trim()) {
      setWaiverFeedback({ type: 'error', message: 'Waiver version is required.' });
      return;
    }

    try {
      setRecordingWaiver(true);
      await recordMemberWaiver(memberId, {
        version: waiverForm.version,
        notes: waiverForm.notes,
        recordedSource: 'admin_panel',
      });
      setWaiverForm({
        version: waiverForm.version.trim(),
        notes: '',
      });
      await loadPage();
      setWaiverFeedback({ type: 'success', message: 'Waiver acknowledgement recorded.' });
    } catch (error) {
      setWaiverFeedback({
        type: 'error',
        message: error.message || 'Unable to record waiver acknowledgement.',
      });
    } finally {
      setRecordingWaiver(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    setNoteFeedback({ type: '', message: '' });

    if (!noteForm.note.trim()) {
      setNoteFeedback({ type: 'error', message: 'Write a note before saving.' });
      return;
    }

    try {
      setSavingNote(true);
      await createMemberNote(memberId, noteForm.note, {
        isPinned: noteForm.isPinned,
        visibility: noteForm.visibility,
      });
      setNoteForm({
        note: '',
        isPinned: false,
        visibility: noteForm.visibility,
      });
      await loadPage();
      setNoteFeedback({ type: 'success', message: 'Internal note saved.' });
    } catch (error) {
      setNoteFeedback({
        type: 'error',
        message: error.message || 'Unable to save note.',
      });
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this internal note?')) {
      return;
    }

    try {
      await deleteMemberNote(noteId);
      await loadPage();
      setNoteFeedback({ type: 'success', message: 'Note deleted.' });
    } catch (error) {
      setNoteFeedback({ type: 'error', message: error.message || 'Unable to delete note.' });
    }
  };

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" mb={4}>
        <Stack spacing={1.5}>
          <Typography color="#ff2625" fontWeight={700}>
            Member detail
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '42px' } }}>
            {member?.full_name || member?.email || 'Member record'}
          </Typography>
          <Typography color="text.secondary" maxWidth="860px">
            Edit lifecycle dates, plan assignment, waiver records, internal notes, and admin context from one page.
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          to={PATHS.admin}
          startIcon={<ArrowBack />}
          variant="outlined"
          sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
        >
          Back to admin panel
        </Button>
      </Stack>

      <SetupNotice title="Member lifecycle tools need Supabase setup" />

      {!member ? (
        <EmptyStateCard
          title="Member not found"
          description="The selected member profile could not be loaded."
          action={(
            <Button
              component={RouterLink}
              to={PATHS.admin}
              variant="contained"
              sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
            >
              Return to admin
            </Button>
          )}
        />
      ) : (
        <>
          {feedback.message ? (
            <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
              {feedback.message}
            </Alert>
          ) : null}

          {!profile?.is_active ? (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
              Your own admin profile is inactive. Some management actions may fail until another admin reactivates it.
            </Alert>
          ) : null}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <AdminPanelSettings sx={{ color: '#ff2625' }} />
                      <Typography fontWeight={800}>Member overview</Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={lifecycleSummary.membershipLabel} sx={getMembershipStatusChipSx(member.membership_status)} />
                      <Chip label={lifecycleSummary.waiverLabel} sx={getWaiverChipSx(Boolean(member.waiver_signed_at))} />
                      <Chip label={getRoleLabel(member.role)} sx={getRoleChipSx(member.role)} />
                    </Stack>

                    <Stack spacing={1.25}>
                      <InfoRow label="Email" value={member.email} />
                      <InfoRow label="Phone" value={member.phone || 'Not set'} />
                      <InfoRow label="Plan" value={member.plan?.name || 'Not assigned'} />
                      <InfoRow label="Access" value={member.is_active ? 'Enabled' : 'Paused'} />
                      <InfoRow label="Member since" value={formatDateValue(member.member_since)} />
                      <InfoRow label="Starts" value={formatDateValue(member.membership_start_date)} />
                      <InfoRow label="Ends" value={formatDateValue(member.membership_end_date)} />
                      <InfoRow label="Next billing" value={formatDateValue(member.next_billing_date)} />
                    </Stack>
                  </Stack>
                </Paper>

                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <WarningAmber sx={{ color: '#ff2625' }} />
                      <Typography fontWeight={800}>Quick actions</Typography>
                    </Stack>

                    <Stack spacing={1.5}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          runQuickAction(member.is_active && member.membership_status !== 'suspended' ? 'suspend' : 'reactivate');
                        }}
                        sx={{ textTransform: 'none', borderRadius: 999, justifyContent: 'flex-start' }}
                      >
                        {member.is_active && member.membership_status !== 'suspended' ? 'Suspend access' : 'Reactivate member'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          runQuickAction('expire');
                        }}
                        sx={{ textTransform: 'none', borderRadius: 999, justifyContent: 'flex-start' }}
                      >
                        Mark membership expired
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>

                <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <HistoryEdu sx={{ color: '#ff2625' }} />
                      <Typography fontWeight={800}>Recent admin activity</Typography>
                    </Stack>

                    {!activity.length ? (
                      <Typography color="text.secondary">
                        No admin actions have been logged for this member yet.
                      </Typography>
                    ) : (
                      <Stack spacing={2}>
                        {activity.map((item) => (
                          <Stack key={item.id} spacing={0.75}>
                            <Typography fontWeight={700}>
                              {item.action_summary}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.actor_name || 'Admin'} • {formatAdminActivityTimestamp(item.created_at)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={8}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
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
                      <AssignmentTurnedIn />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={800}>
                        Editable member record
                      </Typography>
                      <Typography color="text.secondary">
                        Save profile, access, and lifecycle details for this member. Changes are logged with your admin reason.
                      </Typography>
                    </Box>
                  </Stack>

                  <Box component="form" onSubmit={handleSave}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Full name"
                          value={form.fullName}
                          onChange={handleFieldChange('fullName')}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Phone"
                          value={form.phone}
                          onChange={handleFieldChange('phone')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Date of birth"
                          type="date"
                          value={form.dateOfBirth}
                          onChange={handleFieldChange('dateOfBirth')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Role"
                          value={form.role}
                          onChange={handleFieldChange('role')}
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
                          label="Plan"
                          value={form.planId}
                          onChange={handleFieldChange('planId')}
                          fullWidth
                        >
                          <MenuItem value="">No plan assigned</MenuItem>
                          {plans.map((plan) => (
                            <MenuItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Membership status"
                          value={form.membershipStatus}
                          onChange={handleFieldChange('membershipStatus')}
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
                          label="Membership start"
                          type="date"
                          value={form.membershipStartDate}
                          onChange={handleFieldChange('membershipStartDate')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Membership end"
                          type="date"
                          value={form.membershipEndDate}
                          onChange={handleFieldChange('membershipEndDate')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Next billing date"
                          type="date"
                          value={form.nextBillingDate}
                          onChange={handleFieldChange('nextBillingDate')}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={(
                            <Switch
                              checked={Boolean(form.isActive)}
                              onChange={handleFieldChange('isActive')}
                              color="error"
                            />
                          )}
                          label="Enable app access"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Address"
                          value={form.address}
                          onChange={handleFieldChange('address')}
                          fullWidth
                          multiline
                          minRows={2}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Emergency contact name"
                          value={form.emergencyContactName}
                          onChange={handleFieldChange('emergencyContactName')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Emergency contact phone"
                          value={form.emergencyContactPhone}
                          onChange={handleFieldChange('emergencyContactPhone')}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Fitness goal"
                          value={form.fitnessGoal}
                          onChange={handleFieldChange('fitnessGoal')}
                          fullWidth
                          multiline
                          minRows={3}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Admin reason for this change"
                          value={form.changeReason}
                          onChange={handleFieldChange('changeReason')}
                          fullWidth
                          multiline
                          minRows={2}
                          placeholder="Example: upgraded to staff role, corrected renewal date after cash payment, reactivated after waiver review..."
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Membership lifecycle changes are also written into the history timeline automatically.
                          </Typography>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                          >
                            {saving ? 'Saving member...' : 'Save member record'}
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <StickyNote2 sx={{ color: '#ff2625' }} />
                    <Typography fontWeight={800}>Internal notes</Typography>
                  </Stack>

                  {noteFeedback.message ? (
                    <Alert severity={noteFeedback.type || 'info'} sx={{ borderRadius: 3 }}>
                      {noteFeedback.message}
                    </Alert>
                  ) : null}

                  <Box component="form" onSubmit={handleAddNote}>
                    <Stack spacing={2}>
                      <TextField
                        label="Note"
                        value={noteForm.note}
                        onChange={handleNoteFieldChange('note')}
                        multiline
                        minRows={3}
                        fullWidth
                      />
                      <TextField
                        select
                        label="Visibility"
                        value={noteForm.visibility}
                        onChange={handleNoteFieldChange('visibility')}
                        fullWidth
                      >
                        <MenuItem value="staff">Staff + admin</MenuItem>
                        <MenuItem value="admin">Admin only</MenuItem>
                      </TextField>
                      <FormControlLabel
                        control={(
                          <Switch
                            checked={Boolean(noteForm.isPinned)}
                            onChange={handleNoteFieldChange('isPinned')}
                            color="error"
                          />
                        )}
                        label="Pin note to the top"
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingNote}
                        sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        {savingNote ? 'Saving note...' : 'Save note'}
                      </Button>
                    </Stack>
                  </Box>

                  {!notes.length ? (
                    <Typography color="text.secondary">
                      No internal notes yet.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {notes.map((note) => (
                        <Paper key={note.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Stack spacing={1.25}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="space-between">
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {note.is_pinned ? (
                                  <Chip
                                    label="Pinned"
                                    size="small"
                                    sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700 }}
                                  />
                                ) : null}
                                <Chip
                                  label={note.visibility === 'admin' ? 'Admin only' : 'Staff + admin'}
                                  size="small"
                                  sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700 }}
                                />
                              </Stack>

                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteOutline />}
                                onClick={() => {
                                  handleDeleteNote(note.id);
                                }}
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Delete
                              </Button>
                            </Stack>

                            <Typography>{note.note}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTimeValue(note.created_at)} • {note.author_name || 'Admin'}
                            </Typography>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <HistoryEdu sx={{ color: '#ff2625' }} />
                    <Typography fontWeight={800}>Membership history</Typography>
                  </Stack>

                  {!history.length ? (
                    <Typography color="text.secondary">
                      No lifecycle history yet.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {history.map((item) => (
                        <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Stack spacing={0.75}>
                            <Typography fontWeight={700}>
                              {getMembershipStatusLabel(item.next_status)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateValue(item.effective_on)} • {item.change_source.replace('_', ' ')}
                            </Typography>
                            {item.change_reason ? (
                              <Typography variant="body2" color="text.secondary">
                                {item.change_reason}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <AssignmentTurnedIn sx={{ color: '#ff2625' }} />
                    <Typography fontWeight={800}>Waiver records</Typography>
                  </Stack>

                  {waiverFeedback.message ? (
                    <Alert severity={waiverFeedback.type || 'info'} sx={{ borderRadius: 3 }}>
                      {waiverFeedback.message}
                    </Alert>
                  ) : null}

                  <Box component="form" onSubmit={handleRecordWaiver}>
                    <Stack spacing={2}>
                      <TextField
                        label="Waiver version"
                        value={waiverForm.version}
                        onChange={handleWaiverFieldChange('version')}
                        fullWidth
                      />
                      <TextField
                        label="Internal note"
                        value={waiverForm.notes}
                        onChange={handleWaiverFieldChange('notes')}
                        multiline
                        minRows={2}
                        fullWidth
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={recordingWaiver}
                        sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                      >
                        {recordingWaiver ? 'Recording waiver...' : 'Record waiver'}
                      </Button>
                    </Stack>
                  </Box>

                  {!waivers.length ? (
                    <Typography color="text.secondary">
                      No waiver acknowledgements recorded yet.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {waivers.map((waiver) => (
                        <Paper key={waiver.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Stack spacing={0.75}>
                            <Typography fontWeight={700}>
                              {waiver.version}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTimeValue(waiver.accepted_at)}
                            </Typography>
                            {waiver.notes ? (
                              <Typography variant="body2" color="text.secondary">
                                {waiver.notes}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Login sx={{ color: '#ff2625' }} />
                    <Typography fontWeight={800}>Recent attendance</Typography>
                  </Stack>

                  {!attendanceVisits.length ? (
                    <Typography color="text.secondary">
                      No attendance visits have been recorded for this member yet.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {attendanceVisits.map((visit) => (
                        <Paper key={visit.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Stack spacing={0.75}>
                            <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
                              <Typography fontWeight={700}>
                                {formatAttendanceDateTime(visit.checked_in_at)}
                              </Typography>
                              <Chip
                                size="small"
                                label={getAttendanceStatusLabel(visit.attendance_status)}
                                sx={getAttendanceStatusChipSx(visit.attendance_status)}
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              Duration: {formatVisitDuration(visit)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Source: {getAttendanceSourceLabel(visit.check_in_source)}
                            </Typography>
                            {visit.location_label ? (
                              <Typography variant="body2" color="text.secondary">
                                Location: {visit.location_label}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

const InfoRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography color="text.secondary">{label}</Typography>
    <Typography fontWeight={600} textAlign="right">
      {value}
    </Typography>
  </Stack>
);

export default MemberDetailPage;
