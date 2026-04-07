export const PATHS = {
  home: '/',
  auth: '/auth',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  progress: '/progress',
  nutrition: '/nutrition',
  attendance: '/attendance',
  workoutPlan: '/workout-plan',
  schedule: '/schedule',
  bookings: '/bookings',
  billing: '/billing',
  membership: '/membership',
  account: '/account',
  staff: '/staff',
  staffProgress: '/staff/progress',
  staffNutrition: '/staff/nutrition',
  staffSchedule: '/staff/schedule',
  staffBookings: '/staff/bookings',
  staffWorkouts: '/staff/workouts',
  staffBilling: '/staff/billing',
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

export const getStaffNutritionPath = (memberId = '') => (
  memberId ? `/staff/nutrition?memberId=${encodeURIComponent(memberId)}` : '/staff/nutrition'
);

export const getStaffBillingPath = (memberId = '') => (
  memberId ? `/staff/billing?memberId=${encodeURIComponent(memberId)}` : '/staff/billing'
);
