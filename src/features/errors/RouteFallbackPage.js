import React from 'react';
import {
  Box,
  Stack,
  Typography,
} from '@mui/material';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';

import { PATHS } from '../../app/paths';
import ErrorStatePanel from './ErrorStatePanel';

const DEFAULT_ERROR_DETAIL = 'A screen failed to load completely. Try a soft retry first, then reload the page if the issue continues.';

function buildSafeErrorDetails(error) {
  if (!error) {
    return DEFAULT_ERROR_DETAIL;
  }

  let message = '';

  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else if (error.statusText) {
    message = error.statusText;
  }

  const normalizedMessage = message.replace(/\s+/g, ' ').trim();

  if (!normalizedMessage) {
    return DEFAULT_ERROR_DETAIL;
  }

  if (normalizedMessage.length > 180) {
    return `${normalizedMessage.slice(0, 177)}...`;
  }

  return normalizedMessage;
}

function reloadPage() {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.reload();
}

const RouteFallbackPage = ({ error = null, onRetry = null }) => {
  const details = process.env.NODE_ENV !== 'production' ? buildSafeErrorDetails(error) : '';
  const retryHandler = onRetry || reloadPage;

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={1.5} maxWidth="760px" sx={{ mx: 'auto' }}>
        <Typography color="primary.main" fontWeight={800}>
          Patch 34 route fallback
        </Typography>
        <ErrorStatePanel
          eyebrow="Safe failure state"
          title="This screen ran into a problem, but the app is still responding."
          description="Instead of dropping you into a blank page or a hard crash, Patch 34 routes runtime issues into a recoverable fallback screen with clear next steps."
          hint="Try again first. If the same issue comes back, reload the page or return to the homepage."
          details={details}
          severity="warning"
          icon={AutoFixHighRoundedIcon}
          actions={[
            {
              label: 'Try again',
              onClick: retryHandler,
              startIcon: <RefreshRoundedIcon />,
            },
            {
              label: 'Reload page',
              onClick: reloadPage,
              variant: 'outlined',
              startIcon: <RestartAltRoundedIcon />,
            },
            {
              label: 'Go home',
              to: PATHS.home,
              variant: 'text',
              startIcon: <HomeRoundedIcon />,
            },
          ]}
        />
      </Stack>
    </Box>
  );
};

export default RouteFallbackPage;
