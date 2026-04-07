import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import Logo from '../../assets/images/Logo-1.png';

const Footer = () => (
  <Box
    component="footer"
    sx={{
      mt: 10,
      mb: 4,
      borderRadius: 6,
      bgcolor: '#fff3f4',
      overflow: 'hidden',
    }}
  >
    <Stack gap={2} sx={{ alignItems: 'center', textAlign: 'center' }} px={4} py={4}>
      <img src={Logo} alt="Checkers Gym wordmark" style={{ width: '260px', maxWidth: '100%' }} />
      <Typography variant="h6" sx={{ fontSize: { lg: '24px', xs: '18px' } }}>
        Checkers Gym Management App
      </Typography>
      <Typography color="text.secondary" maxWidth="720px">
        A React + Supabase starter for member access, admin workflows, and workout tracking.
      </Typography>
    </Stack>
  </Box>
);

export default Footer;
