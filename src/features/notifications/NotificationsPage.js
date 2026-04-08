import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
  MarkEmailRead,
  NotificationsActive,
  NotificationsNone,
  Tune,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import EmptyStateCard from '../../components/common/EmptyStateCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import MetricCard from '../../components/common/MetricCard';
import SetupNotice from '../../components/common/SetupNotice';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMyNotifications,
  fetchNotificationPreferences,
  markAllNotificationsRead,
  markNotificationReadState,
  saveNotificationPreferences,
} from '../../services/gymService';
import {
  buildNotificationSummary,
  createDefaultNotificationPreferences,
  formatNotificationDate,
  getNotificationReadChipSx,
  getNotificationReadLabel,
  getNotificationTypeChipSx,
  getNotificationTypeLabel,
  NOTIFICATION_STATUS_OPTIONS,
  sortNotificationsNewestFirst,
} from './notificationsHelpers';

const preferenceSwitches = [
  ['email_enabled', 'Email updates'],
  ['push_enabled', 'In-app / push reminders'],
  ['sms_enabled', 'SMS reminders'],
  ['whatsapp_enabled', 'WhatsApp reminders'],
  ['class_reminders_enabled', 'Class reminders'],
  ['billing_reminders_enabled', 'Billing reminders'],
  ['workout_reminders_enabled', 'Workout reminders'],
  ['marketing_enabled', 'Offers and promotions'],
];

