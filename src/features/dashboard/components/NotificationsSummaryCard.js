import React from 'react';
import {
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../../app/paths';
import {
  formatNotificationDate,
  getNotificationTypeChipSx,
  getNotificationTypeLabel,
} from '../../notifications/notificationsHelpers';

const NotificationsSummaryCard = ({ summary }) => {
  const latestItems = summary?.latestThree || [];

  return (
    <Paper className="surface-card" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
      <Stack spacing={2.5} height="100%">
        <Stack spacing={0.75}>
          <Typography color="#ff2625" fontWeight={700}>
            Notifications
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {summary?.unreadCount || 0} unread
          </Typography>
          <Typography color="text.secondary">
            Keep up with class reminders, payment nudges, and coach updates.
          </Typography>
        </Stack>

        {latestItems.length ? (
          <Stack spacing={1.5}>
            {latestItems.map((notification) => (
              <Stack
                key={notification.id}
                spacing={0.75}
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  border: '1px solid #f1f5f9',
                  background: notification.is_read ? '#fff' : '#fffafb',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={getNotificationTypeLabel(notification.notification_type)}
                    sx={getNotificationTypeChipSx(notification.notification_type)}
                  />
                  {!notification.is_read ? (
                    <Chip size="small" label="Unread" sx={{ bgcolor: '#fff1f2', color: '#be123c', fontWeight: 700 }} />
                  ) : null}
                </Stack>
                <Typography fontWeight={700}>{notification.title}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatNotificationDate(notification.created_at)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            No notifications yet. New updates from staff and system reminders will appear here.
          </Typography>
        )}

        <Button
          component={RouterLink}
          to={PATHS.notifications}
          variant="outlined"
          sx={{ textTransform: 'none', borderRadius: 999, alignSelf: 'flex-start', mt: 'auto' }}
        >
          Open notifications
        </Button>
      </Stack>
    </Paper>
  );
};

export default NotificationsSummaryCard;
