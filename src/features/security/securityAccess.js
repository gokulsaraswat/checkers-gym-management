import { PATHS } from '../../app/paths';

const normalizePath = (pathname = '') => {
  const trimmed = pathname.trim();

  if (!trimmed) {
    return PATHS.home;
  }

  if (trimmed === PATHS.home) {
    return trimmed;
  }

  return trimmed.replace(/\/+$/, '');
};

const dynamicPrefix = (pathPattern = '') => pathPattern.replace(/:[^/]+/g, '').replace(/\/+$/, '/');

const FULL_BYPASS_PATHS = new Set([
  PATHS.account,
  PATHS.resetPassword,
  PATHS.securityRestricted,
]);

const PERMISSION_BYPASS_PATHS = new Set([
  PATHS.adminSecurity,
]);

const ROUTE_PERMISSION_RULES = [
  { prefix: PATHS.adminAccessHardware, permissionKey: 'admin.access.hardware' },
  { prefix: dynamicPrefix(PATHS.memberDetail), permissionKey: 'admin.members.detail' },
  { prefix: PATHS.adminAccess, permissionKey: 'admin.access' },
  { prefix: PATHS.adminReports, permissionKey: 'admin.reports' },
  { prefix: PATHS.adminFinance, permissionKey: 'admin.finance' },
  { prefix: PATHS.adminPlans, permissionKey: 'admin.plans' },
  { prefix: PATHS.adminCrm, permissionKey: 'admin.crm' },
  { prefix: PATHS.adminPos, permissionKey: 'admin.pos' },
  { prefix: PATHS.adminBlog, permissionKey: 'admin.blog' },
  { prefix: PATHS.admin, permissionKey: 'admin.dashboard' },
  { prefix: PATHS.staffNotifications, permissionKey: 'staff.notifications' },
  { prefix: PATHS.staffNutrition, permissionKey: 'staff.nutrition' },
  { prefix: PATHS.staffProgress, permissionKey: 'staff.progress' },
  { prefix: PATHS.staffSchedule, permissionKey: 'staff.schedule' },
  { prefix: PATHS.staffBookings, permissionKey: 'staff.bookings' },
  { prefix: PATHS.staffWorkouts, permissionKey: 'staff.workouts' },
  { prefix: PATHS.staffBilling, permissionKey: 'staff.billing' },
  { prefix: PATHS.staffAccess, permissionKey: 'staff.access' },
  { prefix: PATHS.staffTools, permissionKey: 'staff.tools' },
  { prefix: PATHS.staffPos, permissionKey: 'staff.pos' },
  { prefix: PATHS.staffBlog, permissionKey: 'staff.blog' },
  { prefix: PATHS.staff, permissionKey: 'staff.dashboard' },
  { prefix: PATHS.notifications, permissionKey: 'member.notifications' },
  { prefix: PATHS.workoutPlan, permissionKey: 'member.workouts' },
  { prefix: PATHS.membership, permissionKey: 'member.membership' },
  { prefix: PATHS.attendance, permissionKey: 'member.attendance' },
  { prefix: PATHS.progress, permissionKey: 'member.progress' },
  { prefix: PATHS.nutrition, permissionKey: 'member.nutrition' },
  { prefix: PATHS.schedule, permissionKey: 'member.schedule' },
  { prefix: PATHS.bookings, permissionKey: 'member.bookings' },
  { prefix: PATHS.billing, permissionKey: 'member.billing' },
  { prefix: PATHS.dashboard, permissionKey: 'member.dashboard' },
];

const matchPrefix = (pathname, prefix) => {
  const normalizedPath = normalizePath(pathname);
  const normalizedPrefix = normalizePath(prefix);

  if (normalizedPrefix.endsWith('/')) {
    return normalizedPath.startsWith(normalizedPrefix);
  }

  return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
};

export const getPortalAccessField = (requiredPortal = 'member') => {
  if (requiredPortal === 'admin') {
    return 'adminPortalAccess';
  }

  if (requiredPortal === 'staff') {
    return 'staffPortalAccess';
  }

  return 'memberPortalAccess';
};

export const getPermissionKeyForPath = (pathname = '') => {
  const normalizedPath = normalizePath(pathname);
  const matchingRule = ROUTE_PERMISSION_RULES.find((rule) => matchPrefix(normalizedPath, rule.prefix));

  return matchingRule?.permissionKey || null;
};

export const isFullSecurityBypassPath = (pathname = '') => FULL_BYPASS_PATHS.has(normalizePath(pathname));

export const isPermissionBypassPath = (pathname = '') => PERMISSION_BYPASS_PATHS.has(normalizePath(pathname));

export const evaluateSecurityGate = ({
  pathname = '',
  policy = null,
  requiredPortal = 'member',
}) => {
  const normalizedPath = normalizePath(pathname);
  const permissionKey = getPermissionKeyForPath(normalizedPath);
  const deniedPermissions = Array.isArray(policy?.deniedPermissions) ? policy.deniedPermissions : [];

  if (!policy || isFullSecurityBypassPath(normalizedPath)) {
    return {
      allowed: true,
      pathname: normalizedPath,
      permissionKey,
      reasonCode: null,
      requiredPortal,
    };
  }

  if (policy.requirePasswordReset) {
    return {
      allowed: false,
      pathname: normalizedPath,
      permissionKey,
      reasonCode: 'password-reset-required',
      requiredPortal,
    };
  }

  const portalField = getPortalAccessField(requiredPortal);

  if (policy[portalField] === false) {
    return {
      allowed: false,
      pathname: normalizedPath,
      permissionKey,
      reasonCode: 'portal-disabled',
      requiredPortal,
    };
  }

  if (permissionKey && !isPermissionBypassPath(normalizedPath) && deniedPermissions.includes(permissionKey)) {
    return {
      allowed: false,
      pathname: normalizedPath,
      permissionKey,
      reasonCode: 'permission-denied',
      requiredPortal,
    };
  }

  return {
    allowed: true,
    pathname: normalizedPath,
    permissionKey,
    reasonCode: null,
    requiredPortal,
  };
};

export const buildRestrictionState = (gate, pathname) => ({
  pathname: normalizePath(pathname || gate?.pathname || ''),
  reasonCode: gate?.reasonCode || 'portal-disabled',
  permissionKey: gate?.permissionKey || null,
  requiredPortal: gate?.requiredPortal || 'member',
  issuedAt: new Date().toISOString(),
});

export const describeRestriction = (reasonCode = 'portal-disabled') => {
  if (reasonCode === 'password-reset-required') {
    return {
      title: 'Password reset required',
      description: 'Your account has been flagged for a password reset before this part of the app can be opened again.',
    };
  }

  if (reasonCode === 'permission-denied') {
    return {
      title: 'This page is blocked by a security rule',
      description: 'A role-level permission override currently blocks this workspace for your account role.',
    };
  }

  return {
    title: 'Portal access is currently restricted',
    description: 'Your account does not currently have access to this workspace. Contact an administrator if you believe this is a mistake.',
  };
};
