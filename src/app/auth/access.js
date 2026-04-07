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

const protectedAuthPaths = new Set([
  PATHS.dashboard,
  PATHS.account,
  PATHS.staff,
  PATHS.admin,
]);

const guestOnlyPaths = new Set([
  PATHS.auth,
  PATHS.forgotPassword,
]);

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

  if (!protectedAuthPaths.has(pathname)) {
    return true;
  }

  if (pathname === PATHS.admin) {
    return role === USER_ROLES.admin;
  }

  if (pathname === PATHS.staff) {
    return isStaffRole(role);
  }

  return Boolean(role);
};

export const getSafeAuthRedirectPath = (role, from) => {
  const fallbackPath = getPostAuthPath(role);
  const nextPathname = from?.pathname;

  if (!nextPathname || guestOnlyPaths.has(nextPathname) || !canRoleAccessPath(role, nextPathname)) {
    return fallbackPath;
  }

  return `${nextPathname}${from?.search || ''}${from?.hash || ''}`;
};
