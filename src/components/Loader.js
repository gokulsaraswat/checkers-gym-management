import React from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const Loader = ({ size = 54, label = 'Loading exercises...' }) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%', display: 'grid', placeItems: 'center', py: 5 }}>
      <Stack spacing={1.5} alignItems="center" textAlign="center">
        <Box
          className="homepage-spinner-orb"
          sx={{
            width: size + 28,
            height: size + 28,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.12),
          }}
        >
          <CircularProgress size={size} thickness={4.2} />
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={700}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
};

export default Loader;
