import React from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CalendarMonthRounded,
  FitnessCenterRounded,
  MapRounded,
  PlayCircleOutlineRounded,
  StarRounded,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import {
  galleryCollections,
  gymZones,
  testimonials,
  upcomingEvents,
  visitPlanningSteps,
} from './publicSiteContent';
import { formatEventDateRange, publicSectionCardSx } from './publicSiteHelpers';

const HomepageMediaShowcase = () => {
  const theme = useTheme();
  const featuredPoster = galleryCollections[1] || galleryCollections[0];
  const secondaryPoster = galleryCollections[2] || galleryCollections[1] || galleryCollections[0];
  const featuredTestimonial = testimonials[1] || testimonials[0];
  const featuredEvent = upcomingEvents[0];

  return (
    <Grid container spacing={{ xs: 2, md: 2.5 }}>
      <Grid item xs={12} lg={7}>
        <Paper
          className="homepage-visual-story-card"
          sx={{
            ...publicSectionCardSx,
            p: { xs: 2.25, md: 3 },
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            className="homepage-visual-story-card__backdrop"
            sx={{
              backgroundImage: [
                `linear-gradient(135deg, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.78 : 0.58)} 10%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.14)} 100%)`,
                featuredPoster?.imageUrl ? `url(${featuredPoster.imageUrl})` : 'none',
              ].join(','),
            }}
          />

          <Stack spacing={2.2} sx={{ position: 'relative' }}>
            <Chip
              icon={<PlayCircleOutlineRounded />}
              label="Media banner and hero imagery"
              sx={{
                alignSelf: 'flex-start',
                bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.76 : 0.9),
                color: 'text.primary',
              }}
            />

            <Typography variant="h4" fontWeight={900} sx={{ maxWidth: '14ch', fontSize: { xs: '1.7rem', md: '2.3rem' } }}>
              Make the homepage feel like an actual visit preview.
            </Typography>

            <Typography color="text.secondary" sx={{ maxWidth: '64ch' }}>
              Use real floor shots, coaching clips, community recap moments, and short posters so the homepage can feel alive without turning into a cluttered brochure.
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {(featuredPoster?.tags || []).slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  size="small"
                  label={tag}
                  sx={{
                    color: 'text.primary',
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.86),
                  }}
                />
              ))}
            </Stack>

            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <Paper
                  className="homepage-mini-visual-card"
                  sx={{
                    p: 1.75,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.76 : 0.9),
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FitnessCenterRounded color="primary" fontSize="small" />
                      <Typography fontWeight={800}>Exercise presentation cleanup</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      The movement library now sits under a stronger visual introduction so users get both inspiration and utility on the same visit.
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper
                  className="homepage-mini-visual-card"
                  sx={{
                    p: 1.75,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.76 : 0.9),
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MapRounded color="primary" fontSize="small" />
                      <Typography fontWeight={800}>Theme-aware page assets</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Cards, poster areas, and overlays keep contrast readable in both modes without redesigning every public page again.
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button component={RouterLink} to={PATHS.gallery} variant="contained" sx={{ borderRadius: 999, textTransform: 'none' }}>
                Open gallery
              </Button>
              <Button component={RouterLink} to={PATHS.gymMap} variant="outlined" sx={{ borderRadius: 999, textTransform: 'none' }}>
                Open gym map
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Paper sx={{ ...publicSectionCardSx, p: { xs: 2, md: 2.5 } }}>
            <Stack spacing={1.6}>
              <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
                <Box>
                  <Typography variant="h6" fontWeight={900}>What visitors can see next</Typography>
                  <Typography variant="body2" color="text.secondary">
                    A simple strip of events, map cues, and testimonials keeps the homepage moving.
                  </Typography>
                </Box>
                <Chip label="Public site polish" size="small" />
              </Stack>

              <Paper
                className="homepage-event-card"
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthRounded color="primary" fontSize="small" />
                    <Typography fontWeight={800}>{featuredEvent?.title || 'Upcoming event slot'}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {featuredEvent
                      ? formatEventDateRange(featuredEvent.startDate, featuredEvent.endDate)
                      : 'Dates can be seeded from publicSiteContent.js'}
                  </Typography>
                  <Typography variant="body2">
                    {featuredEvent?.summary || 'Use events, competitions, and open house moments to keep the homepage current.'}
                  </Typography>
                </Stack>
              </Paper>

              <Stack spacing={1.1}>
                {visitPlanningSteps.slice(0, 3).map((step, index) => (
                  <Stack key={step.title} direction="row" spacing={1.25} alignItems="flex-start">
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.1),
                        color: 'text.primary',
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box>
                      <Typography fontWeight={800}>{step.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} lg={12}>
              <Paper sx={{ ...publicSectionCardSx, p: 2, height: '100%' }}>
                <Stack spacing={1.1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StarRounded color="primary" fontSize="small" />
                    <Typography fontWeight={800}>Testimonial spotlight</Typography>
                  </Stack>
                  <Typography fontWeight={700}>
                    {featuredTestimonial?.headline || 'Real member stories can sit closer to the homepage hero.'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {featuredTestimonial?.quote || 'Pull one member quote forward to make the page feel more human.'}
                  </Typography>
                  <Button component={RouterLink} to={PATHS.testimonials} size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                    Read testimonials
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} lg={12}>
              <Paper
                sx={{
                  ...publicSectionCardSx,
                  p: 2,
                  height: '100%',
                  backgroundImage: [
                    `linear-gradient(180deg, ${alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.88 : 0.92)} 0%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)} 100%)`,
                    secondaryPoster?.imageUrl ? `url(${secondaryPoster.imageUrl})` : 'none',
                  ].join(','),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <Stack spacing={1.1}>
                  <Typography fontWeight={900}>Key spaces to preview on the homepage</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {gymZones.slice(0, 4).map((zone) => (
                      <Chip key={zone.id} size="small" label={zone.title} />
                    ))}
                  </Stack>
                  <Button component={RouterLink} to={PATHS.contact} variant="outlined" size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                    Plan a visit
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Grid>
    </Grid>
  );
};

export default HomepageMediaShowcase;
