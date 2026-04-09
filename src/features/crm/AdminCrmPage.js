import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
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
  Campaign,
  PersonAddAlt1,
  Refresh,
  SupportAgent,
  TrendingUp,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  archiveCrmLead,
  fetchAvailablePlans,
  fetchCrmLeadInteractions,
  fetchCrmLeads,
  fetchMembers,
  fetchMembershipAddOns,
  saveCrmLead,
  saveCrmLeadInteraction,
  updateCrmLeadStage,
} from '../../services/gymService';
import {
  addOnSelectionMap,
  buildCrmStats,
  createInteractionForm,
  createLeadFilters,
  createLeadForm,
  filterLeads,
  formatCurrency,
  formatDate,
  formatDateTime,
  getFollowUpChipSx,
  getFollowUpLabel,
  getInteractionTypeLabel,
  getLeadSourceLabel,
  getLeadStageChipSx,
  getLeadStageLabel,
  LEAD_CONTACT_METHOD_OPTIONS,
  LEAD_INTERACTION_TYPE_OPTIONS,
  LEAD_SOURCE_FILTER_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_STAGE_OPTIONS,
  LEAD_STATUS_FILTER_OPTIONS,
  parseCommaTags,
  sortInteractions,
  sortLeads,
} from './crmHelpers';

const sectionCardSx = {
  p: { xs: 2.25, md: 3 },
  borderRadius: 4,
  background: '#fff',
  height: '100%',
};

const findNextStage = (currentStage) => {
  const order = LEAD_STAGE_OPTIONS.map((option) => option.value);
  const currentIndex = order.indexOf(currentStage);

  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }

  return order[currentIndex + 1];
};

