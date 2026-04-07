import React from 'react';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CalendarMonth,
  MeetingRoom,
  PersonOutline,
} from '@mui/icons-material';

import {
  formatClassTimeRange,
  getBookingStatusChipSx,
  getBookingStatusMeta,
} from '../dashboardHelpers';

const UpcomingClassesCard = ({ bookings = [] }) => (
  <Paper
    id="upcoming-classes"
    className="surface-card"
    sx={{ p: 3, borderRadius: 4, background: '#fff', height: '100%' }}
  >
    <Stack spacing={2.5}>
      <Box>
        <Typography color="#ff2625" fontWeight={700}>
          Upcoming classes
        </Typography>
        <Typography variant="h6" fontWeight={800} mt={0.5}>
          Your next coached sessions
        </Typography>
      </Box>

      {!bookings.length ? (
        <Stack spacing={1.25}>
          <Typography fontWeight={700}>
            Nothing booked yet
          </Typography>
          <Typography color="text.secondary" lineHeight={1.8}>
            When class scheduling and booking tools are used, your next sessions will appear here automatically.
          </Typography>
        </Stack>
      ) : (
        bookings.map((booking, index) => {
          const session = booking.class_session;
          const bookingMeta = getBookingStatusMeta(booking.booking_status);

          return (
            <React.Fragment key={booking.id}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {session?.title || 'Scheduled class'}
                    </Typography>
                    <Typography color="text.secondary">
                      {session?.description || 'Class details will be shown here once scheduling is configured.'}
                    </Typography>
                  </Box>

                  <Chip
                    label={bookingMeta.label}
                    sx={getBookingStatusChipSx(booking.booking_status)}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonth sx={{ color: '#ff2625', fontSize: 20 }} />
                    <Typography variant="body2">
                      {formatClassTimeRange(session)}
                    </Typography>
                  </Stack>

                  {session?.coach_name ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonOutline sx={{ color: '#ff2625', fontSize: 20 }} />
                      <Typography variant="body2">
                        Coach {session.coach_name}
                      </Typography>
                    </Stack>
                  ) : null}

                  {session?.room_name ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MeetingRoom sx={{ color: '#ff2625', fontSize: 20 }} />
                      <Typography variant="body2">
                        {session.room_name}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>

                {booking.booking_status === 'waitlist' && booking.waitlist_position ? (
                  <Typography variant="body2" color="text.secondary">
                    Waitlist position: #{booking.waitlist_position}
                  </Typography>
                ) : null}

                {booking.notes ? (
                  <Typography variant="body2" color="text.secondary">
                    {booking.notes}
                  </Typography>
                ) : null}
              </Stack>

              {index < bookings.length - 1 ? <Divider /> : null}
            </React.Fragment>
          );
        })
      )}
    </Stack>
  </Paper>
);

export default UpcomingClassesCard;
