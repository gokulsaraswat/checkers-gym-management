import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { getPostAuthPath, isStaffRole } from '../app/auth/access';
import { PATHS } from '../app/paths';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAuth } from '../context/AuthContext';

const StaffRoute = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking staff access..." />;
  }

  if (!user) {
    return <Navigate to={PATHS.auth} replace />;
  }

  if (!isStaffRole(profile?.role)) {
    return <Navigate to={getPostAuthPath(profile?.role)} replace />;
  }

  return <Outlet />;
};

export default StaffRoute;
