
export const PATHS = {
  home: '/',
  auth: '/auth',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  attendance: '/attendance',
  schedule: '/schedule',
  bookings: '/bookings',
  membership: '/membership',
  account: '/account',
  staff: '/staff',
  staffSchedule: '/staff/schedule',
  staffBookings: '/staff/bookings',
  admin: '/admin',
  memberDetail: '/admin/members/:memberId',
  exerciseDetail: '/exercise/:id',
};

export const getExerciseDetailPath = (id) => `/exercise/${id}`;
export const getAdminMemberDetailPath = (memberId) => `/admin/members/${memberId}`;
export const getStaffBookingPath = (sessionId = '') => (
  sessionId ? `/staff/bookings?sessionId=${encodeURIComponent(sessionId)}` : '/staff/bookings'
);
