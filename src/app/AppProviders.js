import React from 'react';

import { AuthProvider } from '../context/AuthContext';

const AppProviders = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

export default AppProviders;
