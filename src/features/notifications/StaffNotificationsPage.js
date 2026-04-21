import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
  FormControlLabel,
} from '@mui/material';
import {
  Campaign,
  Groups2,
  MarkEmailRead,
  Send,
} from '@mui/icons-material';

import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchNotificationReminderRules,
  fetchNotificationTargets,
  fetchStaffNotifications,
  previewNotificationReminderRule,
  runNotificationReminderRule,
  saveNotificationReminderRule,
  sendStaffNotification,
} from '../../services/gymService';
import ReminderPreviewTable from './components/ReminderPreviewTable';
import ReminderRuleEditorCard from './components/ReminderRuleEditorCard';
import {
  applyNotificationTemplate,
  buildNotificationAudienceLabel,
  buildNotificationSummary,
  buildReminderSummary,
  createDefaultReminderRule,
  createEmptyNotificationComposer,
  DELIVERY_CHANNEL_OPTIONS,
  formatNotificationDate,
  getNotificationReadChipSx,
  getNotificationReadLabel,
  getNotificationTypeChipSx,
  getNotificationTypeLabel,
  NOTIFICATION_AUDIENCE_OPTIONS,
  NOTIFICATION_STATUS_OPTIONS,
  NOTIFICATION_TEMPLATE_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  sortNotificationsNewestFirst,
  sortReminderRules,
} from './notificationsHelpers';

const numericReminderFields = new Set(['lead_value', 'cooldown_hours']);

const createRuleKeyFromTitle = (title = '') => {
  const trimmedTitle = title.trim().toLowerCase();

  if (!trimmedTitle) {
    return `reminder-rule-${Date.now()}`;
  }

  const slug = trimmedTitle
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return slug || `reminder-rule-${Date.now()}`;
};

