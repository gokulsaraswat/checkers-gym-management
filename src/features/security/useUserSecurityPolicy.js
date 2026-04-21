import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { fetchCurrentUserSecurityPolicy, logSecurityEvent } from './securityClient';

const DEFAULT_POLICY = {
  role: null,
  requirePasswordReset: false,
  memberPortalAccess: true,
  staffPortalAccess: true,
  adminPortalAccess: true,
  deniedPermissions: [],
  allowedPermissions: [],
  notes: '',
  updatedAt: null,
};

const buildDenialCacheKey = ({ userId, pathname, reasonCode, permissionKey, requiredPortal }) => {
  const safeUserId = userId || 'anonymous';
  const safePath = pathname || 'unknown-path';
  const safeReason = reasonCode || 'unknown-reason';
  const safePermission = permissionKey || 'none';
  const safePortal = requiredPortal || 'member';

  return `security-denial:${safeUserId}:${safePortal}:${safeReason}:${safePermission}:${safePath}`;
};

const setPolicyRole = (policy, profileRole) => ({
  ...DEFAULT_POLICY,
  ...(policy || {}),
  role: policy?.role || profileRole || null,
});

export const useUserSecurityPolicy = () => {
  const { user, profile, isConfigured } = useAuth();
  const [policy, setPolicy] = useState(setPolicyRole(DEFAULT_POLICY, profile?.role));
  const [loading, setLoading] = useState(Boolean(user && isConfigured));
  const [error, setError] = useState(null);

  const refreshPolicy = useCallback(async () => {
    if (!user || !isConfigured) {
      const nextPolicy = setPolicyRole(DEFAULT_POLICY, profile?.role);
      setPolicy(nextPolicy);
      setError(null);
      setLoading(false);
      return nextPolicy;
    }

    setLoading(true);

    try {
      const nextPolicy = setPolicyRole(await fetchCurrentUserSecurityPolicy(), profile?.role);
      setPolicy(nextPolicy);
      setError(null);
      return nextPolicy;
    } catch (nextError) {
      const fallbackPolicy = setPolicyRole(DEFAULT_POLICY, profile?.role);
      setPolicy(fallbackPolicy);
      setError(nextError);
      return fallbackPolicy;
    } finally {
      setLoading(false);
    }
  }, [isConfigured, profile?.role, user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user || !isConfigured) {
        if (!cancelled) {
          setPolicy(setPolicyRole(DEFAULT_POLICY, profile?.role));
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const nextPolicy = await fetchCurrentUserSecurityPolicy();

        if (!cancelled) {
          setPolicy(setPolicyRole(nextPolicy, profile?.role));
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setPolicy(setPolicyRole(DEFAULT_POLICY, profile?.role));
          setError(nextError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isConfigured, profile?.role, user]);

  const logDeniedAccess = useCallback(async (gate, pathname) => {
    if (!user || !isConfigured || !gate || gate.allowed) {
      return;
    }

    const cacheKey = buildDenialCacheKey({
      userId: user.id,
      pathname,
      reasonCode: gate.reasonCode,
      permissionKey: gate.permissionKey,
      requiredPortal: gate.requiredPortal,
    });

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const alreadyLogged = window.sessionStorage.getItem(cacheKey);

        if (alreadyLogged) {
          return;
        }

        window.sessionStorage.setItem(cacheKey, '1');
      }
    } catch (storageError) {
      // Ignore storage failures and continue with the best-effort audit write.
    }

    let actionKey = 'security.portal_blocked';
    let actionSummary = `Blocked access to ${pathname} because ${gate.requiredPortal} portal access is disabled`;

    if (gate.reasonCode === 'password-reset-required') {
      actionKey = 'security.password_reset_blocked';
      actionSummary = `Blocked access to ${pathname} until the user resets their password`;
    } else if (gate.reasonCode === 'permission-denied') {
      actionKey = 'security.permission_denied';
      actionSummary = `Blocked access to ${pathname} by permission override ${gate.permissionKey}`;
    }

    try {
      await logSecurityEvent({
        actionKey,
        actionSummary,
        entityType: 'route',
        entityId: pathname,
        sourceArea: 'route_guard',
        severity: gate.reasonCode === 'password-reset-required' ? 'critical' : 'warn',
        metadata: {
          pathname,
          reasonCode: gate.reasonCode,
          permissionKey: gate.permissionKey,
          requiredPortal: gate.requiredPortal,
          profileRole: profile?.role || null,
        },
      });
    } catch (auditError) {
      // Best effort only. Route enforcement should continue even when audit logging fails.
    }
  }, [isConfigured, profile?.role, user]);

  return useMemo(() => ({
    policy,
    loading,
    error,
    refreshPolicy,
    logDeniedAccess,
  }), [error, loading, logDeniedAccess, policy, refreshPolicy]);
};

export default useUserSecurityPolicy;
