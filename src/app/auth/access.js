
import { PATHS } from '../paths';

export const USER_ROLES = {
  member: 'member',
  staff: 'staff',
  admin: 'admin',
};

const roleHomePathMap = {
  [USER_ROLES.member]: PATHS.dashboard,
  [USER_ROLES.staff]: PATHS.staff,
  [USER_ROLES.admin]: PATHS.admin,
};

const guestOnlyPaths = new Set([
  PATHS.auth,
  PATHS.forgotPassword,
]);

const authOnlyPaths = new Set([
  PATHS.dashboard,
  PATHS.attendance,
  PATHS.workoutPlan,
  PATHS.schedule,
  PATHS.bookings,
  PATHS.notifications,
  PATHS.membership,
  PATHS.account,
]);

const isAdminPath = (pathname = '') => pathname === PATHS.admin || pathname.startsWith(`${PATHS.admin}/`);
const isStaffPath = (pathname = '') => pathname === PATHS.staff || pathname.startsWith(`${PATHS.staff}/`);

export const getPostAuthPath = (role) => roleHomePathMap[role] || PATHS.dashboard;

export const hasRole = (role, allowedRoles = []) => allowedRoles.includes(role);

export const isStaffRole = (role) => role === USER_ROLES.staff || role === USER_ROLES.admin;

export const getRoleBadgeLabel = (role) => {
  if (role === USER_ROLES.admin) {
    return 'Admin access';
  }

  if (role === USER_ROLES.staff) {
    return 'Staff access';
  }

  return 'Member access';
};

export const canRoleAccessPath = (role, pathname = '') => {
  if (!pathname) {
    return false;
  }

  if (isAdminPath(pathname)) {
    return role === USER_ROLES.admin;
  }

  if (isStaffPath(pathname)) {
    return isStaffRole(role);
  }

  if (authOnlyPaths.has(pathname)) {
    return Boolean(role);
  }

  return true;
};

export const getSafeAuthRedirectPath = (role, from) => {
  const fallbackPath = getPostAuthPath(role);
  const nextPathname = from?.pathname;

  if (!nextPathname || guestOnlyPaths.has(nextPathname) || !canRoleAccessPath(role, nextPathname)) {
    return fallbackPath;
  }

  return `${nextPathname}${from?.search || ''}${from?.hash || ''}`;
};