const NotificationsPage = () => {
  const { user, loading, isConfigured } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(createDefaultNotificationPreferences());
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageLoading, setPageLoading] = useState(true);
  const [pageFeedback, setPageFeedback] = useState({ type: '', message: '' });
  const [preferencesFeedback, setPreferencesFeedback] = useState({ type: '', message: '' });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [actingNotificationId, setActingNotificationId] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotificationData = useCallback(async () => {
    if (!user || !isConfigured) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);

      const [notificationRows, preferenceRow] = await Promise.all([
        fetchMyNotifications(user.id, { limit: 80 }),
        fetchNotificationPreferences(user.id),
      ]);

      setNotifications(sortNotificationsNewestFirst(notificationRows));
      setPreferences(createDefaultNotificationPreferences(preferenceRow || {}));
      setPageFeedback({ type: '', message: '' });
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to load your notifications.',
      });
    } finally {
      setPageLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    loadNotificationData();
  }, [loadNotificationData]);

  const visibleNotifications = useMemo(() => {
    if (statusFilter === 'unread') {
      return notifications.filter((row) => !row?.is_read);
    }

    if (statusFilter === 'read') {
      return notifications.filter((row) => row?.is_read);
    }

    return notifications;
  }, [notifications, statusFilter]);

  const summary = useMemo(
    () => buildNotificationSummary(notifications),
    [notifications],
  );

  const handleNotificationToggle = async (notification, nextReadState) => {
    try {
      setActingNotificationId(notification.id);
      setPageFeedback({ type: '', message: '' });
      const saved = await markNotificationReadState(notification.id, nextReadState);
      setNotifications((current) => sortNotificationsNewestFirst(current.map((row) => (
        row.id === notification.id ? { ...row, ...saved } : row
      ))));
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to update the notification.',
      });
    } finally {
      setActingNotificationId('');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      setPageFeedback({ type: '', message: '' });
      const updatedCount = await markAllNotificationsRead();
      await loadNotificationData();
      setPageFeedback({
        type: 'success',
        message: updatedCount ? `Marked ${updatedCount} notification(s) as read.` : 'No unread notifications were left to update.',
      });
    } catch (error) {
      setPageFeedback({
        type: 'error',
        message: error.message || 'Unable to mark all notifications as read.',
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePreferenceToggle = (field) => (event) => {
    const nextValue = event.target.checked;
    setPreferences((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handlePreferenceFieldChange = (field) => (event) => {
    const nextValue = event.target.value;
    setPreferences((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSavePreferences = async () => {
    if (!user) {
      return;
    }

    try {
      setSavingPreferences(true);
      setPreferencesFeedback({ type: '', message: '' });
      const saved = await saveNotificationPreferences(user.id, preferences);
      setPreferences(createDefaultNotificationPreferences(saved || {}));
      setPreferencesFeedback({
        type: 'success',
        message: 'Notification preferences updated.',
      });
    } catch (error) {
      setPreferencesFeedback({
        type: 'error',
        message: error.message || 'Unable to save notification preferences.',
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  if (loading || pageLoading) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <SetupNotice title="Notifications need Supabase setup" />

      <Stack spacing={1.5} mb={4}>
        <Typography color="#ff2625" fontWeight={700}>
          Notifications
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '32px', md: '46px' } }}>
          Stay on top of classes, billing, and coaching updates
        </Typography>
        <Typography color="text.secondary" maxWidth="900px">
          This inbox keeps your reminders, coach nudges, and gym announcements in one place.
          You can mark items as read and control how you want to hear from the gym.
        </Typography>
      </Stack>

      {pageFeedback.message ? (
        <Alert severity={pageFeedback.type || 'info'} sx={{ mb: 3, borderRadius: 3 }}>
          {pageFeedback.message}
        </Alert>
      ) : null}

      <Grid container spacing={3} mb={1}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Unread"
            value={summary.unreadCount}
            caption="Items waiting for you"
            icon={NotificationsActive}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total notifications"
            value={summary.total}
            caption={`${summary.readCount} already reviewed`}
            icon={NotificationsNone}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Action items"
            value={summary.actionableCount}
            caption="Notifications with a direct next step"
            icon={MarkEmailRead}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Latest update"
            value={summary.latest ? getNotificationTypeLabel(summary.latest.notification_type) : 'None'}
            caption={summary.latest ? formatNotificationDate(summary.latest.created_at) : 'No notifications yet'}
            icon={Tune}
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
            <Stack spacing={2}>
              <Typography color="#ff2625" fontWeight={700}>
                Delivery preferences
              </Typography>
              <Typography color="text.secondary">
                Choose how you want the gym to reach you. In-app notifications remain available even if
                external channels are turned off.
              </Typography>

              <Grid container spacing={1}>
                {preferenceSwitches.map(([field, label]) => (
                  <Grid item xs={12} sm={6} key={field}>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={Boolean(preferences[field])}
                          onChange={handlePreferenceToggle(field)}
                        />
                      )}
                      label={label}
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Quiet hours start"
                  type="time"
                  value={preferences.quiet_hours_start || ''}
                  onChange={handlePreferenceFieldChange('quiet_hours_start')}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Quiet hours end"
                  type="time"
                  value={preferences.quiet_hours_end || ''}
                  onChange={handlePreferenceFieldChange('quiet_hours_end')}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>

              {preferencesFeedback.message ? (
                <Alert severity={preferencesFeedback.type || 'info'} sx={{ borderRadius: 3 }}>
                  {preferencesFeedback.message}
                </Alert>
              ) : null}

              <Button
                variant="contained"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                sx={{
                  bgcolor: '#ff2625',
                  textTransform: 'none',
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  '&:hover': { bgcolor: '#df1d1d' },
                }}
              >
                {savingPreferences ? 'Saving...' : 'Save preferences'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper className="surface-card" sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography color="#ff2625" fontWeight={700}>
                    Inbox
                  </Typography>
                  <Typography color="text.secondary">
                    Review recent reminders and coaching messages.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    label="Show"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    sx={{ minWidth: 180 }}
                  >
                    {NOTIFICATION_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    variant="outlined"
                    onClick={handleMarkAllRead}
                    disabled={markingAll || !summary.unreadCount}
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    {markingAll ? 'Marking…' : 'Mark all read'}
                  </Button>
                </Stack>
              </Stack>

              {!visibleNotifications.length ? (
                <EmptyStateCard
                  title="No notifications yet"
                  description="When staff send reminders or the system generates alerts, they will show up here."
                  action={(
                    <Button
                      component={RouterLink}
                      to={PATHS.dashboard}
                      variant="outlined"
                      sx={{ textTransform: 'none', borderRadius: 999 }}
                    >
                      Open dashboard
                    </Button>
                  )}
                />
              ) : (
                <Stack spacing={2}>
                  {visibleNotifications.map((notification) => (
                    <Paper
                      key={notification.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        borderColor: notification.is_read ? 'divider' : '#fecdd3',
                        background: notification.is_read ? '#fff' : '#fffafb',
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1.5}
                        >
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

                          <Typography color="text.secondary" variant="body2">
                            {formatNotificationDate(notification.created_at)}
                          </Typography>
                        </Stack>

                        <Box>
                          <Typography variant="h6" fontWeight={800} gutterBottom>
                            {notification.title}
                          </Typography>
                          <Typography color="text.secondary">
                            {notification.message}
                          </Typography>
                        </Box>

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          justifyContent="space-between"
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Channel: {notification.delivery_channel?.replace('_', ' ') || 'in-app'}
                          </Typography>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            {notification.action_path ? (
                              <Button
                                component={RouterLink}
                                to={notification.action_path}
                                variant="contained"
                                onClick={() => {
                                  if (!notification.is_read) {
                                    handleNotificationToggle(notification, true);
                                  }
                                }}
                                sx={{
                                  bgcolor: '#ff2625',
                                  textTransform: 'none',
                                  borderRadius: 999,
                                  '&:hover': { bgcolor: '#df1d1d' },
                                }}
                              >
                                {notification.action_label || 'Open'}
                              </Button>
                            ) : null}

                            <Button
                              variant="outlined"
                              onClick={() => {
                                handleNotificationToggle(notification, !notification.is_read);
                              }}
                              disabled={actingNotificationId === notification.id}
                              sx={{ textTransform: 'none', borderRadius: 999 }}
                            >
                              {(() => {
                                if (actingNotificationId === notification.id) {
                                  return 'Updating...';
                                }

                                return notification.is_read ? 'Mark unread' : 'Mark read';
                              })()}
                            </Button>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationsPage;
