import React from 'react';

import { AuthProvider } from '../context/AuthContext';
import { ThemeModeProvider } from '../theme/ThemeModeProvider';

const AppProviders = ({ children }) => (
  <ThemeModeProvider>
    <AuthProvider>{children}</AuthProvider>
  </ThemeModeProvider>
);

export default AppProviders;