const StaffNotificationsPage = () => {
  const { loading, isConfigured } = useAuth();

  const [targets, setTargets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [notificationType, setNotificationType] = useState('all');
  const [targetSearch, setTargetSearch] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [form, setForm] = useState(createEmptyNotificationComposer());
  const [reminderRules, setReminderRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [selectedRule, setSelectedRule] = useState(createDefaultReminderRule());
  const [previewRows, setPreviewRows] = useState([]);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [previewingReminder, setPreviewingReminder] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [runningReminder, setRunningReminder] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState({ type: '', message: '' });

  const loadNotifications = useCallback(async ({
    nextQuery = query,
    nextStatus = status,
    nextType = notificationType,
    showPageLoader = false,
  } = {}) => {
    if (!isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      if (showPageLoader) {
        setPageLoading(true);
      } else {
        setRefreshing(true);
      }

      const rows = await fetchStaffNotifications({
        query: nextQuery,
        status: nextStatus,
        notificationType: nextType,
        limit: 120,
      });

      setNotifications(sortNotificationsNewestFirst(rows));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load notification activity.',
      });
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [isConfigured, notificationType, query, status]);

  const loadTargets = useCallback(async (searchValue = '') => {
    if (!isConfigured) {
      return;
    }

    try {
      const rows = await fetchNotificationTargets(searchValue, 30);
      setTargets(rows);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to load the member directory for notifications.',
      });
    }
  }, [isConfigured]);

  const loadReminderRules = useCallback(async (preferredRuleId = '') => {
    if (!isConfigured) {
      setReminderLoading(false);
      return [];
    }

    try {
      setReminderLoading(true);
      const rows = sortReminderRules(await fetchNotificationReminderRules());
      setReminderRules(rows);

      const nextRuleId = preferredRuleId || selectedRuleId || rows[0]?.id || '';
      const nextRule = rows.find((row) => row.id === nextRuleId) || rows[0] || null;

      if (nextRule) {
        setSelectedRuleId(nextRule.id);
        setSelectedRule(createDefaultReminderRule(nextRule));
      } else {
        setSelectedRuleId('');
        setSelectedRule(createDefaultReminderRule());
      }

      return rows;
    } catch (error) {
      setReminderFeedback({
        type: 'error',
        message: error.message || 'Unable to load reminder rules.',
      });
      return [];
    } finally {
      setReminderLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadNotifications({ showPageLoader: true });
  }, [loadNotifications]);

  useEffect(() => {
    const initialiseWorkspace = async () => {
      await Promise.all([
        loadTargets(''),
        loadReminderRules(),
      ]);
    };

    initialiseWorkspace();
  }, [loadReminderRules, loadTargets]);

  const summary = useMemo(() => buildNotificationSummary(notifications), [notifications]);

  const reminderSummary = useMemo(
    () => buildReminderSummary(reminderRules, previewRows),
    [previewRows, reminderRules],
  );

  const selectedTarget = useMemo(
    () => targets.find((row) => row.id === form.target_user_id) || null,
    [form.target_user_id, targets],
  );

  const handleComposerChange = (field) => (event) => {
    const nextValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleApplyTemplate = (event) => {
    const nextTemplate = event.target.value;

    if (!nextTemplate) {
      return;
    }

    setForm((current) => applyNotificationTemplate(current, nextTemplate));
  };

  const handleTargetSearch = async (event) => {
    const nextValue = event.target.value;
    setTargetSearch(nextValue);
    await loadTargets(nextValue);
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setFeedback({ type: '', message: '' });
      const insertedCount = await sendStaffNotification(form);
      await loadNotifications({ showPageLoader: false });
      setFeedback({
        type: 'success',
        message: insertedCount
          ? `Sent ${insertedCount} notification(s) to ${buildNotificationAudienceLabel(form, selectedTarget)}.`
          : 'No recipients matched the selected audience.',
      });
      setForm(createEmptyNotificationComposer());
      setTargetSearch('');
      await loadTargets('');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to send the notification.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSelectRule = (ruleId) => {
    setSelectedRuleId(ruleId);
    const matchingRule = reminderRules.find((row) => row.id === ruleId);
    setSelectedRule(createDefaultReminderRule(matchingRule || {}));
    setPreviewRows([]);
    setReminderFeedback({ type: '', message: '' });
  };

  const handleReminderFieldChange = (field, value) => {
    setSelectedRule((current) => ({
      ...current,
      [field]: numericReminderFields.has(field) ? Number(value || 0) : value,
    }));
  };

  const handleSaveReminderRule = async () => {
    try {
      setSavingReminder(true);
      setReminderFeedback({ type: '', message: '' });

      const payload = {
        ...selectedRule,
        rule_key: selectedRule.rule_key || createRuleKeyFromTitle(selectedRule.title),
      };

      const savedRule = await saveNotificationReminderRule(payload);
      await loadReminderRules(savedRule.id);
      setReminderFeedback({
        type: 'success',
        message: 'Reminder rule saved.',
      });
    } catch (error) {
      setReminderFeedback({
        type: 'error',
        message: error.message || 'Unable to save the reminder rule.',
      });
    } finally {
      setSavingReminder(false);
    }
  };

  const handlePreviewReminderRule = async () => {
    if (!selectedRuleId) {
      setReminderFeedback({
        type: 'warning',
        message: 'Save or select a reminder rule before previewing recipients.',
      });
      return;
    }

    try {
      setPreviewingReminder(true);
      setReminderFeedback({ type: '', message: '' });
      const rows = await previewNotificationReminderRule(selectedRuleId, 80);
      setPreviewRows(rows);
      setReminderFeedback({
        type: rows.length ? 'success' : 'info',
        message: rows.length
          ? `Preview ready for ${rows.length} recipient(s).`
          : 'No recipients currently match this reminder rule.',
      });
    } catch (error) {
      setReminderFeedback({
        type: 'error',
        message: error.message || 'Unable to preview reminder recipients.',
      });
    } finally {
      setPreviewingReminder(false);
    }
  };

  const handleRunReminderRule = async () => {
    if (!selectedRuleId) {
      setReminderFeedback({
        type: 'warning',
        message: 'Save or select a reminder rule before running it.',
      });
      return;
    }

    try {
      setRunningReminder(true);
      setReminderFeedback({ type: '', message: '' });
      const insertedCount = await runNotificationReminderRule(selectedRuleId, 120);
      await Promise.all([
        loadNotifications({ showPageLoader: false }),
        loadReminderRules(selectedRuleId),
      ]);
      setReminderFeedback({
        type: insertedCount ? 'success' : 'info',
        message: insertedCount
          ? `Triggered ${insertedCount} reminder(s) from the selected rule.`
          : 'No new reminders were generated because the current matches are already covered by cooldown.',
      });
    } catch (error) {
      setReminderFeedback({
        type: 'error',
        message: error.message || 'Unable to run the reminder rule.',
      });
    } finally {
      setRunningReminder(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading notifications workspace..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="Notifications need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Staff notifications and reminders
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Send updates now and automate the right nudges later
        </Typography>
        <Typography color="text.secondary" maxWidth="920px">
          Use this workspace to broadcast updates, send one-to-one reminders, preview recurring reminder rules,
          and monitor which notifications members have already opened.
        </Typography>
      </Stack>

      {feedback.message ? (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total sent"
            value={summary.total}
            caption="Latest 120 notifications"
            icon={Campaign}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Unread"
            value={summary.unreadCount}
            caption="Members have not opened these yet"
            icon={Groups2}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Read"
            value={summary.readCount}
            caption="Already acknowledged"
            icon={MarkEmailRead}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Actionable"
            value={summary.actionableCount}
            caption="Includes a direct CTA"
            icon={Send}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Stack spacing={2}>
              <Typography color="#ff2625" fontWeight={700}>
                Compose notification
              </Typography>
              <Typography color="text.secondary">
                Start from a template or write your own message. Broadcast to all members or target one person.
              </Typography>

              <TextField
                select
                label="Quick template"
                defaultValue=""
                onChange={handleApplyTemplate}
              >
                <MenuItem value="">Custom message</MenuItem>
                {NOTIFICATION_TEMPLATE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Audience mode"
                  value={form.target_mode}
                  onChange={handleComposerChange('target_mode')}
                  fullWidth
                >
                  <MenuItem value="role">Broadcast</MenuItem>
                  <MenuItem value="single">Single member</MenuItem>
                </TextField>

                {form.target_mode === 'role' ? (
                  <TextField
                    select
                    label="Audience"
                    value={form.target_role}
                    onChange={handleComposerChange('target_role')}
                    fullWidth
                  >
                    {NOTIFICATION_AUDIENCE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    select
                    label="Target member"
                    value={form.target_user_id}
                    onChange={handleComposerChange('target_user_id')}
                    fullWidth
                    helperText={selectedTarget ? `${selectedTarget.email} · ${selectedTarget.membership_status}` : 'Search below to refresh the list'}
                  >
                    {targets.map((target) => (
                      <MenuItem key={target.id} value={target.id}>
                        {(target.full_name || target.email)}{target.is_active ? '' : ' · inactive'}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>

              {form.target_mode === 'single' ? (
                <TextField
                  label="Search target list"
                  value={targetSearch}
                  onChange={handleTargetSearch}
                  placeholder="Search by name, email, or phone"
                />
              ) : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Notification type"
                  value={form.notification_type}
                  onChange={handleComposerChange('notification_type')}
                  fullWidth
                >
                  {NOTIFICATION_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Delivery channel"
                  value={form.delivery_channel}
                  onChange={handleComposerChange('delivery_channel')}
                  fullWidth
                >
                  {DELIVERY_CHANNEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                label="Title"
                value={form.title}
                onChange={handleComposerChange('title')}
                placeholder="Example: Membership payment due"
              />

              <TextField
                label="Message"
                value={form.message}
                onChange={handleComposerChange('message')}
                placeholder="Write the reminder or update members should see."
                multiline
                minRows={4}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Action label"
                  value={form.action_label}
                  onChange={handleComposerChange('action_label')}
                  placeholder="Open billing"
                  fullWidth
                />
                <TextField
                  label="Action path"
                  value={form.action_path}
                  onChange={handleComposerChange('action_path')}
                  placeholder="/billing"
                  fullWidth
                />
              </Stack>

              <FormControlLabel
                control={(
                  <Switch
                    checked={Boolean(form.include_inactive)}
                    onChange={handleComposerChange('include_inactive')}
                  />
                )}
                label="Include inactive members in broadcasts"
              />

              <Button
                variant="contained"
                onClick={handleSend}
                disabled={sending}
                startIcon={<Send />}
                sx={{
                  bgcolor: '#ff2625',
                  textTransform: 'none',
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  '&:hover': { bgcolor: '#df1d1d' },
                }}
              >
                {sending ? 'Sending...' : 'Send notification'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography color="#ff2625" fontWeight={700}>
                    Notification activity
                  </Typography>
                  <Typography color="text.secondary">
                    Review who received notifications and whether they have read them yet.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title, message, or recipient"
                  />
                  <TextField
                    select
                    label="Status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    sx={{ minWidth: 160 }}
                  >
                    {NOTIFICATION_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Type"
                    value={notificationType}
                    onChange={(event) => setNotificationType(event.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    <MenuItem value="all">All types</MenuItem>
                    {NOTIFICATION_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    onClick={() => loadNotifications({ showPageLoader: false })}
                    disabled={refreshing}
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </Button>
                </Stack>
              </Stack>

              <Divider />

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Recipient</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow key={notification.id} hover>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography fontWeight={700}>
                            {notification.recipient_name || notification.recipient_email || 'Member'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {notification.recipient_email || 'No email on file'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 320 }}>
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                label={getNotificationTypeLabel(notification.notification_type)}
                                sx={getNotificationTypeChipSx(notification.notification_type)}
                              />
                              <Chip
                                label={getNotificationReadLabel(notification)}
                                sx={getNotificationReadChipSx(notification)}
                              />
                            </Stack>
                            <Box>
                              <Typography fontWeight={700}>{notification.title}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {notification.message}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {notification.is_read
                              ? `Read ${notification.read_at ? formatNotificationDate(notification.read_at) : ''}`.trim()
                              : 'Unread'}
                          </Typography>
                        </TableCell>
                        <TableCell>{notification.delivery_channel?.replace('_', ' ') || 'in-app'}</TableCell>
                        <TableCell>{formatNotificationDate(notification.created_at)}</TableCell>
                      </TableRow>
                    ))}

                    {!notifications.length ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography color="text.secondary" py={2}>
                            No notification activity matches the current filters.
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

        <Grid item xs={12}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4 }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
              <Stack spacing={0.75}>
                <Typography color="#ff2625" fontWeight={700}>
                  Reminder automation snapshot
                </Typography>
                <Typography color="text.secondary">
                  Keep staff-triggered reminder rules visible without mixing them into unrelated public-site or hardware work.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap>
                <Chip label={`${reminderSummary.enabledRules} active rule(s)`} sx={{ fontWeight: 700 }} />
                <Chip label={`${reminderSummary.totalRules} total rule(s)`} sx={{ fontWeight: 700 }} />
                <Chip label={`${reminderSummary.previewCount} preview recipient(s)`} sx={{ fontWeight: 700 }} />
                <Chip
                  label={reminderSummary.latestRun ? `Last run ${formatNotificationDate(reminderSummary.latestRun)}` : 'No reminder run yet'}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <ReminderRuleEditorCard
            rules={reminderRules}
            selectedRuleId={selectedRuleId}
            rule={selectedRule}
            feedback={reminderFeedback}
            loading={reminderLoading}
            saving={savingReminder}
            previewing={previewingReminder}
            running={runningReminder}
            onSelectRule={handleSelectRule}
            onFieldChange={handleReminderFieldChange}
            onReload={() => loadReminderRules(selectedRuleId)}
            onSave={handleSaveReminderRule}
            onPreview={handlePreviewReminderRule}
            onRun={handleRunReminderRule}
          />
        </Grid>

        <Grid item xs={12} lg={7}>
          <ReminderPreviewTable rows={previewRows} loading={previewingReminder} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffNotificationsPage;
