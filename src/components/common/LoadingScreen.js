import React from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const LoadingScreen = ({
  title = 'Loading your view',
  message = 'Preparing the latest gym data and UI state.',
  minHeight = '52vh',
  compact = false,
}) => {
  const theme = useTheme();

  return (
    <Box
      className="homepage-loader-shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{
        minHeight: compact ? 260 : minHeight,
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center" textAlign="center" sx={{ maxWidth: 420 }}>
        <Box
          className="homepage-spinner-orb"
          sx={{
            width: compact ? 78 : 92,
            height: compact ? 78 : 92,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.12),
          }}
        >
          <CircularProgress size={compact ? 38 : 48} thickness={4.2} />
        </Box>

        <Stack spacing={0.6}>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          <Typography color="text.secondary">{message}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export default LoadingScreen;
