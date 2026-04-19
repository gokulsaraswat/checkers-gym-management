import React from 'react';
import {
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import { upcomingEvents } from './publicSiteContent';
import { formatEventDateRange, publicSectionCardSx } from './publicSiteHelpers';

const EventsPage = () => (
  <PublicPageShell
    eyebrow="Public website"
    title="Events, workshops, and competition-ready pages"
    description="Patch 31 adds a dedicated home for community activity so the public website can promote open houses, technique workshops, challenge days, and small competitions without relying on the member dashboard."
    chips={['Community calendar', 'Workshops', 'Competitions']}
    actions={[
      { label: 'Contact the team', to: PATHS.contact },
      { label: 'Browse testimonials', to: PATHS.testimonials },
    ]}
    stats={[
      { label: 'Seeded events', value: upcomingEvents.length, caption: 'Dynamic future dates keep preview content feeling current.' },
      { label: 'Works with', value: 'Gallery', caption: 'Event recaps can flow straight into public media sections.' },
      { label: 'Good for', value: 'Lead capture', caption: 'Useful before deeper registration automation arrives.' },
    ]}
  >
    <Grid container spacing={3}>
      {upcomingEvents.map((event) => (
        <Grid key={event.id} item xs={12} lg={6}>
          <Paper variant="outlined" sx={publicSectionCardSx}>
            <Stack spacing={2.5} sx={{ height: '100%', p: { xs: 2.5, md: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip icon={<CalendarMonthRoundedIcon />} label={formatEventDateRange(event.startDate, event.endDate)} color="primary" />
                    <Chip icon={<CelebrationRoundedIcon />} label={event.category} variant="outlined" />
                  </Stack>
                  <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '28px', md: '34px' } }}>
                    {event.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {event.summary}
                  </Typography>
                </Stack>

                <Paper variant="outlined" sx={{ borderRadius: 3, px: 2, py: 1.5, minWidth: { sm: 180 } }}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    Audience
                  </Typography>
                  <Typography fontWeight={800}>{event.audience}</Typography>
                </Paper>
              </Stack>

              <Divider />

              <Stack spacing={1.25} sx={{ flex: 1 }}>
                {event.bullets.map((bullet) => (
                  <Stack key={bullet} direction="row" spacing={1.25} alignItems="flex-start">
                    <FitnessCenterRoundedIcon color="primary" fontSize="small" sx={{ mt: 0.25 }} />
                    <Typography color="text.secondary">{bullet}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  </PublicPageShell>
);

export default EventsPage;
