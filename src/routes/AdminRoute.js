import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { getPostAuthPath } from '../app/auth/access';
import { PATHS } from '../app/paths';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking admin access..." />;
  }

  if (!user) {
    return <Navigate to={PATHS.auth} replace />;
  }

  if (profile?.role !== 'admin') {
    return <Navigate to={getPostAuthPath(profile?.role)} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
