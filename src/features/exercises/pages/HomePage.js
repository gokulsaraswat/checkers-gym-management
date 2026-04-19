import React, { useMemo, useState } from 'react';
import {
  Alert,
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
  AutoAwesomeRounded,
  BoltRounded,
  CalendarMonthRounded,
  CalculateRounded,
  InsightsRounded,
  LocalDrinkRounded,
  MonitorWeightRounded,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import Exercises from '../../../components/Exercises';
import SearchExercises from '../../../components/SearchExercises';
import SetupNotice from '../../../components/common/SetupNotice';
import { PATHS } from '../../../app/paths';
import { getPostAuthPath } from '../../../app/auth/access';
import { useAuth } from '../../../context/AuthContext';
import { isRapidApiConfigured } from '../../../utils/fetchData';
import HomepageHeroSlider from '../../publicSite/HomepageHeroSlider';
import HomepageMediaShowcase from '../../publicSite/HomepageMediaShowcase';
import { publicWebsiteHighlights } from '../../publicSite/publicSiteContent';

const utilityCards = [
  {
    title: 'BMI checks',
    description: 'A simple first-look estimate that helps visitors frame progress conversations before they sign up.',
    icon: MonitorWeightRounded,
  },
  {
    title: 'Calorie planning',
    description: 'Estimate maintenance calories, goal-based targets, and a practical protein starting point.',
    icon: CalculateRounded,
  },
  {
    title: 'Hydration and routine cues',
    description: 'Use quick movement, hydration, and split suggestions without mixing public visitors into member workflows.',
    icon: LocalDrinkRounded,
  },
];

const HomePage = () => {
  const theme = useTheme();
  const [exercises, setExercises] = useState([]);
  const [bodyPart, setBodyPart] = useState('all');
  const { user, profile } = useAuth();

  const dashboardPath = useMemo(() => getPostAuthPath(profile?.role), [profile?.role]);

  const primaryCtaLabel = useMemo(() => {
    if (!user) {
      return 'Open login / signup';
    }

    if (profile?.role === 'admin') {
      return 'Open admin panel';
    }

    return 'Open dashboard';
  }, [profile?.role, user]);

  const scrollToExplorer = () => {
    document.getElementById('homepage-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box className="homepage-shell">
      <HomepageHeroSlider
        primaryCtaLabel={primaryCtaLabel}
        primaryCtaPath={user ? dashboardPath : PATHS.auth}
        onExploreClick={scrollToExplorer}
      />

      <Box sx={{ px: { xs: 1, sm: 2 }, mt: { xs: 3, md: 5 } }}>
        <Stack spacing={{ xs: 3.5, md: 5 }}>
          <SetupNotice title="Supabase unlocks the member and admin app" />

          {!isRapidApiConfigured ? (
            <Alert
              severity="info"
              sx={{
                borderRadius: 3,
                bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
              }}
            >
              RapidAPI is optional here. The exercise explorer stays available in demo mode until you add
              <strong> REACT_APP_RAPID_API_KEY</strong>.
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            {publicWebsiteHighlights.map((highlight) => (
              <Grid item xs={12} md={4} key={highlight.label}>
                <Paper
                  className="homepage-highlight-card surface-card"
                  sx={{
                    p: { xs: 2.25, md: 2.5 },
                    height: '100%',
                    borderRadius: { xs: 3, md: 4 },
                  }}
                >
                  <Stack spacing={1.2}>
                    <Typography variant="body2" color="text.secondary">
                      {highlight.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={900}>
                      {highlight.value}
                    </Typography>
                    <Typography color="text.secondary">{highlight.caption}</Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <HomepageMediaShowcase />

          <Paper
            id="homepage-explorer"
            className="homepage-explorer-card surface-card"
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: { xs: 4, md: 5 },
              backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)} 0%, ${alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.82 : 0.96)} 100%)`,
            }}
          >
            <Stack spacing={{ xs: 2.25, md: 2.75 }}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
                <Box sx={{ maxWidth: '70ch' }}>
                  <Chip
                    icon={<AutoAwesomeRounded />}
                    label="Movement library and homepage polish"
                    sx={{
                      mb: 1.25,
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.1),
                    }}
                  />
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, lineHeight: 1.08, maxWidth: '18ch' }}
                  >
                    Keep the homepage polished without hiding the actual exercise utility.
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: '62ch' }}>
                    The homepage now introduces the gym with stronger media storytelling, then drops users into the searchable movement library without making the public experience feel disconnected from the product.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'row', lg: 'column' }} spacing={1.1} flexWrap="wrap" useFlexGap>
                  <Chip icon={<BoltRounded />} label="Theme-aware hero" />
                  <Chip icon={<CalendarMonthRounded />} label="Media-forward sections" />
                  <Chip icon={<InsightsRounded />} label="Cleaner exercise entry point" />
                </Stack>
              </Stack>

              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <Paper className="homepage-quick-link-card" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack spacing={0.75}>
                      <Typography fontWeight={800}>Public discovery</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use gallery, events, and testimonials together so visitors understand the space before they need the dashboard.
                      </Typography>
                      <Button component={RouterLink} to={PATHS.gallery} size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                        Open gallery
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper className="homepage-quick-link-card" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack spacing={0.75}>
                      <Typography fontWeight={800}>Content and trust</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Blog posts, recaps, and testimonials can now support the homepage instead of sitting in separate silos.
                      </Typography>
                      <Button component={RouterLink} to={PATHS.blog} size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                        Open blog
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper className="homepage-quick-link-card" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack spacing={0.75}>
                      <Typography fontWeight={800}>Visit planning</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Clear contact routes and floor previews reduce friction for first-time visitors and referrals.
                      </Typography>
                      <Button component={RouterLink} to={PATHS.contact} size="small" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                        Contact the gym
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          </Paper>

          <Paper
            className="homepage-quick-link-card surface-card"
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: { xs: 4, md: 5 },
              backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)} 0%, ${alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.84 : 0.97)} 100%)`,
            }}
          >
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} justifyContent="space-between">
                <Box sx={{ maxWidth: '72ch' }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                    <Chip icon={<CalculateRounded />} color="secondary" label="Patch 33 utility tools" sx={{ fontWeight: 700 }} />
                    <Chip icon={<MonitorWeightRounded />} label="BMI" variant="outlined" />
                    <Chip icon={<LocalDrinkRounded />} label="Hydration" variant="outlined" />
                  </Stack>
                  <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.3rem' }, lineHeight: 1.08 }}>
                    Add practical self-serve tools without mixing the public site into private member workflows.
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: '64ch', lineHeight: 1.8 }}>
                    Patch 33 adds BMI, calorie, hydration, and starter-split utilities so visitors can get quick planning value before a trial, consultation, or blog deep dive.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.25} sx={{ alignSelf: { xs: 'flex-start', lg: 'center' } }}>
                  <Button component={RouterLink} to={PATHS.tools} variant="contained" color="secondary" sx={{ textTransform: 'none', borderRadius: 999, px: 2.75 }}>
                    Open tools
                  </Button>
                  <Button component={RouterLink} to={PATHS.contact} variant="outlined" sx={{ textTransform: 'none', borderRadius: 999, px: 2.75 }}>
                    Plan a visit
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={1.5}>
                {utilityCards.map(({ title, description, icon: Icon }) => (
                  <Grid item xs={12} md={4} key={title}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Icon color="secondary" />
                          <Typography fontWeight={800}>{title}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {description}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Box sx={{ mt: { xs: 1.5, md: 3 } }}>
        <SearchExercises setExercises={setExercises} bodyPart={bodyPart} setBodyPart={setBodyPart} />
        <Exercises setExercises={setExercises} exercises={exercises} bodyPart={bodyPart} />
      </Box>
    </Box>
  );
};

export default HomePage;