const AdminCrmPage = () => {
  const { loading, isConfigured, profile, user } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [actingLeadId, setActingLeadId] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [leads, setLeads] = useState([]);
  const [recentInteractions, setRecentInteractions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [owners, setOwners] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  const [leadForm, setLeadForm] = useState(createLeadForm());
  const [interactionForm, setInteractionForm] = useState(createInteractionForm());
  const [filters, setFilters] = useState(createLeadFilters);

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

      const [leadRows, interactionRows, planRows, addOnRows, memberRows] = await Promise.all([
        fetchCrmLeads({ includeArchived: true, limit: 300 }),
        fetchCrmLeadInteractions({ limit: 200 }),
        fetchAvailablePlans(),
        fetchMembershipAddOns(),
        fetchMembers(),
      ]);

      setLeads(leadRows);
      setRecentInteractions(interactionRows);
      setPlans(planRows);
      setAddOns(addOnRows);
      setOwners((memberRows || []).filter((item) => ['staff', 'admin'].includes(item.role)));
      setSelectedLeadId((currentValue) => currentValue || leadRows[0]?.id || '');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the CRM workspace.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    void loadPage(true);
  }, [loadPage]);

  const sortedVisibleLeads = useMemo(() => sortLeads(filterLeads(leads, filters)), [filters, leads]);

  useEffect(() => {
    if (!sortedVisibleLeads.length) {
      setSelectedLeadId('');
      return;
    }

    setSelectedLeadId((currentValue) => {
      if (currentValue && sortedVisibleLeads.some((lead) => lead.id === currentValue)) {
        return currentValue;
      }

      return sortedVisibleLeads[0]?.id || '';
    });
  }, [sortedVisibleLeads]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  const selectedLeadInteractions = useMemo(
    () => sortInteractions(recentInteractions.filter((item) => item.lead_id === selectedLeadId)),
    [recentInteractions, selectedLeadId],
  );

  const stats = useMemo(
    () => buildCrmStats({ leads, interactions: recentInteractions }),
    [leads, recentInteractions],
  );

  const handleFilterChange = (field) => (event) => {
    const value = field === 'dueOnly' || field === 'includeArchived'
      ? event.target.checked
      : event.target.value;

    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLeadFieldChange = (field) => (event) => {
    const value = event.target.value;

    setLeadForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleToggleAddOn = (code) => () => {
    setLeadForm((current) => {
      const selectedCodes = addOnSelectionMap(current.interestedAddOnCodes);

      if (selectedCodes.has(code)) {
        selectedCodes.delete(code);
      } else {
        selectedCodes.add(code);
      }

      return {
        ...current,
        interestedAddOnCodes: [...selectedCodes],
      };
    });
  };

  const resetLeadForm = () => {
    setLeadForm(createLeadForm());
  };

  const handleEditLead = (lead) => {
    setLeadForm(createLeadForm(lead));
    setSelectedLeadId(lead.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveLead = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      setSavingLead(true);
      const savedLead = await saveCrmLead(leadForm, user?.id || null);

      setLeads((current) => {
        const exists = current.some((lead) => lead.id === savedLead.id);
        if (exists) {
          return current.map((lead) => (lead.id === savedLead.id ? savedLead : lead));
        }
        return [savedLead, ...current];
      });

      setSelectedLeadId(savedLead.id);
      setInteractionForm(createInteractionForm(savedLead.id));
      resetLeadForm();
      setFeedback({
        type: 'success',
        message: leadForm.id ? 'Lead updated successfully.' : 'Lead added to the pipeline.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the lead.' });
    } finally {
      setSavingLead(false);
    }
  };

  const handleArchiveLead = async (lead) => {
    const nextArchivedValue = !lead.is_archived;
    const confirmationLabel = nextArchivedValue ? 'archive' : 'restore';

    if (!window.confirm(`Do you want to ${confirmationLabel} ${lead.full_name || lead.email}?`)) {
      return;
    }

    try {
      setActingLeadId(lead.id);
      const savedLead = await archiveCrmLead(lead.id, nextArchivedValue, user?.id || null);
      setLeads((current) => current.map((item) => (item.id === savedLead.id ? savedLead : item)));
      setFeedback({
        type: 'success',
        message: nextArchivedValue ? 'Lead archived.' : 'Lead restored to the active pipeline.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update archive status.' });
    } finally {
      setActingLeadId('');
    }
  };

  const handleAdvanceStage = async (lead, nextStage) => {
    if (!nextStage) {
      return;
    }

    try {
      setActingLeadId(lead.id);
      const savedLead = await updateCrmLeadStage(lead.id, nextStage, user?.id || null);
      setLeads((current) => current.map((item) => (item.id === savedLead.id ? savedLead : item)));
      setSelectedLeadId(savedLead.id);
      setFeedback({
        type: 'success',
        message: `Lead moved to ${getLeadStageLabel(nextStage).toLowerCase()}.`,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update the stage.' });
    } finally {
      setActingLeadId('');
    }
  };

  const handleSaveInteraction = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!selectedLeadId) {
      setFeedback({ type: 'warning', message: 'Select a lead first to add an interaction.' });
      return;
    }

    try {
      setSavingInteraction(true);
      const savedInteraction = await saveCrmLeadInteraction({
        ...interactionForm,
        leadId: selectedLeadId,
      }, user?.id || null);

      setRecentInteractions((current) => [savedInteraction, ...current]);
      setInteractionForm(createInteractionForm(selectedLeadId));
      await loadPage(false);
      setFeedback({ type: 'success', message: 'Interaction logged successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save the interaction.' });
    } finally {
      setSavingInteraction(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading CRM and lead pipeline..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="CRM features need Supabase setup" />

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      {!profile ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          No profile record is available yet. Run <code>supabase/schema.sql</code> and refresh the app.
        </Alert>
      ) : (
        <>
          <Stack spacing={1.5} mb={4}>
            <Typography color="#ff2625" fontWeight={700}>
              CRM and lead pipeline
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
              Turn walk-ins, referrals, and trials into long-term members
            </Typography>
            <Typography color="text.secondary" maxWidth="940px">
              Capture leads, assign follow-ups, track trials, estimate potential revenue, and keep owner visibility on every stage from first contact to conversion.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={RouterLink}
                to={PATHS.admin}
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
              >
                Back to admin
              </Button>
              <Button
                component={RouterLink}
                to={PATHS.adminFinance}
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
              >
                Finance and exports
              </Button>
              <Button
                component={RouterLink}
                to={PATHS.adminReports}
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start' }}
              >
                Reports and analytics
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={() => loadPage(false)}
                variant="contained"
                sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' }, alignSelf: 'flex-start' }}
              >
                {refreshing ? 'Refreshing…' : 'Refresh CRM'}
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={3} mb={1}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Open pipeline"
                value={stats.openLeads}
                caption={`Total leads: ${stats.totalLeads}`}
                icon={SupportAgent}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Due today"
                value={stats.dueTodayLeads + stats.overdueLeads}
                caption={`Overdue: ${stats.overdueLeads}`}
                icon={Campaign}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Pipeline value"
                value={formatCurrency(stats.pipelineValue)}
                caption={`Trials in progress: ${stats.trialLeads}`}
                icon={TrendingUp}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Conversion"
                value={`${stats.conversionRate}%`}
                caption={`Won leads: ${stats.wonLeads}`}
                icon={PersonAddAlt1}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} xl={4}>
              <Paper className="surface-card" sx={sectionCardSx}>
                <Stack spacing={2.5} component="form" onSubmit={handleSaveLead}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      {leadForm.id ? 'Edit lead' : 'Add new lead'}
                    </Typography>
                    <Typography color="text.secondary">
                      Start with the basics, then attach plan interest, add-ons, trial timing, and follow-up ownership.
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField label="Full name" value={leadForm.fullName} onChange={handleLeadFieldChange('fullName')} fullWidth required />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Email" type="email" value={leadForm.email} onChange={handleLeadFieldChange('email')} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Phone" value={leadForm.phone} onChange={handleLeadFieldChange('phone')} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Source" value={leadForm.source} onChange={handleLeadFieldChange('source')} fullWidth>
                        {LEAD_SOURCE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Stage" value={leadForm.stage} onChange={handleLeadFieldChange('stage')} fullWidth>
                        {LEAD_STAGE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Owner" value={leadForm.assignedTo} onChange={handleLeadFieldChange('assignedTo')} fullWidth>
                        <MenuItem value="">Unassigned</MenuItem>
                        {owners.map((owner) => (
                          <MenuItem key={owner.id} value={owner.id}>{owner.full_name || owner.email}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Preferred contact" value={leadForm.preferredContactMethod} onChange={handleLeadFieldChange('preferredContactMethod')} fullWidth>
                        {LEAD_CONTACT_METHOD_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Interested plan" value={leadForm.interestedPlanId} onChange={handleLeadFieldChange('interestedPlanId')} fullWidth>
                        <MenuItem value="">No plan selected</MenuItem>
                        {plans.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Estimated value" type="number" value={leadForm.estimatedValue} onChange={handleLeadFieldChange('estimatedValue')} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Branch" value={leadForm.branchName} onChange={handleLeadFieldChange('branchName')} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Expected close date" type="date" value={leadForm.expectedCloseDate} onChange={handleLeadFieldChange('expectedCloseDate')} InputLabelProps={{ shrink: true }} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Next follow-up" type="datetime-local" value={leadForm.nextFollowUpAt} onChange={handleLeadFieldChange('nextFollowUpAt')} InputLabelProps={{ shrink: true }} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Trial scheduled for" type="datetime-local" value={leadForm.trialScheduledAt} onChange={handleLeadFieldChange('trialScheduledAt')} InputLabelProps={{ shrink: true }} fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Tags" value={leadForm.tags} onChange={handleLeadFieldChange('tags')} helperText="Comma-separated tags like strong referral, warm lead, student plan" fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Notes" value={leadForm.notes} onChange={handleLeadFieldChange('notes')} multiline minRows={3} fullWidth />
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography fontWeight={700} gutterBottom>
                      Interested add-ons
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {addOns.length ? addOns.map((addOn) => (
                        <FormControlLabel
                          key={addOn.id}
                          control={(
                            <Checkbox
                              checked={addOnSelectionMap(leadForm.interestedAddOnCodes).has(addOn.add_on_code)}
                              onChange={handleToggleAddOn(addOn.add_on_code)}
                            />
                          )}
                          label={`${addOn.name} (${formatCurrency(addOn.price, addOn.currency_code || 'INR')})`}
                        />
                      )) : (
                        <Typography variant="body2" color="text.secondary">
                          No add-ons in the catalog yet. Add them from the pricing catalog first.
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={savingLead}
                      sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                    >
                      {savingLead ? 'Saving…' : leadForm.id ? 'Update lead' : 'Save lead'}
                    </Button>
                    <Button type="button" onClick={resetLeadForm} variant="outlined" sx={{ textTransform: 'none', borderRadius: 999 }}>
                      Clear form
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} xl={8}>
              <Stack spacing={3}>
                <Paper className="surface-card" sx={sectionCardSx}>
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="h5" fontWeight={800}>
                        Pipeline filters and queue
                      </Typography>
                      <Typography color="text.secondary">
                        Focus on overdue follow-ups, high-value trials, or source-specific campaigns without losing the full pipeline context.
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField label="Search" value={filters.query} onChange={handleFilterChange('query')} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField select label="Stage" value={filters.stage} onChange={handleFilterChange('stage')} fullWidth>
                          {LEAD_STATUS_FILTER_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField select label="Source" value={filters.source} onChange={handleFilterChange('source')} fullWidth>
                          {LEAD_SOURCE_FILTER_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField select label="Owner" value={filters.ownerId} onChange={handleFilterChange('ownerId')} fullWidth>
                          <MenuItem value="all">All owners</MenuItem>
                          {owners.map((owner) => (
                            <MenuItem key={owner.id} value={owner.id}>{owner.full_name || owner.email}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel control={<Checkbox checked={filters.dueOnly} onChange={handleFilterChange('dueOnly')} />} label="Only due follow-ups" />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel control={<Checkbox checked={filters.includeArchived} onChange={handleFilterChange('includeArchived')} />} label="Include archived" />
                      </Grid>
                    </Grid>

                    {sortedVisibleLeads.length ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Lead</TableCell>
                              <TableCell>Stage</TableCell>
                              <TableCell>Source</TableCell>
                              <TableCell>Plan / add-ons</TableCell>
                              <TableCell>Follow-up</TableCell>
                              <TableCell>Owner</TableCell>
                              <TableCell align="right">Estimated</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sortedVisibleLeads.map((lead) => (
                              <TableRow
                                key={lead.id}
                                hover
                                selected={lead.id === selectedLeadId}
                                onClick={() => {
                                  setSelectedLeadId(lead.id);
                                  setInteractionForm(createInteractionForm(lead.id));
                                }}
                                sx={{ cursor: 'pointer' }}
                              >
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Typography fontWeight={700}>{lead.full_name || 'Unnamed lead'}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {[lead.email, lead.phone].filter(Boolean).join(' • ') || 'No contact details yet'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Chip label={getLeadStageLabel(lead.stage)} size="small" sx={getLeadStageChipSx(lead.stage)} />
                                </TableCell>
                                <TableCell>{getLeadSourceLabel(lead.source)}</TableCell>
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Typography variant="body2">{lead.plan?.name || 'No plan'}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {(lead.interested_add_on_codes || []).join(', ') || 'No add-ons'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Chip size="small" label={getFollowUpLabel(lead)} sx={getFollowUpChipSx(lead)} />
                                    <Typography variant="caption" color="text.secondary">
                                      {lead.next_follow_up_at ? formatDateTime(lead.next_follow_up_at) : 'Not scheduled'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>{lead.assignee?.full_name || lead.assignee?.email || 'Unassigned'}</TableCell>
                                <TableCell align="right">{formatCurrency(lead.estimated_value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <EmptyStateCard
                        title="No leads match the current filters"
                        description="Try widening the source, stage, or owner filters, or create the first lead from the form on the left."
                      />
                    )}
                  </Stack>
                </Paper>

                <Grid container spacing={3}>
                  <Grid item xs={12} xl={6}>
                    <Paper className="surface-card" sx={sectionCardSx}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h5" fontWeight={800}>
                            {selectedLead ? 'Selected lead details' : 'Select a lead'}
                          </Typography>
                          <Typography color="text.secondary">
                            Quick actions for stage movement, archive control, and conversion handoff.
                          </Typography>
                        </Box>

                        {selectedLead ? (
                          <>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
                              <Box>
                                <Typography variant="h6" fontWeight={800}>{selectedLead.full_name}</Typography>
                                <Typography color="text.secondary">
                                  {[selectedLead.email, selectedLead.phone].filter(Boolean).join(' • ') || 'Contact details pending'}
                                </Typography>
                              </Box>
                              <Chip label={getLeadStageLabel(selectedLead.stage)} sx={getLeadStageChipSx(selectedLead.stage)} />
                            </Stack>

                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Interested plan</Typography>
                                <Typography fontWeight={700}>{selectedLead.plan?.name || 'No plan selected yet'}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Preferred contact</Typography>
                                <Typography fontWeight={700}>{selectedLead.preferred_contact_method || '—'}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Expected close</Typography>
                                <Typography fontWeight={700}>{formatDate(selectedLead.expected_close_date)}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Trial</Typography>
                                <Typography fontWeight={700}>{formatDateTime(selectedLead.trial_scheduled_at)}</Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">Notes</Typography>
                                <Typography>{selectedLead.notes || 'No notes yet.'}</Typography>
                              </Grid>
                            </Grid>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} flexWrap="wrap">
                              <Button
                                onClick={() => handleEditLead(selectedLead)}
                                variant="outlined"
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Edit lead
                              </Button>
                              {findNextStage(selectedLead.stage) ? (
                                <Button
                                  onClick={() => handleAdvanceStage(selectedLead, findNextStage(selectedLead.stage))}
                                  disabled={actingLeadId === selectedLead.id}
                                  variant="contained"
                                  sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                                >
                                  Move to {getLeadStageLabel(findNextStage(selectedLead.stage)).toLowerCase()}
                                </Button>
                              ) : null}
                              <Button
                                onClick={() => handleAdvanceStage(selectedLead, 'won')}
                                disabled={actingLeadId === selectedLead.id}
                                variant="outlined"
                                color="success"
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Mark won
                              </Button>
                              <Button
                                onClick={() => handleAdvanceStage(selectedLead, 'lost')}
                                disabled={actingLeadId === selectedLead.id}
                                variant="outlined"
                                color="warning"
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Mark lost
                              </Button>
                              <Button
                                onClick={() => handleArchiveLead(selectedLead)}
                                disabled={actingLeadId === selectedLead.id}
                                variant="outlined"
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                {selectedLead.is_archived ? 'Restore lead' : 'Archive lead'}
                              </Button>
                              <Button
                                component={RouterLink}
                                to={PATHS.admin}
                                variant="outlined"
                                sx={{ textTransform: 'none', borderRadius: 999 }}
                              >
                                Convert via admin account creation
                              </Button>
                            </Stack>
                          </>
                        ) : (
                          <EmptyStateCard
                            title="No lead selected"
                            description="Select a row from the pipeline table to manage the next follow-up or stage update."
                          />
                        )}
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} xl={6}>
                    <Paper className="surface-card" sx={sectionCardSx}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h5" fontWeight={800}>
                            Interaction log
                          </Typography>
                          <Typography color="text.secondary">
                            Keep a simple call/visit/WhatsApp trail so anyone can continue the conversation without losing context.
                          </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSaveInteraction}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField select label="Interaction type" value={interactionForm.interactionType} onChange={(event) => setInteractionForm((current) => ({ ...current, interactionType: event.target.value }))} fullWidth>
                                {LEAD_INTERACTION_TYPE_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField label="Next follow-up" type="datetime-local" value={interactionForm.nextFollowUpAt} onChange={(event) => setInteractionForm((current) => ({ ...current, nextFollowUpAt: event.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField label="Summary" value={interactionForm.summary} onChange={(event) => setInteractionForm((current) => ({ ...current, summary: event.target.value }))} multiline minRows={2} fullWidth required />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField label="Outcome" value={interactionForm.outcome} onChange={(event) => setInteractionForm((current) => ({ ...current, outcome: event.target.value }))} fullWidth />
                            </Grid>
                          </Grid>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={2}>
                            <Button
                              type="submit"
                              disabled={savingInteraction || !selectedLeadId}
                              variant="contained"
                              sx={{ textTransform: 'none', borderRadius: 999, bgcolor: '#ff2625', '&:hover': { bgcolor: '#df1d1d' } }}
                            >
                              {savingInteraction ? 'Saving…' : 'Log interaction'}
                            </Button>
                            {!selectedLeadId ? (
                              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                Select a lead to enable interaction logging.
                              </Typography>
                            ) : null}
                          </Stack>
                        </Box>

                        <Divider />

                        {selectedLeadInteractions.length ? (
                          <Stack spacing={1.5}>
                            {selectedLeadInteractions.slice(0, 10).map((interaction) => (
                              <Paper key={interaction.id} variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                                <Stack spacing={0.75}>
                                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                                    <Chip size="small" label={getInteractionTypeLabel(interaction.interaction_type)} />
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDateTime(interaction.interaction_at || interaction.created_at)}
                                    </Typography>
                                  </Stack>
                                  <Typography fontWeight={700}>{interaction.summary}</Typography>
                                  {interaction.outcome ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Outcome: {interaction.outcome}
                                    </Typography>
                                  ) : null}
                                  {interaction.next_follow_up_at ? (
                                    <Typography variant="caption" color="text.secondary">
                                      Next follow-up: {formatDateTime(interaction.next_follow_up_at)}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        ) : (
                          <EmptyStateCard
                            title="No interactions logged yet"
                            description="The first note, call, trial, or visit summary will appear here."
                          />
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AdminCrmPage;
