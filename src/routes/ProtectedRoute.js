import React, { useEffect, useMemo } from 'react';

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PATHS } from '../app/paths';

import LoadingScreen from '../components/common/LoadingScreen';
import { useAuth } from '../context/AuthContext';
import { buildRestrictionState, evaluateSecurityGate } from '../features/security/securityAccess';
import { useUserSecurityPolicy } from '../features/security/useUserSecurityPolicy';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { policy, loading: securityLoading, logDeniedAccess } = useUserSecurityPolicy();

  const gate = useMemo(() => evaluateSecurityGate({
    pathname: location.pathname,
    policy,
    requiredPortal: 'member',
  }), [location.pathname, policy]);

  useEffect(() => {
    if (!loading && !securityLoading && user && !gate.allowed) {
      logDeniedAccess(gate, location.pathname);
    }
  }, [gate, loading, location.pathname, logDeniedAccess, securityLoading, user]);

  if (loading || securityLoading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (!user) {
    return <Navigate to={PATHS.auth} replace state={{ from: location }} />;
  }

  if (!gate.allowed) {
    return <Navigate to={PATHS.securityRestricted} replace state={buildRestrictionState(gate, location.pathname)} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
