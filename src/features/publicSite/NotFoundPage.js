import React from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import ErrorStatePanel from '../errors/ErrorStatePanel';
import PublicPageShell from './PublicPageShell';
import { publicSectionCardSx } from './publicSiteHelpers';

const fallbackCards = [
  {
    title: 'Return to homepage',
    description: 'Start from the current homepage and navigate back into the public-site sections from a known working route.',
    to: PATHS.home,
    label: 'Home',
    icon: HomeRoundedIcon,
  },
  {
    title: 'Browse the public gallery',
    description: 'Use the gallery and public content pages as a quick recovery path when an old promo link no longer matches the current site.',
    to: PATHS.gallery,
    label: 'Gallery',
    icon: CollectionsRoundedIcon,
  },
  {
    title: 'Check blog and updates',
    description: 'If you expected an article, event recap, or update page, the blog is the fastest way to recover the route and keep browsing.',
    to: PATHS.blog,
    label: 'Blog',
    icon: MenuBookRoundedIcon,
  },
];

function buildMissingPath(pathname) {
  if (!pathname) {
    return 'Unknown route';
  }

  if (pathname.length <= 44) {
    return pathname;
  }

  return `${pathname.slice(0, 41)}...`;
}

const QuickRecoveryCard = ({ title, description, to, label, icon: IconComponent }) => (
  <Paper variant="outlined" sx={{ ...publicSectionCardSx, p: 2.5 }}>
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconComponent color="primary" />
        <Typography fontWeight={800}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {description}
      </Typography>
      <Box>
        <Button component={RouterLink} to={to} variant="outlined">
          {label}
        </Button>
      </Box>
    </Stack>
  </Paper>
);

const NotFoundPage = () => {
  const location = useLocation();
  const missingPath = buildMissingPath(location.pathname);

  return (
    <PublicPageShell
      eyebrow="Patch 34 fallback routes"
      title="We could not find that page."
      description={`The route ${missingPath} does not match an active page right now. This fallback keeps visitors and staff out of blank screens and gives them a clean way back into the app.`}
      chips={['404 page', 'Safer UI failures', 'Reusable error states']}
      actions={[
        { label: 'Back home', to: PATHS.home },
        { label: 'Open tools', to: PATHS.tools, variant: 'outlined' },
        { label: 'Contact the gym', to: PATHS.contact, variant: 'text' },
      ]}
      stats={[
        { label: 'Status', value: '404', caption: 'Route not found' },
        { label: 'Recovery paths', value: '3', caption: 'Home, gallery, and blog' },
        { label: 'Patch', value: '34', caption: 'Fallback pages and safer failures' },
      ]}
    >
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <ErrorStatePanel
            eyebrow="Missing route"
            title="The link may be outdated, moved, or typed incorrectly."
            description="As the public site, blog, and future pages expand, some old links can stop matching the latest structure. Patch 34 replaces hard redirects with a dedicated 404 page so the next step stays obvious."
            hint="Go back home first, then use the gallery, blog, or tools pages to recover the content you were looking for."
            severity="warning"
            icon={SearchOffRoundedIcon}
            actions={[
              {
                label: 'Back home',
                to: PATHS.home,
                startIcon: <HomeRoundedIcon />,
              },
              {
                label: 'Open blog',
                to: PATHS.blog,
                variant: 'outlined',
                startIcon: <MenuBookRoundedIcon />,
              },
            ]}
            sx={{ height: '100%' }}
          />
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={2.5} sx={{ height: '100%' }}>
            {fallbackCards.map((card) => (
              <QuickRecoveryCard
                key={card.title}
                title={card.title}
                description={card.description}
                to={card.to}
                label={card.label}
                icon={card.icon}
              />
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{
          ...publicSectionCardSx,
          mt: 3,
          p: { xs: 2.5, md: 3 },
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TipsAndUpdatesRoundedIcon color="secondary" />
              <Typography fontWeight={800}>Safer failure behavior</Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: '72ch' }}>
              Patch 34 also adds a reusable route fallback for runtime failures, so unexpected render issues can land in a recoverable screen instead of breaking the entire route tree.
            </Typography>
          </Stack>
          <Box>
            <Button component={RouterLink} to={PATHS.contact} variant="contained">
              Report a broken link
            </Button>
          </Box>
        </Stack>
      </Paper>
    </PublicPageShell>
  );
};

export default NotFoundPage;
