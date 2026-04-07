import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { getSafeAuthRedirectPath } from '../app/auth/access';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAuth } from '../context/AuthContext';

const GuestRoute = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (user) {
    return <Navigate to={getSafeAuthRedirectPath(profile?.role, location.state?.from)} replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
