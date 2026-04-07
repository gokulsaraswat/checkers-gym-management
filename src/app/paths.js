
export const PATHS = {
  home: '/',
  auth: '/auth',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  attendance: '/attendance',
  schedule: '/schedule',
  membership: '/membership',
  account: '/account',
  staff: '/staff',
  staffSchedule: '/staff/schedule',
  admin: '/admin',
  memberDetail: '/admin/members/:memberId',
  exerciseDetail: '/exercise/:id',
};

export const getExerciseDetailPath = (id) => `/exercise/${id}`;
export const getAdminMemberDetailPath = (memberId) => `/admin/members/${memberId}`;
