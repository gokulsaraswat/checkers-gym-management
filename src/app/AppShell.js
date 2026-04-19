import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import InstallAppPrompt from '../components/layout/InstallAppPrompt';
import { appShellMaxWidth, layoutGutters } from '../theme/responsiveTokens';

const AppShell = () => (
  <Box className="app-shell">
    <Box
      sx={{
        width: '100%',
        maxWidth: `${appShellMaxWidth}px`,
        mx: 'auto',
        px: layoutGutters,
      }}
    >
      <Navbar />
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <InstallAppPrompt />
      </Box>
      <Box component="main" className="app-shell__content" sx={{ minHeight: 'calc(100vh - 220px)' }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  </Box>
);

export default AppShell;
