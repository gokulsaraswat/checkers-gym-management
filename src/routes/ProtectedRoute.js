import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PATHS } from '../app/paths';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (!user) {
    return <Navigate to={PATHS.auth} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
