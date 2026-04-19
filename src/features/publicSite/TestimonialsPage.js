import React from 'react';
import {
  Avatar,
  Chip,
  Grid,
  Paper,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import { testimonials } from './publicSiteContent';
import { publicSectionCardSx } from './publicSiteHelpers';

const getInitials = (name) => name.slice(0, 2).toUpperCase();

const TestimonialsPage = () => (
  <PublicPageShell
    eyebrow="Public website"
    title="Testimonials and member stories"
    description="Turn scattered success stories into a dedicated page that makes the gym feel human. These cards are seeded examples you can replace with real community voices, transformations, coach quotes, or challenge-day wins."
    chips={['Stories', 'Retention proof', 'Community trust']}
    actions={[
      { label: 'Share feedback', to: PATHS.feedback },
      { label: 'Visit the gallery', to: PATHS.gallery },
    ]}
    stats={[
      { label: 'Story cards', value: testimonials.length, caption: 'Ready for old-site or social proof migration.' },
      { label: 'Best used for', value: 'Trust', caption: 'Helps new visitors picture the member journey.' },
      { label: 'Fits with', value: 'Blog + events', caption: 'Easy to cross-link from recaps and coach posts.' },
    ]}
  >
    <Grid container spacing={3}>
      {testimonials.map((item) => (
        <Grid key={item.id} item xs={12} md={6} lg={4}>
          <Paper variant="outlined" sx={publicSectionCardSx}>
            <Stack spacing={2.25} sx={{ height: '100%', p: { xs: 2.25, md: 2.5 } }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 52, height: 52 }}>{getInitials(item.name)}</Avatar>
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} noWrap>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {item.role}
                  </Typography>
                </Stack>
              </Stack>

              <Rating value={item.rating} readOnly precision={0.5} />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {item.focus.map((focus) => (
                  <Chip key={focus} size="small" variant="outlined" label={focus} />
                ))}
              </Stack>

              <Stack spacing={1.25} sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormatQuoteRoundedIcon color="primary" fontSize="small" />
                  <Typography variant="h6" fontWeight={800}>
                    {item.headline}
                  </Typography>
                </Stack>
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {item.quote}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TrendingUpRoundedIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {item.outcome}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FavoriteRoundedIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Useful for social proof, community recaps, and onboarding reassurance.
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  </PublicPageShell>
);

export default TestimonialsPage;
