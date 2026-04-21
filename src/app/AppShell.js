import React, { Suspense } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

import LoadingScreen from '../components/common/LoadingScreen';
import Footer from '../components/layout/Footer';
import InstallAppPrompt from '../components/layout/InstallAppPrompt';
import Navbar from '../components/layout/Navbar';
import RouteAnnouncer from '../features/accessibility/RouteAnnouncer';
import SkipToContentLink from '../features/accessibility/SkipToContentLink';
import { appShellMaxWidth, layoutGutters } from '../theme/responsiveTokens';

const AppShell = () => (
  <Box className="app-shell">
    <SkipToContentLink />
    <RouteAnnouncer />

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
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        className="app-shell__content"
        sx={{ minHeight: 'calc(100vh - 220px)', outline: 'none' }}
      >
        <Suspense
          fallback={(
            <LoadingScreen
              compact
              title="Loading page"
              message="Preparing the next screen."
              minHeight="40vh"
            />
          )}
        >
          <Outlet />
        </Suspense>
      </Box>
      <Footer />
    </Box>
  </Box>
);

export default AppShell;
