import React from 'react';
import { Chip, Stack } from '@mui/material';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { useLocation } from 'react-router-dom';

import { PATHS } from '../../app/paths';
import ErrorPageShell from './ErrorPageShell';
import { defaultNotFoundTips } from './errorStateHelpers';

const NotFoundPage = () => {
  const location = useLocation();
  const missingPath = `${location.pathname}${location.search || ''}`;

  return (
    <ErrorPageShell
      statusLabel="404 · Route not found"
      title="This page could not be found"
      description="The link may be old, incomplete, or from a route family that no longer matches the current public/member/admin navigation structure. Use a safe entry point below and continue from there."
      details={missingPath ? `Requested path: ${missingPath}` : ''}
      primaryAction={{ label: 'Back to homepage', to: PATHS.home }}
      secondaryAction={{ label: 'Open contact page', to: PATHS.contact }}
      tips={defaultNotFoundTips}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
        <Chip icon={<SearchOffRoundedIcon />} label="Missing or moved route" variant="outlined" />
        <Chip icon={<ExploreRoundedIcon />} label="Use public or dashboard entry points" variant="outlined" />
      </Stack>
    </ErrorPageShell>
  );
};

export default NotFoundPage;
