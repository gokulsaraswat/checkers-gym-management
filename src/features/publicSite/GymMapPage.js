import React from 'react';
import {
  Box,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';

import { PATHS } from '../../app/paths';
import PublicPageShell from './PublicPageShell';
import {
  facilityHighlights,
  gymZones,
  locationEmbedConfig,
} from './publicSiteContent';
import { publicSectionCardSx } from './publicSiteHelpers';

const GymMapPage = () => (
  <PublicPageShell
    eyebrow="Public website"
    title="Gym map and optional 3D view"
    description="Patch 31 adds a flexible orientation page for visitors. Use it as a simple facility map today, then plug in a live location embed or a 3D walkthrough later without redesigning the rest of the website."
    chips={['Facility orientation', 'Optional map embed', 'Optional 3D walkthrough']}
    actions={[
      { label: 'Plan a visit', to: PATHS.contact },
      { label: 'Leave feedback', to: PATHS.feedback },
    ]}
    stats={[
      { label: 'Mapped zones', value: gymZones.length, caption: 'Seeded areas that can be renamed for your branch.' },
      { label: 'Use case', value: 'First visits', caption: 'Good for tours, walkthroughs, and onboarding pages.' },
      { label: 'Upgrade path', value: '3D-ready', caption: 'Drop in a Matterport, video, or custom embed later.' },
    ]}
  >
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} lg={7}>
        <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <MapRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Floor orientation
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              {gymZones.map((zone) => (
                <Paper
                  key={zone.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    minHeight: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gridColumn: { sm: `span ${zone.span}` },
                  }}
                >
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>{zone.title}</Typography>
                    <Chip size="small" variant="outlined" label={zone.level} sx={{ width: 'fit-content' }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {zone.description}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 }, height: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <DirectionsWalkRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Why this page matters
              </Typography>
            </Stack>
            {facilityHighlights.map((highlight) => (
              <Typography key={highlight} color="text.secondary" sx={{ lineHeight: 1.8 }}>
                • {highlight}
              </Typography>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 }, height: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <MapRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Optional branch map embed
              </Typography>
            </Stack>

            {locationEmbedConfig.mapEmbedUrl ? (
              <Box
                component="iframe"
                src={locationEmbedConfig.mapEmbedUrl}
                title="Checkers Gym map"
                loading="lazy"
                allowFullScreen
                sx={{ width: '100%', minHeight: 320, border: 0, borderRadius: 3 }}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  No live map URL is set yet. Add a branch map embed when the real address and parking details are ready.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: { xs: 2.5, md: 3 }, height: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <ViewInArRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Optional 3D walkthrough
              </Typography>
            </Stack>

            {locationEmbedConfig.tourEmbedUrl ? (
              <Box
                component="iframe"
                src={locationEmbedConfig.tourEmbedUrl}
                title="Checkers Gym 3D walkthrough"
                loading="lazy"
                allowFullScreen
                sx={{ width: '100%', minHeight: 320, border: 0, borderRadius: 3 }}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  No 3D walkthrough is configured yet. This placeholder is ready for a hosted 3D tour,
                  video walkthrough, or interactive branch preview.
                </Typography>
              </Paper>
            )}

            <Typography variant="body2" color="text.secondary">
              {locationEmbedConfig.embedHint}
            </Typography>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  </PublicPageShell>
);

export default GymMapPage;
