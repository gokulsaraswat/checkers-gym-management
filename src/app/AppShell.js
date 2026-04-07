import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const AppShell = () => (
  <Box
    className="app-shell"
    sx={{
      width: '100%',
      maxWidth: '1488px',
      mx: 'auto',
      px: { xs: 1.5, sm: 2.5 },
    }}
  >
    <Navbar />
    <Outlet />
    <Footer />
  </Box>
);

export default AppShell;
