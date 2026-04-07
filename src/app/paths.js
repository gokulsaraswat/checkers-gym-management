
export const PATHS = {
  home: '/',
  auth: '/auth',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  progress: '/progress',
  attendance: '/attendance',
  workoutPlan: '/workout-plan',
  schedule: '/schedule',
  bookings: '/bookings',
  membership: '/membership',
  account: '/account',
  staff: '/staff',
  staffProgress: '/staff/progress',
  staffSchedule: '/staff/schedule',
  staffBookings: '/staff/bookings',
  staffWorkouts: '/staff/workouts',
  admin: '/admin',
  memberDetail: '/admin/members/:memberId',
  exerciseDetail: '/exercise/:id',
};

export const getExerciseDetailPath = (id) => `/exercise/${id}`;
export const getAdminMemberDetailPath = (memberId) => `/admin/members/${memberId}`;
export const getStaffBookingPath = (sessionId = '') => (
  sessionId ? `/staff/bookings?sessionId=${encodeURIComponent(sessionId)}` : '/staff/bookings'
);

export const getStaffProgressPath = (memberId = '') => (
  memberId ? `/staff/progress?memberId=${encodeURIComponent(memberId)}` : '/staff/progress'
);
