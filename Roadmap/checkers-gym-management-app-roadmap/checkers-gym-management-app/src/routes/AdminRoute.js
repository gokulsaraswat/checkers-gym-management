import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import LoadingScreen from '../components/common/LoadingScreen';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking admin access..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
